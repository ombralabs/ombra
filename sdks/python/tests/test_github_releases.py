"""GitHub release selection, signed assets, and offline channel evidence."""

from __future__ import annotations

import base64
import json
from pathlib import Path

import httpx
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from ombrabrowser import binary_info, ensure_binary
from ombrabrowser.binary import resolve_binary
from ombrabrowser.config import get_platform_info
from ombrabrowser.errors import BinaryNotFoundError, ChecksumMismatchError, DownloadFailedError
from tests.conftest import make_fake_engine
from tests.test_binary import _create_signed_archive

API = "https://api.github.com/repos/ombralabs/ombra/releases"
DOWNLOAD = "https://github.com/ombralabs/ombra/releases/download"


@pytest.fixture
def github(tmp_path, monkeypatch):
    """Keep the real HTTP, signature, archive, and cache code; replace the network."""
    private_key = Ed25519PrivateKey.generate()
    public_key = base64.b64encode(
        private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).decode()
    monkeypatch.setattr("ombrabrowser.binary.BINARY_SIGNING_PUBKEYS", [public_key])
    monkeypatch.setattr("ombrabrowser.binary.time.sleep", lambda _: None)
    routes = {}
    seen = []

    def request(req):
        url = str(req.url)
        seen.append(url)
        body = routes.get(url)
        if body is None:
            return httpx.Response(404)
        if isinstance(body, tuple):
            return httpx.Response(body[0], json=body[1])
        if isinstance(body, bytes):
            return httpx.Response(200, content=body)
        return httpx.Response(200, json=body)

    def sign(payload):
        signed = json.dumps(payload, separators=(",", ":"))
        return json.dumps({
            "signed": signed,
            "sig": base64.b64encode(private_key.sign(signed.encode())).decode(),
        }).encode()

    def publish(version="151.0.7922.108-7", *, prerelease=False):
        archive, sha, size, _ = _create_signed_archive(
            tmp_path / f"release-{version}", version=version, private_key=private_key
        )
        root = f"{DOWNLOAD}/v{version}"
        manifest = {
            "version": version,
            "platforms": {
                get_platform_info().cdn_name: {"file": archive.name, "sha256": sha, "size": size}
            },
        }
        envelope = sign(manifest)
        release = {
            "id": len(routes) + 1,
            "tag_name": f"v{version}",
            "name": f"Ombra {version}",
            "draft": False,
            "prerelease": prerelease,
            "assets": [
                {"name": "release.json", "browser_download_url": f"{root}/release.json",
                 "size": len(envelope), "state": "uploaded"},
                {"name": archive.name, "browser_download_url": f"{root}/{archive.name}",
                 "size": size, "state": "uploaded"},
            ],
        }
        routes[f"{root}/release.json"] = envelope
        routes[f"{root}/{archive.name}"] = archive.read_bytes()
        routes[f"{API}/tags/v{version}"] = release
        return release, manifest

    with httpx.Client(transport=httpx.MockTransport(request)) as client:
        monkeypatch.setattr(httpx, "get", client.get)
        monkeypatch.setattr(httpx, "stream", client.stream)
        yield routes, seen, publish, sign


@pytest.mark.parametrize("channel", ["stable", "beta"])
@pytest.mark.parametrize("pin", [None, "158.0.8127.37", "158.0.8127.37-2"])
def test_chromium_158_github_download_and_offline_reuse(github, monkeypatch, channel, pin):
    routes, seen, publish, _ = github
    release, _ = publish("158.0.8127.37-2", prerelease=channel == "beta")
    routes[f"{API}/latest"] = release
    routes[f"{API}?per_page=100&page=1"] = [release]
    path = ensure_binary(version=pin, release_channel=channel)
    assert binary_info(version=pin, release_channel=channel)["version"] == "158.0.8127.37-2"
    routes.clear()
    seen.clear()
    monkeypatch.setenv("OMBRA_DOWNLOAD_URL", "off")
    assert resolve_binary(version=pin, release_channel=channel, download=False).path == Path(path)
    assert seen == []


