"""Process lifecycle, CDP readiness bridge, and Playwright launch entry points."""

from __future__ import annotations

import asyncio
import atexit
import contextlib
import inspect
import json
import os
import re
import signal
import subprocess
import threading
import time
import urllib.error
import urllib.request
import weakref
from dataclasses import dataclass, field
from functools import partial
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from .binary import resolve_binary
from .config import is_loopback_host, resolve_license_key
from .errors import (
    CDPConnectError,
    EngineCrashedError,
    EngineExitedError,
    InvalidOptionError,
    LaunchTimeoutError,
    LicenseError,
    PlaywrightNotInstalledError,
    redact_secrets,
)
from .options import (
    MobileViewport,
    build_engine_args,
    resolve_auto_geo_hints,
    validate_launch_options,
)
from .profile import ProfileLease, acquire_profile_lease
from .proxy import LoopbackProxyRelay, prepare_proxy

_STDERR_LOG_NAME = ".ombra-stderr.log"
_LICENSE_LINE_RE = re.compile(r"ombra license:\s*([a-z0-9_]+)", re.IGNORECASE)
_LICENSE_EXIT_CODES = {76: "no_slot", 77: "invalid", 78: "offline", 79: "config"}

_LAUNCH_METADATA: weakref.WeakKeyDictionary[Any, dict[str, Any]] = weakref.WeakKeyDictionary()
_CONTEXT_TO_BROWSER: weakref.WeakKeyDictionary[Any, Any] = weakref.WeakKeyDictionary()
_OBJECT_TO_RUNTIME: weakref.WeakKeyDictionary[Any, _EngineRuntime] = weakref.WeakKeyDictionary()
_ACTIVE_RUNTIMES: set[_EngineRuntime] = set()
_SYNC_PLAYWRIGHT = threading.local()


@dataclass(eq=False)
class _EngineRuntime:
    """Owns the spawned Ombra engine process, proxy relay, and profile lease."""

    proc: subprocess.Popen[bytes]
    binary_path: Path
    engine_version: str
    args: list[str]
    profile_lease: ProfileLease
    relay: LoopbackProxyRelay | None
    stderr_log_path: Path
    secrets_to_redact: tuple[str, ...] = field(repr=False)
    closing: bool = False
    crashed_exit_code: int | None = None
    closed: bool = False

    def stderr_tail(self, limit: int = 2000) -> str:
        if limit <= 0:
            return ""
        try:
            if not self.stderr_log_path.is_file():
                return ""
            with self.stderr_log_path.open("rb") as log:
                log.seek(0, os.SEEK_END)
                log.seek(max(0, log.tell() - limit))
                raw = log.read(limit)
            return redact_secrets(
                raw.decode("utf-8", errors="replace"),
                self.secrets_to_redact,
            )
        except OSError:
            pass
        return ""

    def terminate_tree(self, grace_s: float = 3.0) -> None:
        # Renderer processes can outlive a crashed POSIX group leader.
        if os.name != "nt" or self.proc.poll() is None:
            _signal_process_group(self.proc, force=False)
            deadline = time.monotonic() + grace_s
            while self.proc.poll() is None and time.monotonic() < deadline:
                time.sleep(0.05)
            if os.name != "nt" or self.proc.poll() is None:
                _signal_process_group(self.proc, force=True)
                with contextlib.suppress(subprocess.SubprocessError):
                    self.proc.wait(timeout=2.0)

    def cleanup(self) -> None:
        if self.closed:
            return
        self.closed = True
        _ACTIVE_RUNTIMES.discard(self)
        try:
            self.terminate_tree()
        finally:
            if self.relay is not None:
                with contextlib.suppress(Exception):
                    self.relay.stop()
            with contextlib.suppress(Exception):
                self.profile_lease.release()


@atexit.register
def _cleanup_orphaned_runtimes() -> None:
    for runtime in list(_ACTIVE_RUNTIMES):
        with contextlib.suppress(Exception):
            runtime.cleanup()


def _signal_process_group(proc: subprocess.Popen[bytes], *, force: bool) -> None:
    if os.name == "nt":
        # taskkill needs the live parent PID to discover its descendants.
        with contextlib.suppress(OSError, subprocess.SubprocessError):
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                capture_output=True,
                timeout=5,
            )
        with contextlib.suppress(OSError):
            if force:
                proc.kill()
            else:
                proc.terminate()
        return

    sig = signal.SIGKILL if force else signal.SIGTERM
    try:
        os.killpg(proc.pid, sig)
    except (ProcessLookupError, PermissionError):
        with contextlib.suppress(ProcessLookupError):
            proc.send_signal(sig)


def _weak_get(mapping: weakref.WeakKeyDictionary[Any, Any], obj: Any) -> Any:
    try:
        return mapping.get(obj)
    except TypeError:
        return None


