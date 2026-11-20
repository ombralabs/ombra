"""Launch option validation and Ombra engine CLI switch mapping."""

from __future__ import annotations

import json
import os
import platform
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .config import get_timeout_ms, is_loopback_host, logger, normalize_requested_version
from .errors import InvalidOptionError
from .proxy import NormalizedProxy, parse_proxy

_ALLOWED_OS = frozenset({"macos", "windows", "linux"})
_ALLOWED_FINGERPRINT_KEYS = frozenset({
    "seed",
    "os",
    "os_version",
    "timezone",
    "locale",
    "screen",
    "gpu",
    "hardware_concurrency",
    "device_memory",
    "noise",
})
_ALLOWED_HUMANIZE_KEYS = frozenset({"preset"})
_ALLOWED_HUMANIZE_PRESETS = frozenset({"default", "careful", "fast"})
_ALLOWED_CAPTCHA_KEYS = frozenset({
    "solve",
    "types",
    "time_budget_ms",
    "max_attempts",
    "allow_llm",
    "manual_mode",
    "manual_resume_ms",
})
_ALLOWED_CDP_POLICY_KEYS = _ALLOWED_CAPTCHA_KEYS | frozenset({
    "enabled",
    "timeBudgetMs",
    "maxAttempts",
    "allowLLM",
    "manualMode",
    "manualResumeMs",
})
_CAPTCHA_TASK_TYPES = frozenset({
    "checkbox",
    "image-grid-3x3",
    "image-grid-4x4",
    "image-grid-4x2",
    "image-dynamic-3x3",
    "image-area",
    "audio",
    "text",
    "slider",
    "press-hold",
    "managed",
    "unknown",
    "icon-click",
    "text-click",
    "text-order",
    "icon-grid-3x3",
    "icon-swap",
    "icon-gobang",
    "spatial",
})

# Stealth invariants SI-05 / SI-07 / SI-11: flags SDK must never inject,
# and container sandbox flags that trigger a warning when passed by caller.
_WARN_USER_ARGS = frozenset({"--no-sandbox", "--disable-setuid-sandbox"})


@dataclass(frozen=True)
class ValidatedLaunchOptions:
    """Normalized launch configuration after strict contract validation."""

    headless: bool = True
    proxy: NormalizedProxy | None = None
    fingerprint: dict[str, Any] = field(default_factory=dict)
    profile: str | None = None
    user_data_dir: Path | None = None
    args: tuple[str, ...] = ()
    binary_path: Path | None = None
    version: str | None = None
    timeout_ms: int = 30_000
    humanize: bool | dict[str, Any] | None = None
    captcha: bool | dict[str, Any] | None = None
    license_key: str | None = None
    env: dict[str, str] = field(default_factory=dict)
    download: bool = True


def _reject_unknown_keys(data: dict[str, Any], allowed: frozenset[str], scope: str) -> None:
    unknown = set(data) - allowed
    if unknown:
        raise InvalidOptionError(
            f"Unknown {scope} option(s): {', '.join(sorted(unknown))}.",
            details={"scope": scope, "unknown": sorted(unknown)},
        )


def _require_bool(val: Any, name: str) -> bool:
    if not isinstance(val, bool):
        raise InvalidOptionError(f"{name} must be a boolean, got {type(val).__name__}.")
    return val


def _require_int(val: Any, name: str, *, minimum: int | None = None, maximum: int | None = None) -> int:
    if isinstance(val, bool) or not isinstance(val, int):
        raise InvalidOptionError(f"{name} must be an integer, got {type(val).__name__}.")
    if minimum is not None and val < minimum:
        raise InvalidOptionError(f"{name} must be >= {minimum}, got {val}.")
    if maximum is not None and val > maximum:
        raise InvalidOptionError(f"{name} must be <= {maximum}, got {val}.")
    return val


