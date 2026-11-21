"""Named profiles, .ombra/profile.json seed persistence, and OS process locks."""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import get_profiles_dir, logger
from .errors import InvalidOptionError, ProfileBusyError

PROFILE_META_DIR = ".ombra"
PROFILE_META_FILE = "profile.json"
PROFILE_LOCK_FILE = "profile.lock"

_UNSAFE_SLUG_RE = re.compile(r"[^a-z0-9_-]+")
_MULTI_DASH_RE = re.compile(r"-{2,}")

# Tracks active profile directories locked by the current Python process so
# concurrent calls inside one process also fail deterministically with ProfileBusy.
_ACTIVE_LOCKS_GUARD = threading.Lock()
_ACTIVE_LOCKS: set[Path] = set()


def generate_seed() -> int:
    """Generate a CSPRNG persona seed safe across 64-bit engines and JSON."""
    return secrets.randbelow((1 << 53) - 10_000) + 10_000


def _raw_slug(name: str) -> str:
    lowered = name.strip().lower()
    cleaned = _UNSAFE_SLUG_RE.sub("-", lowered)
    cleaned = _MULTI_DASH_RE.sub("-", cleaned).strip("-")
    return cleaned or "profile"


def resolve_named_profile_dir(name: str) -> Path:
    """Resolve ``OMBRA_CACHE_DIR/profiles/<slug>`` with deterministic collision handling."""
    if not isinstance(name, str) or not name.strip():
        raise InvalidOptionError("profile must be a non-empty string.")
    profiles_root = get_profiles_dir()
    base_slug = _raw_slug(name)
    suffix = hashlib.sha256(name.encode("utf-8")).hexdigest()[:8]
    suffixed_slug = f"{base_slug}-{suffix}"
    candidates = [
        profiles_root / base_slug,
        profiles_root / suffixed_slug,
        *sorted(profiles_root.glob(f"{suffixed_slug}-*")),
    ]
    # Reuse an owned suffix even when the original base profile was deleted.
    for candidate in candidates:
        meta = read_profile_metadata(candidate)
        if meta is not None and meta.get("name") == name:
            return candidate

    candidate = profiles_root / base_slug
    collision = 0
    while True:
        meta = read_profile_metadata(candidate)
        if meta is None or meta.get("name") in (None, name):
            return candidate
        slug = suffixed_slug if collision == 0 else f"{suffixed_slug}-{collision}"
        candidate = profiles_root / slug
        collision += 1


def _meta_path(profile_dir: Path) -> Path:
    return profile_dir / PROFILE_META_DIR / PROFILE_META_FILE


def _lock_path(profile_dir: Path) -> Path:
    return profile_dir / PROFILE_META_DIR / PROFILE_LOCK_FILE


def read_profile_metadata(profile_dir: Path) -> dict[str, Any] | None:
    """Read ``<profile_dir>/.ombra/profile.json`` if present and valid."""
    path = _meta_path(profile_dir)
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def write_profile_metadata(profile_dir: Path, data: dict[str, Any]) -> None:
    """Atomically write ``<profile_dir>/.ombra/profile.json`` (no credentials)."""
    path = _meta_path(profile_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f"{path.name}.{secrets.token_hex(6)}.tmp")
    payload = json.dumps(data, indent=2, sort_keys=True) + "\n"
    try:
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(payload)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            tmp.unlink()
        raise


def _process_start_time(pid: int) -> str | None:
    """Best-effort OS start timestamp for *pid* to distinguish PID reuse."""
    if sys.platform.startswith("linux"):
        try:
            stat_text = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8")
            rparen = stat_text.rfind(")")
            if rparen != -1:
                fields = stat_text[rparen + 2 :].split()
                if len(fields) > 19:
                    return fields[19]
        except OSError:
            return None
    if os.name == "posix":
        try:
            res = subprocess.run(
                ["ps", "-p", str(pid), "-o", "lstart="],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except (OSError, subprocess.SubprocessError):
            return None
    return None


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        import ctypes

        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return False
        try:
            exit_code = ctypes.c_ulong()
            ok = ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
            STILL_ACTIVE = 259
            return bool(ok and exit_code.value == STILL_ACTIVE)
        finally:
            ctypes.windll.kernel32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False


def _is_stale_lock(payload: dict[str, Any]) -> bool:
    pid = payload.get("pid")
    if not isinstance(pid, int) or pid <= 0:
        return True
    if not _pid_alive(pid):
        return True
    recorded_start = payload.get("process_start_time")
    if recorded_start:
        current_start = _process_start_time(pid)
        if current_start is not None and current_start != recorded_start:
            return True
    return False


def _acquire_os_flock(fh: Any) -> bool:
    """Try non-blocking exclusive OS lock on *fh*. Returns False if busy."""
    if os.name == "nt":
        import msvcrt

        try:
            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
            return True
        except OSError:
            return False
    import fcntl

    try:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except (BlockingIOError, OSError):
        return False


def _release_os_flock(fh: Any) -> None:
    if os.name == "nt":
        import msvcrt

        with contextlib.suppress(OSError):
            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)
        return
    import fcntl

    with contextlib.suppress(OSError):
        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)