def last_launch_info(obj: Any) -> dict[str, Any] | None:
    """Return read-only metadata for a browser/context created by Ombra."""
    meta = _weak_get(_LAUNCH_METADATA, obj)
    if meta is None:
        return None
    runtime = _weak_get(_OBJECT_TO_RUNTIME, obj)
    if (
        runtime is not None
        and not runtime.closing
        and not runtime.closed
        and runtime.crashed_exit_code is None
    ):
        code = runtime.proc.poll()
        if code is not None:
            runtime.crashed_exit_code = code
            meta["crashed"] = True
            meta["exit_code"] = code
    return dict(meta)


def resolve_browser_handle(obj: Any) -> Any:
    """Resolve the underlying Playwright Browser from a Browser or BrowserContext."""
    mapped = _weak_get(_CONTEXT_TO_BROWSER, obj)
    if mapped is not None:
        return mapped
    if hasattr(obj, "new_browser_cdp_session"):
        return obj
    browser_attr = getattr(obj, "browser", None)
    if browser_attr is not None and hasattr(browser_attr, "new_browser_cdp_session"):
        return browser_attr
    raise InvalidOptionError(
        "Expected a Playwright Browser or BrowserContext returned by ombrabrowser.launch*()."
    )


def check_engine_health(obj: Any) -> None:
    """Raise ``EngineCrashedError`` if the launched Ombra engine died unexpectedly."""
    runtime = _weak_get(_OBJECT_TO_RUNTIME, obj)
    if runtime is None:
        raise InvalidOptionError(
            "Expected a Playwright Browser or BrowserContext returned by ombrabrowser.launch*()."
        )
    if runtime.closing and runtime.crashed_exit_code is None:
        return

    exit_code = runtime.crashed_exit_code
    if exit_code is None and not runtime.closed:
        exit_code = runtime.proc.poll()
        if exit_code is not None and not runtime.closing:
            runtime.crashed_exit_code = exit_code

    if exit_code is not None and (runtime.crashed_exit_code is not None or not runtime.closing):
        meta = _weak_get(_LAUNCH_METADATA, obj)
        if meta is not None:
            meta["crashed"] = True
            meta["exit_code"] = exit_code
        tail = runtime.stderr_tail()
        runtime.cleanup()
        raise EngineCrashedError(
            f"Ombra engine process exited unexpectedly while browser was open (code {exit_code}).",
            details={
                "exit_code": exit_code,
                "binary_path": str(runtime.binary_path),
                "stderr_tail": tail,
            },
            secrets=runtime.secrets_to_redact,
        )


def _record_unexpected_disconnect(runtime: _EngineRuntime, meta: dict[str, Any]) -> None:
    if runtime.closing or runtime.closed:
        return
    code = runtime.proc.poll()
    if code is None:
        with contextlib.suppress(subprocess.TimeoutExpired):
            code = runtime.proc.wait(timeout=0.05)
    if code is not None:
        runtime.crashed_exit_code = code
        meta["crashed"] = True
        meta["exit_code"] = code
    runtime.cleanup()


def _import_sync_playwright() -> Any:
    try:
        from playwright.sync_api import sync_playwright
        return sync_playwright
    except ImportError as exc:
        raise PlaywrightNotInstalledError(
            "Playwright is required for launch(). Reinstall with: pip install --upgrade ombrabrowser"
        ) from exc


def _import_async_playwright() -> Any:
    try:
        from playwright.async_api import async_playwright
        return async_playwright
    except ImportError as exc:
        raise PlaywrightNotInstalledError(
            "Playwright is required for launch_async(). Reinstall with: pip install --upgrade ombrabrowser"
        ) from exc


def _acquire_sync_playwright(factory: Any) -> Any:
    if getattr(_SYNC_PLAYWRIGHT, "instance", None) is None:
        _SYNC_PLAYWRIGHT.instance = factory().start()
        _SYNC_PLAYWRIGHT.references = 0
    _SYNC_PLAYWRIGHT.references += 1
    return _SYNC_PLAYWRIGHT.instance


def _release_sync_playwright() -> None:
    _SYNC_PLAYWRIGHT.references -= 1
    if _SYNC_PLAYWRIGHT.references == 0:
        pw = _SYNC_PLAYWRIGHT.instance
        del _SYNC_PLAYWRIGHT.instance, _SYNC_PLAYWRIGHT.references
        pw.stop()


async def _cleanup_async_runtime(pw: Any, runtime: _EngineRuntime) -> None:
    try:
        if pw is not None:
            with contextlib.suppress(Exception):
                await pw.stop()
    finally:
        cleanup = asyncio.create_task(asyncio.to_thread(runtime.cleanup))
        cancelled = None
        # Keep the thread alive and wait for profile release even on repeated cancellation.
        while not cleanup.done():
            try:
                await asyncio.shield(cleanup)
            except asyncio.CancelledError as exc:
                cancelled = exc
        cleanup.result()
        if cancelled is not None:
            raise cancelled


