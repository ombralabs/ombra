"""Browser-level CDP bridge for Ombra's custom ``Ombra`` and ``Browser`` domains.

Ombra Chromium registers its custom ``Ombra`` CDP domain (``Ombra.pdl``, patch 135)
exclusively on **browser-level** CDP sessions (``browser.new_browser_cdp_session()``), not on
page/frame sessions (``context.new_cdp_session(page)``).

This module provides lightweight sync/async helpers that attach to a browser-level CDP session
from either a ``Browser`` or ``BrowserContext`` without wrapping Playwright's native objects.
"""

from __future__ import annotations

import contextlib
from collections.abc import Callable, Generator
from typing import Any, TypedDict

from .errors import InvalidOptionError
from .launcher import resolve_browser_handle

_HUMANIZE_PRESETS = frozenset({"default", "careful", "fast"})


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


class OmbraCDP:
    """Synchronous browser-level CDP client for the custom ``Ombra`` domain."""

    def __init__(self, browser: Any, session: Any) -> None:
        self.browser = browser
        self.session = session
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