@dataclass
class ProfileLease:
    """Resolved profile directory, persona seed, and active lock handle."""

    path: Path
    name: str | None
    seed: int
    ephemeral: bool
    os_hint: str | None = None
    timezone: str | None = None
    locale: str | None = None
    humanize_preset: str | None = None
    _lock_fh: Any = None
    _canonical_dir: Path | None = None
    _released: bool = False

    def release(self) -> None:
        """Release the profile lock and clean up ephemeral temp directories."""
        if self._released:
            return
        self._released = True

        if self._lock_fh is not None:
            # Keep the inode: another process may already have this file open.
            with contextlib.suppress(OSError):
                self._lock_fh.seek(0)
                self._lock_fh.truncate()
                self._lock_fh.flush()
            _release_os_flock(self._lock_fh)
            with contextlib.suppress(OSError):
                self._lock_fh.close()
            self._lock_fh = None

        if self._canonical_dir is not None:
            with _ACTIVE_LOCKS_GUARD:
                _ACTIVE_LOCKS.discard(self._canonical_dir)
            self._canonical_dir = None

        if self.ephemeral:
            shutil.rmtree(self.path, ignore_errors=True)


def acquire_profile_lease(
    *,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    explicit_seed: int | None = None,
    os_hint: str | None = None,
    timezone: str | None = None,
    locale: str | None = None,
    humanize_preset: str | None = None,
    engine_version: str | None = None,
) -> ProfileLease:
    """Resolve the profile directory, lock it, and resolve/persist persona metadata."""
    if profile is not None and user_data_dir is not None:
        raise InvalidOptionError(
            "Options 'profile' and 'user_data_dir' are mutually exclusive."
        )

    ephemeral = False
    if profile is not None:
        profile_dir = resolve_named_profile_dir(profile)
        profile_dir.mkdir(parents=True, exist_ok=True)
    elif user_data_dir is not None:
        raw_dir = os.fspath(user_data_dir)
        if not raw_dir.strip():
            raise InvalidOptionError("user_data_dir must be a non-empty path.")
        profile_dir = Path(raw_dir).expanduser()
        profile_dir.mkdir(parents=True, exist_ok=True)
    else:
        profile_dir = Path(tempfile.mkdtemp(prefix="ombra-profile-"))
        ephemeral = True

    canonical = profile_dir.resolve()
    with _ACTIVE_LOCKS_GUARD:
        if canonical in _ACTIVE_LOCKS:
            raise ProfileBusyError(
                f"Profile directory is already in use by this process: {profile_dir}",
                details={"profile": profile, "path": str(profile_dir)},
            )
        _ACTIVE_LOCKS.add(canonical)

    lock_fh = None
    lock_owned = False
    try:
        lock_file = _lock_path(profile_dir)
        lock_file.parent.mkdir(parents=True, exist_ok=True)

        # Open without truncating so an existing flock holder's metadata stays intact.
        lock_fh = open(lock_file, "a+", encoding="utf-8")
        if not _acquire_os_flock(lock_fh):
            raise ProfileBusyError(
                f"Profile is locked by another running Ombra instance: {profile_dir}",
                details={"profile": profile, "path": str(profile_dir)},
            )

        lock_fh.seek(0)
        existing_raw = lock_fh.read().strip()
        if existing_raw:
            with contextlib.suppress(json.JSONDecodeError):
                existing = json.loads(existing_raw)
                if isinstance(existing, dict) and not _is_stale_lock(existing):
                    raise ProfileBusyError(
                        f"Profile is busy (held by PID {existing.get('pid')}): {profile_dir}",
                        details={"profile": profile, "path": str(profile_dir)},
                    )
                if isinstance(existing, dict):
                    logger.debug(
                        "Clearing stale profile lock for PID %s in %s",
                        existing.get("pid"),
                        profile_dir,
                    )

        lock_owned = True
        lock_payload = {
            "pid": os.getpid(),
            "started_at": datetime.now(timezone_utc()).isoformat(),
            "process_start_time": _process_start_time(os.getpid()),
        }
        lock_fh.seek(0)
        lock_fh.truncate()
        lock_fh.write(json.dumps(lock_payload) + "\n")
        lock_fh.flush()
        os.fsync(lock_fh.fileno())
    except BaseException:
        if lock_fh is not None:
            if lock_owned:
                with contextlib.suppress(OSError):
                    lock_fh.seek(0)
                    lock_fh.truncate()
                    lock_fh.flush()
            _release_os_flock(lock_fh)
            with contextlib.suppress(OSError):
                lock_fh.close()
        with _ACTIVE_LOCKS_GUARD:
            _ACTIVE_LOCKS.discard(canonical)
        if ephemeral:
            shutil.rmtree(profile_dir, ignore_errors=True)
        raise

    try:
        resolved_seed, meta_os, meta_tz, meta_locale, meta_preset = _sync_profile_metadata(
            profile_dir=profile_dir,
            profile_name=profile,
            ephemeral=ephemeral,
            explicit_seed=explicit_seed,
            os_hint=os_hint,
            timezone=timezone,
            locale=locale,
            humanize_preset=humanize_preset,
            engine_version=engine_version,
        )
    except BaseException:
        lease = ProfileLease(
            path=profile_dir,
            name=profile,
            seed=0,
            ephemeral=ephemeral,
            _lock_fh=lock_fh,
            _canonical_dir=canonical,
        )
        lease.release()
        raise

    return ProfileLease(
        path=profile_dir,
        name=profile,
        seed=resolved_seed,
        ephemeral=ephemeral,
        os_hint=meta_os,
        timezone=meta_tz,
        locale=meta_locale,
        humanize_preset=meta_preset,
        _lock_fh=lock_fh,
        _canonical_dir=canonical,
    )