def _build_child_env(
    user_env: dict[str, str], license_key: str | None
) -> tuple[dict[str, str] | None, tuple[str, ...]]:
    if license_key is None and user_env.get("OMBRA_LICENSE_KEY", "").strip():
        license_key = user_env["OMBRA_LICENSE_KEY"]
    resolved_key, source = resolve_license_key(license_key)
    secrets_list = [resolved_key] if resolved_key else []
    if not user_env and source not in {"param", "file"}:
        return None, tuple(secrets_list)
    merged = dict(os.environ)
    merged.update(user_env)
    if resolved_key and source in {"param", "file"}:
        merged["OMBRA_LICENSE_KEY"] = resolved_key
    return merged, tuple(secrets_list)


def _parse_devtools_active_port(path: Path) -> tuple[int, str] | None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    if len(lines) < 2:
        return None
    port_text = lines[0].strip()
    ws_path = lines[1].strip()
    if not port_text.isdigit() or not ws_path.startswith("/devtools/browser/"):
        return None
    port = int(port_text)
    if not (1 <= port <= 65535):
        return None
    return port, ws_path


def _probe_cdp_version(port: int) -> tuple[str, str | None]:
    """Probe ``http://127.0.0.1:<port>/json/version`` without enabling CDP domains.

    Returns ``(status, value)`` where status is one of:
    - ``"ready"`` with WebSocket debugger URL
    - ``"license"`` with engine license state from 503 body
    - ``"pending"`` when endpoint is not yet ready
    """
    url = f"http://127.0.0.1:{port}/json/version"
    req = urllib.request.Request(url, method="GET")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=2.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ws_url = data.get("webSocketDebuggerUrl") if isinstance(data, dict) else None
            if isinstance(ws_url, str) and ws_url.strip():
                return "ready", ws_url.strip()
            return "pending", None
    except urllib.error.HTTPError as exc:
        if exc.code == 503:
            with contextlib.suppress(Exception):
                body = json.loads(exc.read().decode("utf-8"))
                state = (body.get("ombra") or {}).get("license")
                if isinstance(state, str) and state.strip():
                    return "license", state.strip()
        return "pending", None
    except (OSError, ValueError, urllib.error.URLError):
        return "pending", None


def _raise_exit_error(runtime: _EngineRuntime, exit_code: int | None) -> None:
    tail = runtime.stderr_tail()
    lic_match = _LICENSE_LINE_RE.search(tail)
    state = lic_match.group(1).lower() if lic_match else _LICENSE_EXIT_CODES.get(exit_code or -1)
    if state in {"no_key", "invalid", "no_slot", "offline", "config"}:
        raise LicenseError(
            f"Ombra engine refused to start due to license state ({state}).",
            details={
                "license_state": state,
                "exit_code": exit_code,
                "binary_path": str(runtime.binary_path),
                "stderr_tail": tail,
            },
            secrets=runtime.secrets_to_redact,
        )
    raise EngineExitedError(
        f"Ombra engine exited prematurely with code {exit_code}.",
        details={
            "exit_code": exit_code,
            "binary_path": str(runtime.binary_path),
            "stderr_tail": tail,
        },
        secrets=runtime.secrets_to_redact,
    )


def _check_ws_loopback(ws_url: str) -> None:
    parsed = urlsplit(ws_url)
    if not is_loopback_host(parsed.hostname):
        raise CDPConnectError(
            f"Refusing non-loopback CDP endpoint host {parsed.hostname!r} (SI-08).",
            details={"cdp_host": parsed.hostname},
        )


def _wait_for_engine_ready_sync(runtime: _EngineRuntime, timeout_ms: int) -> tuple[int, str]:
    port_file = runtime.profile_lease.path / "DevToolsActivePort"
    deadline = time.monotonic() + (timeout_ms / 1000.0)
    port: int | None = None
    last_license_state: str | None = None

    while time.monotonic() < deadline:
        exit_code = runtime.proc.poll()
        if exit_code is not None:
            _raise_exit_error(runtime, exit_code)

        if port is None:
            parsed = _parse_devtools_active_port(port_file)
            if parsed is not None:
                port = parsed[0]
            else:
                time.sleep(0.05)
                continue

        status, val = _probe_cdp_version(port)
        if status == "ready" and val is not None:
            _check_ws_loopback(val)
            return port, val
        if status == "license" and val is not None:
            last_license_state = val
            if val in {"no_key", "invalid"}:
                raise LicenseError(
                    f"Ombra engine license error ({val}). Set OMBRA_LICENSE_KEY or ~/.ombra/license.key.",
                    details={
                        "license_state": val,
                        "binary_path": str(runtime.binary_path),
                        "stderr_tail": runtime.stderr_tail(),
                    },
                    secrets=runtime.secrets_to_redact,
                )
        time.sleep(0.1)

    if last_license_state in {"no_slot", "offline"}:
        raise LicenseError(
            f"Ombra engine license error ({last_license_state}) timed out after {timeout_ms}ms.",
            details={
                "license_state": last_license_state,
                "timeout_ms": timeout_ms,
                "binary_path": str(runtime.binary_path),
                "stderr_tail": runtime.stderr_tail(),
            },
            secrets=runtime.secrets_to_redact,
        )
    raise LaunchTimeoutError(
        f"Ombra engine did not expose a ready CDP endpoint within {timeout_ms}ms.",
        details={
            "timeout_ms": timeout_ms,
            "binary_path": str(runtime.binary_path),
            "stderr_tail": runtime.stderr_tail(),
        },
        secrets=runtime.secrets_to_redact,
    )


