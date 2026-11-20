"""Tests for Ombra's custom browser-level ``Ombra`` CDP domain (CAPTCHA, humanize, agent)."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from ombrabrowser import (
    CAPTCHA_EVENTS,
    InvalidOptionError,
    launch_async,
    launch_context,
    launch_persistent_context,
    ombra_cdp,
    ombra_cdp_async,
)
from ombrabrowser.captcha import OmbraCDP
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
        if method == "Ombra.getCaptchaState":
            return {
                "state": {
                    "policy": {"enabled": True, "types": None, "timeBudgetMs": 50000, "maxAttempts": 3},
                    "captchas": [{"id": 1, "vendor": "turnstile", "state": "ready"}],
                    "signaturesVersion": "2026.11.01",
                }
            }
        if method == "Ombra.setCaptchaPolicy":
            return {"state": {"policy": params["policy"], "captchas": [], "signaturesVersion": "1"}}
        if method == "Ombra.solveCaptcha":
            return {"count": 2}
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


def test_all_nine_custom_captcha_events_stream_without_enable():
    assert CAPTCHA_EVENTS == (
        "captchaDetected",
        "captchaStateChanged",
        "captchaInvisible",
        "captchaBlocked",
        "captchaHardMode",
        "captchaGone",
        "captchaSolving",
        "captchaSolved",
        "captchaFailed",
    )

    session = FakeCDPSession()
    fake_browser = MagicMock()
    fake_browser.new_browser_cdp_session.return_value = session

    received: list[dict[str, Any]] = []
    with ombra_cdp(fake_browser) as cdp:
        assert isinstance(cdp, OmbraCDP)
        # Never sends Ombra.enable or Runtime.enable on attach!
        assert session.sent == []

        unsub = cdp.on_captcha(received.append)
        for idx, short_name in enumerate(CAPTCHA_EVENTS):
            if short_name == "captchaBlocked":
                session.emit(
                    f"Ombra.{short_name}",
                    {
                        "targetId": "T1",
                        "frameId": "F1",
                        "pageUrl": "https://example.com",
                        "vendor": "datadome",
                        "reason": "block-page",
                        "diagnosis": {"humanization": "on"},
                    },
                )
            else:
                session.emit(
                    f"Ombra.{short_name}",
                    {"captcha": {"id": idx, "vendor": "recaptcha", "state": "ready"}},
                )

        assert [e["event"] for e in received] == list(CAPTCHA_EVENTS)
        assert received[0]["cdp_event"] == "Ombra.captchaDetected"
        assert received[3]["vendor"] == "datadome"

        unsub()
        session.emit("Ombra.captchaSolved", {"captcha": {"id": 99}})
        assert len(received) == 9

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
        ctx = launch_context(binary_path=exe, captcha={"solve": False})
        try:
            with ombra_cdp(ctx) as cdp:
                state = cdp.get_captcha_state()
                assert state["captchas"][0]["vendor"] == "turnstile"
                # Must never call context.new_cdp_session (page-level session lacks Ombra domain)
                fake_ctx.new_cdp_session.assert_not_called()
        finally:
            ctx.close()

        pctx = launch_persistent_context(profile="cdp-persist", binary_path=exe, captcha=True)
        try:
            with ombra_cdp(pctx) as cdp:
                assert cdp.solve_captcha(target_id="TAB1", captcha_id=0) == 2
        finally:
            pctx.close()

    with pytest.raises(InvalidOptionError):
        ombra_cdp(object())


def test_sync_recorder_wait_for_pumps_page_and_commands():
    session = FakeCDPSession()
    fake_page = MagicMock()
    ticks = {"n": 0}

    def pump(_ms: int) -> None:
        ticks["n"] += 1
        if ticks["n"] == 2:
            session.emit(
                "Ombra.captchaSolved",
                {
                    "captcha": {"id": 1, "vendor": "turnstile", "state": "solved"},
                    "durationMs": 412.5,
                    "attempts": 1,
                    "rounds": 1,
                    "strategy": "behavioral",
                },
            )

    fake_page.wait_for_timeout.side_effect = pump
    fake_ctx = MagicMock()
    fake_ctx.pages = [fake_page]
    fake_browser = MagicMock()
    fake_browser.contexts = [fake_ctx]
    fake_browser.new_browser_cdp_session.return_value = session

    with ombra_cdp(fake_browser) as cdp:
        with cdp.record_captcha_events() as rec:
            solved = rec.wait_for(("captchaSolved", "captchaFailed"), timeout_ms=1000)
            assert solved["event"] == "captchaSolved"
            assert solved["strategy"] == "behavioral"
            assert fake_page.wait_for_timeout.call_count == 2

            with pytest.raises(TimeoutError):
                rec.wait_for("captchaBlocked", timeout_ms=30)

        # Commands: set_captcha_policy (snake_case -> camelCase), solve_captcha, humanize, agent
        updated = cdp.set_captcha_policy(
            solve=False,
            types=["checkbox", "image-grid-9"],
            time_budget_ms=25_000,
            max_attempts=4,
            allow_llm=True,
            manual_mode=True,
            manual_resume_ms=5_000,
        )
        assert updated["policy"] == {
            "enabled": False,
            "types": ["checkbox", "image-grid-9"],
            "timeBudgetMs": 25_000,
            "maxAttempts": 4,
            "allowLLM": True,
            "manualMode": True,
            "manualResumeMs": 5_000,
        }

        with pytest.raises(InvalidOptionError):
            cdp.set_captcha_policy(solve=True, enabled=False)

        assert cdp.get_humanize_state()["preset"] == "default"
        assert cdp.set_humanize(enabled=False, preset="careful")["preset"] == "careful"
        with pytest.raises(InvalidOptionError):
            cdp.set_humanize(preset="invalid-preset")

        agent_res = cdp.agent_run_task(target_id="T1", goal="Click submit", max_steps=5)
        assert agent_res["success"] is True


def test_async_ombra_cdp_context_and_recorder(tmp_path: Path):
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
            browser = await launch_async(binary_path=exe, captcha=True)
            try:
                async with ombra_cdp_async(browser) as cdp:
                    async with cdp.record_captcha_events() as rec:
                        asyncio.get_running_loop().call_later(
                            0.02,
                            session.emit,
                            "Ombra.captchaDetected",
                            {"captcha": {"id": 7, "vendor": "geetest", "variant": "v4"}},
                        )
                        ev = await rec.wait_for("captchaDetected", timeout_ms=2000)
                        assert ev["captcha"]["vendor"] == "geetest"

                    st = await cdp.get_captcha_state()
                    assert st["signaturesVersion"] == "2026.11.01"
                    cnt = await cdp.solve_captcha(target_id="T9")
                    assert cnt == 2
                assert session.detached is True
            finally:
                await browser.close()

    asyncio.run(run())