def timezone_utc() -> timezone:
    return timezone.utc


def _sync_profile_metadata(
    *,
    profile_dir: Path,
    profile_name: str | None,
    ephemeral: bool,
    explicit_seed: int | None,
    os_hint: str | None,
    timezone: str | None,
    locale: str | None,
    humanize_preset: str | None,
    engine_version: str | None,
) -> tuple[int, str | None, str | None, str | None, str | None]:
    """Apply contract §7 seed/metadata precedence and persist non-secret profile metadata."""
    if ephemeral:
        seed = explicit_seed if explicit_seed is not None else generate_seed()
        return seed, os_hint, timezone, locale, humanize_preset

    existing = read_profile_metadata(profile_dir) or {}
    if profile_name is not None and existing.get("name") not in (None, profile_name):
        raise ProfileBusyError(
            f"Profile ownership changed during acquisition; retry: {profile_dir}",
            details={"profile": profile_name, "path": str(profile_dir)},
        )
    persisted_seed = existing.get("seed")
    if not isinstance(persisted_seed, int) or isinstance(persisted_seed, bool) or persisted_seed < 0:
        persisted_seed = None

    if explicit_seed is not None:
        seed = explicit_seed
        if persisted_seed is not None and persisted_seed != explicit_seed:
            logger.info(
                "Updating persona seed for profile %s (%s -> %s)",
                profile_name or profile_dir.name,
                persisted_seed,
                explicit_seed,
            )
    elif persisted_seed is not None:
        seed = persisted_seed
    else:
        seed = generate_seed()

    effective_os = os_hint if os_hint is not None else _opt_str(existing.get("os"))
    effective_tz = timezone if timezone is not None else _opt_str(existing.get("timezone"))
    effective_locale = locale if locale is not None else _opt_str(existing.get("locale"))
    effective_preset = (
        humanize_preset if humanize_preset is not None else _opt_str(existing.get("humanize_preset"))
    )

    now = datetime.now(timezone_utc()).isoformat()
    meta: dict[str, Any] = {
        "seed": seed,
        "created_at": existing.get("created_at") or now,
        "updated_at": now,
    }
    effective_name = profile_name if profile_name is not None else existing.get("name")
    if effective_name is not None:
        meta["name"] = effective_name
    if effective_os is not None:
        meta["os"] = effective_os
    if effective_tz is not None and effective_tz != "auto":
        meta["timezone"] = effective_tz
    if effective_locale is not None and effective_locale != "auto":
        meta["locale"] = effective_locale
    if effective_preset is not None:
        meta["humanize_preset"] = effective_preset
    if engine_version is not None:
        meta["engine_version"] = existing.get("engine_version") or engine_version

    write_profile_metadata(profile_dir, meta)
    return seed, effective_os, effective_tz, effective_locale, effective_preset


def _opt_str(value: Any) -> str | None:
    return value if isinstance(value, str) and value.strip() else None
