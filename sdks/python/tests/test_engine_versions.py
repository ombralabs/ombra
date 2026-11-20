"""Engine pins must select the requested release through every public launcher."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ombrabrowser import (
    build_launch_options,
    last_launch_info,
    launch,
    launch_async,
    launch_context,
    launch_context_async,
    launch_persistent_context,
    launch_persistent_context_async,
)
from ombrabrowser.binary import resolve_binary
from ombrabrowser.config import normalize_requested_version
from ombrabrowser.errors import InvalidOptionError, UnsupportedEngineError
from tests.conftest import make_fake_engine
from tests.test_launch import _write_fake_engine_server


@pytest.mark.parametrize("version", [7, True, [], {}, "latest", "../../engine"])
def test_invalid_version_pin_raises_typed_error(version):
    with pytest.raises(InvalidOptionError):
        normalize_requested_version(version)


@pytest.mark.parametrize("source", ["argument", "env", "cache"])
def test_version_pin_rejects_mismatching_binary(tmp_path: Path, monkeypatch, source):
    directory = (
        tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7"
        if source == "cache" else tmp_path / "explicit-engine"
    )
    binary = make_fake_engine(directory, version="151.0.7922.108-9")
    if source == "env":
        monkeypatch.setenv("OMBRA_BINARY_PATH", str(binary))
    with pytest.raises(UnsupportedEngineError, match="151.0.7922.108-7"):
        resolve_binary(
            version="151.0.7922.108-7",
            binary_path=binary if source == "argument" else None,
            download=False,
        )


def test_build_launch_options_honors_explicit_pin_over_environment(tmp_path: Path, monkeypatch):
    for version in ["151.0.7922.108-7", "151.0.7922.108-9"]:
        make_fake_engine(tmp_path / "ombra-cache" / "engines" / version, version=version)
    monkeypatch.setenv("OMBRA_VERSION", "151.0.7922.108-9")
    result = build_launch_options(version="151.0.7922.108-7", download=False)
    assert result["engine_version"] == "151.0.7922.108-7"
    assert "151.0.7922.108-7" in result["binary_path"]


@pytest.mark.parametrize("launcher", [launch, launch_context, launch_persistent_context])
def test_sync_launch_helpers_honor_version_pin(tmp_path: Path, monkeypatch, launcher):
    _write_fake_engine_server(
        tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7",
        version="151.0.7922.108-7",
    )
    monkeypatch.setenv("OMBRA_VERSION", "151.0.7922.108-9")
    browser = MagicMock()
    browser.contexts = [MagicMock()]
    pw = MagicMock()
    pw.chromium.connect_over_cdp.return_value = browser
    manager = MagicMock()
    manager.start.return_value = pw
    with patch("playwright.sync_api.sync_playwright", return_value=manager):
        result = launcher(version="151.0.7922.108-7", profile="pinned", download=False)
        try:
            assert last_launch_info(result)["engine_version"] == "151.0.7922.108-7"
        finally:
            result.close()


@pytest.mark.parametrize(
    "launcher", [launch_async, launch_context_async, launch_persistent_context_async]
)
def test_async_launch_helpers_honor_version_pin(tmp_path: Path, monkeypatch, launcher):
    _write_fake_engine_server(
        tmp_path / "ombra-cache" / "engines" / "151.0.7922.108-7",
        version="151.0.7922.108-7",
    )
    monkeypatch.setenv("OMBRA_VERSION", "151.0.7922.108-9")

    async def run():
        browser = AsyncMock()
        browser.on = MagicMock()
        browser.contexts = [AsyncMock()]
        pw = AsyncMock()
        pw.chromium.connect_over_cdp.return_value = browser
        manager = MagicMock()
        manager.start = AsyncMock(return_value=pw)
        with patch("playwright.async_api.async_playwright", return_value=manager):
            result = await launcher(version="151.0.7922.108-7", profile="pinned", download=False)
            try:
                assert last_launch_info(result)["engine_version"] == "151.0.7922.108-7"
            finally:
                await result.close()

    asyncio.run(run())
