"""Canonical engine names coexist with immutable, verified historical caches."""
import base64
import json
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from ombrabrowser import binary_info, ensure_binary
from ombrabrowser.binary import resolve_binary
from ombrabrowser.config import binary_relative_path, get_platform_info
from ombrabrowser.errors import ChecksumMismatchError
from tests.conftest import make_fake_engine
from tests.test_binary import _create_signed_archive, _start_static_server


@pytest.mark.parametrize("system,relative", [("Darwin", "Ombra.app/Contents/MacOS/Ombra"), ("Windows", "ombra.exe"), ("Linux", "ombra")])
def test_canonical_relative_path(system, relative):
    assert binary_relative_path(system) == Path(relative)


@pytest.mark.parametrize("layout", ["legacy", "ombra", "hybrid"])
def test_verified_cache_layout_is_preserved(tmp_path, layout):
    if layout == "hybrid" and get_platform_info().system != "Darwin":
        pytest.skip("historical DMG layout is macOS only")
    version = "158.0.8127.37-3" if layout == "ombra" else "158.0.8127.37-2"
    root = tmp_path / "ombra-cache/engines" / version
    binary = make_fake_engine(root, version=version, layout=layout)
    inode = binary.stat().st_ino
    receipt = (root / "binary.sha256").read_bytes()
    assert resolve_binary(version=version, download=False).path == binary
    assert binary.stat().st_ino == inode
    assert (root / "binary.sha256").read_bytes() == receipt


def test_signed_native_download_is_reused_offline(tmp_path, monkeypatch):
    key = Ed25519PrivateKey.generate()
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [base64.b64encode(key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)).decode()])
    version = "158.0.8127.37-3"
    archive, _, _, envelope = _create_signed_archive(tmp_path / "release", version=version, private_key=key, layout="ombra")
    archive_url = f"/engine/releases/{version}/{archive.name}"
    server, url, requests = _start_static_server({"/engine/channels/stable.json": (200, envelope), archive_url: (200, archive.read_bytes())})
    try:
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", url)
        binary = Path(ensure_binary())
        assert binary.name == binary_relative_path().name
        inode = binary.stat().st_ino
        monkeypatch.setenv("OMBRA_DOWNLOAD_URL", "off")
        assert Path(ensure_binary(version=version)) == binary
        assert binary.stat().st_ino == inode
        assert requests.count(archive_url) == 1
    finally:
        server.shutdown()
        server.server_close()


def test_conflicting_executables_are_refused(tmp_path):
    version = "158.0.8127.37-3"
    root = tmp_path / "ombra-cache/engines" / version
    make_fake_engine(root, version=version, layout="legacy")
    make_fake_engine(root, version=version, layout="ombra")
    with pytest.raises(ChecksumMismatchError, match="[Aa]mbiguous.*executable"):
        resolve_binary(version=version, download=False)
    assert not binary_info(version=version)["installed"]


def test_conflicting_build_metadata_is_refused(tmp_path):
    version = "158.0.8127.37-3"
    root = tmp_path / "ombra-cache/engines" / version
    binary = make_fake_engine(root, version=version, layout="ombra")
    app = binary.parents[2] if get_platform_info().system == "Darwin" else root
    duplicate = app / ("ombra-build.json" if get_platform_info().system == "Darwin" else "Contents/Resources/ombra-build.json")
    duplicate.parent.mkdir(parents=True, exist_ok=True)
    duplicate.write_text(json.dumps({"version": "158.0.8127.37-2"}))
    with pytest.raises(ChecksumMismatchError, match="[Cc]onflicting.*metadata"):
        resolve_binary(version=version, download=False)
