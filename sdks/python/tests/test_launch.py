"""Tests for launcher process lifecycle, CDP readiness, license probes, and async API."""

from __future__ import annotations

import asyncio
import contextlib
import os
import select
import signal
import subprocess
import sys
import textwrap
import threading
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ombrabrowser import (
    launch,
    launch_async,
    launch_context,
    launch_context_async,
    launch_persistent_context,
    launch_persistent_context_async,
    last_launch_info,
)
from ombrabrowser.errors import (
    CDPConnectError,
    EngineExitedError,
    InvalidOptionError,
    LaunchTimeoutError,
    LicenseError,
    PlaywrightNotInstalledError,
    ProfileBusyError,
)
from ombrabrowser._version import DEFAULT_ENGINE_VERSION
from tests.conftest import make_fake_engine


def _write_fake_engine_server(
    base_dir: Path, behavior: str = "ready", *, version: str = DEFAULT_ENGINE_VERSION
) -> Path:
    """Create a real Python-backed executable acting as Ombra Chromium.

    Writes DevToolsActivePort inside --user-data-dir and serves HTTP /json/version.
    """
    script = textwrap.dedent(
        f"""\
        #!{sys.executable}
        import http.server
        import json
        import signal
        import sys
        import threading
        import time
        from pathlib import Path

        BEHAVIOR = {behavior!r}
        user_data_dir = None
        for arg in sys.argv[1:]:
            if arg.startswith("--user-data-dir="):
                user_data_dir = Path(arg.split("=", 1)[1])

        if BEHAVIOR == "exit_early":
            sys.stderr.write("fatal crash in renderer init\\n")
            sys.stderr.flush()
            sys.exit(42)

        if BEHAVIOR == "hang_no_port":
            time.sleep(30)
            sys.exit(0)

        stop_event = threading.Event()
        state_counter = {{"calls": 0}}

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path != "/json/version":
                    self.send_response(404)
                    self.end_headers()
                    return
                state_counter["calls"] += 1
                if BEHAVIOR == "no_key":
                    body = json.dumps({{"ombra": {{"license": "no_key"}}}}).encode()
                    self.send_response(503)
                elif BEHAVIOR == "invalid":
                    body = json.dumps({{"ombra": {{"license": "invalid"}}}}).encode()
                    self.send_response(503)
                elif BEHAVIOR == "no_slot":
                    body = json.dumps({{"ombra": {{"license": "no_slot"}}}}).encode()
                    self.send_response(503)
                elif BEHAVIOR == "ok_then_ready" and state_counter["calls"] < 3:
                    body = json.dumps({{"ombra": {{"license": "ok"}}}}).encode()
                    self.send_response(503)
                else:
                    port = self.server.server_address[1]
                    body = json.dumps({{
                        "Browser": "Chrome/151.0.7922.108",
                        "webSocketDebuggerUrl": f"ws://127.0.0.1:{{port}}/devtools/browser/fake-id",
                    }}).encode()
                    self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, fmt, *args):
                return

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        port = server.server_address[1]
        if user_data_dir is not None:
            user_data_dir.mkdir(parents=True, exist_ok=True)
            (user_data_dir / "DevToolsActivePort").write_text(f"{{port}}\\n/devtools/browser/fake-id\\n")

        signal.signal(signal.SIGTERM, lambda *_: stop_event.set())
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        try:
            while not stop_event.is_set():
                time.sleep(0.05)
        finally:
            server.shutdown()
        """
    )
    return make_fake_engine(base_dir, version=version, script_body=script)


def test_import_ombra_without_playwright(monkeypatch: pytest.MonkeyPatch):
    import ombrabrowser

    assert callable(ombrabrowser.launch)
    assert callable(ombrabrowser.binary_info)

    with patch.dict(sys.modules, {"playwright": None, "playwright.sync_api": None}):
        with pytest.raises(PlaywrightNotInstalledError) as exc_info:
            launch()
        assert "pip install --upgrade ombrabrowser" in str(exc_info.value)


