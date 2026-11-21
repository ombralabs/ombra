"""Tests for binary resolution, Ed25519 + SHA-256 verification, download, and cache."""

from __future__ import annotations

import base64
import hashlib
import http.server
import io
import json
import multiprocessing
import os
import subprocess
import sys
import shlex
import tarfile
import threading
import zipfile
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from ombrabrowser import binary_info, clear_cache, ensure_binary
from ombrabrowser.binary import compute_sha256, resolve_binary
from ombrabrowser.config import get_platform_info
from ombrabrowser.errors import (
    BinaryNotFoundError,
    ChecksumMismatchError,
    DownloadFailedError,
    UnsupportedEngineError,
    UnsupportedPlatformError,
)
from tests.conftest import make_fake_engine


def _create_signed_archive(
    dest_dir: Path,
    *,
    version: str,
    private_key: Ed25519PrivateKey,
) -> tuple[Path, str, int, bytes]:
    plat = get_platform_info()
    staging = dest_dir / "pkg_src"
    bin_path = make_fake_engine(staging, version=version)
    assert bin_path.exists()

    archive_name = f"ombra-engine-{version}-{plat.cdn_name}{plat.archive_ext}"
    archive_path = dest_dir / archive_name

    if plat.archive_ext == ".zip":
        with zipfile.ZipFile(archive_path, "w") as zf:
            for item in staging.rglob("*"):
                if item.is_file():
                    zf.write(item, item.relative_to(staging))
    else:
        mode = "w:xz" if plat.archive_ext == ".tar.xz" else "w:gz"
        with tarfile.open(archive_path, mode) as tf:
            for item in staging.iterdir():
                tf.add(item, arcname=item.name)

    archive_bytes = archive_path.read_bytes()
    sha = hashlib.sha256(archive_bytes).hexdigest()
    size = len(archive_bytes)

    channel_payload = {
        "channel": "stable",
        "serial": 1,
        "published": "2026-11-16T00:00:00Z",
        "platforms": {
            plat.cdn_name: {
                "version": version,
                "path": f"/engine/releases/{version}/{archive_name}",
                "sha256": sha,
                "size": size,
                "minManager": "0.1.0",
                "notes": "test release",
            }
        },
    }
    signed_str = json.dumps(channel_payload, separators=(",", ":"), sort_keys=True)
    sig_b64 = base64.b64encode(private_key.sign(signed_str.encode("utf-8"))).decode("ascii")
    envelope = json.dumps({"signed": signed_str, "sig": sig_b64}).encode("utf-8")
    return archive_path, sha, size, envelope


def _start_static_server(routes: dict[str, tuple[int, bytes]]) -> tuple[http.server.ThreadingHTTPServer, str, list[str]]:
    requested_paths: list[str] = []

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            requested_paths.append(self.path)
            entry = routes.get(self.path)
            if entry is None:
                self.send_response(404)
                self.end_headers()
                return
            status, body = entry
            if callable(status):
                status, body = status()
            self.send_response(status)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            return

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    return server, f"http://127.0.0.1:{port}", requested_paths


