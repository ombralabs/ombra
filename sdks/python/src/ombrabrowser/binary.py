"""Engine binary resolution, Ed25519 + SHA-256 verification, and download."""

from __future__ import annotations

import base64
import contextlib
import hashlib
import json
import os
import platform
import plistlib
import re
import shutil
import stat
import struct
import subprocess
import tarfile
import tempfile
import time
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlsplit

from ._version import (
    DEFAULT_ENGINE_VERSION,
    SUPPORTED_ENGINE_MAX_MAJOR,
    SUPPORTED_ENGINE_MIN_CHROMIUM,
    SUPPORTED_ENGINE_RANGE,
)
from .config import (
    BINARY_SIGNING_PUBKEYS,
    DEFAULT_DOWNLOAD_URL,
    PlatformInfo,
    binary_relative_path,
    get_app_engines_dir,
    get_auto_update,
    get_binary_path_override,
    get_cache_dir,
    get_download_base_url,
    get_managed_engines_dir,
    get_platform_info,
    get_release_channel,
    is_loopback_host,
    logger,
    normalize_requested_version,
    skip_checksum_enabled,
)
from .errors import (
    BinaryNotFoundError,
    ChecksumMismatchError,
    DownloadFailedError,
    OmbraError,
    UnsupportedEngineError,
    UnsupportedPlatformError,
    redact_secrets,
)

_VERSION_PARTS_RE = re.compile(
    r"^(?P<chromium>\d+\.\d+\.\d+\.\d+)(?:-(?P<release>[1-9]\d*|0\+dev\.[0-9a-fA-F]+))?$"
)
_SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
_UPDATE_CHECK_INTERVAL_S = 3600.0
_DOWNLOAD_RETRIES = 2  # Contract §11: download may retry twice with backoff
_GITHUB_DOWNLOAD_URL = "https://github.com/ombralabs/ombra/releases/download"


@dataclass(frozen=True)
class _ReleaseEntry:
    version: str
    url: str
    sha256: str
    size: int | None
    github_evidence: str | None = None


@dataclass(frozen=True)
class ResolvedBinary:
    """Internal result of resolving and verifying an engine executable."""

    version: str
    platform: str
    path: Path | None
    installed: bool
    source: str       # argument | env | app | cache | download | none
    sha256: str | None

    def to_binary_info(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "platform": self.platform,
            "path": str(self.path) if self.path is not None else None,
            "installed": self.installed,
            "source": self.source,
            "sha256": self.sha256,
        }


def parse_version_key(version: str) -> tuple[tuple[int, int, int, int], int, bool]:
    """Parse '<a.b.c.d>[-<N>|-0+dev.<sha>]' into a sortable comparison tuple."""
    match = _VERSION_PARTS_RE.fullmatch(version.strip())
    if not match:
        raise ValueError(f"Unrecognized engine version: {version!r}")
    chromium = tuple(int(p) for p in match.group("chromium").split("."))
    rel_raw = match.group("release")
    if rel_raw is None:
        return (chromium[0], chromium[1], chromium[2], chromium[3]), 0, False
    if rel_raw.startswith("0+dev."):
        return (chromium[0], chromium[1], chromium[2], chromium[3]), 0, True
    return (chromium[0], chromium[1], chromium[2], chromium[3]), int(rel_raw), False


def version_newer(candidate: str, current: str) -> bool:
    """Return True when *candidate* is strictly newer than *current*."""
    c_chr, c_rel, _ = parse_version_key(candidate)
    cur_chr, cur_rel, _ = parse_version_key(current)
    return (c_chr, c_rel) > (cur_chr, cur_rel)


def check_engine_compatibility(version: str, *, binary_path: Path | None = None) -> None:
    """Raise UnsupportedEngineError if *version* is outside SUPPORTED_ENGINE_RANGE."""
    try:
        chromium, _, _ = parse_version_key(version)
    except ValueError as exc:
        raise UnsupportedEngineError(
            f"Unrecognized Ombra engine version {version!r}; SDK supports {SUPPORTED_ENGINE_RANGE}.",
            details={
                "engine_version": version,
                "supported_range": SUPPORTED_ENGINE_RANGE,
                "binary_path": str(binary_path) if binary_path else None,
            },
        ) from exc

    if chromium < SUPPORTED_ENGINE_MIN_CHROMIUM or chromium[0] >= SUPPORTED_ENGINE_MAX_MAJOR:
        raise UnsupportedEngineError(
            f"Ombra engine version {version!r} is outside SDK supported range "
            f"{SUPPORTED_ENGINE_RANGE}.",
            details={
                "engine_version": version,
                "supported_range": SUPPORTED_ENGINE_RANGE,
                "binary_path": str(binary_path) if binary_path else None,
            },
        )