async def _wait_for_engine_ready_async(runtime: _EngineRuntime, timeout_ms: int) -> tuple[int, str]:
    port_file = runtime.profile_lease.path / "DevToolsActivePort"
    deadline = time.monotonic() + (timeout_ms / 1000.0)
    port: int | None = None
    last_license_state: str | None = None

    while time.monotonic() < deadline:
        exit_code = runtime.proc.poll()
        if exit_code is not None:
            _raise_exit_error(runtime, exit_code)

        if port is None:
            parsed = _parse_devtools_active_port(port_file)
            if parsed is not None:
                port = parsed[0]
            else:
                await asyncio.sleep(0.05)
                continue

        status, val = await asyncio.to_thread(_probe_cdp_version, port)
        if status == "ready" and val is not None:
            _check_ws_loopback(val)
            return port, val
        if status == "license" and val is not None:
            last_license_state = val
            if val in {"no_key", "invalid"}:
                raise LicenseError(
                    f"Ombra engine license error ({val}). Set OMBRA_LICENSE_KEY or ~/.ombra/license.key.",
                    details={
                        "license_state": val,
                        "binary_path": str(runtime.binary_path),
                        "stderr_tail": runtime.stderr_tail(),
                    },
                    secrets=runtime.secrets_to_redact,
                )
        await asyncio.sleep(0.1)

    if last_license_state in {"no_slot", "offline"}:
        raise LicenseError(
            f"Ombra engine license error ({last_license_state}) timed out after {timeout_ms}ms.",
            details={
                "license_state": last_license_state,
                "timeout_ms": timeout_ms,
                "binary_path": str(runtime.binary_path),
                "stderr_tail": runtime.stderr_tail(),
            },
            secrets=runtime.secrets_to_redact,
        )
    raise LaunchTimeoutError(
        f"Ombra engine did not expose a ready CDP endpoint within {timeout_ms}ms.",
        details={
            "timeout_ms": timeout_ms,
            "binary_path": str(runtime.binary_path),
            "stderr_tail": runtime.stderr_tail(),
        },
        secrets=runtime.secrets_to_redact,
    )


def _cdp_connect_kwargs(connect_fn: Any, remaining_ms: int) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "timeout": max(1000, remaining_ms), "is_local": True, "no_defaults": True
    }
    try:
        params = inspect.signature(connect_fn).parameters
    except (TypeError, ValueError):
        return kwargs
    if not {"is_local", "no_defaults"}.issubset(params) and not any(
        param.kind == inspect.Parameter.VAR_KEYWORD for param in params.values()
    ):
        raise PlaywrightNotInstalledError(
            "Playwright >=1.60 is required for stealth CDP attachment. "
            "Upgrade with: pip install --upgrade ombrabrowser"
        )
    return kwargs


def _default_no_viewport_sync(browser: Any) -> None:
    """Default new_page()/new_context() to no_viewport=True to avoid Emulation overrides."""
    orig_new_context = browser.new_context
    orig_new_page = browser.new_page

    def _patched_new_context(**kwargs: Any) -> Any:
        if kwargs.get("viewport") is None:
            kwargs.pop("viewport", None)
            kwargs.setdefault("no_viewport", True)
        return orig_new_context(**kwargs)

    def _patched_new_page(**kwargs: Any) -> Any:
        if kwargs.get("viewport") is None:
            kwargs.pop("viewport", None)
            kwargs.setdefault("no_viewport", True)
        return orig_new_page(**kwargs)

    browser.new_context = _patched_new_context
    browser.new_page = _patched_new_page


def _default_no_viewport_async(browser: Any) -> None:
    orig_new_context = browser.new_context
    orig_new_page = browser.new_page

    async def _patched_new_context(**kwargs: Any) -> Any:
        if kwargs.get("viewport") is None:
            kwargs.pop("viewport", None)
            kwargs.setdefault("no_viewport", True)
        return await orig_new_context(**kwargs)

    async def _patched_new_page(**kwargs: Any) -> Any:
        if kwargs.get("viewport") is None:
            kwargs.pop("viewport", None)
            kwargs.setdefault("no_viewport", True)
        return await orig_new_page(**kwargs)

    browser.new_context = _patched_new_context
    browser.new_page = _patched_new_page


