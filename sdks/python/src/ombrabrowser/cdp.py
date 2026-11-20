"""Browser-level CDP bridge for Ombra's custom ``Ombra`` and ``Browser`` domains.

Ombra Chromium registers its custom ``Ombra`` CDP domain (``Ombra.pdl``, patches 135 & 970)
exclusively on **browser-level** CDP sessions (``browser.new_browser_cdp_session()``), not on
page/frame sessions (``context.new_cdp_session(page)``). All 9 CAPTCHA events stream to every
browser session automatically without calling an ``enable`` command.

This module provides lightweight sync/async helpers that attach to a browser-level CDP session
from either a ``Browser`` or ``BrowserContext`` without wrapping Playwright's native objects.
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from collections.abc import Callable, Collection, Generator
from typing import Any, TypedDict

from .errors import InvalidOptionError
from .launcher import resolve_browser_handle
from .options import normalize_captcha_policy_patch

CAPTCHA_EVENTS: tuple[str, ...] = (
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

_HUMANIZE_PRESETS = frozenset({"default", "careful", "fast"})


class CaptchaBBox(TypedDict):
    x: float
    y: float
    width: float
    height: float


class CaptchaPoint(TypedDict):
    x: float
    y: float


class CaptchaInfo(TypedDict, total=False):
    targetId: str
    frameId: str
    pageUrl: str
    id: int
    vendor: str
    variant: str
    taskType: str
    state: str
    bbox: CaptchaBBox
    click: CaptchaPoint
    ready: bool
    rounds: int
    rejections: int
    suspectedHardMode: bool
    taskServed: bool


class CaptchaPolicy(TypedDict, total=False):
    enabled: bool
    types: list[str] | None
    timeBudgetMs: int
    maxAttempts: int
    allowLLM: bool
    manualMode: bool
    manualResumeMs: int


class CaptchaState(TypedDict, total=False):
    policy: CaptchaPolicy
    captchas: list[CaptchaInfo]
    signaturesVersion: str


class CaptchaEvent(TypedDict, total=False):
    event: str
    cdp_event: str
    timestamp: float
    captcha: CaptchaInfo
    previousState: str
    targetId: str
    frameId: str
    pageUrl: str
    vendor: str
    reason: str
    diagnosis: dict[str, Any]
    strategy: str
    strategies: list[str]
    attempt: int
    attempts: int
    rounds: int
    durationMs: float


class HumanizeState(TypedDict, total=False):
    enabled: bool
    preset: str
    seed: str
    persona: dict[str, Any]
    overrides: dict[str, Any]
    blockInput: bool
    cursory: dict[str, Any]
    scrollTableError: str


def _normalize_event_name(event: str) -> tuple[str, str]:
    if not isinstance(event, str) or not event.strip():
        raise InvalidOptionError("CDP event name must be a non-empty string.")
    name = event.strip()
    if "." in name:
        domain, short = name.split(".", 1)
        return short, f"{domain}.{short}"
    return name, f"Ombra.{name}"


def _build_predicate(
    event_or_predicate: str | Collection[str] | Callable[[dict[str, Any]], bool] | None,
) -> Callable[[dict[str, Any]], bool]:
    if event_or_predicate is None:
        return lambda _e: True
    if callable(event_or_predicate):
        return event_or_predicate
    if isinstance(event_or_predicate, str):
        short, _ = _normalize_event_name(event_or_predicate)
        return lambda e: e.get("event") == short
    if isinstance(event_or_predicate, Collection):
        wanted = {_normalize_event_name(item)[0] for item in event_or_predicate}
        return lambda e: e.get("event") in wanted
    raise InvalidOptionError(
        "event_or_predicate must be None, an event name string, a collection of names, or a callable."
    )


def _discover_first_page(browser: Any) -> Any:
    for ctx in getattr(browser, "contexts", None) or ():
        pages = getattr(ctx, "pages", None) or ()
        if pages:
            return pages[0]
    return None


def _build_solve_params(
    *,
    target_id: str | None,
    frame_id: str | None,
    captcha_id: int | None,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if target_id is not None:
        if not isinstance(target_id, str) or not target_id:
            raise InvalidOptionError("target_id must be a non-empty string.")
        params["targetId"] = target_id
    if frame_id is not None:
        if not isinstance(frame_id, str) or not frame_id:
            raise InvalidOptionError("frame_id must be a non-empty string.")
        params["frameId"] = frame_id
    if captcha_id is not None:
        if isinstance(captcha_id, bool) or not isinstance(captcha_id, int) or captcha_id < 0:
            raise InvalidOptionError("captcha_id must be a non-negative integer.")
        params["id"] = captcha_id
    return params


def _build_humanize_params(
    *,
    enabled: bool | None,
    preset: str | None,
    overrides: dict[str, Any] | None,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if enabled is not None:
        if not isinstance(enabled, bool):
            raise InvalidOptionError("enabled must be a boolean.")
        params["enabled"] = enabled
    if preset is not None:
        if not isinstance(preset, str) or preset not in _HUMANIZE_PRESETS:
            raise InvalidOptionError(
                f"preset must be one of {sorted(_HUMANIZE_PRESETS)}, got {preset!r}."
            )
        params["preset"] = preset
    if overrides is not None:
        if not isinstance(overrides, dict):
            raise InvalidOptionError("overrides must be a dict.")
        params["overrides"] = overrides
    return params


def _build_agent_params(
    *,
    target_id: str,
    goal: str,
    max_steps: int | None,
    model: str | None,
    plan_json: str | None,
) -> dict[str, Any]:
    if not isinstance(target_id, str) or not target_id.strip():
        raise InvalidOptionError("target_id must be a non-empty string.")
    if not isinstance(goal, str) or not goal.strip():
        raise InvalidOptionError("goal must be a non-empty string.")
    params: dict[str, Any] = {"targetId": target_id, "goal": goal}
    if max_steps is not None:
        if isinstance(max_steps, bool) or not isinstance(max_steps, int) or max_steps < 1:
            raise InvalidOptionError("max_steps must be an integer >= 1.")
        params["maxSteps"] = max_steps
    if model is not None:
        if not isinstance(model, str) or not model.strip():
            raise InvalidOptionError("model must be a non-empty string.")
        params["model"] = model
    if plan_json is not None:
        if not isinstance(plan_json, str):
            raise InvalidOptionError("plan_json must be a JSON string.")
        params["planJson"] = plan_json
    return params


class CaptchaEventRecorder:
    """In-order buffer of ``Ombra.captcha*`` CDP events for synchronous Playwright scripts."""

    def __init__(self, cdp: OmbraCDP) -> None:
        self._cdp = cdp
        self.events: list[dict[str, Any]] = []
        self._unsubscribe: Callable[[], None] | None = cdp.on_captcha(self.events.append)

    def clear(self) -> None:
        self.events.clear()

    def stop(self) -> None:
        if self._unsubscribe is not None:
            unsub = self._unsubscribe
            self._unsubscribe = None
            unsub()

    def __enter__(self) -> CaptchaEventRecorder:
        return self

    def __exit__(self, *_: Any) -> None:
        self.stop()

    def wait_for(
        self,
        event_or_predicate: str | Collection[str] | Callable[[dict[str, Any]], bool] | None = None,
        *,
        timeout_ms: int = 30_000,
        page: Any = None,
    ) -> dict[str, Any]:
        """Wait for a matching ``Ombra.captcha*`` event and return it.

        Playwright's synchronous API only dispatches incoming CDP events while a Playwright
        protocol call is running, so this method pumps ``page.wait_for_timeout(...)`` when a
        page is available, falling back to ``Browser.getVersion`` (allowed by SI-02).
        """
        pred = _build_predicate(event_or_predicate)
        deadline = time.monotonic() + max(0.0, timeout_ms / 1000.0)

        while True:
            for item in self.events:
                if pred(item):
                    return item
            remaining_s = deadline - time.monotonic()
            if remaining_s <= 0:
                raise TimeoutError(
                    f"Timed out after {timeout_ms}ms waiting for Ombra CAPTCHA CDP event."
                )

            step_ms = max(1, min(50, int(remaining_s * 1000)))
            active_page = page if page is not None else _discover_first_page(self._cdp.browser)
            if active_page is not None and hasattr(active_page, "wait_for_timeout"):
                active_page.wait_for_timeout(step_ms)
            else:
                with contextlib.suppress(Exception):
                    self._cdp.session.send("Browser.getVersion")
                time.sleep(step_ms / 1000.0)


class AsyncCaptchaEventRecorder:
    """In-order buffer of ``Ombra.captcha*`` CDP events for async Playwright scripts."""

    def __init__(self, cdp: AsyncOmbraCDP) -> None:
        self._cdp = cdp
        self.events: list[dict[str, Any]] = []
        self._wakeup = asyncio.Event()

        def _on_event(item: dict[str, Any]) -> None:
            self.events.append(item)
            self._wakeup.set()

        self._unsubscribe: Callable[[], None] | None = cdp.on_captcha(_on_event)

    def clear(self) -> None:
        self.events.clear()

    def stop(self) -> None:
        if self._unsubscribe is not None:
            unsub = self._unsubscribe
            self._unsubscribe = None
            unsub()

    def __enter__(self) -> AsyncCaptchaEventRecorder:
        return self

    def __exit__(self, *_: Any) -> None:
        self.stop()

    async def __aenter__(self) -> AsyncCaptchaEventRecorder:
        return self

    async def __aexit__(self, *_: Any) -> None:
        self.stop()

    async def wait_for(
        self,
        event_or_predicate: str | Collection[str] | Callable[[dict[str, Any]], bool] | None = None,
        *,
        timeout_ms: int = 30_000,
    ) -> dict[str, Any]:
        """Await a matching ``Ombra.captcha*`` event without polling."""
        pred = _build_predicate(event_or_predicate)
        deadline = time.monotonic() + max(0.0, timeout_ms / 1000.0)

        while True:
            self._wakeup.clear()
            for item in self.events:
                if pred(item):
                    return item
            remaining_s = deadline - time.monotonic()
            if remaining_s <= 0:
                raise TimeoutError(
                    f"Timed out after {timeout_ms}ms waiting for Ombra CAPTCHA CDP event."
                )
            try:
                await asyncio.wait_for(self._wakeup.wait(), timeout=remaining_s)
            except asyncio.TimeoutError as exc:
                raise TimeoutError(
                    f"Timed out after {timeout_ms}ms waiting for Ombra CAPTCHA CDP event."
                ) from exc


class OmbraCDP:
    """Synchronous browser-level CDP client for the custom ``Ombra`` domain."""

    def __init__(self, browser: Any, session: Any) -> None:
        self.browser = browser
        self.session = session
        self._t0 = time.monotonic()
        self._detached = False

    def __enter__(self) -> OmbraCDP:
        return self

    def __exit__(self, *_: Any) -> None:
        self.detach()

    def detach(self) -> None:
        """Detach this browser CDP session without closing the browser."""
        if self._detached:
            return
        self._detached = True
        with contextlib.suppress(Exception):
            self.session.detach()

    def on(self, event: str, handler: Callable[[dict[str, Any]], Any]) -> Callable[[], None]:
        """Subscribe to an ``Ombra.*`` (or explicit ``Domain.event``) CDP event."""
        _, full_name = _normalize_event_name(event)
        self.session.on(full_name, handler)

        def _unsubscribe() -> None:
            remove = getattr(self.session, "remove_listener", None)
            if callable(remove):
                with contextlib.suppress(Exception):
                    remove(full_name, handler)

        return _unsubscribe

    def on_captcha(self, callback: Callable[[dict[str, Any]], Any]) -> Callable[[], None]:
        """Subscribe *callback* to all 9 ``Ombra.captcha*`` events.

        Each invocation receives ``{"event": <short>, "cdp_event": "Ombra.<short>",
        "timestamp": <seconds>, **params}``. Returns an ``unsubscribe()`` callable.
        """
        unsubscribers: list[Callable[[], None]] = []
        for short_name in CAPTCHA_EVENTS:
            full_name = f"Ombra.{short_name}"

            def _make_listener(ev_short: str, ev_full: str) -> Callable[[dict[str, Any]], None]:
                def _listener(params: dict[str, Any] | None = None) -> None:
                    payload: dict[str, Any] = {
                        "event": ev_short,
                        "cdp_event": ev_full,
                        "timestamp": round(time.monotonic() - self._t0, 3),
                    }
                    if isinstance(params, dict):
                        payload.update(params)
                    callback(payload)

                return _listener

            unsubscribers.append(self.on(full_name, _make_listener(short_name, full_name)))

        def _unsubscribe_all() -> None:
            for fn in unsubscribers:
                fn()

        return _unsubscribe_all

    def record_captcha_events(self) -> CaptchaEventRecorder:
        """Start recording all ``Ombra.captcha*`` events into an in-memory buffer."""
        return CaptchaEventRecorder(self)

    def get_captcha_state(self) -> dict[str, Any]:
        """Call ``Ombra.getCaptchaState`` and return ``{policy, captchas, signaturesVersion}``."""
        res = self.session.send("Ombra.getCaptchaState")
        return res["state"] if isinstance(res, dict) and "state" in res else res

    def set_captcha_policy(
        self, policy: dict[str, Any] | None = None, **kwargs: Any
    ) -> dict[str, Any]:
        """Validate and apply a live ``Ombra.setCaptchaPolicy`` update."""
        merged: dict[str, Any] = {}
        if policy is not None:
            if not isinstance(policy, dict):
                raise InvalidOptionError("policy must be a dict.")
            merged.update(policy)
        merged.update(kwargs)
        wire_policy = normalize_captcha_policy_patch(merged)
        res = self.session.send("Ombra.setCaptchaPolicy", {"policy": wire_policy})
        return res["state"] if isinstance(res, dict) and "state" in res else res

    def solve_captcha(
        self,
        *,
        target_id: str | None = None,
        frame_id: str | None = None,
        captcha_id: int | None = None,
    ) -> int:
        """Trigger ``Ombra.solveCaptcha`` (works even when policy ``solve=False``)."""
        params = _build_solve_params(
            target_id=target_id, frame_id=frame_id, captcha_id=captcha_id
        )
        res = self.session.send("Ombra.solveCaptcha", params or None)
        return int(res["count"]) if isinstance(res, dict) and "count" in res else 0

    def get_humanize_state(self) -> dict[str, Any]:
        """Call ``Ombra.getHumanizeState``."""
        res = self.session.send("Ombra.getHumanizeState")
        return res["state"] if isinstance(res, dict) and "state" in res else res

    def set_humanize(
        self,
        *,
        enabled: bool | None = None,
        preset: str | None = None,
        overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Call ``Ombra.setHumanize`` to toggle or adjust humanized input on the fly."""
        params = _build_humanize_params(enabled=enabled, preset=preset, overrides=overrides)
        res = self.session.send("Ombra.setHumanize", params or None)
        return res["state"] if isinstance(res, dict) and "state" in res else res

    def agent_run_task(
        self,
        *,
        target_id: str,
        goal: str,
        max_steps: int | None = None,
        model: str | None = None,
        plan_json: str | None = None,
    ) -> dict[str, Any]:
        """Call ``Browser.agentRunTask`` for Ombra's native in-browser AI agent."""
        params = _build_agent_params(
            target_id=target_id,
            goal=goal,
            max_steps=max_steps,
            model=model,
            plan_json=plan_json,
        )
        return self.session.send("Browser.agentRunTask", params)


