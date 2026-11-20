"""Convenience re-exports for Ombra's browser-level CAPTCHA CDP events and commands."""

from __future__ import annotations

from .cdp import (
    CAPTCHA_EVENTS,
    AsyncCaptchaEventRecorder,
    AsyncOmbraCDP,
    CaptchaBBox,
    CaptchaEvent,
    CaptchaEventRecorder,
    CaptchaInfo,
    CaptchaPoint,
    CaptchaPolicy,
    CaptchaState,
    OmbraCDP,
    ombra_cdp,
    ombra_cdp_async,
)

__all__ = [
    "CAPTCHA_EVENTS",
    "CaptchaBBox",
    "CaptchaPoint",
    "CaptchaInfo",
    "CaptchaPolicy",
    "CaptchaState",
    "CaptchaEvent",
    "CaptchaEventRecorder",
    "AsyncCaptchaEventRecorder",
    "OmbraCDP",
    "AsyncOmbraCDP",
    "ombra_cdp",
    "ombra_cdp_async",
]