def test_default_latest_download_verifies_github_assets_and_works_offline(github, monkeypatch):
    routes, seen, publish, _ = github
    release, _ = publish()
    routes[f"{API}/latest"] = release
    path = ensure_binary()
    assert Path(path).is_file()
    assert seen == [f"{API}/latest", *[a["browser_download_url"] for a in release["assets"]]]
    assert binary_info()["version"] == "151.0.7922.108-7"
    seen.clear()
    routes.clear()
    monkeypatch.setenv("OMBRA_DOWNLOAD_URL", "off")
    assert ensure_binary() == path
    assert resolve_binary(download=False).path == Path(path)
    assert seen == []


def test_exact_pin_uses_tag_without_granting_stable_channel_membership(github):
    routes, seen, publish, _ = github
    release, _ = publish(prerelease=True)
    path = ensure_binary(version="151.0.7922.108-7")
    assert Path(path).is_file()
    assert seen == [f"{API}/tags/v151.0.7922.108-7",
                    *[a["browser_download_url"] for a in release["assets"]]]
    routes.clear()
    seen.clear()
    assert ensure_binary(version="151.0.7922.108-7") == path
    with pytest.raises(BinaryNotFoundError):
        resolve_binary(download=False)
    assert seen == []


def test_latest_skips_desktop_and_beta_releases(github):
    routes, _, publish, _ = github
    stable, _ = publish()
    beta, _ = publish("151.0.7922.108-9", prerelease=True)
    desktop = {**stable, "tag_name": "desktop-v0.5.0"}
    dev = {**stable, "tag_name": "v151.0.7922.108-0+dev.abc"}
    draft = {**stable, "draft": True}
    routes[f"{API}/latest"] = desktop
    routes[f"{API}?per_page=100&page=1"] = [desktop, beta, dev, draft, stable]
    assert resolve_binary().version == "151.0.7922.108-7"


def test_beta_channel_cache_cannot_be_reused_as_stable(github, monkeypatch):
    routes, seen, publish, _ = github
    beta, _ = publish("151.0.7922.108-9", prerelease=True)
    stable, _ = publish()
    routes[f"{API}/latest"] = stable
    routes[f"{API}?per_page=100&page=1"] = [stable, beta]
    assert resolve_binary(release_channel="beta").version == "151.0.7922.108-9"
    with pytest.raises(BinaryNotFoundError):
        resolve_binary(download=False)
    assert resolve_binary().version == "151.0.7922.108-7"
    routes.clear()
    seen.clear()
    monkeypatch.setenv("OMBRA_DOWNLOAD_URL", "off")
    assert resolve_binary(release_channel="beta").version == "151.0.7922.108-9"
    assert resolve_binary().version == "151.0.7922.108-7"
    assert seen == []


def test_chromium_pin_finds_matching_channel_release(github):
    routes, _, publish, _ = github
    stable, _ = publish()
    newer, _ = publish("151.0.7922.109-1")
    beta, _ = publish("151.0.7922.108-9", prerelease=True)
    routes[f"{API}?per_page=100&page=1"] = [newer, beta, stable]
    assert resolve_binary(version="151.0.7922.108").version == "151.0.7922.108-7"


def test_release_list_is_paginated_and_empty_has_no_cdn_fallback(github):
    routes, seen, publish, _ = github
    beta, _ = publish(prerelease=True)
    routes[f"{API}?per_page=100&page=1"] = [{**beta, "prerelease": False}] * 100
    routes[f"{API}?per_page=100&page=2"] = [beta]
    assert resolve_binary(release_channel="beta").version == "151.0.7922.108-7"
    assert f"{API}?per_page=100&page=2" in seen
    routes[f"{API}?per_page=100&page=1"] = []
    with pytest.raises(DownloadFailedError):
        resolve_binary()
    assert all(url.startswith((API, DOWNLOAD)) for url in seen)


@pytest.mark.parametrize("defect", ["signature", "version", "filename", "size", "hash",
                                    "asset_url", "asset_size", "draft", "tag"])