def _prepare_runtime(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    extra_unknown_kwargs: dict[str, Any] | None = None,
) -> tuple[_EngineRuntime, int]:
    opts = validate_launch_options(
        headless=headless,
        proxy=proxy,
        fingerprint=fingerprint,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
        extra_unknown_kwargs=extra_unknown_kwargs,
    )

    resolved_bin = resolve_binary(
        binary_path=opts.binary_path,
        version=opts.version,
        download=opts.download,
    )
    assert resolved_bin.path is not None

    fp = opts.fingerprint
    explicit_preset = opts.humanize.get("preset") if isinstance(opts.humanize, dict) else None
    lease = acquire_profile_lease(
        profile=opts.profile,
        user_data_dir=opts.user_data_dir,
        explicit_seed=fp.get("seed"),
        os_hint=fp.get("os"),
        require_host_os=opts.mobile_viewport is not None,
        timezone=fp.get("timezone"),
        locale=fp.get("locale"),
        humanize_preset=explicit_preset,
        engine_version=resolved_bin.version,
    )

    relay: LoopbackProxyRelay | None = None
    try:
        proxy_args, relay = prepare_proxy(opts.proxy)

        eff_tz, eff_locale = resolve_auto_geo_hints(
            timezone=lease.timezone,
            locale=lease.locale,
            proxy=opts.proxy,
        )

        cli_args = build_engine_args(
            options=opts,
            profile_dir=lease.path,
            seed=lease.seed,
            proxy_args=proxy_args,
            engine_version=resolved_bin.version,
            resolved_os=lease.os_hint,
            resolved_timezone=eff_tz,
            resolved_locale=eff_locale,
            resolved_humanize_preset=lease.humanize_preset,
        )

        child_env, key_secrets = _build_child_env(opts.env, opts.license_key)
        all_secrets = tuple(
            s for s in (*(opts.proxy.secrets() if opts.proxy else ()), *key_secrets) if s
        )

        # Remove stale DevToolsActivePort before spawning so we never read a previous run's port.
        (lease.path / "DevToolsActivePort").unlink(missing_ok=True)
        stderr_log = lease.path / _STDERR_LOG_NAME

        popen_kwargs: dict[str, Any] = {
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "env": child_env,
        }
        if os.name == "nt":
            popen_kwargs["creationflags"] = 0x00000200 | 0x08000000  # NEW_PROCESS_GROUP | NO_WINDOW
        else:
            popen_kwargs["start_new_session"] = True

        with open(stderr_log, "wb") as err_fh:
            popen_kwargs["stderr"] = err_fh
            proc = subprocess.Popen(
                [str(resolved_bin.path), *cli_args],
                **popen_kwargs,
            )
    except BaseException:
        if relay is not None:
            with contextlib.suppress(Exception):
                relay.stop()
        lease.release()
        raise

    runtime = _EngineRuntime(
        proc=proc,
        binary_path=resolved_bin.path,
        engine_version=resolved_bin.version,
        args=cli_args,
        profile_lease=lease,
        relay=relay,
        stderr_log_path=stderr_log,
        secrets_to_redact=all_secrets,
    )
    try:
        _ACTIVE_RUNTIMES.add(runtime)
    except BaseException:
        runtime.cleanup()
        raise
    return runtime, opts.timeout_ms


def build_launch_options(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    **kwargs: Any,
) -> dict[str, Any]:
    """Validate options and return the resolved engine command configuration without spawning."""
    opts = validate_launch_options(
        headless=headless,
        proxy=proxy,
        fingerprint=fingerprint,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
        extra_unknown_kwargs=kwargs or None,
    )
    resolved_bin = resolve_binary(
        binary_path=opts.binary_path, version=opts.version, download=opts.download
    )
    assert resolved_bin.path is not None

    dummy_profile = opts.user_data_dir or Path("<ephemeral-profile>")
    seed = opts.fingerprint.get("seed")
    if seed is None:
        seed = 0
    proxy_flags = (
        ["--proxy-server=socks5://127.0.0.1:<relay>"]
        if opts.proxy and opts.proxy.has_credentials
        else ([f"--proxy-server={opts.proxy.server_url}"] if opts.proxy else [])
    )
    if opts.proxy and opts.proxy.bypass:
        proxy_flags.append(f"--proxy-bypass-list={opts.proxy.bypass}")

    cli_args = build_engine_args(
        options=opts,
        profile_dir=dummy_profile,
        seed=seed,
        proxy_args=proxy_flags,
        engine_version=resolved_bin.version,
        resolved_os=opts.fingerprint.get("os"),
        resolved_timezone=opts.fingerprint.get("timezone"),
        resolved_locale=opts.fingerprint.get("locale"),
    )
    return {
        "binary_path": str(resolved_bin.path),
        "engine_version": resolved_bin.version,
        "args": cli_args,
        "timeout_ms": opts.timeout_ms,
    }


