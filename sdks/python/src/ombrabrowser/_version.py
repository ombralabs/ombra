"""Version and compatibility declarations for the Ombra Python SDK."""

from __future__ import annotations

__version__ = "0.2.0"

CONTRACT_VERSION = "0.2.0"
SUPPORTED_CONTRACT_RANGE = ">=0.2,<0.3"

DEFAULT_ENGINE_VERSION = "158.0.8127.37"
SUPPORTED_ENGINE_RANGE = ">=151.0.7922.108,<159"
SUPPORTED_ENGINE_MIN_CHROMIUM = (151, 0, 7922, 108)
SUPPORTED_ENGINE_MAX_MAJOR = 159  # exclusive

SUPPORTED_PLAYWRIGHT_RANGE = ">=1.60,<2.0"
