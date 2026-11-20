"""Tests for launch option validation and Ombra engine CLI switch mapping."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pytest

from ombrabrowser.errors import InvalidOptionError, OmbraError, redact_secrets
from ombrabrowser.options import build_engine_args, validate_launch_options
from ombrabrowser.proxy import parse_proxy


def test_rejects_unknown_top_level_options():
    with pytest.raises(InvalidOptionError) as exc_info:
        validate_launch_options(extra_unknown_kwargs={"stealth_mode": True, "bogus": 1})
    assert exc_info.value.kind == "InvalidOption"
    assert "bogus" in str(exc_info.value)


def test_profile_and_user_data_dir_are_mutually_exclusive(tmp_path: Path):
    with pytest.raises(InvalidOptionError) as exc_info:
        validate_launch_options(profile="main", user_data_dir=tmp_path)
    assert exc_info.value.kind == "InvalidOption"


def test_rejects_unknown_nested_keys():
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"seed": 1, "canvas_hack": True})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(humanize={"preset": "default", "speed": 99})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(captcha={"unknown": 1})


def test_validates_fingerprint_ranges_and_enums():
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"seed": -1})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"seed": True})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"os": "android"})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"screen": {"width": 100, "height": 800}})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"hardware_concurrency": 0})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"device_memory": 0})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(fingerprint={"noise": "yes"})


def test_validates_humanize_and_captcha_options():
    with pytest.raises(InvalidOptionError):
        validate_launch_options(humanize={"preset": "turbo"})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(captcha={"time_budget_ms": 500})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(captcha={"max_attempts": 11})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(captcha={"types": ["unknown-task-type-xyz"]})
    with pytest.raises(InvalidOptionError):
        validate_launch_options(captcha={"types": ["image-grid-٣"]})

    opts = validate_launch_options(
        humanize={"preset": "careful"},
        captcha={
            "solve": False,
            "types": ["checkbox", "image-grid-9"],
            "time_budget_ms": 45000,
            "max_attempts": 5,
            "allow_llm": True,
            "manual_mode": True,
            "manual_resume_ms": 2000,
        },
    )
    assert opts.humanize == {"preset": "careful"}
    assert opts.captcha == {
        "solve": False,
        "types": ["checkbox", "image-grid-9"],
        "time_budget_ms": 45000,
        "max_attempts": 5,
        "allow_llm": True,
        "manual_mode": True,
        "manual_resume_ms": 2000,
    }

    detect_only_args = build_engine_args(
        options=validate_launch_options(captcha={"solve": False}),
        profile_dir=Path("/tmp/p"),
        seed=1,
        proxy_args=[],
    )
    assert "--fingerprint-captcha=on" in detect_only_args
    assert '--fingerprint-captcha-policy={"enabled":false}' in detect_only_args


def test_timeout_precedence_and_bounds(monkeypatch: pytest.MonkeyPatch):
    assert validate_launch_options().timeout_ms == 30_000
    monkeypatch.setenv("OMBRA_TIMEOUT_MS", "45000")
    assert validate_launch_options().timeout_ms == 45_000
    assert validate_launch_options(timeout_ms=12_000).timeout_ms == 12_000

    with pytest.raises(InvalidOptionError):
        validate_launch_options(timeout_ms=500)
    with pytest.raises(InvalidOptionError):
        validate_launch_options(timeout_ms=700_000)


def test_build_engine_args_maps_all_contract_options(tmp_path: Path):
    opts = validate_launch_options(
        headless=True,
        profile="Pricing EU",
        fingerprint={
            "seed": 20261116,
            "os": "macos",
            "os_version": "15.2.0",
            "timezone": "Europe/Berlin",
            "locale": "de-DE",
            "screen": {"width": 1440, "height": 900},
            "gpu": {"vendor": "Google Inc. (Apple)", "renderer": "ANGLE Metal M2"},
            "hardware_concurrency": 8,
            "device_memory": 16,
            "noise": False,
        },
        humanize={"preset": "fast"},
        captcha={"types": ["checkbox"], "time_budget_ms": 30000, "max_attempts": 2},
        args=["--mute-audio"],
    )
    args = build_engine_args(
        options=opts,
        profile_dir=tmp_path,
        seed=20261116,
        proxy_args=["--proxy-server=socks5://127.0.0.1:43210"],
        engine_version="151.0.7922.108-7",
        resolved_os="macos",
        resolved_timezone="Europe/Berlin",
        resolved_locale="de-DE",
    )

    assert f"--user-data-dir={tmp_path}" in args
    assert "--remote-debugging-port=0" in args
    assert "--headless=new" in args
    assert "--profile-label=Pricing EU" in args
    assert "--proxy-server=socks5://127.0.0.1:43210" in args
    assert "--fingerprint=20261116" in args
    assert "--fingerprint-brand=chrome" in args
    assert "--window-position=0,0" in args
    assert "--window-size=1440,805" in args
    assert "--fingerprint-platform=macos" in args
    assert "--fingerprint-platform-version=15.2.0" in args
    assert "--fingerprint-timezone=Europe/Berlin" in args
    assert "--fingerprint-locale=de-DE" in args
    assert "--fingerprint-screen-width=1440" in args
    assert "--fingerprint-screen-height=900" in args
    assert "--fingerprint-gpu-vendor=Google Inc. (Apple)" in args
    assert "--fingerprint-gpu-renderer=ANGLE Metal M2" in args
    assert "--fingerprint-hardware-concurrency=8" in args
    assert "--fingerprint-device-memory=16" in args
    assert "--disable-fingerprint-noise" in args
    assert "--fingerprint-tls-profile=chrome-151" in args
    assert "--fingerprint-humanize=on" in args
    assert "--fingerprint-humanize-seed=20261116" in args
    assert "--fingerprint-humanize-preset=fast" in args
    assert "--fingerprint-captcha=on" in args
    policy_arg = next(a for a in args if a.startswith("--fingerprint-captcha-policy="))
    policy = json.loads(policy_arg.split("=", 1)[1])
    assert policy == {"enabled": True, "types": ["checkbox"], "timeBudgetMs": 30000, "maxAttempts": 2}
    assert args[-1] == "--mute-audio"


def test_auto_sentinel_flags_are_never_forwarded_literally(tmp_path: Path):
    opts = validate_launch_options(
        fingerprint={
            "seed": 12345,
            "screen": "auto",
            "gpu": "auto",
            "hardware_concurrency": "auto",
            "device_memory": "auto",
            "timezone": "auto",
            "locale": "auto",
        }
    )
    args = build_engine_args(
        options=opts,
        profile_dir=tmp_path,
        seed=12345,
        proxy_args=[],
        resolved_timezone="auto",
        resolved_locale="auto",
    )
    joined = " ".join(args)
    assert "=auto" not in joined


def test_humanize_false_disables_humanize(tmp_path: Path):
    opts = validate_launch_options(humanize=False)
    args = build_engine_args(options=opts, profile_dir=tmp_path, seed=42, proxy_args=[])
    assert "--fingerprint-humanize=off" in args


def test_rejects_non_loopback_remote_debugging_address():
    with pytest.raises(InvalidOptionError):
        validate_launch_options(args=["--remote-debugging-address=0.0.0.0"])


def test_warns_when_user_explicitly_passes_no_sandbox(caplog: pytest.LogCaptureFixture):
    with caplog.at_level(logging.WARNING, logger="ombrabrowser"):
        opts = validate_launch_options(args=["--no-sandbox"])
    assert "--no-sandbox" in opts.args
    assert any("--no-sandbox" in rec.message for rec in caplog.records)


def test_error_redacts_secrets_and_urls():
    err = OmbraError(
        "failed via socks5://alice:secret123@proxy.example:1080 with key OMBRA_LICENSE_KEY=lic_super_secret",
        details={"stderr_tail": "Authorization: Bearer tok_99999"},
        secrets=("lic_super_secret", "tok_99999"),
    )
    assert "alice" not in err.message
    assert "secret123" not in err.message
    assert "lic_super_secret" not in err.message
    assert "tok_99999" not in err.details["stderr_tail"]
    assert redact_secrets("http://bob:pw@h:80") == "http://***:***@h:80"


def test_proxy_validation():
    p = parse_proxy({"type": "socks5", "host": "10.0.0.1", "port": 1080, "username": "u", "password": "p"})
    assert p is not None and p.has_credentials and p.server_url == "socks5://10.0.0.1:1080"
