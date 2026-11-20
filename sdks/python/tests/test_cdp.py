"""Tests for Ombra's custom browser-level ``Ombra`` CDP domain (humanize and agent)."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ombrabrowser import (
    InvalidOptionError,
    launch_async,
    launch_context,
    launch_persistent_context,
    ombra_cdp,
    ombra_cdp_async,
)
from ombrabrowser.cdp import OmbraCDP
from tests.test_launch import _write_fake_engine_server


class FakeCDPSession:
    """In-memory mock of Playwright's browser-level CDPSession."""

    def __init__(self) -> None:
        self.listeners: dict[str, list[Any]] = {}
        self.sent: list[tuple[str, dict[str, Any] | None]] = []
        self.detached = False

    def on(self, event: str, handler: Any) -> None:
        self.listeners.setdefault(event, []).append(handler)

    def remove_listener(self, event: str, handler: Any) -> None:
        if event in self.listeners and handler in self.listeners[event]:
            self.listeners[event].remove(handler)

    def emit(self, event: str, params: dict[str, Any]) -> None:
        for fn in list(self.listeners.get(event, ())):
            fn(params)

    def send(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self.sent.append((method, params))
        if method == "Ombra.getHumanizeState":
            return {"state": {"enabled": True, "preset": "default", "seed": "48213"}}
        if method == "Ombra.setHumanize":
            return {"state": {"enabled": params.get("enabled", True), "preset": params.get("preset", "default")}}
        if method == "Browser.agentRunTask":
            return {"success": True, "finalText": "done", "stepsJson": "[]"}
        if method == "Browser.getVersion":
            return {"product": "Chrome/151.0.7922.108"}
        return {}

    def detach(self) -> None:
        self.detached = True


class AsyncFakeCDPSession(FakeCDPSession):
    async def send(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:  # type: ignore[override]
        return super().send(method, params)

    async def detach(self) -> None:  # type: ignore[override]
        self.detached = True


def test_browser_cdp_events_stop_after_unsubscribe():
    session = FakeCDPSession()
    fake_browser = MagicMock()
    fake_browser.new_browser_cdp_session.return_value = session

    received: list[dict[str, Any]] = []
    with ombra_cdp(fake_browser) as cdp:
        assert isinstance(cdp, OmbraCDP)
        assert session.sent == []
        unsubscribe = cdp.on("Target.targetCreated", received.append)
        session.emit("Target.targetCreated", {"targetId": "first"})
        unsubscribe()
        session.emit("Target.targetCreated", {"targetId": "second"})
        assert received == [{"targetId": "first"}]
    assert session.detached is True


def test_attaches_browser_cdp_session_from_context_and_persistent_context(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_cdp", behavior="ready")
    session = FakeCDPSession()

    fake_browser = MagicMock()
    fake_browser.new_browser_cdp_session.return_value = session
    fake_ctx = MagicMock()
    # Simulate a BrowserContext whose .browser is None to verify _CONTEXT_TO_BROWSER tracking!
    fake_ctx.browser = None
    fake_browser.new_context.return_value = fake_ctx
    fake_browser.contexts = [fake_ctx]

    pw = MagicMock()
    pw.chromium.connect_over_cdp.return_value = fake_browser
    pw_cm = MagicMock()
    pw_cm.start.return_value = pw

    with patch("playwright.sync_api.sync_playwright", return_value=pw_cm):
        ctx = launch_context(binary_path=exe)
        try:
            with ombra_cdp(ctx) as cdp:
                assert cdp.get_humanize_state()["preset"] == "default"
                # Must never call context.new_cdp_session (page-level session lacks Ombra domain)
                fake_ctx.new_cdp_session.assert_not_called()
        finally:
            ctx.close()

        pctx = launch_persistent_context(profile="cdp-persist", binary_path=exe)
        try:
            with ombra_cdp(pctx) as cdp:
                assert cdp.agent_run_task(target_id="TAB1", goal="Click submit")["success"] is True
        finally:
            pctx.close()

    with pytest.raises(InvalidOptionError):
        ombra_cdp(object())


def test_sync_humanize_and_agent_commands():
    session = FakeCDPSession()
    fake_browser = MagicMock()
    fake_browser.new_browser_cdp_session.return_value = session

    with ombra_cdp(fake_browser) as cdp:
        assert cdp.get_humanize_state()["preset"] == "default"
        assert cdp.set_humanize(enabled=False, preset="careful")["preset"] == "careful"
        with pytest.raises(InvalidOptionError):
            cdp.set_humanize(preset="invalid-preset")

        agent_res = cdp.agent_run_task(target_id="T1", goal="Click submit", max_steps=5)
        assert agent_res["success"] is True


def test_async_ombra_cdp_context_and_commands(tmp_path: Path):
    exe = _write_fake_engine_server(tmp_path / "engine_async_cdp", behavior="ready")

    async def run() -> None:
        session = AsyncFakeCDPSession()
        fake_browser = AsyncMock()
        fake_browser.on = MagicMock()
        fake_browser.new_context = AsyncMock()
        fake_browser.new_page = AsyncMock()
        fake_browser.new_browser_cdp_session = AsyncMock(return_value=session)

        pw = AsyncMock()
        pw.chromium.connect_over_cdp.return_value = fake_browser
        pw_cm = MagicMock()
        pw_cm.start = AsyncMock(return_value=pw)

        with patch("playwright.async_api.async_playwright", return_value=pw_cm):
            browser = await launch_async(binary_path=exe)
            try:
                async with ombra_cdp_async(browser) as cdp:
                    state = await cdp.get_humanize_state()
                    assert state["preset"] == "default"
                    updated = await cdp.set_humanize(enabled=False, preset="careful")
                    assert updated["enabled"] is False
                    assert updated["preset"] == "careful"
                    result = await cdp.agent_run_task(target_id="T9", goal="Click submit")
                    assert result["success"] is True
                assert session.detached is True
            finally:
                await browser.close()

    asyncio.run(run())
