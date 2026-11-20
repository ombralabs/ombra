"""Configuration, environment variables, and platform mapping for Ombra SDK."""

from __future__ import annotations

import logging
import os
import platform
import re
from dataclasses import dataclass
from pathlib import Path

from .errors import InvalidOptionError, UnsupportedPlatformError

logger = logging.getLogger("ombrabrowser")

DEFAULT_DOWNLOAD_URL = "https://api.github.com/repos/ombralabs/ombra/releases"
DEFAULT_TIMEOUT_MS = 30_000
MIN_TIMEOUT_MS = 1_000
MAX_TIMEOUT_MS = 600_000

# Ed25519 public keys used to verify Ombra engine channel/release envelopes
# (matches config/engine-signing.pub in ombra-engine).
BINARY_SIGNING_PUBKEYS: list[str] = [
    "c3bmkOT6aDdpe3Kobp/KU5GzND8A77L6gv0XCdL2ZlY=",
]

_LOG_LEVELS: dict[str, int] = {
    "error": logging.ERROR,
    "warn": logging.WARNING,
    "warning": logging.WARNING,
    "info": logging.INFO,
    "debug": logging.DEBUG,
}

_VERSION_PIN_RE = re.compile(
    r"^(?P<chromium>\d+\.\d+\.\d+\.\d+)(?:-(?P<release>[1-9]\d*|0\+dev\.[0-9a-fA-F]+))?$"
)


@dataclass(frozen=True)
class PlatformInfo:
    """Host platform metadata across SDK schema and release manifests."""

    sdk_name: str      # spec/schemas/binary-info.schema.json (e.g. macos-arm64)
    cdn_name: str      # Release manifest key (e.g. darwin-arm64)
    archive_ext: str   # .tar.gz | .tar.xz | .zip
    system: str
    machine: str


_PLATFORM_TABLE: dict[tuple[str, str], tuple[str, str, str]] = {
    ("Darwin", "arm64"): ("macos-arm64", "darwin-arm64", ".tar.gz"),
    ("Darwin", "x86_64"): ("macos-x64", "darwin-x64", ".tar.gz"),
    ("Windows", "AMD64"): ("windows-x64", "windows-x64", ".zip"),
    ("Windows", "x86_64"): ("windows-x64", "windows-x64", ".zip"),
    ("Linux", "x86_64"): ("linux-x64", "linux-x64", ".tar.xz"),
}


def configure_logging() -> None:
    """Configure logger level from OMBRA_LOG_LEVEL (default: warn)."""
    raw = os.environ.get("OMBRA_LOG_LEVEL", "warn").strip().lower()
    level = _LOG_LEVELS.get(raw, logging.WARNING)
    logger.setLevel(level)
    if not logger.handlers:
        logger.addHandler(logging.NullHandler())


configure_logging()


def get_platform_info() -> PlatformInfo:
    """Detect and validate the host OS and architecture."""
    system = platform.system()
    machine = platform.machine()
    entry = _PLATFORM_TABLE.get((system, machine))
    if entry is None:
        raise UnsupportedPlatformError(
            f"Unsupported platform: {system} {machine}. "
            f"Supported: {', '.join(sdk for sdk, _, _ in _PLATFORM_TABLE.values())}",
            details={"system": system, "machine": machine},
        )
    sdk_name, cdn_name, archive_ext = entry
    return PlatformInfo(
        sdk_name=sdk_name,
        cdn_name=cdn_name,
        archive_ext=archive_ext,
        system=system,
        machine=machine,
    )


def get_platform_tag() -> str:
    """Return the SDK-canonical platform tag (e.g. 'macos-arm64', 'linux-x64')."""
    return get_platform_info().sdk_name


def get_cache_dir() -> Path:
    """Return the Ombra SDK cache root (OMBRA_CACHE_DIR or ~/.ombra)."""
    custom = os.environ.get("OMBRA_CACHE_DIR", "").strip()
    if custom:
        return Path(custom).expanduser()
    return Path.home() / ".ombra"


def get_app_engines_dir() -> Path:
    """Return the Ombra desktop app engines directory for the host OS."""
    override = os.environ.get("OMBRA_APP_ENGINES_DIR", "").strip()
    if override:
        return Path(override).expanduser()
    system = platform.system()
    if system == "Darwin":
        return Path.home() / "Library" / "Application Support" / "Ombra" / "engines"
    if system == "Windows":
        local_app = os.environ.get("LOCALAPPDATA", "").strip()
        base = Path(local_app) if local_app else Path.home() / "AppData" / "Local"
        return base / "Ombra" / "engines"
    xdg_data = os.environ.get("XDG_DATA_HOME", "").strip()
    base = Path(xdg_data) if xdg_data and Path(xdg_data).is_absolute() else Path.home() / ".local" / "share"
    return base / "Ombra" / "engines"


def get_managed_engines_dir() -> Path:
    """Return the directory where the SDK stores downloaded engine builds."""
    return get_cache_dir() / "engines"


def get_profiles_dir() -> Path:
    """Return the root directory for named persistent profiles."""
    return get_cache_dir() / "profiles"


def get_binary_path_override() -> str | None:
    """Return OMBRA_BINARY_PATH if set and non-empty."""
    raw = os.environ.get("OMBRA_BINARY_PATH", "").strip()
    return raw or None


