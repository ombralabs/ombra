"""CLI for managing the Ombra stealth Chromium binary and license key.

Usage:
    python -m ombrabrowser install       # Download and verify the engine binary
    python -m ombrabrowser info          # Environment, binary, and dependency diagnostics
    python -m ombrabrowser doctor        # Alias for info
    python -m ombrabrowser update        # Check for and install a newer engine build
    python -m ombrabrowser clear-cache   # Remove SDK-managed engine binaries (keeps profiles)
    python -m ombrabrowser login [KEY]   # Save license key to ~/.ombra/license.key (0600)
    python -m ombrabrowser logout        # Remove saved license keys
"""

from __future__ import annotations

import argparse
import getpass
import importlib.util
import json
import os
import platform
import secrets
import subprocess
import sys
from pathlib import Path

from ._version import CONTRACT_VERSION, SUPPORTED_ENGINE_RANGE, __version__
from .binary import binary_info, clear_cache, ensure_binary, resolve_binary
from .config import (
    _license_key_paths,
    _normalize_license_key,
    get_cache_dir,
    get_platform_tag,
    resolve_license_key,
)
from .errors import redact_secrets


def _module_available(module_name: str) -> bool:
    try:
        return importlib.util.find_spec(module_name) is not None
    except (ImportError, ValueError):
        return False