def _connect_cdp_with_single_retry_sync(
    pw: Any, runtime: _EngineRuntime, port: int, deadline: float
) -> Any:
    endpoint = f"http://127.0.0.1:{port}"
    last_exc: Exception | None = None
    for attempt in range(2):
        remaining_ms = int((deadline - time.monotonic()) * 1000)
        if remaining_ms <= 0:
            break
        kwargs = _cdp_connect_kwargs(pw.chromium.connect_over_cdp, remaining_ms)
        try:
            return pw.chromium.connect_over_cdp(endpoint, **kwargs)
        except Exception as exc:
            last_exc = exc
            if runtime.proc.poll() is not None:
                _raise_exit_error(runtime, runtime.proc.returncode)
            status, _ = _probe_cdp_version(port)
            if attempt == 0 and status == "ready" and time.monotonic() < deadline:
                time.sleep(0.1)
                continue
            break
    raise CDPConnectError(
        f"Failed to connect Playwright over CDP to {endpoint}: {last_exc}",
        details={
            "endpoint": endpoint,
            "binary_path": str(runtime.binary_path),
            "stderr_tail": runtime.stderr_tail(),
        },
        secrets=runtime.secrets_to_redact,
    ) from last_exc


async def _connect_cdp_with_single_retry_async(
    pw: Any, runtime: _EngineRuntime, port: int, deadline: float
) -> Any:
    endpoint = f"http://127.0.0.1:{port}"
    last_exc: Exception | None = None
    for attempt in range(2):
        remaining_ms = int((deadline - time.monotonic()) * 1000)
        if remaining_ms <= 0:
            break
        kwargs = _cdp_connect_kwargs(pw.chromium.connect_over_cdp, remaining_ms)
        try:
            return await pw.chromium.connect_over_cdp(endpoint, **kwargs)
        except Exception as exc:
            last_exc = exc
            if runtime.proc.poll() is not None:
                _raise_exit_error(runtime, runtime.proc.returncode)
            status, _ = await asyncio.to_thread(_probe_cdp_version, port)
            if attempt == 0 and status == "ready" and time.monotonic() < deadline:
                await asyncio.sleep(0.1)
                continue
            break
    raise CDPConnectError(
        f"Failed to connect Playwright over CDP to {endpoint}: {last_exc}",
        details={
            "endpoint": endpoint,
            "binary_path": str(runtime.binary_path),
            "stderr_tail": runtime.stderr_tail(),
        },
        secrets=runtime.secrets_to_redact,
    ) from last_exc


def launch(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    **kwargs: Any,
) -> Any:
    """Launch Ombra Chromium and return a native ``playwright.sync_api.Browser``."""
    sync_playwright = _import_sync_playwright()
    runtime, resolved_timeout_ms = _prepare_runtime(
        headless=headless,
        proxy=proxy,
        fingerprint=fingerprint,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
        extra_unknown_kwargs=kwargs or None,
    )

    pw = None
    try:
        deadline = time.monotonic() + (resolved_timeout_ms / 1000.0)
        port, ws_url = _wait_for_engine_ready_sync(runtime, resolved_timeout_ms)
        pw = _acquire_sync_playwright(sync_playwright)
        browser = _connect_cdp_with_single_retry_sync(pw, runtime, port, deadline)
    except BaseException:
        if pw is not None:
            with contextlib.suppress(Exception):
                _release_sync_playwright()
        runtime.cleanup()
        raise

    original_close = browser.close

    def _close_with_cleanup(*, reason: str | None = None) -> None:
        if runtime.closing:
            return
        runtime.closing = True
        try:
            with contextlib.suppress(Exception):
                cdp = browser.new_browser_cdp_session()
                cdp.send("Browser.close")
            with contextlib.suppress(Exception):
                if reason is None:
                    original_close()
                else:
                    original_close(reason=reason)
            # Allow patch 980's exit DELETE /processes request (bounded at 3s in engine)
            # to complete cleanly before terminate_tree() falls back to SIGTERM/SIGKILL.
            if runtime.proc.poll() is None:
                with contextlib.suppress(subprocess.TimeoutExpired):
                    runtime.proc.wait(timeout=3.5)
        finally:
            with contextlib.suppress(Exception):
                _release_sync_playwright()
            runtime.cleanup()

    meta: dict[str, Any] = {
        "binary_path": str(runtime.binary_path),
        "engine_version": runtime.engine_version,
        "profile_dir": str(runtime.profile_lease.path),
        "seed": runtime.profile_lease.seed,
        "cdp_port": port,
        "ws_url": ws_url,
        "pid": runtime.proc.pid,
        "crashed": False,
        "exit_code": None,
    }
    browser.close = _close_with_cleanup
    _default_no_viewport_sync(browser)
    browser.on("disconnected", lambda *_: _record_unexpected_disconnect(runtime, meta))

    _LAUNCH_METADATA[browser] = meta
    _OBJECT_TO_RUNTIME[browser] = runtime
    return browser


