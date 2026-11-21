"""Tests for the `ombrabrowser` CLI commands."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ombrabrowser.__main__ import main
from ombrabrowser.config import resolve_license_key
from tests.conftest import make_fake_engine


def test_cli_info_json(tmp_path: Path, capsys: pytest.CaptureFixture[str]):
    exe = make_fake_engine(tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7")
    main(["info", "--quick", "--json"])
    out = json.loads(capsys.readouterr().out)
    assert out["binary"]["installed"] is True
    assert out["binary"]["path"] == str(exe)
    assert out["sdk"]["contract"] == "0.2.0"


def test_cli_login_logout_and_clear_cache(tmp_path: Path, capsys: pytest.CaptureFixture[str]):
    cache_dir = tmp_path / "ombra-cache"
    make_fake_engine(cache_dir / "engines" / "151.0.7922.108-7")
    profile_dir = cache_dir / "profiles" / "keep-me"
    profile_dir.mkdir(parents=True, exist_ok=True)
    (profile_dir / "data.txt").write_text("ok", encoding="utf-8")

    main(["login", "test-license-key-123"])
    key_file = cache_dir / "license.key"
    assert key_file.read_text(encoding="utf-8") == "test-license-key-123\n"
    capsys.readouterr()

    main(["clear-cache"])
    assert not (cache_dir / "engines").exists()
    assert (profile_dir / "data.txt").exists()
    assert key_file.exists()

    main(["logout"])
    assert not key_file.exists()


@pytest.mark.parametrize("saved_locations", [("cache",), ("home",), ("cache", "home")])
@pytest.mark.parametrize("env_key", [None, "fake-env-license-key"])
def test_cli_logout_removes_all_resolvable_saved_keys(
    saved_locations: tuple[str, ...], env_key: str | None,
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
):
    paths = {
        "cache": tmp_path / "custom-cache" / "license.key",
        "home": Path.home() / ".ombra" / "license.key",
    }
    monkeypatch.setenv("OMBRA_CACHE_DIR", str(paths["cache"].parent))
    for location in saved_locations:
        path = paths[location]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"fake-{location}-license-key\n", encoding="utf-8")
    unrelated = paths[saved_locations[0]].with_name("keep.txt")
    unrelated.write_text("keep", encoding="utf-8")
    assert resolve_license_key() == (f"fake-{saved_locations[0]}-license-key", "file")
    if env_key is not None:
        monkeypatch.setenv("OMBRA_LICENSE_KEY", env_key)

    main(["logout"])

    assert all(not path.exists() for path in paths.values())
    assert unrelated.read_text(encoding="utf-8") == "keep"
    assert resolve_license_key() == ((env_key, "env") if env_key else (None, "none"))
    output = capsys.readouterr()
    assert "fake-" not in output.out + output.err


def test_cli_logout_with_default_cache_and_no_saved_keys(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
):
    monkeypatch.delenv("OMBRA_CACHE_DIR")
    main(["login", "fake-saved-license-key"])
    key_path = Path.home() / ".ombra" / "license.key"
    assert key_path.exists()
    capsys.readouterr()

    main(["logout"])
    assert not key_path.exists()
    assert resolve_license_key() == (None, "none")
    assert capsys.readouterr().out.count("Removed ") == 1

    main(["logout"])
    assert "No saved license key found" in capsys.readouterr().out