def _probe_binary_runs(binary_path: str) -> dict[str, object]:
    if platform.system() == "Windows":
        return {"tested": False, "reason": "skipped on Windows (--version spawns browser)"}
    try:
        res = subprocess.run(
            [binary_path, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if res.returncode == 0:
            return {"tested": True, "ok": True, "version": res.stdout.strip()}
        return {
            "tested": True,
            "ok": False,
            "error": (res.stderr or res.stdout).strip(),
        }
    except (OSError, subprocess.SubprocessError) as exc:
        return {"tested": True, "ok": False, "error": str(exc)}


def _collect_diagnostics(*, quick: bool = False, proxy: str | None = None) -> dict[str, object]:
    info = binary_info()
    _, key_source = resolve_license_key()

    if quick or not info.get("installed") or not info.get("path"):
        launch_check: dict[str, object] = {
            "tested": False,
            "reason": "skipped (--quick)" if quick else "binary not installed",
        }
    else:
        launch_check = _probe_binary_runs(str(info["path"]))

    from .geoip import GEOIP_DB_FILENAME, get_geoip_dir, geoip_available

    geoip_db = get_geoip_dir() / GEOIP_DB_FILENAME
    geoip_diag: dict[str, object] = {
        "db_present": geoip_db.exists(),
        "path": str(geoip_db),
    }
    if proxy:
        from .proxy import parse_proxy

        try:
            parsed = parse_proxy(proxy)
            from .geoip import resolve_proxy_geo_with_ip

            tz, loc, exit_ip = resolve_proxy_geo_with_ip(
                parsed.upstream_url_for_geoip() if parsed else None
            )
            geoip_diag["resolved"] = {
                "exit_ip": exit_ip,
                "timezone": tz,
                "locale": loc,
            }
        except Exception as exc:
            geoip_diag["resolved"] = {"error": redact_secrets(str(exc))}

    return {
        "sdk": {
            "version": __version__,
            "contract": CONTRACT_VERSION,
            "supported_engine": SUPPORTED_ENGINE_RANGE,
            "python": sys.version.split()[0],
            "os": platform.system(),
            "arch": platform.machine(),
            "platform": get_platform_tag(),
            "cache_dir": str(get_cache_dir()),
        },
        "binary": info,
        "launch_check": launch_check,
        "license": {
            "configured": key_source != "none",
            "source": key_source,
        },
        "geoip": geoip_diag,
        "modules": {
            "playwright": _module_available("playwright.sync_api"),
            "httpx": _module_available("httpx"),
            "cryptography": _module_available("cryptography"),
            "geoip2": geoip_available(),
        },
    }


def _print_diagnostics(diag: dict[str, object]) -> None:
    sdk = diag["sdk"]
    binary = diag["binary"]
    launch_check = diag["launch_check"]
    lic = diag["license"]
    geoip = diag["geoip"]
    modules = diag["modules"]
    assert isinstance(sdk, dict)
    assert isinstance(binary, dict)
    assert isinstance(launch_check, dict)
    assert isinstance(lic, dict)
    assert isinstance(geoip, dict)
    assert isinstance(modules, dict)

    print("Ombra SDK diagnostics")
    print(f"SDK:       {sdk['version']} (contract {sdk['contract']}, engine {sdk['supported_engine']})")
    print(f"Python:    {sdk['python']}")
    print(f"Platform:  {sdk['platform']} ({sdk['os']} {sdk['arch']})")
    print(f"Cache dir: {sdk['cache_dir']}")
    print(f"Binary:    {binary['path'] or '(not installed)'}")
    print(f"Version:   {binary['version']} (source={binary['source']}, installed={binary['installed']})")
    print(f"SHA-256:   {binary['sha256'] or '(none)'}")
    if launch_check.get("tested"):
        status = f"ok ({launch_check.get('version')})" if launch_check.get("ok") else f"failed ({launch_check.get('error')})"
        print(f"Check:     {status}")
    else:
        print(f"Check:     {launch_check.get('reason')}")
    print(f"License:   {'configured' if lic['configured'] else 'not set'} (source={lic['source']})")
    print(f"GeoIP DB:  {'present' if geoip['db_present'] else 'absent'}")
    if "resolved" in geoip:
        res = geoip["resolved"]
        assert isinstance(res, dict)
        if "error" in res:
            print(f"GeoIP res: error ({res['error']})")
        else:
            print(f"GeoIP res: exit_ip={res.get('exit_ip')}, tz={res.get('timezone')}, locale={res.get('locale')}")
    print("Modules:")
    for name, ok in modules.items():
        print(f"  {name}: {'ok' if ok else 'missing'}")


def _cmd_install(args: argparse.Namespace) -> None:
    path = ensure_binary(version=args.version, release_channel=args.channel)
    print(path)


def _cmd_info(args: argparse.Namespace) -> None:
    diag = _collect_diagnostics(quick=args.quick, proxy=args.proxy)
    if args.json:
        print(json.dumps(diag, indent=2))
    else:
        _print_diagnostics(diag)


def _cmd_update(args: argparse.Namespace) -> None:
    resolved = resolve_binary(
        download=True,
        release_channel=args.channel,
        force_update_check=True,
    )
    print(f"Engine ready: {resolved.version} ({resolved.path})")


def _cmd_clear_cache(_args: argparse.Namespace) -> None:
    clear_cache()
    print("Cleared SDK-managed engine cache (profiles preserved).")


def _write_key_file(path: Path, key: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if os.name != "nt":
        os.chmod(path.parent, 0o700)
    tmp = path.with_name(f"{path.name}.{secrets.token_hex(6)}.tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(key + "\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def _cmd_login(args: argparse.Namespace) -> None:
    raw_key = args.key
    if not raw_key:
        if not sys.stdin.isatty():
            print("Usage: ombra login <license-key>", file=sys.stderr)
            sys.exit(2)
        raw_key = getpass.getpass("Enter Ombra license key: ")
    cleaned = _normalize_license_key(raw_key)
    key_path = get_cache_dir() / "license.key"
    _write_key_file(key_path, cleaned)
    print(f"Saved license key to {key_path}")


def _cmd_logout(_args: argparse.Namespace) -> None:
    removed = False
    for key_path in _license_key_paths():
        if key_path.exists():
            key_path.unlink()
            print(f"Removed {key_path}")
            removed = True
    if not removed:
        print("No saved license key found.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ombrabrowser",
        description="Manage the Ombra stealth Chromium binary and SDK configuration.",
    )
    sub = parser.add_subparsers(dest="command")

    install_p = sub.add_parser("install", help="Resolve/download and verify the Ombra engine")
    install_p.add_argument("--version", default=None, help="Pin an engine version")
    install_p.add_argument("--channel", default=None, help="Release channel (stable|beta)")

    for name, help_text in (("info", "Diagnostics report"), ("doctor", "Alias for info")):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("--quick", action="store_true", help="Skip spawning binary --version check")
        p.add_argument("--json", action="store_true", help="Output diagnostics as JSON")
        p.add_argument("--proxy", default=None, help="Test GeoIP exit resolution through proxy")

    update_p = sub.add_parser("update", help="Check for and install the latest engine build")
    update_p.add_argument("--channel", default=None, help="Release channel (stable|beta)")

    sub.add_parser("clear-cache", help="Remove SDK-managed binaries (keeps profiles)")

    login_p = sub.add_parser("login", help="Save an Ombra license key to ~/.ombra/license.key")
    login_p.add_argument("key", nargs="?", default=None, help="License key (omit to prompt securely)")
    sub.add_parser("logout", help="Remove all saved license keys")

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        sys.exit(2)

    handlers = {
        "install": _cmd_install,
        "info": _cmd_info,
        "doctor": _cmd_info,
        "update": _cmd_update,
        "clear-cache": _cmd_clear_cache,
        "login": _cmd_login,
        "logout": _cmd_logout,
    }
    try:
        handlers[args.command](args)
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as exc:
        print(f"Error: {redact_secrets(str(exc))}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