def test_binary_info_matches_schema_when_not_installed(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OMBRA_DOWNLOAD_URL", "off")
    info = binary_info()
    assert set(info.keys()) == {"version", "platform", "path", "installed", "source", "sha256"}
    assert isinstance(info["version"], str) and info["version"]
    assert info["installed"] is False
    assert info["source"] == "none"
    assert info["path"] is None
    assert info["sha256"] is None


def test_binary_resolution_precedence(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    # 4. cache
    cache_exe = make_fake_engine(
        tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-4",
        version="151.0.7922.108-4",
    )
    assert binary_info()["source"] == "cache"
    assert binary_info()["path"] == str(cache_exe)

    # 3. app overrides cache
    app_engines = tmp_path / "ombra-app-engines"
    app_exe = make_fake_engine(
        app_engines / "versions" / "151.0.7922.108-7",
        version="151.0.7922.108-7",
    )
    (app_engines / "selection.json").write_text(
        json.dumps({"active": "151.0.7922.108-7"}), encoding="utf-8"
    )
    assert binary_info()["source"] == "app"
    assert binary_info()["path"] == str(app_exe)

    # 2. OMBRA_BINARY_PATH overrides app
    env_exe = make_fake_engine(tmp_path / "env_bin", version="151.0.7922.108-8")
    monkeypatch.setenv("OMBRA_BINARY_PATH", str(env_exe))
    assert binary_info()["source"] == "env"
    assert binary_info()["path"] == str(env_exe)

    # 1. explicit argument overrides OMBRA_BINARY_PATH
    arg_exe = make_fake_engine(tmp_path / "arg_bin", version="151.0.7922.108-9")
    info = binary_info(binary_path=arg_exe)
    assert info["source"] == "argument"
    assert info["path"] == str(arg_exe)
    assert info["installed"] is True
    assert len(info["sha256"]) == 64


def test_rejects_incompatible_engine_version(tmp_path: Path):
    old_exe = make_fake_engine(tmp_path / "old_engine", version="150.0.7871.114-1", chromium="150.0.7871.114")
    with pytest.raises(UnsupportedEngineError) as exc_info:
        ensure_binary(binary_path=old_exe)
    assert exc_info.value.kind == "UnsupportedEngine"
    assert "150.0.7871.114" in str(exc_info.value)
    assert "151.0.7922.108" in str(exc_info.value)


def test_rejects_wrong_platform_metadata_and_elf_magic(tmp_path: Path):
    bad_meta_exe = make_fake_engine(tmp_path / "wrong_plat", platform_name="windows-x64" if get_platform_info().cdn_name != "windows-x64" else "linux-x64")
    with pytest.raises(UnsupportedPlatformError):
        ensure_binary(binary_path=bad_meta_exe)

    # Raw ELF header on non-Linux or wrong header bytes
    bad_bin = make_fake_engine(tmp_path / "bad_magic")
    bad_bin.write_bytes(b"NOT_A_VALID_BINARY_HEADER_" * 4)
    with pytest.raises(UnsupportedPlatformError):
        ensure_binary(binary_path=bad_bin)


def test_detects_checksum_tampering_and_skip_checksum(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog):
    engine_dir = tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7"
    exe = make_fake_engine(engine_dir, version="151.0.7922.108-7")
    (engine_dir / "binary.sha256").write_text("0" * 64 + "\n", encoding="utf-8")

    # binary_info reports unverified
    info = binary_info()
    assert info["installed"] is False
    assert info["sha256"] is None

    with pytest.raises(ChecksumMismatchError) as exc_info:
        ensure_binary()
    assert exc_info.value.kind == "ChecksumMismatch"

    # Dev bypass works loudly
    monkeypatch.setenv("OMBRA_SKIP_CHECKSUM", "1")
    with caplog.at_level("WARNING", logger="ombrabrowser"):
        resolved = ensure_binary()
    assert resolved == str(exe)
    assert any("OMBRA_SKIP_CHECKSUM" in r.message for r in caplog.records)


@pytest.mark.parametrize("receipt", [None, b"", b"invalid\n", b"\xff"])
def test_managed_binary_requires_valid_receipt(tmp_path: Path, monkeypatch, caplog, receipt):
    engine_dir = tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7"
    exe = make_fake_engine(engine_dir)
    receipt_path = engine_dir / "binary.sha256"
    if receipt is None:
        receipt_path.unlink()
    else:
        receipt_path.write_bytes(receipt)

    assert binary_info()["installed"] is False
    with pytest.raises(ChecksumMismatchError):
        ensure_binary()

    monkeypatch.setenv("OMBRA_SKIP_CHECKSUM", "1")
    with caplog.at_level("WARNING", logger="ombrabrowser"):
        assert ensure_binary() == str(exe)
    assert any("OMBRA_SKIP_CHECKSUM" in record.message for record in caplog.records)


@pytest.mark.skipif(get_platform_info().system == "Windows", reason="Windows never probes --version")
@pytest.mark.parametrize("source", ["argument", "env", "cache", "app"])
@pytest.mark.parametrize("pinned", [False, True])
def test_bad_receipt_prevents_version_probe(tmp_path: Path, monkeypatch, source, pinned):
    version = "151.0.7922.108-7"
    engine_dir = {
        "cache": tmp_path / "ombra-cache" / "engines" / version,
        "app": tmp_path / "ombra-app-engines" / "versions" / version,
    }.get(source, tmp_path / "developer-engine")
    marker = tmp_path / "version-probe-ran"
    exe = make_fake_engine(
        engine_dir,
        write_build_json=False,
        script_body=f"#!/bin/sh\ntouch {shlex.quote(str(marker))}\necho 'Chromium {version}'\n",
    )
    if get_platform_info().system == "Darwin":
        (exe.parent.parent / "Info.plist").unlink()
    (engine_dir / "binary.sha256").write_text("0" * 64 + "\n")
    if source == "env":
        monkeypatch.setenv("OMBRA_BINARY_PATH", str(exe))
    kwargs = {"binary_path": exe} if source == "argument" else {}
    if pinned:
        kwargs["version"] = version

    assert binary_info(**kwargs)["installed"] is False
    assert not marker.exists(), "binary_info executed an unverified --version probe"
    with pytest.raises(ChecksumMismatchError):
        ensure_binary(**kwargs)
    assert not marker.exists(), "ensure_binary executed an unverified --version probe"


@pytest.mark.parametrize("source", ["argument", "env", "app"])
def test_external_binary_does_not_require_receipt(tmp_path: Path, monkeypatch, source):
    engine_dir = (
        tmp_path / "ombra-app-engines" / "versions" / "151.0.7922.108-7"
        if source == "app" else tmp_path / "developer-engine"
    )
    exe = make_fake_engine(engine_dir)
    (engine_dir / "binary.sha256").unlink()
    if source == "env":
        monkeypatch.setenv("OMBRA_BINARY_PATH", str(exe))
    kwargs = {"binary_path": exe} if source == "argument" else {}
    assert ensure_binary(**kwargs) == str(exe)


@pytest.mark.skipif(get_platform_info().system == "Windows", reason="Windows never probes --version")
def test_app_selection_uses_directory_version_without_probing(tmp_path: Path):
    version = "151.0.7922.108-7"
    marker = tmp_path / "unselected-version-probe-ran"
    app_exe = make_fake_engine(
        tmp_path / "ombra-app-engines" / "versions" / "151.0.7922.108-9",
        write_build_json=False,
        script_body=f"#!/bin/sh\ntouch {shlex.quote(str(marker))}\necho 'Chromium {version}'\n",
    )
    if get_platform_info().system == "Darwin":
        (app_exe.parent.parent / "Info.plist").unlink()
    cache_exe = make_fake_engine(tmp_path / "ombra-cache" / "engines" / version, version=version)

    resolved = resolve_binary(version=version, download=False)
    assert resolved.path == cache_exe
    assert resolved.source == "cache"
    assert not marker.exists()


@pytest.mark.skipif(get_platform_info().system == "Windows", reason="Windows never probes --version")
@pytest.mark.parametrize("app_version, expected_source", [
    ("151.0.7922.108-7", "app"),
    ("151.0.7922.108-9", "cache"),
    ("150.0.0.1", "cache"),
])
def test_legacy_app_without_metadata_or_receipt_supports_version_pin(
    tmp_path: Path, app_version, expected_source
):
    version = "151.0.7922.108-7"
    engine_dir = tmp_path / "ombra-app-engines"
    exe = make_fake_engine(
        engine_dir,
        write_build_json=False,
        script_body=f"#!/bin/sh\necho 'Chromium {app_version}'\n",
    )
    if get_platform_info().system == "Darwin":
        (exe.parent.parent / "Info.plist").unlink()
    (engine_dir / "binary.sha256").unlink()
    cache_exe = make_fake_engine(tmp_path / "ombra-cache" / "engines" / version, version=version)

    resolved = resolve_binary(version=version, download=False)
    assert resolved.path == (exe if expected_source == "app" else cache_exe)
    assert resolved.source == expected_source
    assert resolved.version == version


def test_signed_download_and_verification(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    priv = Ed25519PrivateKey.generate()
    pub_raw = priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    pub_b64 = base64.b64encode(pub_raw).decode("ascii")
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [pub_b64])

    plat = get_platform_info()
    version = "151.0.7922.108-7"
    archive_path, _sha, _size, envelope = _create_signed_archive(
        tmp_path / "dist", version=version, private_key=priv
    )
    rel_path = f"/engine/releases/{version}/ombra-engine-{version}-{plat.cdn_name}{plat.archive_ext}"

    server, base_url, requests_seen = _start_static_server(
        {
            "/engine/channels/stable.json": (200, envelope),
            rel_path: (200, archive_path.read_bytes()),
        }
    )
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
        resolved = ensure_binary()
        assert Path(resolved).is_file()
        assert "/engine/channels/stable.json" in requests_seen
        assert rel_path in requests_seen

        info = binary_info()
        assert info["installed"] is True
        assert info["source"] == "cache"
        assert info["version"] == version
        assert info["sha256"] == compute_sha256(Path(resolved))
    finally:
        server.shutdown()


def test_rejects_bad_signature_or_archive_checksum(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    priv = Ed25519PrivateKey.generate()
    other_priv = Ed25519PrivateKey.generate()
    pub_b64 = base64.b64encode(
        priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode("ascii")
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [pub_b64])

    plat = get_platform_info()
    version = "151.0.7922.108-7"
    archive_path, _sha, _size, bad_sig_env = _create_signed_archive(
        tmp_path / "dist_bad_sig", version=version, private_key=other_priv
    )
    server, base_url, _ = _start_static_server({"/engine/channels/stable.json": (200, bad_sig_env)})
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
        with pytest.raises(ChecksumMismatchError):
            ensure_binary()
    finally:
        server.shutdown()

    # Valid signature, corrupted archive bytes -> ChecksumMismatchError
    archive_path2, _sha2, _size2, good_env = _create_signed_archive(
        tmp_path / "dist_bad_hash", version=version, private_key=priv
    )
    rel_path = f"/engine/releases/{version}/ombra-engine-{version}-{plat.cdn_name}{plat.archive_ext}"
    tampered_bytes = b"X" * archive_path2.stat().st_size
    server2, base_url2, _ = _start_static_server(
        {
            "/engine/channels/stable.json": (200, good_env),
            rel_path: (200, tampered_bytes),
        }
    )
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url2)
        with pytest.raises(ChecksumMismatchError):
            ensure_binary()
    finally:
        server2.shutdown()


def test_download_retries_transient_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    priv = Ed25519PrivateKey.generate()
    pub_b64 = base64.b64encode(
        priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode("ascii")
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [pub_b64])
    monkeypatch.setattr("ombrabrowser.binary.time.sleep", lambda _s: None)

    plat = get_platform_info()
    version = "151.0.7922.108-7"
    archive_path, _sha, _size, envelope = _create_signed_archive(
        tmp_path / "dist_retry", version=version, private_key=priv
    )
    rel_path = f"/engine/releases/{version}/ombra-engine-{version}-{plat.cdn_name}{plat.archive_ext}"

    attempts = {"n": 0}

    def flaky_archive():
        attempts["n"] += 1
        if attempts["n"] < 3:
            return 503, b"busy"
        return 200, archive_path.read_bytes()

    server, base_url, _ = _start_static_server(
        {
            "/engine/channels/stable.json": (200, envelope),
            rel_path: (flaky_archive, b""),
        }
    )
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
        resolved = ensure_binary()
        assert Path(resolved).is_file()
        assert attempts["n"] == 3  # initial try + 2 retries
    finally:
        server.shutdown()


def test_download_disabled_raises_binary_not_found():
    with pytest.raises(BinaryNotFoundError) as exc_info:
        resolve_binary(download=False)
    assert exc_info.value.kind == "BinaryNotFound"
    assert "ensure_binary()" in str(exc_info.value)


@pytest.mark.parametrize("pin", ["151.0.7922.108-7", "151.0.7922.108"])
def test_pinned_download_uses_signed_release(tmp_path: Path, monkeypatch, pin):
    private_key = Ed25519PrivateKey.generate()
    public_key = base64.b64encode(
        private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode("ascii")
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [public_key])
    monkeypatch.setenv("OMBRA_AUTO_UPDATE", "true")
    monkeypatch.setenv("OMBRA_VERSION", pin)
    version = "151.0.7922.108-7"
    archive, sha, size, channel = _create_signed_archive(
        tmp_path / "pinned", version=version, private_key=private_key
    )
    release = json.dumps({
        "version": version,
        "platforms": {
            get_platform_info().cdn_name: {"file": archive.name, "sha256": sha, "size": size}
        },
    }, separators=(",", ":"))
    envelope = json.dumps({
        "signed": release,
        "sig": base64.b64encode(private_key.sign(release.encode())).decode(),
    }).encode()
    release_path = f"/engine/releases/{version}/release.json"
    archive_path = f"/engine/releases/{version}/{archive.name}"
    server, base_url, seen = _start_static_server({
        release_path: (200, envelope),
        archive_path: (200, archive.read_bytes()),
        "/engine/channels/stable.json": (200, channel),
    })
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
        path = ensure_binary()
        assert Path(path).is_file()
        assert binary_info()["version"] == version
        if pin == version:
            assert seen == [release_path, archive_path]
        seen.clear()
        assert ensure_binary() == path
        assert seen == []
    finally:
        server.shutdown()


def test_tar_rejects_symlink_chain_escape(tmp_path: Path):
    from ombrabrowser.binary import _safe_extract_tar

    archive = tmp_path / "chain.tar.gz"
    with tarfile.open(archive, "w:gz") as tf:
        for name, target in [("a", "."), ("a/b", "..")]:
            link = tarfile.TarInfo(name)
            link.type = tarfile.SYMTYPE
            link.linkname = target
            tf.addfile(link)
        member = tarfile.TarInfo("a/b/escaped.txt")
        member.size = 4
        tf.addfile(member, io.BytesIO(b"evil"))
    with pytest.raises(ChecksumMismatchError):
        _safe_extract_tar(archive, tmp_path / "extract")
    assert not (tmp_path / "escaped.txt").exists()


def test_auto_update_stays_selected_on_the_next_launch(tmp_path: Path, monkeypatch):
    old_version, new_version = "151.0.7922.108-7", "151.0.7922.108-9"
    engines = tmp_path / "ombra-cache" / "engines"
    make_fake_engine(engines / old_version, version=old_version)
    plat = get_platform_info()
    (engines / f".latest_stable_{plat.cdn_name}").write_text(old_version)
    monkeypatch.setenv("OMBRA_AUTO_UPDATE", "true")
    private_key = Ed25519PrivateKey.generate()
    public_key = base64.b64encode(
        private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode()
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [public_key])
    archive, sha, size, channel = _create_signed_archive(
        tmp_path / "update", version=new_version, private_key=private_key
    )
    release = json.dumps({
        "version": new_version,
        "platforms": {plat.cdn_name: {"file": archive.name, "sha256": sha, "size": size}},
    }, separators=(",", ":"))
    envelope = json.dumps({
        "signed": release,
        "sig": base64.b64encode(private_key.sign(release.encode())).decode(),
    }).encode()
    server, base_url, seen = _start_static_server({
        "/engine/channels/stable.json": (200, channel),
        f"/engine/releases/{new_version}/release.json": (200, envelope),
        f"/engine/releases/{new_version}/{archive.name}": (200, archive.read_bytes()),
    })
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
        assert resolve_binary().version == new_version
        seen.clear()
        assert resolve_binary().version == new_version
        assert seen == []
    finally:
        server.shutdown()


def test_rejects_archive_path_traversal(tmp_path: Path):
    from ombrabrowser.binary import _safe_extract_tar, _safe_extract_zip

    bad_zip = tmp_path / "evil.zip"
    with zipfile.ZipFile(bad_zip, "w") as zf:
        zf.writestr("../escape.txt", "evil")
    with pytest.raises(ChecksumMismatchError):
        _safe_extract_zip(bad_zip, tmp_path / "out_zip")

    bad_tar = tmp_path / "evil.tar.gz"
    with tarfile.open(bad_tar, "w:gz") as tf:
        info = tarfile.TarInfo("../escape.txt")
        data = b"evil"
        info.size = len(data)
        tf.addfile(info, io.BytesIO(data))
    with pytest.raises(ChecksumMismatchError):
        _safe_extract_tar(bad_tar, tmp_path / "out_tar")


def test_clear_cache_preserves_profiles_and_license(tmp_path: Path):
    cache_dir = tmp_path / "ombra-cache"
    make_fake_engine(cache_dir / "engines" / "151.0.7922.108-7")
    profile_file = cache_dir / "profiles" / "pricing-eu" / "Cookies"
    profile_file.parent.mkdir(parents=True, exist_ok=True)
    profile_file.write_text("cookie-data", encoding="utf-8")
    license_file = cache_dir / "license.key"
    license_file.write_text("my-key\n", encoding="utf-8")

    clear_cache()
    assert not (cache_dir / "engines").exists()
    assert profile_file.read_text(encoding="utf-8") == "cookie-data"
    assert license_file.read_text(encoding="utf-8") == "my-key\n"


def test_download_failure_raises_download_failed(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("ombrabrowser.binary.time.sleep", lambda _s: None)
    server, base_url, _ = _start_static_server({})
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
        with pytest.raises(DownloadFailedError):
            ensure_binary()
    finally:
        server.shutdown()


@pytest.fixture
def signed_release(tmp_path, monkeypatch):
    private_key = Ed25519PrivateKey.generate()
    public_key = base64.b64encode(
        private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode()
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [public_key])
    archive, sha, size, envelope = _create_signed_archive(
        tmp_path / "release", version="151.0.7922.108-7", private_key=private_key
    )
    archive_url = f"/engine/releases/151.0.7922.108-7/{archive.name}"
    server, base_url, seen = _start_static_server({
        "/engine/channels/stable.json": (200, envelope),
        archive_url: (200, archive.read_bytes()),
    })
    monkeypatch.setenv("OMBRA_DOWNLOAD_URL", base_url)
    try:
        yield archive, sha, public_key, seen, archive_url
    finally:
        server.shutdown()
        server.server_close()


def _install_process(public_key, attempted, extracting, release, result):
    """Spawned interpreter: real HTTP/signatures, extraction, and OS file locks."""
    from ombrabrowser import binary

    binary.BINARY_SIGNING_PUBKEYS = [public_key]
    original_install = binary._install_archive
    original_extract = (
        binary._safe_extract_zip if get_platform_info().archive_ext == ".zip"
        else binary._safe_extract_tar
    )

    def install(*args):
        attempted.set()
        return original_install(*args)

    def extract(*args):
        extracting.set()
        assert release.wait(15), "parent did not release extraction"
        return original_extract(*args)

    binary._install_archive = install
    if get_platform_info().archive_ext == ".zip":
        binary._safe_extract_zip = extract
    else:
        binary._safe_extract_tar = extract
    try:
        resolved = binary.resolve_binary()
        result.put((str(resolved.path), resolved.path.stat().st_ino, resolved.sha256))
    except Exception as exc:
        result.put(("error", repr(exc)))
        raise


def test_process_installers_converge_without_replacing_peer(signed_release):
    _, _, public_key, _, _ = signed_release
    ctx = multiprocessing.get_context("spawn")
    result = ctx.Queue()
    release = ctx.Event()
    attempted = [ctx.Event(), ctx.Event()]
    extracting = [ctx.Event(), ctx.Event()]
    workers = [ctx.Process(
        target=_install_process,
        args=(public_key, attempted[i], extracting[i], release, result),
    ) for i in range(2)]
    try:
        workers[0].start()
        assert extracting[0].wait(15)
        workers[1].start()
        assert attempted[1].wait(15)
        raced = extracting[1].wait(0.5)
        release.set()
        for worker in workers:
            worker.join(15)
            assert worker.exitcode == 0
        first, second = result.get(timeout=5), result.get(timeout=5)
        assert not raced, "second process extracted while the first owned installation"
        assert first == second, "a completed peer installation was replaced"
        assert resolve_binary(download=False).sha256 == first[2]
    finally:
        release.set()
        for worker in workers:
            if worker.is_alive():
                worker.terminate()
            if worker.pid is not None:
                worker.join(5)
        result.close()


def test_failed_publication_restores_previous_installation(tmp_path, monkeypatch, signed_release):
    from ombrabrowser import binary

    archive, sha, _, _, _ = signed_release
    version = "151.0.7922.108-7"
    destination = tmp_path / "ombra-cache" / "engines" / version
    old_binary = make_fake_engine(destination, version=version)
    old_binary.write_text("incomplete previous installation")
    original_replace = os.replace

    def fail_publication(src, dst):
        if ".partial-" in Path(src).name and Path(dst) == destination:
            raise OSError("injected final-publication error")
        return original_replace(src, dst)

    monkeypatch.setattr(binary.os, "replace", fail_publication)
    with pytest.raises(OSError, match="injected final-publication error"):
        binary._install_archive(archive, version, sha, get_platform_info())
    assert old_binary.is_file(), "previous installation was deleted before publication"
    assert old_binary.read_text() == "incomplete previous installation"


def test_same_version_reinstall_keeps_verified_binary_visible(tmp_path, monkeypatch, signed_release):
    from ombrabrowser import binary

    archive, sha, _, _, _ = signed_release
    version = "151.0.7922.108-7"
    destination = tmp_path / "ombra-cache" / "engines" / version
    old_binary = make_fake_engine(destination, version=version)
    inode = old_binary.stat().st_ino
    original_replace = os.replace
    observed = []

    def observe_replacement(src, dst):
        original_replace(src, dst)
        if Path(src) == destination:
            probe = subprocess.run([
                sys.executable, "-c",
                "from ombrabrowser.binary import resolve_binary; "
                "resolve_binary(version='151.0.7922.108-7', download=False)",
            ], capture_output=True, text=True, timeout=10)
            observed.append(probe.returncode)

    monkeypatch.setattr(binary.os, "replace", observe_replacement)
    assert binary._install_archive(archive, version, sha, get_platform_info()) == old_binary
    assert all(code == 0 for code in observed), "concurrent resolver lost verified installation"
    assert old_binary.stat().st_ino == inode, "valid same-version install must remain immutable"


def test_stable_does_not_select_beta_only_cache(tmp_path, signed_release):
    _, _, _, seen, archive_url = signed_release
    engines = tmp_path / "ombra-cache" / "engines"
    beta = make_fake_engine(
        engines / "151.0.7922.108-9", version="151.0.7922.108-9", channel="beta"
    )
    assert resolve_binary(release_channel="stable").version == "151.0.7922.108-7"
    assert archive_url in seen
    assert resolve_binary(release_channel="beta", download=False).path == beta


@pytest.mark.parametrize("mode", ["download_false", "url_off", "offline"])
def test_beta_only_cache_cannot_satisfy_stable_offline(tmp_path, monkeypatch, mode):
    engines = tmp_path / "ombra-cache" / "engines"
    beta = make_fake_engine(
        engines / "151.0.7922.108-9", version="151.0.7922.108-9", channel="beta"
    )
    kwargs = {"release_channel": "stable"}
    if mode == "download_false":
        kwargs["download"] = False
    elif mode == "url_off":
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", "off")
    else:
        def offline(*args, **kwargs):
            raise DownloadFailedError("offline")
        monkeypatch.setattr("ombrabrowser.binary._http_get_bytes", offline)
        monkeypatch.setattr("ombrabrowser.binary.time.sleep", lambda _: None)
    with pytest.raises(DownloadFailedError if mode == "offline" else BinaryNotFoundError):
        resolve_binary(**kwargs)
    assert resolve_binary(release_channel="beta", download=False).path == beta
    assert resolve_binary(version="151.0.7922.108-9", download=False).path == beta


def test_signed_channel_reuses_cached_release_without_archive(tmp_path, signed_release):
    _, _, _, seen, archive_url = signed_release
    engines = tmp_path / "ombra-cache" / "engines"
    cached = make_fake_engine(
        engines / "151.0.7922.108-7", version="151.0.7922.108-7", channel=None
    )
    inode = cached.stat().st_ino
    # An exact-pin install has no channel evidence until signed metadata assigns it.
    assert resolve_binary(release_channel="stable").path == cached
    assert seen == ["/engine/channels/stable.json"]
    assert archive_url not in seen
    assert cached.stat().st_ino == inode
    assert resolve_binary(release_channel="stable", download=False).path == cached


def test_signed_channel_rejects_serial_rollback(tmp_path, signed_release):
    _, _, _, seen, archive_url = signed_release
    engines = tmp_path / "ombra-cache" / "engines"
    engines.mkdir(parents=True)
    (engines / ".serial_stable").write_text("2")
    with pytest.raises(ChecksumMismatchError, match="serial rollback"):
        resolve_binary(release_channel="stable")
    assert archive_url not in seen
    assert (engines / ".serial_stable").read_text() == "2"


def test_auto_update_failure_retains_verified_channel_cache(tmp_path, monkeypatch):
    version = "151.0.7922.108-7"
    engine = make_fake_engine(tmp_path / "ombra-cache" / "engines" / version, version=version)
    monkeypatch.setenv("OMBRA_AUTO_UPDATE", "true")

    def offline(*args, **kwargs):
        raise DownloadFailedError("offline")

    monkeypatch.setattr("ombrabrowser.binary._http_get_bytes", offline)
    assert resolve_binary().path == engine
    assert resolve_binary(download=False).path == engine
