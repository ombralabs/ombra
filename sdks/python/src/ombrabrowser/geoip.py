"""Optional GeoIP-based timezone and locale detection from egress/proxy IP.

Requires the ``geoip`` extra (``pip install 'ombrabrowser[geoip]'``).
Downloads GeoLite2-City.mmdb on first use into ``<OMBRA_CACHE_DIR>/geoip/``.
"""

from __future__ import annotations

import ipaddress
import math
import os
import tempfile
import threading
import time
from pathlib import Path

from .config import get_cache_dir, logger
from .errors import ProxyError, redact_secrets

GEOIP_DB_URL = "https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb"
GEOIP_DB_FILENAME = "GeoLite2-City.mmdb"
GEOIP_UPDATE_INTERVAL = 30 * 86_400
DEFAULT_GEOIP_TIMEOUT_SECONDS = 20.0
GEOIP_TIMEOUT_ENV = "OMBRA_GEOIP_TIMEOUT_SECONDS"

_GEOIP_DOWNLOAD_LOCK = threading.Lock()

# Country ISO code -> BCP 47 locale (aligned with Ombra engine/desktop locale map).
COUNTRY_LOCALE_MAP: dict[str, str] = {
    "AE": "ar-AE", "AR": "es-AR", "AT": "de-AT", "AU": "en-AU", "AZ": "az-AZ",
    "BE": "nl-BE", "BG": "bg-BG", "BR": "pt-BR", "BY": "ru-BY", "CA": "en-CA",
    "CH": "de-CH", "CL": "es-CL", "CN": "zh-CN", "CO": "es-CO", "CY": "el-CY",
    "CZ": "cs-CZ", "DE": "de-DE", "DK": "da-DK", "EE": "et-EE", "EG": "ar-EG",
    "ES": "es-ES", "FI": "fi-FI", "FR": "fr-FR", "GB": "en-GB", "GE": "ka-GE",
    "GR": "el-GR", "HK": "zh-HK", "HR": "hr-HR", "HU": "hu-HU", "ID": "id-ID",
    "IE": "en-IE", "IL": "he-IL", "IN": "en-IN", "IT": "it-IT", "JP": "ja-JP",
    "KR": "ko-KR", "KZ": "ru-KZ", "LT": "lt-LT", "LU": "fr-LU", "LV": "lv-LV",
    "MD": "ro-MD", "MX": "es-MX", "MY": "ms-MY", "NL": "nl-NL", "NO": "nb-NO",
    "NZ": "en-NZ", "PE": "es-PE", "PH": "en-PH", "PL": "pl-PL", "PT": "pt-PT",
    "RO": "ro-RO", "RS": "sr-RS", "RU": "ru-RU", "SA": "ar-SA", "SE": "sv-SE",
    "SG": "en-SG", "SI": "sl-SI", "SK": "sk-SK", "TH": "th-TH", "TR": "tr-TR",
    "TW": "zh-TW", "UA": "uk-UA", "US": "en-US", "UZ": "uz-UZ", "VN": "vi-VN",
    "ZA": "en-ZA",
}

_IP_ECHO_URLS = (
    "https://api.ipify.org",
    "https://checkip.amazonaws.com",
    "https://ifconfig.me/ip",
)


def geoip_available() -> bool:
    """Return True if optional geoip2 dependency is importable."""
    try:
        import geoip2.database  # noqa: F401
        return True
    except ImportError:
        return False


def get_geoip_dir() -> Path:
    return get_cache_dir() / "geoip"


def _get_geoip_timeout_seconds() -> float:
    raw = os.getenv(GEOIP_TIMEOUT_ENV)
    if not raw:
        return DEFAULT_GEOIP_TIMEOUT_SECONDS
    try:
        timeout = float(raw)
    except ValueError:
        timeout = float("nan")
    if not math.isfinite(timeout):
        return DEFAULT_GEOIP_TIMEOUT_SECONDS
    return max(timeout, 0.0)


def _resolve_exit_ip(proxy_url: str | None, timeout: float) -> str | None:
    import httpx

    deadline = time.monotonic() + timeout if timeout > 0 else None
    for url in _IP_ECHO_URLS:
        try:
            remaining = max(deadline - time.monotonic(), 0.0) if deadline else 10.0
            if deadline is not None and remaining <= 0:
                return None
            resp = httpx.get(url, proxy=proxy_url or None, timeout=min(10.0, remaining))
            resp.raise_for_status()
            ip = resp.text.strip()
            ipaddress.ip_address(ip)
            return ip
        except httpx.UnsupportedProtocol:
            logger.warning(
                "SOCKS5 GeoIP lookup requires socksio: pip install 'ombrabrowser[geoip]'"
            )
            return None
        except Exception:
            continue
    return None


def _download_geoip_db(dest: Path) -> None:
    import httpx

    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_name = tempfile.mkstemp(dir=dest.parent, suffix=".tmp")
    tmp_path = Path(tmp_name)
    try:
        with os.fdopen(tmp_fd, "wb") as fh:
            with httpx.stream("GET", GEOIP_DB_URL, follow_redirects=True, timeout=300.0) as resp:
                resp.raise_for_status()
                for chunk in resp.iter_bytes(chunk_size=65_536):
                    fh.write(chunk)
        os.replace(tmp_path, dest)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def _ensure_geoip_db() -> Path | None:
    db_path = get_geoip_dir() / GEOIP_DB_FILENAME
    if db_path.exists():
        _maybe_trigger_update(db_path)
        return db_path
    with _GEOIP_DOWNLOAD_LOCK:
        if db_path.exists():
            return db_path
        try:
            _download_geoip_db(db_path)
            return db_path
        except Exception as exc:
            logger.warning("Failed to download GeoIP database: %s", exc)
            return None


def _maybe_trigger_update(db_path: Path) -> None:
    try:
        if time.time() - db_path.stat().st_mtime < GEOIP_UPDATE_INTERVAL:
            return
    except OSError:
        return

    def _bg() -> None:
        if not _GEOIP_DOWNLOAD_LOCK.acquire(blocking=False):
            return
        try:
            _download_geoip_db(db_path)
        except Exception:
            logger.debug("Background GeoIP update failed", exc_info=True)
        finally:
            _GEOIP_DOWNLOAD_LOCK.release()

    threading.Thread(target=_bg, daemon=True).start()


def resolve_proxy_geo_with_ip(
    proxy_url: str | None,
) -> tuple[str | None, str | None, str | None]:
    """Resolve ``(timezone, locale, exit_ip)`` for a proxy or direct egress."""
    try:
        import geoip2.database
    except ImportError as exc:
        raise ImportError(
            "geoip2 is required for automatic GeoIP timezone/locale resolution. "
            "Install with: pip install 'ombrabrowser[geoip]'"
        ) from exc

    db_path = _ensure_geoip_db()
    if db_path is None:
        raise ProxyError("GeoIP database is unavailable.")

    timeout = _get_geoip_timeout_seconds()
    ip = _resolve_exit_ip(proxy_url, timeout=timeout)
    if ip is None:
        raise ProxyError("GeoIP resolution failed: could not discover egress IP.")

    try:
        with geoip2.database.Reader(str(db_path)) as reader:
            resp = reader.city(ip)
            tz = resp.location.time_zone
            country = resp.country.iso_code
            locale = COUNTRY_LOCALE_MAP.get(country, "en-US") if country else "en-US"
            return tz, locale, ip
    except Exception as exc:
        raise ProxyError(redact_secrets(f"GeoIP lookup failed for {ip}: {exc}")) from exc