def get_download_base_url() -> str | None:
    """Return the configured engine download base URL, or None if explicitly disabled."""
    if "OMBRA_DOWNLOAD_URL" not in os.environ:
        return DEFAULT_DOWNLOAD_URL
    raw = os.environ.get("OMBRA_DOWNLOAD_URL", "").strip()
    if not raw or raw.lower() in {"none", "off", "false", "0"}:
        return None
    return raw.rstrip("/")


def get_auto_update() -> bool:
    """Return whether the SDK checks for newer engine builds on launch."""
    raw = os.environ.get("OMBRA_AUTO_UPDATE", "true").strip().lower()
    return raw not in {"0", "false", "no", "off"}


def skip_checksum_enabled() -> bool:
    """Return True if OMBRA_SKIP_CHECKSUM enables development checksum bypass."""
    raw = os.environ.get("OMBRA_SKIP_CHECKSUM", "false").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def get_release_channel(channel: str | None = None) -> str:
    """Return normalized engine release channel ('stable' or 'beta')."""
    raw = channel if channel is not None else os.environ.get("OMBRA_RELEASE_CHANNEL", "stable")
    normalized = raw.strip().lower()
    if normalized in {"", "stable"}:
        return "stable"
    if normalized == "beta":
        return "beta"
    raise InvalidOptionError(
        f"Invalid release channel {raw!r}; expected 'stable' or 'beta'."
    )


def normalize_requested_version(version: str | None = None) -> str | None:
    """Validate and return an explicit Ombra engine version pin, or None."""
    raw = version if version is not None else os.environ.get("OMBRA_VERSION")
    if raw is None:
        return None
    if not isinstance(raw, str):
        raise InvalidOptionError("version must be an engine version string.")
    cleaned = raw.strip()
    if not cleaned:
        return None
    if not _VERSION_PIN_RE.fullmatch(cleaned):
        raise InvalidOptionError(
            f"Invalid engine version pin {raw!r}. Expected '<a.b.c.d>' or '<a.b.c.d>-<N>' "
            "(for example '158.0.8127.37' or '158.0.8127.37-2').",
            details={"version": cleaned},
        )
    return cleaned


def get_timeout_ms(timeout_ms: int | None = None) -> int:
    """Resolve timeout_ms (explicit > OMBRA_TIMEOUT_MS > 30000) and validate range."""
    if timeout_ms is not None:
        if isinstance(timeout_ms, bool) or not isinstance(timeout_ms, int):
            raise InvalidOptionError(
                f"timeout_ms must be an integer, got {type(timeout_ms).__name__}."
            )
        value = timeout_ms
    else:
        raw_env = os.environ.get("OMBRA_TIMEOUT_MS", "").strip()
        if raw_env:
            try:
                value = int(raw_env)
            except ValueError as exc:
                raise InvalidOptionError(
                    f"OMBRA_TIMEOUT_MS must be an integer, got {raw_env!r}."
                ) from exc
        else:
            value = DEFAULT_TIMEOUT_MS

    if not (MIN_TIMEOUT_MS <= value <= MAX_TIMEOUT_MS):
        raise InvalidOptionError(
            f"timeout_ms {value} is outside {MIN_TIMEOUT_MS}..{MAX_TIMEOUT_MS}.",
            details={"timeout_ms": value},
        )
    return value


def resolve_license_key(license_key: str | None = None) -> tuple[str | None, str]:
    """Resolve license key and source ('param' | 'env' | 'file' | 'none').

    Follows engine patch 980 rules: explicit option > OMBRA_LICENSE_KEY >
    ~/.ombra/license.key. Never logs or exposes the key value.
    """
    if license_key is not None:
        if not isinstance(license_key, str) or not license_key.strip():
            raise InvalidOptionError("license_key must be a non-empty string.")
        cleaned = _normalize_license_key(license_key)
        return cleaned, "param"

    env_key = os.environ.get("OMBRA_LICENSE_KEY", "")
    if env_key.strip():
        return _normalize_license_key(env_key), "env"

    for candidate in _license_key_paths():
        try:
            text = candidate.read_text(encoding="utf-8")
        except OSError:
            continue
        if text.strip():
            return _normalize_license_key(text), "file"

    return None, "none"


def _license_key_paths() -> list[Path]:
    paths = [get_cache_dir() / "license.key"]
    default_path = Path.home() / ".ombra" / "license.key"
    if default_path not in paths:
        paths.append(default_path)
    return paths


def _normalize_license_key(raw: str) -> str:
    cleaned = raw.strip(" \t\r\n\ufeff")
    if not cleaned or len(cleaned) > 512 or any(ch.isspace() or ord(ch) < 32 for ch in cleaned):
        raise InvalidOptionError("Invalid license_key format.")
    return cleaned


def binary_relative_path(system: str | None = None) -> Path:
    """Relative path of the Chromium executable inside an extracted engine directory."""
    target = system or platform.system()
    if target == "Darwin":
        return Path("Chromium.app") / "Contents" / "MacOS" / "Chromium"
    if target == "Windows":
        return Path("chrome.exe")
    return Path("chrome")


def is_loopback_host(host: str | None) -> bool:
    """Return True if *host* refers to the local loopback interface."""
    if not host:
        return False
    cleaned = host.strip().lower().strip("[]")
    return cleaned in {"127.0.0.1", "localhost", "::1"}
