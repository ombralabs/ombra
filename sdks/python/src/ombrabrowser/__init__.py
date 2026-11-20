"""Ombra Python SDK — Stealth Chromium launcher and CDP bridge for Playwright.

Usage:
    from ombrabrowser import launch

    browser = launch()
    page = browser.new_page()
    page.goto("https://example.com")
    print(page.title())
    browser.close()
"""

from __future__ import annotations

from ._version import (
    CONTRACT_VERSION,
    DEFAULT_ENGINE_VERSION,
    SUPPORTED_CONTRACT_RANGE,
    SUPPORTED_ENGINE_RANGE,
    SUPPORTED_PLAYWRIGHT_RANGE,
    __version__,
)
from .binary import binary_info, clear_cache, ensure_binary
from .errors import (
    BinaryNotFoundError,
    CDPConnectError,
    ChecksumMismatchError,
    DownloadFailedError,
    EngineCrashedError,
    EngineExitedError,
    InvalidOptionError,
    LaunchTimeoutError,
    LicenseError,
    OmbraError,
    PlaywrightNotInstalledError,
    ProfileBusyError,
    ProxyError,
    UnsupportedEngineError,
    UnsupportedPlatformError,
)
from .cdp import (
    AsyncOmbraCDP,
    HumanizeState,
    OmbraCDP,
    ombra_cdp,
    ombra_cdp_async,
)
from .launcher import (
    build_launch_options,
    check_engine_health,
    last_launch_info,
    launch,
    launch_async,
    launch_context,
    launch_context_async,
    launch_persistent_context,
    launch_persistent_context_async,
)

__all__ = [
    "__version__",
    "CONTRACT_VERSION",
    "DEFAULT_ENGINE_VERSION",
    "SUPPORTED_CONTRACT_RANGE",
    "SUPPORTED_ENGINE_RANGE",
    "SUPPORTED_PLAYWRIGHT_RANGE",
    "launch",
    "launch_async",
    "launch_context",
    "launch_context_async",
    "launch_persistent_context",
    "launch_persistent_context_async",
    "build_launch_options",
    "last_launch_info",
    "check_engine_health",
    "HumanizeState",
    "OmbraCDP",
    "AsyncOmbraCDP",
    "ombra_cdp",
    "ombra_cdp_async",
    "binary_info",
    "ensure_binary",
    "clear_cache",
    "OmbraError",
    "InvalidOptionError",
    "BinaryNotFoundError",
    "DownloadFailedError",
    "ChecksumMismatchError",
    "UnsupportedPlatformError",
    "UnsupportedEngineError",
    "LicenseError",
    "ProxyError",
    "ProfileBusyError",
    "LaunchTimeoutError",
    "CDPConnectError",
    "EngineExitedError",
    "EngineCrashedError",
    "PlaywrightNotInstalledError",
]