def test_real_subprocess_launch_readiness_and_cleanup(tmp_path: Path):
    exe = _write_fake_engine_server(
        tmp_path / "engine_ready", behavior="ok_then_ready", version="151.0.7922.108-7"
    )

    fake_browser = MagicMock()
    fake_cdp = MagicMock()
    fake_browser.new_browser_cdp_session.return_value = fake_cdp
    orig_close = MagicMock()
    fake_browser.close = orig_close

    pw = MagicMock()
    pw.chromium.connect_over_cdp.return_value = fake_browser
    pw_cm = MagicMock()
    pw_cm.start.return_value = pw

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        browser = launch(
            binary_path=exe,
            profile="e2e-prof",
            fingerprint={"seed": 77777, "os": "macos"},
            timeout_ms=5000,
        )
        assert browser is fake_browser
        meta = last_launch_info(browser)
        assert meta is not None
        assert meta["seed"] == 77777
        assert meta["engine_version"] == "151.0.7922.108-7"
        assert pw.chromium.connect_over_cdp.call_args.args[0].startswith("http://127.0.0.1:")

        # Profile lock prevents a concurrent second launch on the same profile.
        with pytest.raises(ProfileBusyError):
            launch(binary_path=exe, profile="e2e-prof", timeout_ms=3000)

        browser.close()

    fake_cdp.send.assert_called_once_with("Browser.close")
    orig_close.assert_called_once()
    pw.stop.assert_called_once()

    # Profile lock was released; third launch succeeds.
    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        browser2 = launch(binary_path=exe, profile="e2e-prof", timeout_ms=5000)
        browser2.close()


