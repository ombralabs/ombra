"""Shared pytest fixtures for Ombra Python SDK tests."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import stat
from pathlib import Path
from typing import Any

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from ombrabrowser.config import DEFAULT_DOWNLOAD_URL, get_managed_engines_dir, get_platform_info

_CACHE_SIGNING_KEY = Ed25519PrivateKey.from_private_bytes(bytes(range(32)))

_ENV_VARS_TO_ISOLATE = (
    "OMBRA_BINARY_PATH",
    "OMBRA_CACHE_DIR",
    "OMBRA_APP_ENGINES_DIR",
    "OMBRA_DOWNLOAD_URL",
    "OMBRA_VERSION",
    "OMBRA_AUTO_UPDATE",
    "OMBRA_SKIP_CHECKSUM",
    "OMBRA_LICENSE_KEY",
    "OMBRA_TIMEOUT_MS",
    "OMBRA_LOG_LEVEL",
    "OMBRA_RELEASE_CHANNEL",
)


@pytest.fixture(autouse=True)
def isolated_ombra_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolate Ombra environment variables and directories for every test."""
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: tmp_path / "home"))
    for key in _ENV_VARS_TO_ISOLATE:
        monkeypatch.delenv(key, raising=False)

    cache_dir = tmp_path / "ombra-cache"
    app_engines = tmp_path / "ombra-app-engines"
    monkeypatch.setenv("OMBRA_CACHE_DIR", str(cache_dir))
    monkeypatch.setenv("OMBRA_APP_ENGINES_DIR", str(app_engines))
    monkeypatch.setenv("OMBRA_AUTO_UPDATE", "false")
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [base64.b64encode(
        _CACHE_SIGNING_KEY.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode()])
    return tmp_path


def make_fake_engine(
    base_dir: Path,
    *,
    version: str = "151.0.7922.108",
    chromium: str | None = None,
    platform_name: str | None = None,
    script_body: str = "#!/bin/sh\necho \"Chromium 151.0.7922.108\"\n",
    write_build_json: bool = True,
    channel: str | None = "stable",
) -> Path:
    """Create a realistic fake Ombra Chromium tree under *base_dir* and return executable path."""
    plat = get_platform_info()
    target_plat = platform_name or plat.cdn_name
    chr_ver = chromium or version.split("-", 1)[0]

    if plat.system == "Darwin":
        app_root = base_dir / "Chromium.app"
        exe = app_root / "Contents" / "MacOS" / "Chromium"
        build_json = app_root / "Contents" / "Resources" / "ombra-build.json"
        plist = app_root / "Contents" / "Info.plist"
        plist.parent.mkdir(parents=True, exist_ok=True)
        plist.write_text(
            f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<plist version="1.0"><dict>\n'
            f'<key>CFBundleShortVersionString</key><string>{chr_ver}</string>\n'
            f'</dict></plist>\n',
            encoding="utf-8",
        )
    elif plat.system == "Windows":
        app_root = base_dir
        exe = app_root / "chrome.exe"
        build_json = app_root / "ombra-build.json"
    else:
        app_root = base_dir
        exe = app_root / "chrome"
        build_json = app_root / "ombra-build.json"

    exe.parent.mkdir(parents=True, exist_ok=True)
    exe.write_text(script_body, encoding="utf-8")
    if os.name != "nt":
        exe.chmod(exe.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    if write_build_json:
        build_json.parent.mkdir(parents=True, exist_ok=True)
        meta: dict[str, Any] = {
            "version": version,
            "chromium": chr_ver,
            "commit": "0" * 40,
            "platform": target_plat,
            "built": "2026-11-16T00:00:00Z",
        }
        build_json.write_text(json.dumps(meta), encoding="utf-8")

    (base_dir / "binary.sha256").write_text(
        hashlib.sha256(exe.read_bytes()).hexdigest() + "\n", encoding="utf-8"
    )
    if channel and base_dir.parent == get_managed_engines_dir():
        (base_dir.parent / f".latest_{channel}_{plat.cdn_name}").write_text(base_dir.name)
        filename = f"ombra-engine-{base_dir.name}-{plat.cdn_name}{plat.archive_ext}"
        signed = json.dumps({
            "version": base_dir.name,
            "platforms": {plat.cdn_name: {"file": filename, "sha256": "0" * 64, "size": 1}},
        })
        envelope = json.dumps({
            "signed": signed,
            "sig": base64.b64encode(_CACHE_SIGNING_KEY.sign(signed.encode())).decode(),
        })
        root = f"https://github.com/ombralabs/ombra/releases/download/v{base_dir.name}"
        marker = {
            "source": DEFAULT_DOWNLOAD_URL,
            "channel": channel,
            "release": {
                "tag_name": f"v{base_dir.name}", "draft": False, "prerelease": channel == "beta",
                "assets": [
                    {"name": "release.json", "browser_download_url": f"{root}/release.json",
                     "size": len(envelope)},
                    {"name": filename, "browser_download_url": f"{root}/{filename}", "size": 1},
                ],
            },
            "envelope": envelope,
        }
        (base_dir.parent / f".latest_github_{channel}_{plat.cdn_name}").write_text(json.dumps(marker))
    return exe