def compute_sha256(path: Path) -> str:
    """Return lowercase hex SHA-256 of *path*."""
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(128 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def _app_root_for_binary(binary: Path, system: str | None = None) -> Path:
    target = system or platform.system()
    if target == "Darwin" and binary.parent.name == "MacOS" and binary.parent.parent.name == "Contents":
        return binary.parent.parent.parent
    return binary.parent


def _read_ombra_build_json(binary: Path) -> dict[str, Any] | None:
    app_root = _app_root_for_binary(binary)
    candidates = [
        app_root / "Contents" / "Resources" / "ombra-build.json",
        app_root / "ombra-build.json",
        binary.parent / "ombra-build.json",
    ]
    for path in candidates:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
        except (OSError, json.JSONDecodeError):
            continue
    return None


def _read_macos_plist_version(app_root: Path) -> str | None:
    plist_path = app_root / "Contents" / "Info.plist"
    if not plist_path.is_file():
        return None
    try:
        with open(plist_path, "rb") as fh:
            data = plistlib.load(fh)
        ver = data.get("CFBundleShortVersionString")
        return ver.strip() if isinstance(ver, str) and ver.strip() else None
    except (OSError, plistlib.InvalidFileException):
        return None


def _read_binary_version_cli(binary: Path) -> str | None:
    # Windows Chromium ignores --version and launches a full browser window.
    if platform.system() == "Windows":
        return None
    try:
        res = subprocess.run(
            [str(binary), "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if res.returncode == 0 and res.stdout.strip():
            last = res.stdout.strip().split()[-1]
            if _VERSION_PARTS_RE.fullmatch(last):
                return last
    except (OSError, subprocess.SubprocessError):
        return None
    return None


def detect_binary_version(
    binary: Path, fallback_version: str | None = None, *, allow_cli: bool = True
) -> str | None:
    """Determine engine version from ombra-build.json, Info.plist, or --version."""
    build_meta = _read_ombra_build_json(binary)
    if build_meta:
        ver = build_meta.get("version") or build_meta.get("chromium")
        if isinstance(ver, str) and _VERSION_PARTS_RE.fullmatch(ver.strip()):
            return ver.strip()
    app_root = _app_root_for_binary(binary)
    plist_ver = _read_macos_plist_version(app_root)
    if plist_ver and _VERSION_PARTS_RE.fullmatch(plist_ver):
        return plist_ver
    if allow_cli:
        cli_ver = _read_binary_version_cli(binary)
        if cli_ver:
            return cli_ver
    return fallback_version


def _check_executable_format(binary: Path, plat: PlatformInfo) -> None:
    """Validate that *binary* matches the host OS and CPU architecture.

    Shebang test stubs (#!) are allowed so offline unit tests can run fake
    launcher scripts without compiling native binaries.
    """
    try:
        with open(binary, "rb") as fh:
            header = fh.read(64)
    except OSError as exc:
        raise BinaryNotFoundError(
            f"Cannot read engine binary at {binary}: {exc}",
            details={"binary_path": str(binary)},
        ) from exc

    if header.startswith(b"#!"):
        return

    if plat.system == "Darwin":
        if len(header) < 8:
            raise UnsupportedPlatformError(
                f"Engine binary at {binary} is not a valid macOS Mach-O executable.",
                details={"binary_path": str(binary), "platform": plat.sdk_name},
            )
        magic_le = struct.unpack("<I", header[:4])[0]
        magic_be = struct.unpack(">I", header[:4])[0]
        if magic_be in (0xCAFEBABE, 0xBEBAFECA):
            return  # Universal Mach-O fat binary
        if magic_le == 0xFEEDFACF:
            cputype = struct.unpack("<i", header[4:8])[0]
        elif magic_be == 0xFEEDFACF:
            cputype = struct.unpack(">i", header[4:8])[0]
        else:
            raise UnsupportedPlatformError(
                f"Engine binary at {binary} is not a macOS 64-bit Mach-O binary.",
                details={"binary_path": str(binary), "platform": plat.sdk_name},
            )
        expected_cpu = 0x0100000C if plat.machine == "arm64" else 0x01000007
        if cputype != expected_cpu:
            raise UnsupportedPlatformError(
                f"Engine binary architecture mismatch at {binary} for {plat.sdk_name}.",
                details={"binary_path": str(binary), "platform": plat.sdk_name},
            )
        return

    if plat.system == "Linux":
        if len(header) < 20 or header[:4] != b"\x7fELF":
            raise UnsupportedPlatformError(
                f"Engine binary at {binary} is not a Linux ELF executable.",
                details={"binary_path": str(binary), "platform": plat.sdk_name},
            )
        e_machine = struct.unpack("<H", header[18:20])[0]
        if e_machine != 0x3E:  # EM_X86_64
            raise UnsupportedPlatformError(
                f"Engine binary architecture mismatch at {binary} for {plat.sdk_name}.",
                details={"binary_path": str(binary), "platform": plat.sdk_name},
            )
        return

    if plat.system == "Windows":
        if len(header) < 64 or header[:2] != b"MZ":
            raise UnsupportedPlatformError(
                f"Engine binary at {binary} is not a Windows PE executable.",
                details={"binary_path": str(binary), "platform": plat.sdk_name},
            )


def _has_windows_motw(binary: Path) -> bool:
    if platform.system() != "Windows":
        return False
    try:
        with open(f"{binary}:Zone.Identifier", "rb"):
            return True
    except OSError:
        return False


def _find_binary_receipt(binary: Path) -> str | None:
    app_root = _app_root_for_binary(binary)
    candidates = [
        app_root.parent / "binary.sha256",
        app_root / "binary.sha256",
        binary.parent / "binary.sha256",
    ]
    for path in candidates:
        try:
            text = path.read_text(encoding="utf-8").strip().lower()
            if _SHA256_RE.fullmatch(text):
                return text
        except (OSError, UnicodeError):
            continue
    return None


def verify_binary(
    binary: Path,
    *,
    plat: PlatformInfo,
    expected_sha256: str | None = None,
    fallback_version: str | None = None,
    requested_version: str | None = None,
    require_receipt: bool = False,
) -> tuple[str, str]:
    """Verify binary existence, permissions, platform, compatibility, and SHA-256.

    Returns ``(version, sha256)``.
    """
    if not binary.exists() or not binary.is_file():
        raise BinaryNotFoundError(
            f"Engine binary does not exist at {binary}.",
            details={"binary_path": str(binary)},
        )

    if platform.system() != "Windows" and not os.access(binary, os.X_OK):
        raise ChecksumMismatchError(
            f"Engine binary at {binary} is not executable.",
            details={"binary_path": str(binary)},
        )

    if _has_windows_motw(binary):
        raise ChecksumMismatchError(
            f"Engine binary at {binary} is blocked by Windows Mark-of-the-Web (Zone.Identifier).",
            details={"binary_path": str(binary)},
        )

    _check_executable_format(binary, plat)

    build_meta = _read_ombra_build_json(binary)
    if build_meta and isinstance(build_meta.get("platform"), str):
        meta_platform = build_meta["platform"].strip()
        if meta_platform and meta_platform != plat.cdn_name:
            raise UnsupportedPlatformError(
                f"Engine binary at {binary} targets {meta_platform}, expected {plat.cdn_name}.",
                details={"binary_path": str(binary), "platform": meta_platform},
            )

    actual_sha = compute_sha256(binary)
    receipt_sha = expected_sha256 or _find_binary_receipt(binary)
    if skip_checksum_enabled():
        logger.warning(
            "OMBRA_SKIP_CHECKSUM=1 is set; bypassing binary SHA-256 verification for %s (dev only).",
            binary,
        )
    elif receipt_sha is None and require_receipt:
        raise ChecksumMismatchError(
            f"Missing or invalid binary.sha256 receipt for managed engine binary {binary}.",
            details={"binary_path": str(binary)},
        )
    elif receipt_sha is not None and actual_sha != receipt_sha.lower():
        raise ChecksumMismatchError(
            f"SHA-256 mismatch for engine binary {binary}: expected {receipt_sha}, got {actual_sha}.",
            details={
                "binary_path": str(binary),
                "expected_sha256": receipt_sha,
                "actual_sha256": actual_sha,
            },
        )

    version = detect_binary_version(binary, fallback_version=fallback_version)
    if not version:
        raise UnsupportedEngineError(
            f"Could not determine engine version for binary at {binary}.",
            details={"binary_path": str(binary), "supported_range": SUPPORTED_ENGINE_RANGE},
        )
    if requested_version and not _version_matches(version, requested_version):
        raise UnsupportedEngineError(
            f"Engine {version!r} at {binary} does not match requested version {requested_version!r}.",
            details={
                "engine_version": version,
                "requested_version": requested_version,
                "binary_path": str(binary),
            },
        )
    check_engine_compatibility(version, binary_path=binary)

    return version, actual_sha


def _binary_candidates_in_dir(base_dir: Path, system: str) -> list[Path]:
    rel = binary_relative_path(system)
    candidates = [base_dir / rel]
    if system != "Darwin":
        candidates.append(base_dir / "Chromium" / rel)
    return candidates


def _version_matches(installed_version: str, requested_version: str) -> bool:
    if installed_version == requested_version:
        return True
    if "-" not in requested_version:
        try:
            inst_chr, _, _ = parse_version_key(installed_version)
            req_chr, _, _ = parse_version_key(requested_version)
            return inst_chr == req_chr
        except ValueError:
            return False
    return False


def _resolve_app_binary(
    plat: PlatformInfo, requested_version: str | None
) -> tuple[Path, str] | None:
    engines_dir = get_app_engines_dir()
    if not engines_dir.is_dir():
        return None

    candidate_dirs: list[tuple[Path, str | None]] = []
    selection_path = engines_dir / "selection.json"
    active_id: str | None = None
    try:
        selection = json.loads(selection_path.read_text(encoding="utf-8"))
        if isinstance(selection, dict):
            raw_active = selection.get("active")
            if isinstance(raw_active, str) and raw_active.strip():
                active_id = raw_active.strip()
    except (OSError, json.JSONDecodeError):
        pass

    if requested_version:
        candidate_dirs.append((engines_dir / "versions" / requested_version, requested_version))
    if active_id and active_id != "legacy":
        candidate_dirs.append((engines_dir / "versions" / active_id, active_id))

    versions_dir = engines_dir / "versions"
    if versions_dir.is_dir():
        subdirs = []
        for entry in versions_dir.iterdir():
            if entry.is_dir() and _VERSION_PARTS_RE.fullmatch(entry.name):
                subdirs.append(entry)
        subdirs.sort(key=lambda p: parse_version_key(p.name), reverse=True)
        for sub in subdirs:
            candidate_dirs.append((sub, sub.name))

    candidate_dirs.append((engines_dir, None))

    seen: set[Path] = set()
    for base_dir, hint_ver in candidate_dirs:
        if not base_dir.exists():
            continue
        for bin_path in _binary_candidates_in_dir(base_dir, plat.system):
            if bin_path in seen or not bin_path.is_file():
                continue
            seen.add(bin_path)
            detected = detect_binary_version(bin_path, fallback_version=hint_ver, allow_cli=False)
            if requested_version and detected and not _version_matches(detected, requested_version):
                continue
            return bin_path, (detected or hint_ver or DEFAULT_ENGINE_VERSION)
    return None


def _latest_marker_path(channel: str, plat: PlatformInfo) -> Path:
    return get_managed_engines_dir() / f".latest_{channel}_{plat.cdn_name}"


def _github_latest_marker_path(channel: str, plat: PlatformInfo) -> Path:
    return get_managed_engines_dir() / f".latest_github_{channel}_{plat.cdn_name}"


def _serial_marker_path(channel: str) -> Path:
    return get_managed_engines_dir() / f".serial_{channel}"


def _last_update_check_path(channel: str, plat: PlatformInfo) -> Path:
    return get_managed_engines_dir() / f".last_check_{channel}_{plat.cdn_name}"


def _read_latest_marker(channel: str, plat: PlatformInfo) -> str | None:
    base_url = get_download_base_url()
    if base_url in {DEFAULT_DOWNLOAD_URL, None}:
        try:
            evidence = json.loads(_github_latest_marker_path(channel, plat).read_text("utf-8"))
            if (
                isinstance(evidence, dict)
                and evidence.get("source") == DEFAULT_DOWNLOAD_URL
                and evidence.get("channel") == channel
                and isinstance(evidence.get("envelope"), str)
                and _github_release_version(evidence.get("release"), channel=channel) is not None
            ):
                entry = _github_signed_release_entry(
                    evidence["release"], evidence["envelope"].encode(), plat
                )
                return entry.version
        except (OSError, ValueError, TypeError, OmbraError):
            pass
        if base_url == DEFAULT_DOWNLOAD_URL:
            return None
    try:
        ver = _latest_marker_path(channel, plat).read_text(encoding="utf-8").strip()
        if ver and _VERSION_PARTS_RE.fullmatch(ver):
            return ver
    except (OSError, UnicodeError):
        pass
    return None


def _write_text_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
    finally:
        with contextlib.suppress(OSError):
            tmp.unlink()


def _resolve_cache_binary(
    plat: PlatformInfo, requested_version: str | None, channel: str
) -> tuple[Path, str] | None:
    engines_dir = get_managed_engines_dir()
    if not engines_dir.is_dir():
        return None

    candidate_dirs: list[tuple[Path, str]] = []
    if requested_version:
        candidate_dirs.append((engines_dir / requested_version, requested_version))
    else:
        marker_ver = _read_latest_marker(channel, plat)
        if marker_ver:
            candidate_dirs.append((engines_dir / marker_ver, marker_ver))

    if requested_version:
        # Also match <chromium>-<N> directories if user pinned <chromium> without -<N>.
        subdirs = [
            entry
            for entry in engines_dir.iterdir()
            if entry.is_dir()
            and _VERSION_PARTS_RE.fullmatch(entry.name)
            and _version_matches(entry.name, requested_version)
        ]
        subdirs.sort(key=lambda p: parse_version_key(p.name), reverse=True)
        for sub in subdirs:
            candidate_dirs.append((sub, sub.name))

    seen: set[Path] = set()
    for base_dir, ver in candidate_dirs:
        if not base_dir.is_dir():
            continue
        for bin_path in _binary_candidates_in_dir(base_dir, plat.system):
            if bin_path in seen or not bin_path.is_file():
                continue
            seen.add(bin_path)
            return bin_path, ver
    return None


def _resolve_local_binary(
    *,
    binary_path: str | os.PathLike[str] | None,
    requested_version: str | None,
    channel: str,
    plat: PlatformInfo,
) -> ResolvedBinary:
    """Resolve and verify an already-present local binary without downloading."""
    if binary_path is not None:
        raw_path = os.fspath(binary_path).strip()
        if not raw_path:
            raise BinaryNotFoundError("Explicit binary_path cannot be empty.")
        candidate = Path(raw_path).expanduser()
        ver, sha = verify_binary(candidate, plat=plat, requested_version=requested_version)
        return ResolvedBinary(
            version=ver,
            platform=plat.sdk_name,
            path=candidate,
            installed=True,
            source="argument",
            sha256=sha,
        )

    env_path = get_binary_path_override()
    if env_path is not None:
        candidate = Path(env_path).expanduser()
        ver, sha = verify_binary(candidate, plat=plat, requested_version=requested_version)
        return ResolvedBinary(
            version=ver,
            platform=plat.sdk_name,
            path=candidate,
            installed=True,
            source="env",
            sha256=sha,
        )

    app_match = _resolve_app_binary(plat, requested_version)
    if app_match is not None:
        app_bin, hint_ver = app_match
        try:
            ver, sha = verify_binary(
                app_bin, plat=plat, fallback_version=hint_ver, requested_version=requested_version
            )
        except UnsupportedEngineError as exc:
            if not requested_version or exc.details.get("requested_version") != requested_version:
                raise
        else:
            return ResolvedBinary(
                version=ver,
                platform=plat.sdk_name,
                path=app_bin,
                installed=True,
                source="app",
                sha256=sha,
            )

    cache_match = _resolve_cache_binary(plat, requested_version, channel)
    if cache_match is not None:
        cache_bin, hint_ver = cache_match
        ver, sha = verify_binary(
            cache_bin,
            plat=plat,
            fallback_version=hint_ver,
            requested_version=requested_version,
            require_receipt=True,
        )
        return ResolvedBinary(
            version=ver,
            platform=plat.sdk_name,
            path=cache_bin,
            installed=True,
            source="cache",
            sha256=sha,
        )

    return ResolvedBinary(
        version=requested_version or DEFAULT_ENGINE_VERSION,
        platform=plat.sdk_name,
        path=None,
        installed=False,
        source="none",
        sha256=None,
    )


def _validate_download_url(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme == "https":
        return
    if parsed.scheme == "http" and is_loopback_host(parsed.hostname):
        return
    raise DownloadFailedError(
        f"Refusing insecure non-HTTPS download URL: {url!r}.",
        details={"url": url},
    )


def _http_get_bytes(url: str, *, timeout: float = 15.0) -> bytes:
    _validate_download_url(url)
    try:
        import httpx

        resp = httpx.get(url, follow_redirects=True, timeout=timeout)
        resp.raise_for_status()
        return bytes(resp.content)
    except Exception as exc:
        raise DownloadFailedError(
            f"Failed to download {url}: {exc}",
            details={"url": url, "status": getattr(getattr(exc, "response", None), "status_code", None)},
        ) from exc


def _http_download_file(url: str, dest: Path, *, expected_size: int | None = None) -> None:
    _validate_download_url(url)
    logger.info("Downloading Ombra engine from %s", redact_secrets(url))
    try:
        import httpx

        timeout = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)
        with httpx.stream("GET", url, follow_redirects=True, timeout=timeout) as resp:
            resp.raise_for_status()
            written = 0
            with open(dest, "wb") as fh:
                for chunk in resp.iter_bytes(chunk_size=65_536):
                    written += len(chunk)
                    if expected_size is not None and written > expected_size:
                        raise ChecksumMismatchError(
                            f"Download exceeded declared size ({expected_size} bytes).",
                            details={"url": url},
                        )
                    fh.write(chunk)
    except OmbraError:
        raise
    except Exception as exc:
        raise DownloadFailedError(f"Failed downloading {url}: {exc}") from exc

    if expected_size is not None and dest.stat().st_size != expected_size:
        raise ChecksumMismatchError(
            f"Downloaded size mismatch: expected {expected_size}, got {dest.stat().st_size}.",
            details={"url": url},
        )


def _verify_ed25519_envelope(raw: bytes) -> dict[str, Any]:
    """Verify a signed ``{"signed": "...", "sig": "..."}`` JSON envelope."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    try:
        envelope = json.loads(raw.decode("utf-8"))
        signed_str = envelope["signed"]
        sig_b64 = envelope["sig"]
        if not isinstance(signed_str, str) or not isinstance(sig_b64, str):
            raise TypeError("envelope fields must be strings")
        sig_bytes = base64.b64decode(sig_b64.strip(), validate=True)
        signed_bytes = signed_str.encode("utf-8")
    except Exception as exc:
        raise ChecksumMismatchError(f"Malformed signed engine manifest envelope: {exc}") from exc

    for key_b64 in BINARY_SIGNING_PUBKEYS:
        try:
            pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(key_b64, validate=True))
            pub.verify(sig_bytes, signed_bytes)
            payload = json.loads(signed_str)
            if not isinstance(payload, dict):
                raise TypeError("signed manifest payload must be a JSON object")
            return payload
        except Exception:
            continue

    raise ChecksumMismatchError(
        "Engine manifest Ed25519 signature verification failed against pinned Ombra signing keys."
    )


def _github_release_version(release: Any, *, channel: str | None = None) -> str | None:
    if (
        not isinstance(release, dict)
        or release.get("draft") is not False
        or not isinstance(release.get("prerelease"), bool)
    ):
        return None
    tag = release.get("tag_name")
    if not isinstance(tag, str) or not tag.startswith("v"):
        return None
    version = tag[1:]
    if not _VERSION_PARTS_RE.fullmatch(version) or parse_version_key(version)[2]:
        return None
    if channel is not None and release["prerelease"] != (channel == "beta"):
        return None
    return version


def _github_asset(release: dict[str, Any], filename: str, version: str) -> dict[str, Any]:
    assets = release.get("assets")
    matches = [
        asset for asset in assets
        if isinstance(asset, dict) and asset.get("name") == filename
    ] if isinstance(assets, list) else []
    expected_url = f"{_GITHUB_DOWNLOAD_URL}/v{version}/{filename}"
    if (
        len(matches) != 1
        or matches[0].get("browser_download_url") != expected_url
        or type(matches[0].get("size")) is not int
        or matches[0]["size"] <= 0
    ):
        raise ChecksumMismatchError(f"Missing or invalid GitHub release asset {filename!r}.")
    return matches[0]


def _github_signed_release_entry(
    release: dict[str, Any], raw: bytes, plat: PlatformInfo
) -> _ReleaseEntry:
    version = _github_release_version(release)
    if version is None:
        raise ChecksumMismatchError("Invalid GitHub browser release metadata.")
    manifest = _verify_ed25519_envelope(raw)
    if manifest.get("version") != version:
        raise ChecksumMismatchError("GitHub tag does not match signed release manifest version.")
    platforms = manifest.get("platforms")
    entry = platforms.get(plat.cdn_name) if isinstance(platforms, dict) else None
    if not isinstance(entry, dict):
        raise UnsupportedPlatformError(f"Engine {version} has no build for {plat.sdk_name}.")
    filename = f"ombra-engine-{version}-{plat.cdn_name}{plat.archive_ext}"
    sha256 = entry.get("sha256")
    size = entry.get("size")
    if (
        entry.get("file") != filename
        or not isinstance(sha256, str)
        or not _SHA256_RE.fullmatch(sha256.lower())
        or type(size) is not int
        or size <= 0
    ):
        raise ChecksumMismatchError("Signed release entry has invalid file, sha256, or size.")
    _github_asset(release, "release.json", version)
    asset = _github_asset(release, filename, version)
    if asset["size"] != size:
        raise ChecksumMismatchError("GitHub asset size does not match signed release manifest.")
    check_engine_compatibility(version)
    return _ReleaseEntry(version, asset["browser_download_url"], sha256.lower(), size)


def _resolve_github_release_entry(
    plat: PlatformInfo, *, requested_version: str | None, channel: str
) -> _ReleaseEntry:
    def get_json(url: str) -> Any:
        try:
            return json.loads(_http_get_bytes(url))
        except (ValueError, UnicodeError) as exc:
            raise DownloadFailedError(f"Malformed GitHub releases response from {url}.") from exc

    release = None
    if requested_version and "-" in requested_version:
        release = get_json(f"{DEFAULT_DOWNLOAD_URL}/tags/v{requested_version}")
        if _github_release_version(release) != requested_version:
            raise ChecksumMismatchError("GitHub release tag does not match requested version.")
    elif requested_version is None and channel == "stable":
        try:
            latest = get_json(f"{DEFAULT_DOWNLOAD_URL}/latest")
        except DownloadFailedError as exc:
            if exc.details.get("status") != 404:
                raise
        else:
            if _github_release_version(latest, channel=channel) is not None:
                release = latest

    page = 1
    while release is None:
        releases = get_json(f"{DEFAULT_DOWNLOAD_URL}?per_page=100&page={page}")
        if not isinstance(releases, list):
            raise DownloadFailedError("Malformed GitHub release list; expected an array.")
        for candidate in releases:
            version = _github_release_version(candidate, channel=channel)
            if version and (requested_version is None or _version_matches(version, requested_version)):
                release = candidate
                break
        if release is None and len(releases) < 100:
            raise DownloadFailedError(
                f"No published Ombra browser release on GitHub for channel {channel!r}"
                + (f" matching {requested_version!r}." if requested_version else ".")
            )
        page += 1

    version = _github_release_version(release)
    assert version is not None
    asset = _github_asset(release, "release.json", version)
    raw = _http_get_bytes(asset["browser_download_url"])
    entry = _github_signed_release_entry(release, raw, plat)
    evidence = json.dumps({
        "source": DEFAULT_DOWNLOAD_URL, "channel": channel,
        "release": release, "envelope": raw.decode("utf-8"),
    }) if requested_version is None else None
    return _ReleaseEntry(entry.version, entry.url, entry.sha256, entry.size, evidence)


def _resolve_release_entry(
    base_url: str,
    plat: PlatformInfo,
    *,
    requested_version: str | None,
    channel: str,
) -> _ReleaseEntry:
    """Fetch and verify channel/release metadata.

    The default source is GitHub Releases; explicit mirrors retain signed channels.
    """
    if base_url == DEFAULT_DOWNLOAD_URL:
        return _resolve_github_release_entry(plat, requested_version=requested_version, channel=channel)
    if requested_version and "-" not in requested_version:
        channel_entry = _resolve_release_entry(base_url, plat, requested_version=None, channel=channel)
        if not _version_matches(channel_entry.version, requested_version):
            raise UnsupportedEngineError(
                f"Channel {channel!r} provides {channel_entry.version!r}, which does not match "
                f"requested Chromium version {requested_version!r}. "
                "Specify the full engine release version, including its '-N' suffix."
            )
        return channel_entry

    if requested_version:
        manifest_url = f"{base_url}/engine/releases/{requested_version}/release.json"
        raw = _http_get_bytes(manifest_url)
        release = _verify_ed25519_envelope(raw)
        declared_version = release.get("version")
        if declared_version != requested_version:
            raise ChecksumMismatchError(
                f"Release manifest version mismatch: requested {requested_version!r}, "
                f"got {declared_version!r}."
            )
        platforms = release.get("platforms") or {}
        entry = platforms.get(plat.cdn_name)
        if not isinstance(entry, dict):
            raise UnsupportedPlatformError(
                f"Engine {requested_version} has no build for {plat.sdk_name}."
            )
        filename = entry.get("file")
        sha256 = str(entry.get("sha256", "")).lower()
        size = entry.get("size")
        if not isinstance(filename, str) or not _SHA256_RE.fullmatch(sha256):
            raise ChecksumMismatchError("Release manifest entry is missing file or valid sha256.")
        check_engine_compatibility(requested_version)
        return _ReleaseEntry(
            requested_version,
            f"{base_url}/engine/releases/{requested_version}/{filename}",
            sha256,
            int(size) if isinstance(size, int) else None,
        )

    channel_url = f"{base_url}/engine/channels/{channel}.json"
    raw = _http_get_bytes(channel_url)
    chan_doc = _verify_ed25519_envelope(raw)
    if chan_doc.get("channel") != channel:
        raise ChecksumMismatchError(
            f"Signed channel mismatch: requested {channel!r}, got {chan_doc.get('channel')!r}."
        )
    serial = chan_doc.get("serial")
    if not isinstance(serial, int) or serial <= 0:
        raise ChecksumMismatchError("Signed channel manifest has invalid serial.")

    serial_path = _serial_marker_path(channel)
    try:
        prev_serial = int(serial_path.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        prev_serial = 0
    if serial < prev_serial:
        raise ChecksumMismatchError(
            f"Signed channel serial rollback detected ({serial} < {prev_serial})."
        )

    platforms = chan_doc.get("platforms") or {}
    entry = platforms.get(plat.cdn_name)
    if not isinstance(entry, dict):
        raise UnsupportedPlatformError(
            f"No engine build on {channel!r} channel for {plat.sdk_name}."
        )
    version = entry.get("version")
    rel_path = entry.get("path")
    sha256 = str(entry.get("sha256", "")).lower()
    size = entry.get("size")
    if (
        not isinstance(version, str)
        or not isinstance(rel_path, str)
        or not _SHA256_RE.fullmatch(sha256)
    ):
        raise ChecksumMismatchError("Channel platform entry is malformed.")
    check_engine_compatibility(version)
    expected_path = (
        f"/engine/releases/{version}/ombra-engine-{version}-{plat.cdn_name}{plat.archive_ext}"
    )
    if rel_path != expected_path:
        raise ChecksumMismatchError(
            f"Channel path {rel_path!r} does not match expected canonical path {expected_path!r}."
        )

    _write_text_atomic(serial_path, str(serial))
    return _ReleaseEntry(
        version,
        f"{base_url}{rel_path}",
        sha256,
        int(size) if isinstance(size, int) else None,
    )


def _safe_extract_zip(archive: Path, dest_dir: Path) -> None:
    root = dest_dir.resolve()
    with zipfile.ZipFile(archive, "r") as zf:
        for info in zf.infolist():
            mode = (info.external_attr >> 16) & 0o170000
            if mode == stat.S_IFLNK:
                raise ChecksumMismatchError(
                    f"Archive contains unsupported symlink entry: {info.filename}"
                )
            target = (dest_dir / info.filename).resolve()
            if not target.is_relative_to(root):
                raise ChecksumMismatchError(
                    f"Archive entry escapes destination directory: {info.filename}"
                )
        zf.extractall(dest_dir)


def _safe_extract_tar(archive: Path, dest_dir: Path) -> None:
    root = dest_dir.resolve()
    mode = "r:xz" if str(archive).endswith(".xz") else "r:gz"
    with tarfile.open(archive, mode) as tf:
        members = tf.getmembers()
        for member in members:
            if member.isdev():
                raise ChecksumMismatchError(
                    f"Archive contains device node: {member.name}"
                )
            member_path = Path(member.name)
            if member_path.is_absolute() or ".." in member_path.parts:
                raise ChecksumMismatchError(
                    f"Archive entry escapes destination directory: {member.name}"
                )
            resolved_target = (dest_dir / member_path).resolve()
            if not resolved_target.is_relative_to(root):
                raise ChecksumMismatchError(
                    f"Archive entry escapes destination directory: {member.name}"
                )
            if member.issym() or member.islnk():
                link_target = Path(member.linkname)
                if link_target.is_absolute():
                    raise ChecksumMismatchError(
                        f"Archive contains absolute link target: {member.name} -> {member.linkname}"
                    )
                base_dir = resolved_target.parent if member.issym() else root
                resolved_link = (base_dir / link_target).resolve()
                if not resolved_link.is_relative_to(root):
                    raise ChecksumMismatchError(
                        f"Archive link escapes destination directory: {member.name}"
                    )
            # Validate after earlier links exist so symlink chains cannot escape the root.
            try:
                tf.extract(member, dest_dir, filter="fully_trusted")
            except TypeError:
                tf.extract(member, dest_dir)


def _flatten_single_subdir(staging_dir: Path) -> None:
    entries = list(staging_dir.iterdir())
    if len(entries) == 1 and entries[0].is_dir() and not entries[0].name.endswith(".app"):
        subdir = entries[0]
        for item in subdir.iterdir():
            shutil.move(str(item), str(staging_dir / item.name))
        subdir.rmdir()


@contextlib.contextmanager
def _engine_cache_lock() -> Iterator[None]:
    from .profile import _acquire_os_flock, _release_os_flock

    # Keep the lock outside engines so clear_cache cannot unlink its inode.
    lock_path = get_cache_dir() / ".engine-install.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with open(lock_path, "a+b") as fh:
        deadline = time.monotonic() + 300
        while not _acquire_os_flock(fh):
            if time.monotonic() >= deadline:
                raise DownloadFailedError("Timed out waiting for the engine cache lock.")
            time.sleep(0.05)
        try:
            yield
        finally:
            _release_os_flock(fh)


def _verified_cached_release(version: str, plat: PlatformInfo) -> ResolvedBinary | None:
    match = _resolve_cache_binary(plat, version, "stable")
    if match is None:
        return None
    path, hint = match
    try:
        ver, sha = verify_binary(
            path, plat=plat, fallback_version=hint,
            requested_version=version, require_receipt=True,
        )
    except (BinaryNotFoundError, ChecksumMismatchError, UnsupportedEngineError, UnsupportedPlatformError):
        return None
    return ResolvedBinary(ver, plat.sdk_name, path, True, "cache", sha)


@_engine_cache_lock()
def _install_archive(
    archive_path: Path,
    version: str,
    archive_sha256: str,
    plat: PlatformInfo,
) -> Path:
    cached = _verified_cached_release(version, plat)
    if cached is not None:
        assert cached.path is not None
        return cached.path

    dest_dir = get_managed_engines_dir() / version
    dest_dir.parent.mkdir(parents=True, exist_ok=True)
    staging_dir = dest_dir.with_name(f"{version}.partial-{uuid.uuid4().hex}")
    staging_dir.mkdir(parents=True, exist_ok=True)
    try:
        if str(archive_path).endswith(".zip"):
            _safe_extract_zip(archive_path, staging_dir)
        else:
            _safe_extract_tar(archive_path, staging_dir)
        _flatten_single_subdir(staging_dir)

        staged_bin = next(
            (p for p in _binary_candidates_in_dir(staging_dir, plat.system) if p.is_file()),
            None,
        )
        if staged_bin is None:
            raise DownloadFailedError(
                f"Extracted archive for {version} did not contain expected binary.",
                details={"version": version, "platform": plat.sdk_name},
            )

        if plat.system != "Windows":
            current_mode = staged_bin.stat().st_mode
            staged_bin.chmod(current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        if plat.system == "Darwin":
            with contextlib.suppress(Exception):
                subprocess.run(["xattr", "-cr", str(staging_dir)], capture_output=True, timeout=30)

        bin_sha = compute_sha256(staged_bin)
        (staging_dir / "archive.sha256").write_text(archive_sha256 + "\n", encoding="utf-8")
        (staging_dir / "binary.sha256").write_text(bin_sha + "\n", encoding="utf-8")

        verify_binary(
            staged_bin, plat=plat, fallback_version=version,
            requested_version=version, require_receipt=True,
        )
        stale = dest_dir.with_name(f"{version}.stale-{uuid.uuid4().hex}")
        if dest_dir.exists():
            os.replace(dest_dir, stale)
        try:
            os.replace(staging_dir, dest_dir)
        except OSError:
            if stale.exists():
                os.replace(stale, dest_dir)
            raise
        else:
            shutil.rmtree(stale, ignore_errors=True)
    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)

    final_bin = next(
        (p for p in _binary_candidates_in_dir(dest_dir, plat.system) if p.is_file()),
        None,
    )
    if final_bin is None:
        raise DownloadFailedError(f"Installed binary missing under {dest_dir}.")
    return final_bin


def _download_with_retries(
    *,
    base_url: str,
    plat: PlatformInfo,
    requested_version: str | None,
    channel: str,
    release: _ReleaseEntry | None = None,
) -> ResolvedBinary:
    last_err: Exception | None = None
    for attempt in range(_DOWNLOAD_RETRIES + 1):
        try:
            entry = release or _resolve_release_entry(
                base_url,
                plat,
                requested_version=requested_version,
                channel=channel,
            )
            version, archive_url = entry.version, entry.url
            expected_sha, expected_size = entry.sha256, entry.size
            resolved = _verified_cached_release(version, plat)
            if resolved is None:
                with tempfile.NamedTemporaryFile(suffix=plat.archive_ext, delete=False) as tmp:
                    tmp_path = Path(tmp.name)
                try:
                    _http_download_file(archive_url, tmp_path, expected_size=expected_size)
                    actual_archive_sha = compute_sha256(tmp_path)
                    if not skip_checksum_enabled() and actual_archive_sha != expected_sha:
                        raise ChecksumMismatchError(
                            f"Archive SHA-256 mismatch for {version}: "
                            f"expected {expected_sha}, got {actual_archive_sha}.",
                            details={
                                "version": version,
                                "expected_sha256": expected_sha,
                                "actual_sha256": actual_archive_sha,
                            },
                        )
                    bin_path = _install_archive(tmp_path, version, actual_archive_sha, plat)
                finally:
                    tmp_path.unlink(missing_ok=True)

                ver, bin_sha = verify_binary(
                    bin_path,
                    plat=plat,
                    fallback_version=version,
                    requested_version=version,
                    require_receipt=True,
                )
                resolved = ResolvedBinary(
                    version=ver,
                    platform=plat.sdk_name,
                    path=bin_path,
                    installed=True,
                    source="download",
                    sha256=bin_sha,
                )

            if requested_version is None:
                if entry.github_evidence is not None:
                    _write_text_atomic(_github_latest_marker_path(channel, plat), entry.github_evidence)
                else:
                    _write_text_atomic(_latest_marker_path(channel, plat), version)
                _write_text_atomic(_last_update_check_path(channel, plat), str(time.time()))
            return resolved
        except (ChecksumMismatchError, UnsupportedPlatformError, UnsupportedEngineError):
            raise
        except DownloadFailedError as exc:
            last_err = exc
            if attempt < _DOWNLOAD_RETRIES:
                time.sleep(0.5 * (2**attempt))
                continue
            raise
        except Exception as exc:
            last_err = exc
            if attempt < _DOWNLOAD_RETRIES:
                time.sleep(0.5 * (2**attempt))
                continue
            raise DownloadFailedError(f"Failed to download Ombra engine: {exc}") from exc

    raise DownloadFailedError(f"Failed to download Ombra engine: {last_err}")


def _should_check_auto_update(channel: str, plat: PlatformInfo) -> bool:
    if not get_auto_update():
        return False
    marker = _last_update_check_path(channel, plat)
    try:
        elapsed = time.time() - float(marker.read_text(encoding="utf-8").strip())
        return elapsed >= _UPDATE_CHECK_INTERVAL_S
    except (OSError, ValueError):
        return True


def resolve_binary(
    *,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    download: bool = True,
    release_channel: str | None = None,
    force_update_check: bool = False,
) -> ResolvedBinary:
    """Resolve, verify, and optionally download the Ombra Chromium engine binary."""
    plat = get_platform_info()
    requested_version = normalize_requested_version(version)
    channel = get_release_channel(release_channel)

    local = _resolve_local_binary(
        binary_path=binary_path,
        requested_version=requested_version,
        channel=channel,
        plat=plat,
    )

    if local.source in {"argument", "env", "app"}:
        return local

    base_url = get_download_base_url()

    # If a cached build exists and unpinned auto-update is due, check for newer release.
    if (
        local.installed
        and local.source == "cache"
        and download
        and base_url is not None
        and requested_version is None
        and (force_update_check or _should_check_auto_update(channel, plat))
    ):
        try:
            latest = _resolve_release_entry(
                base_url, plat, requested_version=None, channel=channel
            )
            _write_text_atomic(_last_update_check_path(channel, plat), str(time.time()))
            if version_newer(latest.version, local.version):
                updated = _download_with_retries(
                    base_url=base_url,
                    plat=plat,
                    requested_version=None,
                    channel=channel,
                    release=latest,
                )
                return updated
        except (ChecksumMismatchError, UnsupportedEngineError):
            raise
        except Exception as exc:
            logger.warning("Engine auto-update check failed; using cached %s: %s", local.version, exc)

    if local.installed:
        return local

    if not download:
        raise BinaryNotFoundError(
            "Ombra engine binary not found and automatic download is disabled. "
            "Run ensure_binary() or set OMBRA_BINARY_PATH / binary_path.",
            details={"platform": plat.sdk_name, "version": requested_version or DEFAULT_ENGINE_VERSION},
        )

    if base_url is None:
        raise BinaryNotFoundError(
            "Ombra engine binary not found and OMBRA_DOWNLOAD_URL is disabled. "
            "Run ensure_binary() with a download URL or set OMBRA_BINARY_PATH.",
            details={"platform": plat.sdk_name},
        )

    return _download_with_retries(
        base_url=base_url,
        plat=plat,
        requested_version=requested_version,
        channel=channel,
    )


def ensure_binary(
    *,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    release_channel: str | None = None,
) -> str:
    """Ensure the Ombra engine binary is available and verified, returning its path."""
    resolved = resolve_binary(
        binary_path=binary_path,
        version=version,
        download=True,
        release_channel=release_channel,
    )
    if not resolved.installed or resolved.path is None:
        raise BinaryNotFoundError("Could not resolve or download Ombra engine binary.")
    return str(resolved.path)


def binary_info(
    *,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    release_channel: str | None = None,
) -> dict[str, Any]:
    """Return binary metadata matching spec/schemas/binary-info.schema.json."""
    plat = get_platform_info()
    requested_version = normalize_requested_version(version)
    channel = get_release_channel(release_channel)
    try:
        resolved = _resolve_local_binary(
            binary_path=binary_path,
            requested_version=requested_version,
            channel=channel,
            plat=plat,
        )
        return resolved.to_binary_info()
    except (BinaryNotFoundError, ChecksumMismatchError, UnsupportedEngineError, UnsupportedPlatformError) as exc:
        logger.debug("binary_info verification incomplete: %s", exc)
        return {
            "version": requested_version or DEFAULT_ENGINE_VERSION,
            "platform": plat.sdk_name,
            "path": None,
            "installed": False,
            "source": "none",
            "sha256": None,
        }


def clear_cache() -> None:
    """Remove SDK-managed engine binaries while preserving named profiles and keys."""
    engines_dir = get_managed_engines_dir()
    if engines_dir.exists():
        shutil.rmtree(engines_dir)
        logger.info("Cleared SDK engine cache at %s", engines_dir)

    # Remove any leftover staging/partial siblings if present.
    cache_dir = get_cache_dir()
    if cache_dir.is_dir():
        for entry in cache_dir.iterdir():
            if entry.name.startswith("engines.partial-") or entry.name.startswith("engines.stale-"):
                shutil.rmtree(entry, ignore_errors=True)