def test_license_no_key_fails_fast_and_cleans_up(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_nokey", behavior="no_key")
    pw_cm = MagicMock()

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        with pytest.raises(LicenseError) as exc_info:
            launch(binary_path=exe, profile="lic-test", timeout_ms=5000)
    assert exc_info.value.kind == "LicenseError"
    assert exc_info.value.details["license_state"] == "no_key"
    # Profile lock must be released even when license fails.
    pw_cm.start.assert_not_called()


def test_license_no_slot_times_out_with_license_error(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_noslot", behavior="no_slot")
    pw_cm = MagicMock()

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        with pytest.raises(LicenseError) as exc_info:
            launch(binary_path=exe, timeout_ms=1000)
    assert exc_info.value.details["license_state"] == "no_slot"


def test_launch_timeout_reaps_process_and_releases_lock(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_hang", behavior="hang_no_port")
    pw_cm = MagicMock()

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        with pytest.raises(LaunchTimeoutError) as exc_info:
            launch(binary_path=exe, profile="timeout-prof", timeout_ms=1000)
    assert exc_info.value.kind == "LaunchTimeout"


def test_early_exit_preserves_redacted_stderr_and_exit_code(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_exit", behavior="exit_early")
    pw_cm = MagicMock()

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        with pytest.raises(EngineExitedError) as exc_info:
            launch(binary_path=exe, timeout_ms=3000)
    assert exc_info.value.kind == "EngineExited"
    assert exc_info.value.details["exit_code"] == 42
    assert "fatal crash" in exc_info.value.details["stderr_tail"]


def test_cdp_connect_retries_once_when_endpoint_alive(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_retry", behavior="ready")
    fake_browser = MagicMock()
    pw = MagicMock()
    pw.chromium.connect_over_cdp.side_effect = [RuntimeError("transient"), fake_browser]
    pw_cm = MagicMock()
    pw_cm.start.return_value = pw

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        browser = launch(binary_path=exe, timeout_ms=5000)
        assert pw.chromium.connect_over_cdp.call_count == 2
        browser.close()

    # If both fail -> CDPConnectError and cleanup
    pw2 = MagicMock()
    pw2.chromium.connect_over_cdp.side_effect = RuntimeError("refused")
    pw2_cm = MagicMock()
    pw2_cm.start.return_value = pw2
    with patch("playwright.sync_api.sync_playwright", return_value=pw2_cm):
        with pytest.raises(CDPConnectError) as exc_info:
            launch(binary_path=exe, timeout_ms=5000)
        assert exc_info.value.kind == "CDPConnectError"


def test_launch_context_and_persistent_context(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_ctx", behavior="ready")
    fake_browser = MagicMock()
    fake_ctx = MagicMock()
    fake_default_ctx = MagicMock()
    orig_new_context = MagicMock(return_value=fake_ctx)
    fake_browser.new_context = orig_new_context
    fake_browser.contexts = [fake_default_ctx]
    pw = MagicMock()
    pw.chromium.connect_over_cdp.return_value = fake_browser
    pw_cm = MagicMock()
    pw_cm.start.return_value = pw

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        ctx = launch_context(
            binary_path=exe,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            storage_state="state.json",
        )
        ctx_kwargs = orig_new_context.call_args.kwargs
        assert ctx_kwargs["viewport"] == {"width": 1920, "height": 1080}
        assert ctx_kwargs["storage_state"] == "state.json"
        assert "locale" not in ctx_kwargs
        ctx.close()

        # Persistent context returns browser.contexts[0] and validates unknown kwargs.
        with pytest.raises(InvalidOptionError):
            launch_persistent_context(tmp_path / "pdir", binary_path=exe, unknown_flag=1)

        pctx = launch_persistent_context(tmp_path / "pdir", binary_path=exe)
        assert pctx is fake_default_ctx
        pctx.close()


def test_async_launch_variants_and_cancellation_cleanup(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_async", behavior="ready")

    async def run() -> None:
        fake_ctx = AsyncMock()
        fake_default_ctx = AsyncMock()

        def make_fake_async_browser(new_ctx_side_effect=None) -> AsyncMock:
            b = AsyncMock()
            b.on = MagicMock()
            b.new_context = AsyncMock(return_value=fake_ctx, side_effect=new_ctx_side_effect)
            b.new_page = AsyncMock()
            b.contexts = [fake_default_ctx]
            return b

        pw = AsyncMock()
        pw.chromium.connect_over_cdp.side_effect = [
            make_fake_async_browser(),
            make_fake_async_browser(),
            make_fake_async_browser(),
            make_fake_async_browser(new_ctx_side_effect=asyncio.CancelledError()),
            make_fake_async_browser(),
        ]
        pw_cm = MagicMock()
        pw_cm.start = AsyncMock(return_value=pw)

        with patch("playwright.async_api.async_playwright", return_value=pw_cm):
            browser = await launch_async(binary_path=exe, profile="async-prof", timeout_ms=5000)
            assert browser.close is not None
            await browser.close()

            ctx = await launch_context_async(binary_path=exe, locale="fr-FR")
            await ctx.close()

            pctx = await launch_persistent_context_async(profile="async-persist", binary_path=exe)
            assert pctx is fake_default_ctx
            await pctx.close()

            # CancelledError during new_context cleans up browser and profile lock.
            with pytest.raises(asyncio.CancelledError):
                await launch_context_async(binary_path=exe, profile="cancel-prof")

            # Profile lock must be released after cancellation.
            b2 = await launch_async(binary_path=exe, profile="cancel-prof")
            await b2.close()

    asyncio.run(run())


def test_cancel_during_prepare_reaps_the_engine(tmp_path: Path):
    from ombrabrowser import launcher
    from ombrabrowser.profile import acquire_profile_lease

    exe = _write_fake_engine_server(tmp_path / "engine_cancel_prepare")
    profile_dir = tmp_path / "cancelled-profile"
    started = threading.Event()
    resume = threading.Event()
    finished = threading.Event()
    prepared = []
    original_prepare = launcher._prepare_runtime

    def delayed_prepare(**kwargs):
        started.set()
        assert resume.wait(5)
        result = original_prepare(**kwargs)
        prepared.append(result[0])
        finished.set()
        return result

    async def run() -> None:
        with patch.object(launcher, "_prepare_runtime", side_effect=delayed_prepare):
            task = asyncio.create_task(
                launch_async(
                    binary_path=exe, user_data_dir=profile_dir,
                    license_key="om_cancel_test_key", timeout_ms=1000,
                )
            )
            try:
                assert await asyncio.to_thread(started.wait, 2)
                task.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await asyncio.wait_for(task, 0.5)
                resume.set()
                assert await asyncio.to_thread(finished.wait, 5)
                deadline = time.monotonic() + 3
                while not prepared[0].profile_lease._released and time.monotonic() < deadline:
                    await asyncio.sleep(0.02)
                assert prepared[0].proc.poll() is not None
                lease = acquire_profile_lease(user_data_dir=profile_dir)
                lease.release()
            finally:
                resume.set()
                await asyncio.to_thread(finished.wait, 5)
                for runtime in prepared:
                    await asyncio.to_thread(runtime.cleanup)

    asyncio.run(run())


@pytest.mark.parametrize("launch_failure", [False, True], ids=["close", "launch-failure"])
def test_cancel_during_driver_stop_reaps_engine_and_releases_profile(
    tmp_path: Path, launch_failure: bool,
):
    from ombrabrowser import launcher
    from ombrabrowser.profile import acquire_profile_lease

    exe = _write_fake_engine_server(tmp_path / "engine_cancel_stop")
    profile_dir = tmp_path / "cancel-stop-profile"
    prepared = []
    original_prepare = launcher._prepare_runtime

    def capture_prepare(**kwargs):
        result = original_prepare(**kwargs)
        prepared.append(result[0])
        return result

    async def run() -> None:
        stop_entered = asyncio.Event()
        resume_stop = asyncio.Event()

        async def stop():
            stop_entered.set()
            await resume_stop.wait()

        browser = AsyncMock()
        browser.on = MagicMock()
        pw = AsyncMock()
        pw.stop.side_effect = stop
        pw.chromium.connect_over_cdp.return_value = browser
        if launch_failure:
            pw.chromium.connect_over_cdp.side_effect = RuntimeError("CDP refused")
        manager = MagicMock()
        manager.start = AsyncMock(return_value=pw)
        with (
            patch.object(launcher, "_prepare_runtime", side_effect=capture_prepare),
            patch("playwright.async_api.async_playwright", return_value=manager),
        ):
            task = asyncio.create_task(launch_async(
                binary_path=exe, user_data_dir=profile_dir, timeout_ms=5000,
                license_key="om_cancel_stop_test_key",
            ))
            try:
                if not launch_failure:
                    launched = await task
                    assert launched is browser
                    task = asyncio.create_task(launched.close())
                await asyncio.wait_for(stop_entered.wait(), 8)
                assert prepared[0].proc.poll() is None
                task.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await asyncio.wait_for(task, 5)
                assert prepared[0].proc.poll() is not None, "Cancelled shutdown leaked engine"
                lease = acquire_profile_lease(user_data_dir=profile_dir)
                lease.release()
                if not launch_failure:
                    resume_stop.set()
                    await browser.close()
                    pw.stop.assert_awaited_once()
            finally:
                resume_stop.set()
                if not task.done():
                    task.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await task
                for runtime in prepared:
                    await asyncio.to_thread(runtime.cleanup)

    asyncio.run(run())


def test_repeated_cancellation_waits_for_process_cleanup(tmp_path: Path):
    from ombrabrowser import launcher
    from ombrabrowser.profile import acquire_profile_lease

    profile_dir = tmp_path / "cancel-cleanup-profile"
    lease = acquire_profile_lease(user_data_dir=profile_dir)
    proc = subprocess.Popen(
        [sys.executable, "-c", "import time; time.sleep(60)"],
        start_new_session=os.name != "nt",
    )
    runtime = launcher._EngineRuntime(
        proc=proc, binary_path=Path(sys.executable), engine_version="test", args=[],
        profile_lease=lease, relay=None, stderr_log_path=tmp_path / "stderr.log",
        secrets_to_redact=(),
    )
    cleanup_entered = threading.Event()
    resume_cleanup = threading.Event()
    original_cleanup = runtime.cleanup

    def delayed_cleanup():
        cleanup_entered.set()
        assert resume_cleanup.wait(5)
        original_cleanup()

    async def run():
        browser = AsyncMock()
        browser.on = MagicMock()
        pw = AsyncMock()
        manager = MagicMock()
        manager.start = AsyncMock(return_value=pw)
        pw.chromium.connect_over_cdp.return_value = browser
        with (
            patch.object(launcher, "_prepare_runtime", return_value=(runtime, 5000)),
            patch.object(launcher, "_wait_for_engine_ready_async", return_value=(9222, "ws://localhost")),
            patch.object(runtime, "cleanup", side_effect=delayed_cleanup),
            patch("playwright.async_api.async_playwright", return_value=manager),
        ):
            browser = await launch_async()
            task = asyncio.create_task(browser.close())
            try:
                assert await asyncio.to_thread(cleanup_entered.wait, 5)
                for _ in range(2):
                    task.cancel()
                    await asyncio.sleep(0)
                    assert not task.done(), "Cancellation abandoned in-flight cleanup"
                resume_cleanup.set()
                with pytest.raises(asyncio.CancelledError):
                    await task
                assert proc.poll() is not None
                replacement = acquire_profile_lease(user_data_dir=profile_dir)
                replacement.release()
            finally:
                resume_cleanup.set()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

    try:
        asyncio.run(run())
    finally:
        resume_cleanup.set()
        original_cleanup()


def test_multiple_sync_launches_share_a_driver_until_the_last_close():
    from ombrabrowser import launcher

    runtimes = [MagicMock(), MagicMock(), MagicMock()]
    for runtime in runtimes:
        runtime.proc.poll.return_value = 0
        runtime.closing = False
    with (
        patch.object(launcher, "_prepare_runtime", side_effect=[(rt, 1000) for rt in runtimes]),
        patch.object(launcher, "_wait_for_engine_ready_sync", return_value=(9222, "ws://127.0.0.1:9222")),
        patch.object(launcher, "_connect_cdp_with_single_retry_sync", side_effect=[MagicMock(), MagicMock(), MagicMock()]) as connect,
    ):
        first = launch()
        second = None
        try:
            second = launch()
            driver = connect.call_args.args[0]
            first.close()
            first.close()
            request = driver.request.new_context()
            request.dispose()
        finally:
            first.close()
            if second is not None:
                second.close()
        third = launch()
        third.close()


def test_child_env_injects_a_license_saved_in_the_custom_cache(tmp_path: Path):
    from ombrabrowser.launcher import _build_child_env

    cache = Path(os.environ["OMBRA_CACHE_DIR"])
    cache.mkdir(parents=True)
    (cache / "license.key").write_text("om_saved_test_key\n", encoding="utf-8")
    child_env, secrets = _build_child_env({}, None)
    assert child_env is not None
    assert child_env["OMBRA_LICENSE_KEY"] == "om_saved_test_key"
    assert "om_saved_test_key" in secrets


def test_child_env_redacts_the_effective_user_license(monkeypatch: pytest.MonkeyPatch):
    from ombrabrowser.launcher import _build_child_env

    monkeypatch.setenv("OMBRA_LICENSE_KEY", "om_parent_test_key")
    child_env, secrets = _build_child_env({"OMBRA_LICENSE_KEY": "om_child_test_key"}, None)
    assert child_env["OMBRA_LICENSE_KEY"] == "om_child_test_key"
    assert "om_child_test_key" in secrets
    explicit_env, explicit_secrets = _build_child_env(
        {"OMBRA_LICENSE_KEY": "om_child_test_key"}, "om_explicit_test_key"
    )
    assert explicit_env["OMBRA_LICENSE_KEY"] == "om_explicit_test_key"
    assert "om_explicit_test_key" in explicit_secrets


def test_cdp_connect_rejects_playwright_without_stealth_options():
    from ombrabrowser.launcher import _cdp_connect_kwargs

    def old_connect(endpoint_url, *, timeout=None):
        pass

    with pytest.raises(PlaywrightNotInstalledError, match="1.60"):
        _cdp_connect_kwargs(old_connect, 1000)


@pytest.mark.skipif(os.name == "nt", reason="POSIX process groups")
def test_cleanup_kills_children_after_the_group_leader_exits(tmp_path: Path):
    from ombrabrowser.launcher import _EngineRuntime

    read_fd, write_fd = os.pipe()
    child_code = (
        "import os, signal, sys, time; "
        "signal.signal(signal.SIGTERM, signal.SIG_IGN); "
        "os.write(int(sys.argv[1]), b'R'); time.sleep(60)"
    )
    parent_code = (
        "import subprocess, sys; "
        f"subprocess.Popen([sys.executable, '-c', {child_code!r}, sys.argv[1]], "
        "pass_fds=(int(sys.argv[1]),))"
    )
    proc = subprocess.Popen(
        [sys.executable, "-c", parent_code, str(write_fd)],
        pass_fds=(write_fd,), start_new_session=True,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    os.close(write_fd)
    runtime = _EngineRuntime(
        proc=proc, binary_path=Path(sys.executable), engine_version="151.0.7922.108",
        args=[], profile_lease=MagicMock(), relay=None,
        stderr_log_path=tmp_path / "stderr.log", secrets_to_redact=(),
    )
    try:
        proc.wait(timeout=5)
        assert select.select([read_fd], [], [], 5)[0]
        assert os.read(read_fd, 1) == b"R"
        runtime.cleanup()
        assert select.select([read_fd], [], [], 2)[0], "Engine child is still alive"
        assert os.read(read_fd, 1) == b""
    finally:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass
        os.close(read_fd)


def test_windows_cleanup_attempts_tree_termination_before_parent_exit(tmp_path: Path):
    from ombrabrowser import launcher

    events = []
    proc = MagicMock(pid=12345)
    proc.poll.return_value = None

    def terminate():
        events.append("parent-exit")
        proc.poll.return_value = 0

    def taskkill(command, **kwargs):
        assert command[0] == "taskkill"
        assert "/T" in command
        assert command[command.index("/PID") + 1] == "12345"
        events.append("tree-attempt")
        return subprocess.CompletedProcess(command, 0)

    proc.terminate.side_effect = terminate
    runtime = launcher._EngineRuntime(
        proc=proc, binary_path=tmp_path / "chrome.exe", engine_version="test",
        args=[], profile_lease=MagicMock(), relay=None,
        stderr_log_path=tmp_path / "stderr.log", secrets_to_redact=(),
    )
    # Replace launcher.os only: changing the real os.name breaks pathlib on macOS.
    windows_os = MagicMock(name="windows-os")
    windows_os.name = "nt"
    with (
        patch.object(launcher, "os", windows_os),
        patch.object(launcher.subprocess, "run", side_effect=taskkill),
    ):
        runtime.cleanup()
        runtime.cleanup()
    assert events == ["tree-attempt", "parent-exit"]
    runtime.profile_lease.release.assert_called_once()


def test_stderr_tail_reads_only_the_requested_bytes(tmp_path: Path, monkeypatch):
    from ombrabrowser.launcher import _EngineRuntime

    log = tmp_path / "stderr.log"
    tail = b"ok:\xff token=om_tail_test_key\n"
    log.write_bytes(b"x" * (8 * 1024 * 1024 - len(tail)) + tail)
    runtime = _EngineRuntime(
        proc=MagicMock(), binary_path=tmp_path / "chrome", engine_version="test",
        args=[], profile_lease=MagicMock(), relay=None,
        stderr_log_path=log, secrets_to_redact=("om_tail_test_key",),
    )
    reads = []
    original_open = Path.open

    class TrackedReader:
        def __init__(self, file):
            self.file = file

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return self.file.__exit__(*args)

        def __getattr__(self, name):
            return getattr(self.file, name)

        def read(self, size=-1):
            data = self.file.read(size)
            reads.append(len(data))
            return data

    def tracking_open(path, *args, **kwargs):
        file = original_open(path, *args, **kwargs)
        return TrackedReader(file) if path == log else file

    monkeypatch.setattr(Path, "open", tracking_open)
    assert runtime.stderr_tail(32) == "x" * (32 - len(tail)) + "ok:\ufffd token=***\n"
    assert sum(reads) <= 32, "Reading a short tail loaded the full log"
    reads.clear()
    assert runtime.stderr_tail(0) == ""
    assert reads == []
    log.write_bytes(b"short log\n")
    assert runtime.stderr_tail(32) == "short log\n"
    log.unlink()
    assert runtime.stderr_tail(32) == ""


def test_runtime_repr_hides_redaction_secrets(tmp_path: Path):
    from ombrabrowser.launcher import _EngineRuntime

    runtime = _EngineRuntime(
        proc=MagicMock(), binary_path=tmp_path / "chrome", engine_version="test",
        args=[], profile_lease=MagicMock(), relay=None,
        stderr_log_path=tmp_path / "stderr.log", secrets_to_redact=("om_repr_fake_key",),
    )
    assert "om_repr_fake_key" not in repr(runtime)


def test_shared_fixture_isolates_saved_license_fallback(tmp_path: Path):
    from ombrabrowser.config import resolve_license_key

    assert Path.home() == tmp_path / "home"
    saved_key = Path.home() / ".ombra" / "license.key"
    saved_key.parent.mkdir(parents=True)
    saved_key.write_text("om_isolated_fake_key\n", encoding="utf-8")
    assert resolve_license_key() == ("om_isolated_fake_key", "file")


def test_engine_crash_tracking_and_persistent_viewport_error(tmp_path: Path):
    from ombrabrowser import EngineCrashedError, check_engine_health

    exe = _write_fake_engine_server(tmp_path / "engine_crash", behavior="ready")
    fake_browser = MagicMock()
    fake_browser.contexts = [MagicMock()]
    pw = MagicMock()
    pw.chromium.connect_over_cdp.return_value = fake_browser
    pw_cm = MagicMock()
    pw_cm.start.return_value = pw

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        with pytest.raises(InvalidOptionError) as vp_err:
            launch_persistent_context(
                profile="vp-prof",
                binary_path=exe,
                viewport={"width": 1280, "height": 720},
            )
        assert "fingerprint" in str(vp_err.value)

        browser = launch(binary_path=exe, profile="crash-prof", timeout_ms=5000)
        check_engine_health(browser)
        assert last_launch_info(browser)["crashed"] is False

        pid = last_launch_info(browser)["pid"]
        os.kill(pid, 9)
        import time as _t

        deadline = _t.monotonic() + 3.0
        while _t.monotonic() < deadline:
            if last_launch_info(browser)["crashed"]:
                break
            _t.sleep(0.05)

        with pytest.raises(EngineCrashedError) as crash_err:
            check_engine_health(browser)
        assert crash_err.value.kind == "EngineCrashed"
        assert last_launch_info(browser)["crashed"] is True
        browser.close()


@pytest.mark.real_browser
def test_real_ombra_binary_smoke():
    """Optional live smoke test against a local Ombra Chromium binary.

    Enabled only when OMBRA_REAL_BROWSER_TEST=1 is set in the environment.
    """
    if os.environ.get("OMBRA_REAL_BROWSER_TEST") != "1":
        pytest.skip("Set OMBRA_REAL_BROWSER_TEST=1 to run against real Ombra Chromium.")
    browser = launch(headless=True)
    try:
        page = browser.new_page()
        page.set_content("<title>Ombra Smoke</title>")
        assert page.title() == "Ombra Smoke"
        assert page.evaluate("navigator.webdriver") is False
        assert page.evaluate("window.__ombra ?? null") is None
    finally:
        browser.close()