def _validate_fingerprint(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise InvalidOptionError(
            f"fingerprint must be an object, got {type(raw).__name__}."
        )
    _reject_unknown_keys(raw, _ALLOWED_FINGERPRINT_KEYS, "fingerprint")

    out: dict[str, Any] = {}
    if "seed" in raw and raw["seed"] is not None:
        out["seed"] = _require_int(raw["seed"], "fingerprint.seed", minimum=0)

    if "os" in raw and raw["os"] is not None:
        os_val = raw["os"]
        if not isinstance(os_val, str) or os_val not in _ALLOWED_OS:
            raise InvalidOptionError(
                f"fingerprint.os must be one of {sorted(_ALLOWED_OS)}, got {os_val!r}."
            )
        out["os"] = os_val

    if "os_version" in raw and raw["os_version"] is not None:
        ver = raw["os_version"]
        if not isinstance(ver, str) or not ver.strip():
            raise InvalidOptionError("fingerprint.os_version must be a non-empty string.")
        out["os_version"] = ver.strip()

    if "timezone" in raw and raw["timezone"] is not None:
        tz = raw["timezone"]
        if not isinstance(tz, str) or not tz.strip():
            raise InvalidOptionError("fingerprint.timezone must be an IANA zone or 'auto'.")
        out["timezone"] = tz.strip()

    if "locale" in raw and raw["locale"] is not None:
        loc = raw["locale"]
        if not isinstance(loc, str) or not loc.strip():
            raise InvalidOptionError("fingerprint.locale must be a BCP-47 tag or 'auto'.")
        out["locale"] = loc.strip()

    if "screen" in raw and raw["screen"] is not None:
        screen = raw["screen"]
        if screen == "auto":
            out["screen"] = "auto"
        elif isinstance(screen, dict):
            _reject_unknown_keys(screen, frozenset({"width", "height"}), "fingerprint.screen")
            if "width" not in screen or "height" not in screen:
                raise InvalidOptionError("fingerprint.screen requires 'width' and 'height'.")
            w = _require_int(screen["width"], "fingerprint.screen.width", minimum=320)
            h = _require_int(screen["height"], "fingerprint.screen.height", minimum=240)
            out["screen"] = {"width": w, "height": h}
        else:
            raise InvalidOptionError("fingerprint.screen must be {width, height} or 'auto'.")

    if "gpu" in raw and raw["gpu"] is not None:
        gpu = raw["gpu"]
        if gpu == "auto":
            out["gpu"] = "auto"
        elif isinstance(gpu, dict):
            _reject_unknown_keys(gpu, frozenset({"vendor", "renderer"}), "fingerprint.gpu")
            if "vendor" not in gpu or "renderer" not in gpu:
                raise InvalidOptionError("fingerprint.gpu requires 'vendor' and 'renderer'.")
            if not isinstance(gpu["vendor"], str) or not isinstance(gpu["renderer"], str):
                raise InvalidOptionError("fingerprint.gpu vendor and renderer must be strings.")
            out["gpu"] = {"vendor": gpu["vendor"], "renderer": gpu["renderer"]}
        else:
            raise InvalidOptionError("fingerprint.gpu must be {vendor, renderer} or 'auto'.")

    if "hardware_concurrency" in raw and raw["hardware_concurrency"] is not None:
        hc = raw["hardware_concurrency"]
        if hc == "auto":
            out["hardware_concurrency"] = "auto"
        else:
            out["hardware_concurrency"] = _require_int(
                hc, "fingerprint.hardware_concurrency", minimum=1
            )

    if "device_memory" in raw and raw["device_memory"] is not None:
        mem = raw["device_memory"]
        if mem == "auto":
            out["device_memory"] = "auto"
        else:
            out["device_memory"] = _require_int(mem, "fingerprint.device_memory", minimum=1)

    if "noise" in raw and raw["noise"] is not None:
        out["noise"] = _require_bool(raw["noise"], "fingerprint.noise")

    return out


def _validate_humanize(raw: Any) -> bool | dict[str, Any] | None:
    if raw is None or isinstance(raw, bool):
        return raw
    if isinstance(raw, dict):
        _reject_unknown_keys(raw, _ALLOWED_HUMANIZE_KEYS, "humanize")
        preset = raw.get("preset", "default")
        if not isinstance(preset, str) or preset not in _ALLOWED_HUMANIZE_PRESETS:
            raise InvalidOptionError(
                f"humanize.preset must be one of {sorted(_ALLOWED_HUMANIZE_PRESETS)}, got {preset!r}."
            )
        return {"preset": preset}
    raise InvalidOptionError(f"humanize must be a boolean or object, got {type(raw).__name__}.")


def _is_valid_captcha_task(task: str) -> bool:
    if task in _CAPTCHA_TASK_TYPES:
        return True
    if task.startswith("image-grid-"):
        suffix = task[len("image-grid-") :]
        return bool(suffix) and not suffix.startswith("0") and suffix.isascii() and suffix.isdigit()
    return False


def _validate_captcha_types_list(types: Any, field_name: str = "captcha.types") -> list[str] | None:
    if types is None:
        return None
    if not isinstance(types, list) or not all(isinstance(t, str) for t in types):
        raise InvalidOptionError(f"{field_name} must be a list of strings or null.")
    if len(types) > 32:
        raise InvalidOptionError(f"{field_name} supports at most 32 entries.")
    for item in types:
        if not _is_valid_captcha_task(item):
            raise InvalidOptionError(f"Unknown captcha task type {item!r}.")
    return list(types)


def normalize_captcha_policy_patch(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate and convert a snake_case or camelCase captcha policy patch for CDP/CLI."""
    if not isinstance(raw, dict):
        raise InvalidOptionError(f"captcha policy must be a dict, got {type(raw).__name__}.")
    _reject_unknown_keys(raw, _ALLOWED_CDP_POLICY_KEYS, "captcha policy")
    if "solve" in raw and "enabled" in raw:
        raise InvalidOptionError("Specify either 'solve' or 'enabled' in captcha policy, not both.")

    policy: dict[str, Any] = {}
    if "solve" in raw and raw["solve"] is not None:
        policy["enabled"] = _require_bool(raw["solve"], "captcha.solve")
    elif "enabled" in raw and raw["enabled"] is not None:
        policy["enabled"] = _require_bool(raw["enabled"], "captcha.enabled")

    if "types" in raw:
        policy["types"] = _validate_captcha_types_list(raw["types"], "captcha.types")

    for snake, camel in (
        ("time_budget_ms", "timeBudgetMs"),
        ("max_attempts", "maxAttempts"),
        ("manual_resume_ms", "manualResumeMs"),
    ):
        if snake in raw and camel in raw:
            raise InvalidOptionError(f"Specify either {snake!r} or {camel!r}, not both.")

    budget_val = raw.get("time_budget_ms", raw.get("timeBudgetMs"))
    if budget_val is not None:
        policy["timeBudgetMs"] = _require_int(
            budget_val, "captcha.time_budget_ms", minimum=1000, maximum=600_000
        )

    attempts_val = raw.get("max_attempts", raw.get("maxAttempts"))
    if attempts_val is not None:
        policy["maxAttempts"] = _require_int(
            attempts_val, "captcha.max_attempts", minimum=1, maximum=10
        )

    resume_val = raw.get("manual_resume_ms", raw.get("manualResumeMs"))
    if resume_val is not None:
        policy["manualResumeMs"] = _require_int(
            resume_val, "captcha.manual_resume_ms", minimum=0, maximum=600_000
        )

    if "allow_llm" in raw and "allowLLM" in raw:
        raise InvalidOptionError("Specify either 'allow_llm' or 'allowLLM', not both.")
    llm_val = raw.get("allow_llm", raw.get("allowLLM"))
    if llm_val is not None:
        policy["allowLLM"] = _require_bool(llm_val, "captcha.allow_llm")

    if "manual_mode" in raw and "manualMode" in raw:
        raise InvalidOptionError("Specify either 'manual_mode' or 'manualMode', not both.")
    manual_val = raw.get("manual_mode", raw.get("manualMode"))
    if manual_val is not None:
        policy["manualMode"] = _require_bool(manual_val, "captcha.manual_mode")

    return policy


def _validate_captcha(raw: Any) -> bool | dict[str, Any] | None:
    if raw is None or isinstance(raw, bool):
        return raw
    if isinstance(raw, dict):
        _reject_unknown_keys(raw, _ALLOWED_CAPTCHA_KEYS, "captcha")
        out: dict[str, Any] = {}
        if "solve" in raw and raw["solve"] is not None:
            out["solve"] = _require_bool(raw["solve"], "captcha.solve")
        if "types" in raw:
            out["types"] = _validate_captcha_types_list(raw["types"], "captcha.types")
        if "time_budget_ms" in raw and raw["time_budget_ms"] is not None:
            out["time_budget_ms"] = _require_int(
                raw["time_budget_ms"], "captcha.time_budget_ms", minimum=1000, maximum=600_000
            )
        if "max_attempts" in raw and raw["max_attempts"] is not None:
            out["max_attempts"] = _require_int(
                raw["max_attempts"], "captcha.max_attempts", minimum=1, maximum=10
            )
        if "allow_llm" in raw and raw["allow_llm"] is not None:
            out["allow_llm"] = _require_bool(raw["allow_llm"], "captcha.allow_llm")
        if "manual_mode" in raw and raw["manual_mode"] is not None:
            out["manual_mode"] = _require_bool(raw["manual_mode"], "captcha.manual_mode")
        if "manual_resume_ms" in raw and raw["manual_resume_ms"] is not None:
            out["manual_resume_ms"] = _require_int(
                raw["manual_resume_ms"], "captcha.manual_resume_ms", minimum=0, maximum=600_000
            )
        return out
    raise InvalidOptionError(f"captcha must be a boolean or object, got {type(raw).__name__}.")


def _validate_extra_args(raw: Any) -> tuple[str, ...]:
    if raw is None:
        return ()
    if not isinstance(raw, (list, tuple)) or not all(isinstance(item, str) for item in raw):
        raise InvalidOptionError("args must be a list of strings.")

    validated: list[str] = []
    for arg in raw:
        key, _, val = arg.partition("=")
        if key == "--remote-debugging-address" and not is_loopback_host(val):
            raise InvalidOptionError(
                "CDP debugging port must remain on loopback (SI-08); "
                f"refusing --remote-debugging-address={val!r}."
            )
        if key in _WARN_USER_ARGS:
            logger.warning(
                "Caller explicitly passed %s in args; disabling Chromium sandbox reduces isolation.",
                key,
            )
        validated.append(arg)
    return tuple(validated)


def _validate_env(raw: Any) -> dict[str, str]:
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise InvalidOptionError(f"env must be a mapping, got {type(raw).__name__}.")
    out: dict[str, str] = {}
    for key, val in raw.items():
        if not isinstance(key, str) or not isinstance(val, str):
            raise InvalidOptionError("env keys and values must all be strings.")
        out[key] = val
    return out


def validate_launch_options(
    *,
    headless: bool = True,
    proxy: str | dict[str, Any] | None = None,
    fingerprint: dict[str, Any] | None = None,
    profile: str | None = None,
    user_data_dir: str | os.PathLike[str] | None = None,
    args: list[str] | tuple[str, ...] | None = None,
    binary_path: str | os.PathLike[str] | None = None,
    version: str | None = None,
    timeout_ms: int | None = None,
    humanize: bool | dict[str, Any] | None = None,
    captcha: bool | dict[str, Any] | None = None,
    license_key: str | None = None,
    env: dict[str, str] | None = None,
    download: bool = True,
    extra_unknown_kwargs: dict[str, Any] | None = None,
) -> ValidatedLaunchOptions:
    """Validate all launch options against spec/schemas/launch-options.schema.json."""
    if extra_unknown_kwargs:
        unknown = sorted(extra_unknown_kwargs)
        raise InvalidOptionError(
            f"Unknown launch option(s): {', '.join(unknown)}.",
            details={"unknown_options": unknown},
        )

    if profile is not None and user_data_dir is not None:
        raise InvalidOptionError(
            "Options 'profile' and 'user_data_dir' are mutually exclusive."
        )

    if profile is not None and (not isinstance(profile, str) or not profile.strip()):
        raise InvalidOptionError("profile must be a non-empty string.")

    resolved_udd: Path | None = None
    if user_data_dir is not None:
        try:
            raw_udd = os.fspath(user_data_dir)
        except TypeError as exc:
            raise InvalidOptionError("user_data_dir must be a valid filesystem path.") from exc
        if not isinstance(raw_udd, str) or not raw_udd.strip():
            raise InvalidOptionError("user_data_dir must be a non-empty path.")
        resolved_udd = Path(raw_udd).expanduser()

    resolved_bin: Path | None = None
    if binary_path is not None:
        try:
            raw_bin = os.fspath(binary_path)
        except TypeError as exc:
            raise InvalidOptionError("binary_path must be a valid filesystem path.") from exc
        if not isinstance(raw_bin, str) or not raw_bin.strip():
            raise InvalidOptionError("binary_path must be a non-empty path.")
        resolved_bin = Path(raw_bin).expanduser()

    if license_key is not None and (not isinstance(license_key, str) or not license_key.strip()):
        raise InvalidOptionError("license_key must be a non-empty string.")

    return ValidatedLaunchOptions(
        headless=_require_bool(headless, "headless"),
        proxy=parse_proxy(proxy),
        fingerprint=_validate_fingerprint(fingerprint),
        profile=profile.strip() if isinstance(profile, str) else None,
        user_data_dir=resolved_udd,
        args=_validate_extra_args(args),
        binary_path=resolved_bin,
        version=normalize_requested_version(version),
        timeout_ms=get_timeout_ms(timeout_ms),
        humanize=_validate_humanize(humanize),
        captcha=_validate_captcha(captcha),
        license_key=license_key.strip() if isinstance(license_key, str) else None,
        env=_validate_env(env),
        download=_require_bool(download, "download"),
    )


def resolve_auto_geo_hints(
    *,
    timezone: str | None,
    locale: str | None,
    proxy: NormalizedProxy | None,
) -> tuple[str | None, str | None]:
    """Resolve ``auto`` timezone/locale hints via optional GeoIP when available."""
    need_tz = timezone == "auto"
    need_loc = locale == "auto"
    if not (need_tz or need_loc):
        return timezone, locale

    from .geoip import geoip_available, resolve_proxy_geo_with_ip

    if not geoip_available():
        logger.warning(
            "fingerprint 'auto' timezone/locale requires ombrabrowser[geoip]; leaving engine defaults."
        )
        return (None if need_tz else timezone), (None if need_loc else locale)

    proxy_url = proxy.upstream_url_for_geoip() if proxy is not None else None
    geo_tz, geo_loc, _ = resolve_proxy_geo_with_ip(proxy_url)
    return (geo_tz if need_tz else timezone), (geo_loc if need_loc else locale)


def build_engine_args(
    *,
    options: ValidatedLaunchOptions,
    profile_dir: Path,
    seed: int,
    proxy_args: list[str],
    engine_version: str | None = None,
    resolved_os: str | None = None,
    resolved_timezone: str | None = None,
    resolved_locale: str | None = None,
    resolved_humanize_preset: str | None = None,
) -> list[str]:
    """Translate validated options and profile metadata into Ombra engine switches."""
    cmd_args: list[str] = [
        f"--user-data-dir={profile_dir}",
        "--remote-debugging-port=0",
        "--no-first-run",
        "--no-default-browser-check",
    ]
    if platform.system() == "Darwin":
        cmd_args.append("--use-mock-keychain")
    if not any(a.startswith("--window-position") for a in options.args):
        cmd_args.append("--window-position=0,0")
    if options.headless:
        cmd_args.append("--headless=new")

    if options.profile:
        clean_label = "".join(ch for ch in options.profile if ord(ch) >= 32)
        if clean_label:
            cmd_args.append(f"--profile-label={clean_label}")

    cmd_args.extend(proxy_args)

    # Fingerprint switches (contract §6)
    cmd_args.append(f"--fingerprint={seed}")
    if not any(a.startswith("--fingerprint-brand") for a in options.args):
        cmd_args.append("--fingerprint-brand=chrome")

    fp = options.fingerprint
    eff_os = resolved_os or fp.get("os")
    if eff_os:
        cmd_args.append(f"--fingerprint-platform={eff_os}")
    if fp.get("os_version"):
        cmd_args.append(f"--fingerprint-platform-version={fp['os_version']}")

    eff_tz = resolved_timezone if resolved_timezone != "auto" else None
    if eff_tz:
        cmd_args.append(f"--fingerprint-timezone={eff_tz}")

    eff_locale = resolved_locale if resolved_locale != "auto" else None
    if eff_locale:
        cmd_args.append(f"--fingerprint-locale={eff_locale}")

    screen = fp.get("screen")
    if isinstance(screen, dict):
        cmd_args.append(f"--fingerprint-screen-width={screen['width']}")
        cmd_args.append(f"--fingerprint-screen-height={screen['height']}")
        if not any(a.startswith("--window-size") for a in options.args):
            target_os = eff_os or (
                "macos"
                if platform.system() == "Darwin"
                else "windows"
                if platform.system() == "Windows"
                else "linux"
            )
            taskbar = 95 if target_os == "macos" else 48 if target_os == "windows" else 0
            min_h = min(600, screen["height"])
            win_h = max(min_h, screen["height"] - taskbar)
            cmd_args.append(f"--window-size={screen['width']},{win_h}")
    elif not any(a.startswith("--window-size") for a in options.args):
        cmd_args.append("--window-size=1280,720")

    gpu = fp.get("gpu")
    if isinstance(gpu, dict):
        cmd_args.append(f"--fingerprint-gpu-vendor={gpu['vendor']}")
        cmd_args.append(f"--fingerprint-gpu-renderer={gpu['renderer']}")

    hc = fp.get("hardware_concurrency")
    if isinstance(hc, int):
        cmd_args.append(f"--fingerprint-hardware-concurrency={hc}")

    mem = fp.get("device_memory")
    if isinstance(mem, int):
        cmd_args.append(f"--fingerprint-device-memory={mem}")

    if fp.get("noise") is False:
        cmd_args.append("--disable-fingerprint-noise")

    if engine_version and not any(
        a.startswith("--fingerprint-tls-profile") for a in options.args
    ):
        major = engine_version.split(".", 1)[0]
        if major.isdigit():
            cmd_args.append(f"--fingerprint-tls-profile=chrome-{major}")

    # Humanize switches (contract §9; engine patch 135)
    humanize = options.humanize
    if humanize is False:
        cmd_args.append("--fingerprint-humanize=off")
    elif humanize is True or isinstance(humanize, dict):
        cmd_args.append("--fingerprint-humanize=on")
        cmd_args.append(f"--fingerprint-humanize-seed={seed}")
        preset = (
            humanize.get("preset")
            if isinstance(humanize, dict)
            else resolved_humanize_preset
        )
        if preset:
            cmd_args.append(f"--fingerprint-humanize-preset={preset}")

    # Captcha switches (contract §9; engine patch 970)
    captcha = options.captcha
    if captcha is True:
        cmd_args.append("--fingerprint-captcha=on")
    elif isinstance(captcha, dict):
        cmd_args.append("--fingerprint-captcha=on")
        policy = normalize_captcha_policy_patch(captcha)
        policy.setdefault("enabled", True)
        cmd_args.append(
            f"--fingerprint-captcha-policy={json.dumps(policy, separators=(',', ':'))}"
        )

    # Caller extra args passed through unchanged.
    cmd_args.extend(options.args)
    return cmd_args
