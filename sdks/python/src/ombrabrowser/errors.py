"""Typed error hierarchy and secret redaction for the Ombra Python SDK."""

from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any

# Patterns redacted from error messages, details, and logs (SI-06 / contract §11).
_URL_USERINFO_PASS_RE = re.compile(r"([a-zA-Z][a-zA-Z0-9+.-]*://)([^/@\s:]*):([^/@\s]*)@")
_URL_USERINFO_USER_RE = re.compile(r"([a-zA-Z][a-zA-Z0-9+.-]*://)([^/@\s:]+)@")
_LICENSE_ENV_RE = re.compile(r"(OMBRA_LICENSE_KEY=)([^\s\"']+)")
_AUTH_HEADER_RE = re.compile(
    r"(Authorization\s*:\s*(?:Bearer|License)\s+)([^\s\"']+)", re.IGNORECASE
)


def redact_secrets(text: str, extra_secrets: Iterable[str] = ()) -> str:
    """Return *text* with proxy credentials, license keys, and auth headers masked."""
    if not text:
        return text
    out = _URL_USERINFO_PASS_RE.sub(r"\1***:***@", text)
    out = _URL_USERINFO_USER_RE.sub(r"\1***@", out)
    out = _LICENSE_ENV_RE.sub(r"\1***", out)
    out = _AUTH_HEADER_RE.sub(r"\1***", out)
    for secret in extra_secrets:
        if secret and len(secret) >= 4:
            out = out.replace(secret, "***")
    return out


def _redact_value(value: Any, extra_secrets: tuple[str, ...]) -> Any:
    if isinstance(value, str):
        return redact_secrets(value, extra_secrets)
    if isinstance(value, dict):
        return {k: _redact_value(v, extra_secrets) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact_value(item, extra_secrets) for item in value]
    return value


class OmbraError(Exception):
    """Base exception for all Ombra SDK errors."""

    kind: str = "OmbraError"

    def __init__(
        self,
        message: str,
        *,
        details: dict[str, Any] | None = None,
        secrets: Iterable[str] = (),
    ) -> None:
        secret_tuple = tuple(s for s in secrets if s)
        clean_message = redact_secrets(message, secret_tuple)
        clean_details = _redact_value(dict(details or {}), secret_tuple)
        self.message = clean_message
        self.details: dict[str, Any] = clean_details
        super().__init__(clean_message)

    def __repr__(self) -> str:
        return f"{type(self).__name__}(kind={self.kind!r}, message={self.message!r})"


class InvalidOptionError(OmbraError, ValueError):
    """Unknown option, conflicting options, or invalid option value/type."""

    kind = "InvalidOption"


class BinaryNotFoundError(OmbraError, FileNotFoundError):
    """No engine binary found at any resolution step and download disabled/unavailable."""

    kind = "BinaryNotFound"


class DownloadFailedError(OmbraError, RuntimeError):
    """Network, HTTP, extraction, or disk failure while fetching the engine binary."""

    kind = "DownloadFailed"


class ChecksumMismatchError(OmbraError, RuntimeError):
    """SHA-256, Ed25519 signature, or integrity verification failed."""

    kind = "ChecksumMismatch"


class UnsupportedPlatformError(OmbraError, RuntimeError):
    """No engine build or compatibility for the host OS or CPU architecture."""

    kind = "UnsupportedPlatform"


class UnsupportedEngineError(OmbraError, RuntimeError):
    """Resolved engine build is outside the SDK's supported version range."""

    kind = "UnsupportedEngine"


class LicenseError(OmbraError, RuntimeError):
    """Engine refused to start or stay open because of license validation/slots."""

    kind = "LicenseError"


class ProxyError(OmbraError, RuntimeError):
    """Loopback proxy relay could not start or proxy configuration is invalid."""

    kind = "ProxyError"


class ProfileBusyError(OmbraError, RuntimeError):
    """Another live process holds the lock on the target profile directory."""

    kind = "ProfileBusy"


class LaunchTimeoutError(OmbraError, TimeoutError):
    """CDP endpoint did not become ready within timeout_ms."""

    kind = "LaunchTimeout"


class CDPConnectError(OmbraError, RuntimeError):
    """CDP endpoint appeared, but the automation client could not connect."""

    kind = "CDPConnectError"


class EngineExitedError(OmbraError, RuntimeError):
    """Engine process exited during launch or immediately after."""

    kind = "EngineExited"


class EngineCrashedError(OmbraError, RuntimeError):
    """Engine process died unexpectedly while the browser was open."""

    kind = "EngineCrashed"


class PlaywrightNotInstalledError(InvalidOptionError, ImportError):
    """The required Playwright dependency is missing or incompatible."""

    kind = "InvalidOption"