async def launch_async(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    **kwargs: Any,
) -> Any:
    """Async variant of ``launch()``. Returns ``playwright.async_api.Browser``."""
    async_playwright = _import_async_playwright()
    prepare_future = asyncio.get_running_loop().run_in_executor(
        None,
        partial(
            _prepare_runtime,
            headless=headless,
            proxy=proxy,
            fingerprint=fingerprint,
            mobile_viewport=mobile_viewport,
            profile=profile,
            user_data_dir=user_data_dir,
            args=args,
            binary_path=binary_path,
            version=version,
            timeout_ms=timeout_ms,
            humanize=humanize,
            license_key=license_key,
            env=env,
            download=download,
            extra_unknown_kwargs=kwargs or None,
        ),
    )
    try:
        runtime, resolved_timeout_ms = await asyncio.shield(prepare_future)
    except asyncio.CancelledError:
        def _cleanup_prepared(future: asyncio.Future[Any]) -> None:
            try:
                prepared_runtime, _ = future.result()
            except BaseException:  # noqa: BLE001 - cancelled launches discard preparation failures
                return
            threading.Thread(
                target=prepared_runtime.cleanup,
                name="ombra-cancelled-launch-cleanup",
                daemon=False,
            ).start()

        prepare_future.add_done_callback(_cleanup_prepared)
        raise

    pw = None
    try:
        deadline = time.monotonic() + (resolved_timeout_ms / 1000.0)
        port, ws_url = await _wait_for_engine_ready_async(runtime, resolved_timeout_ms)
        pw = await async_playwright().start()
        browser = await _connect_cdp_with_single_retry_async(pw, runtime, port, deadline)
    except BaseException:
        await _cleanup_async_runtime(pw, runtime)
        raise

    original_close = browser.close

    async def _close_with_cleanup(*, reason: str | None = None) -> None:
        if runtime.closing:
            return
        runtime.closing = True
        try:
            with contextlib.suppress(Exception):
                cdp = await browser.new_browser_cdp_session()
                await cdp.send("Browser.close")
            with contextlib.suppress(Exception):
                if reason is None:
                    await original_close()
                else:
                    await original_close(reason=reason)
            if runtime.proc.poll() is None:
                with contextlib.suppress(subprocess.TimeoutExpired):
                    await asyncio.to_thread(runtime.proc.wait, 3.5)
        finally:
            await _cleanup_async_runtime(pw, runtime)

    meta: dict[str, Any] = {
        "binary_path": str(runtime.binary_path),
        "engine_version": runtime.engine_version,
        "profile_dir": str(runtime.profile_lease.path),
        "seed": runtime.profile_lease.seed,
        "cdp_port": port,
        "ws_url": ws_url,
        "pid": runtime.proc.pid,
        "crashed": False,
        "exit_code": None,
    }

    def _on_async_disconnected(*_: Any) -> None:
        if runtime.closing or runtime.closed:
            return
        threading.Thread(
            target=_record_unexpected_disconnect,
            args=(runtime, meta),
            name="ombra-async-disconnect-cleanup",
            daemon=True,
        ).start()

    browser.close = _close_with_cleanup
    _default_no_viewport_async(browser)
    browser.on("disconnected", _on_async_disconnected)

    _LAUNCH_METADATA[browser] = meta
    _OBJECT_TO_RUNTIME[browser] = runtime
    return browser


_VIEWPORT_UNSET = object()


def _attach_context_tracking(context: Any, browser: Any) -> None:
    _CONTEXT_TO_BROWSER[context] = browser
    rt = _OBJECT_TO_RUNTIME.get(browser)
    if rt is not None:
        _OBJECT_TO_RUNTIME[context] = rt
    meta = _LAUNCH_METADATA.get(browser)
    if meta is not None:
        _LAUNCH_METADATA[context] = meta


def _reject_persistent_viewport(kwargs: dict[str, Any]) -> None:
    if "viewport" in kwargs and kwargs["viewport"] is not None:
        raise InvalidOptionError(
            "launch_persistent_context attaches to the engine's default context and cannot "
            "override viewport via Playwright Emulation (SI-04); pass "
            "fingerprint={'screen': {'width': ..., 'height': ...}} or args=['--window-size=W,H'] instead."
        )