def test_rejects_untrusted_release_metadata_and_archives(github, tmp_path, defect):
    routes, seen, publish, sign = github
    release, manifest = publish()
    entry = manifest["platforms"][get_platform_info().cdn_name]
    if defect == "signature":
        raw = json.loads(routes[release["assets"][0]["browser_download_url"]])
        raw["sig"] = base64.b64encode(b"x" * 64).decode()
        routes[release["assets"][0]["browser_download_url"]] = json.dumps(raw).encode()
    elif defect == "asset_url":
        release["assets"][1]["browser_download_url"] = "https://mirror.invalid/browser.tar.gz"
    elif defect == "asset_size":
        release["assets"][1]["size"] += 1
    elif defect == "draft":
        release["draft"] = True
    elif defect == "tag":
        release["tag_name"] = "v151.0.7922.108-8"
    else:
        if defect == "version":
            manifest["version"] = "151.0.7922.108-8"
        elif defect == "filename":
            entry["file"] = "../browser.tar.gz"
        elif defect == "size":
            entry["size"] = 0
        else:
            entry["sha256"] = "0" * 64
        routes[release["assets"][0]["browser_download_url"]] = sign(manifest)
    with pytest.raises(ChecksumMismatchError):
        ensure_binary(version="151.0.7922.108-7")
    assert binary_info(version="151.0.7922.108-7")["installed"] is False
    assert not (tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7").exists()
    assert all(url.startswith((API, DOWNLOAD)) for url in seen)


def test_legacy_plain_channel_marker_requires_github_revalidation(github, tmp_path):
    routes, seen, publish, _ = github
    cached = make_fake_engine(
        tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7",
        version="151.0.7922.108-7", channel=None,
    )
    plat = get_platform_info()
    (tmp_path / "ombra-cache" / "engines" / f".latest_stable_{plat.cdn_name}").write_text(
        "151.0.7922.108-7"
    )
    with pytest.raises(BinaryNotFoundError):
        resolve_binary(download=False)
    release, _ = publish()
    routes[f"{API}/latest"] = release
    assert resolve_binary().path == cached
    assert seen == [f"{API}/latest", release["assets"][0]["browser_download_url"]]
    assert resolve_binary(download=False).path == cached


@pytest.mark.parametrize("defect", ["source", "channel", "signature", "prerelease", "asset_size"])
def test_offline_channel_cache_revalidates_signed_github_evidence(github, tmp_path, defect):
    routes, seen, publish, _ = github
    release, _ = publish()
    routes[f"{API}/latest"] = release
    ensure_binary()
    plat = get_platform_info()
    marker = tmp_path / "ombra-cache" / "engines" / f".latest_github_stable_{plat.cdn_name}"
    evidence = json.loads(marker.read_text())
    if defect == "source":
        evidence["source"] = "https://mirror.invalid"
    elif defect == "channel":
        evidence["channel"] = "beta"
    elif defect == "prerelease":
        evidence["release"]["prerelease"] = True
    elif defect == "asset_size":
        evidence["release"]["assets"][1]["size"] += 1
    else:
        envelope = json.loads(evidence["envelope"])
        envelope["sig"] = base64.b64encode(b"x" * 64).decode()
        evidence["envelope"] = json.dumps(envelope)
    marker.write_text(json.dumps(evidence))
    seen.clear()
    with pytest.raises(BinaryNotFoundError):
        resolve_binary(download=False)
    assert resolve_binary(version="151.0.7922.108-7", download=False).installed
    assert seen == []


@pytest.mark.parametrize("extra", [-1, 1])
def test_github_archive_download_enforces_signed_byte_count(github, extra):
    routes, _, publish, _ = github
    release, _ = publish()
    url = release["assets"][1]["browser_download_url"]
    original = routes[url]
    routes[url] = original[:-1] if extra < 0 else original + b"x"
    with pytest.raises(ChecksumMismatchError, match="size|exceeded"):
        ensure_binary(version="151.0.7922.108-7")


def test_auto_update_persists_github_channel_evidence_for_next_launch(github):
    routes, seen, publish, _ = github
    old, _ = publish()
    routes[f"{API}/latest"] = old
    ensure_binary()
    new, _ = publish("151.0.7922.108-9")
    routes[f"{API}/latest"] = new
    assert resolve_binary(force_update_check=True).version == "151.0.7922.108-9"
    routes.clear()
    seen.clear()
    assert resolve_binary(download=False).version == "151.0.7922.108-9"
    assert seen == []


@pytest.mark.parametrize("status", [403, 429])
def test_github_rate_limit_raises_without_another_download_source(github, status):
    routes, seen, _, _ = github
    routes[f"{API}/latest"] = (status, {"message": "API rate limit exceeded"})
    with pytest.raises(DownloadFailedError):
        ensure_binary()
    assert seen == [f"{API}/latest"] * 3
