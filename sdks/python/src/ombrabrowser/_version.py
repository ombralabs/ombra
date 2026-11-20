"""Version and compatibility declarations for the Ombra Python SDK."""

from __future__ import annotations

__version__ = "0.1.3"

CONTRACT_VERSION = "0.1.0"
SUPPORTED_CONTRACT_RANGE = ">=0.1,<0.2"

DEFAULT_ENGINE_VERSION = "151.0.7922.108"
SUPPORTED_ENGINE_RANGE = ">=151.0.7922.108,<152"
SUPPORTED_ENGINE_MIN_CHROMIUM = (151, 0, 7922, 108)
SUPPORTED_ENGINE_MAX_MAJOR = 152  # exclusive

SUPPORTED_PLAYWRIGHT_RANGE = ">=1.60,<2.0"