def _prepare_context_options(
    *,
    fingerprint: dict[str, Any] | None,
    locale: str | None,
    timezone: str | None,
    context_kwargs: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    if "captcha" in context_kwargs:
        raise InvalidOptionError(
            "Unknown context option(s): captcha.",
            details={"unknown_options": ["captcha"]},
        )
    fp = dict(fingerprint) if fingerprint is not None else {}
    if "timezone_id" in context_kwargs:
        tz_alias = context_kwargs.pop("timezone_id")
        if timezone is None:
            timezone = tz_alias
    if timezone is not None and "timezone" not in fp:
        fp["timezone"] = timezone
    if locale is not None and "locale" not in fp:
        fp["locale"] = locale

    viewport = context_kwargs.pop("viewport", _VIEWPORT_UNSET)
    pw_ctx_kwargs = dict(context_kwargs)
    if viewport is _VIEWPORT_UNSET or viewport is None:
        if "no_viewport" not in pw_ctx_kwargs:
            pw_ctx_kwargs["no_viewport"] = True
    elif not pw_ctx_kwargs.get("no_viewport"):
        pw_ctx_kwargs["viewport"] = viewport
    return (fp or None), pw_ctx_kwargs


def launch_context(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    locale: str | None = None,
    timezone: str | None = None,
    **context_kwargs: Any,
) -> Any:
    """Launch Ombra and return a ``playwright.sync_api.BrowserContext``.

    Closing the returned context also closes the underlying browser and stops
    the engine process.
    """
    fp, pw_ctx_kwargs = _prepare_context_options(
        fingerprint=fingerprint,
        locale=locale,
        timezone=timezone,
        context_kwargs=context_kwargs,
    )
    browser = launch(
        headless=headless,
        proxy=proxy,
        fingerprint=fp,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
    )
    try:
        context = browser.new_context(**pw_ctx_kwargs)
    except BaseException:
        with contextlib.suppress(Exception):
            browser.close()
        raise

    original_ctx_close = context.close

    def _close_context(*, reason: str | None = None) -> None:
        try:
            with contextlib.suppress(Exception):
                if reason is None:
                    original_ctx_close()
                else:
                    original_ctx_close(reason=reason)
        finally:
            browser.close()

    context.close = _close_context
    _attach_context_tracking(context, browser)
    return context


async def launch_context_async(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    locale: str | None = None,
    timezone: str | None = None,
    **context_kwargs: Any,
) -> Any:
    """Async variant of ``launch_context()``."""
    fp, pw_ctx_kwargs = _prepare_context_options(
        fingerprint=fingerprint,
        locale=locale,
        timezone=timezone,
        context_kwargs=context_kwargs,
    )
    browser = await launch_async(
        headless=headless,
        proxy=proxy,
        fingerprint=fp,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
    )
    try:
        context = await browser.new_context(**pw_ctx_kwargs)
    except BaseException:
        with contextlib.suppress(Exception):
            await browser.close()
        raise

    original_ctx_close = context.close

    async def _close_context(*, reason: str | None = None) -> None:
        try:
            with contextlib.suppress(Exception):
                if reason is None:
                    await original_ctx_close()
                else:
                    await original_ctx_close(reason=reason)
        finally:
            await browser.close()

    context.close = _close_context
    _attach_context_tracking(context, browser)
    return context


def launch_persistent_context(
    user_data_dir: str | os.PathLike[str] | None = None,
    *,
    profile: str | None = None,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    locale: str | None = None,
    timezone: str | None = None,
    **kwargs: Any,
) -> Any:
    """Launch Ombra with a persistent profile and return its default BrowserContext."""
    if user_data_dir is None and profile is None:
        raise InvalidOptionError("Either 'user_data_dir' or 'profile' is required.")
    _reject_persistent_viewport(kwargs)
    extra = dict(kwargs)
    fp, left = _prepare_context_options(
        fingerprint=fingerprint,
        locale=locale,
        timezone=timezone,
        context_kwargs=extra,
    )
    # Remove default no_viewport injected by _prepare_context_options before checking unknown keys.
    left.pop("no_viewport", None)
    if left:
        raise InvalidOptionError(
            f"Unknown launch_persistent_context option(s): {', '.join(sorted(left))}.",
            details={"unknown_options": sorted(left)},
        )

    browser = launch(
        headless=headless,
        proxy=proxy,
        fingerprint=fp,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
    )
    contexts = getattr(browser, "contexts", None) or []
    context = contexts[0] if contexts else browser.new_context(no_viewport=True)

    def _close_persistent(*, reason: str | None = None) -> None:
        if reason is None:
            browser.close()
        else:
            browser.close(reason=reason)

    context.close = _close_persistent
    _attach_context_tracking(context, browser)
    return context


async def launch_persistent_context_async(
    user_data_dir: str | os.PathLike[str] | None = None,
    *,
    profile: str | None = None,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    mobile_viewport: MobileViewport | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    locale: str | None = None,
    timezone: str | None = None,
    **kwargs: Any,
) -> Any:
    """Async variant of ``launch_persistent_context()``."""
    if user_data_dir is None and profile is None:
        raise InvalidOptionError("Either 'user_data_dir' or 'profile' is required.")
    _reject_persistent_viewport(kwargs)
    extra = dict(kwargs)
    fp, left = _prepare_context_options(
        fingerprint=fingerprint,
        locale=locale,
        timezone=timezone,
        context_kwargs=extra,
    )
    left.pop("no_viewport", None)
    if left:
        raise InvalidOptionError(
            f"Unknown launch_persistent_context_async option(s): {', '.join(sorted(left))}.",
            details={"unknown_options": sorted(left)},
        )

    browser = await launch_async(
        headless=headless,
        proxy=proxy,
        fingerprint=fp,
        mobile_viewport=mobile_viewport,
        profile=profile,
        user_data_dir=user_data_dir,
        args=args,
        binary_path=binary_path,
        version=version,
        timeout_ms=timeout_ms,
        humanize=humanize,
        license_key=license_key,
        env=env,
        download=download,
    )
    contexts = getattr(browser, "contexts", None) or []
    context = contexts[0] if contexts else await browser.new_context(no_viewport=True)

    async def _close_persistent(*, reason: str | None = None) -> None:
        if reason is None:
            await browser.close()
        else:
            await browser.close(reason=reason)

    context.close = _close_persistent
    _attach_context_tracking(context, browser)
    return context