class AsyncOmbraCDP:
    """Asynchronous browser-level CDP client for the custom ``Ombra`` domain."""

    def __init__(self, browser: Any, session: Any) -> None:
        self.browser = browser
        self.session = session
        self._t0 = time.monotonic()
        self._detached = False

    async def __aenter__(self) -> AsyncOmbraCDP:
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.detach()

    async def detach(self) -> None:
        """Detach this browser CDP session without closing the browser."""
        if self._detached:
            return
        self._detached = True
        with contextlib.suppress(Exception):
            await self.session.detach()

    def on(self, event: str, handler: Callable[[dict[str, Any]], Any]) -> Callable[[], None]:
        """Subscribe to an ``Ombra.*`` (or explicit ``Domain.event``) CDP event."""
        _, full_name = _normalize_event_name(event)
        self.session.on(full_name, handler)

        def _unsubscribe() -> None:
            remove = getattr(self.session, "remove_listener", None)
            if callable(remove):
                with contextlib.suppress(Exception):
                    remove(full_name, handler)

        return _unsubscribe

    def on_captcha(self, callback: Callable[[dict[str, Any]], Any]) -> Callable[[], None]:
        """Subscribe *callback* to all 9 ``Ombra.captcha*`` events."""
        unsubscribers: list[Callable[[], None]] = []
        for short_name in CAPTCHA_EVENTS:
            full_name = f"Ombra.{short_name}"

            def _make_listener(ev_short: str, ev_full: str) -> Callable[[dict[str, Any]], None]:
                def _listener(params: dict[str, Any] | None = None) -> None:
                    payload: dict[str, Any] = {
                        "event": ev_short,
                        "cdp_event": ev_full,
                        "timestamp": round(time.monotonic() - self._t0, 3),
                    }
                    if isinstance(params, dict):
                        payload.update(params)
                    res = callback(payload)
                    if asyncio.iscoroutine(res):
                        asyncio.create_task(res)

                return _listener

            unsubscribers.append(self.on(full_name, _make_listener(short_name, full_name)))

        def _unsubscribe_all() -> None:
            for fn in unsubscribers:
                fn()

        return _unsubscribe_all

    def record_captcha_events(self) -> AsyncCaptchaEventRecorder:
        """Start recording all ``Ombra.captcha*`` events into an async-awaitable buffer."""
        return AsyncCaptchaEventRecorder(self)

    async def get_captcha_state(self) -> dict[str, Any]:
        """Call ``Ombra.getCaptchaState`` and return ``{policy, captchas, signaturesVersion}``."""
        res = await self.session.send("Ombra.getCaptchaState")
        return res["state"] if isinstance(res, dict) and "state" in res else res

    async def set_captcha_policy(
        self, policy: dict[str, Any] | None = None, **kwargs: Any
    ) -> dict[str, Any]:
        """Validate and apply a live ``Ombra.setCaptchaPolicy`` update."""
        merged: dict[str, Any] = {}
        if policy is not None:
            if not isinstance(policy, dict):
                raise InvalidOptionError("policy must be a dict.")
            merged.update(policy)
        merged.update(kwargs)
        wire_policy = normalize_captcha_policy_patch(merged)
        res = await self.session.send("Ombra.setCaptchaPolicy", {"policy": wire_policy})
        return res["state"] if isinstance(res, dict) and "state" in res else res

    async def solve_captcha(
        self,
        *,
        target_id: str | None = None,
        frame_id: str | None = None,
        captcha_id: int | None = None,
    ) -> int:
        """Trigger ``Ombra.solveCaptcha`` (works even when policy ``solve=False``)."""
        params = _build_solve_params(
            target_id=target_id, frame_id=frame_id, captcha_id=captcha_id
        )
        res = await self.session.send("Ombra.solveCaptcha", params or None)
        return int(res["count"]) if isinstance(res, dict) and "count" in res else 0

    async def get_humanize_state(self) -> dict[str, Any]:
        """Call ``Ombra.getHumanizeState``."""
        res = await self.session.send("Ombra.getHumanizeState")
        return res["state"] if isinstance(res, dict) and "state" in res else res

    async def set_humanize(
        self,
        *,
        enabled: bool | None = None,
        preset: str | None = None,
        overrides: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Call ``Ombra.setHumanize`` to toggle or adjust humanized input on the fly."""
        params = _build_humanize_params(enabled=enabled, preset=preset, overrides=overrides)
        res = await self.session.send("Ombra.setHumanize", params or None)
        return res["state"] if isinstance(res, dict) and "state" in res else res

    async def agent_run_task(
        self,
        *,
        target_id: str,
        goal: str,
        max_steps: int | None = None,
        model: str | None = None,
        plan_json: str | None = None,
    ) -> dict[str, Any]:
        """Call ``Browser.agentRunTask`` for Ombra's native in-browser AI agent."""
        params = _build_agent_params(
            target_id=target_id,
            goal=goal,
            max_steps=max_steps,
            model=model,
            plan_json=plan_json,
        )
        return await self.session.send("Browser.agentRunTask", params)


class _AsyncOmbraCDPContext:
    """Awaitable + async-context-manager returned by ``ombra_cdp_async()``."""

    def __init__(self, browser: Any) -> None:
        self._browser = browser
        self._cdp: AsyncOmbraCDP | None = None

    async def _open(self) -> AsyncOmbraCDP:
        if self._cdp is None:
            session = await self._browser.new_browser_cdp_session()
            self._cdp = AsyncOmbraCDP(self._browser, session)
        return self._cdp

    def __await__(self) -> Generator[Any, None, AsyncOmbraCDP]:
        return self._open().__await__()

    async def __aenter__(self) -> AsyncOmbraCDP:
        return await self._open()

    async def __aexit__(self, *_: Any) -> None:
        if self._cdp is not None:
            await self._cdp.detach()


def ombra_cdp(browser_or_context: Any) -> OmbraCDP:
    """Open a synchronous browser-level CDP session for Ombra's custom ``Ombra`` domain.

    Accepts either a ``Browser`` (from ``launch()``) or a ``BrowserContext`` (from
    ``launch_context()`` / ``launch_persistent_context()``).
    """
    browser = resolve_browser_handle(browser_or_context)
    session = browser.new_browser_cdp_session()
    return OmbraCDP(browser, session)


def ombra_cdp_async(browser_or_context: Any) -> _AsyncOmbraCDPContext:
    """Open an async browser-level CDP session for Ombra's custom ``Ombra`` domain.

    Supports both ``cdp = await ombra_cdp_async(browser)`` and
    ``async with ombra_cdp_async(browser) as cdp:``.
    """
    browser = resolve_browser_handle(browser_or_context)
    return _AsyncOmbraCDPContext(browser)
