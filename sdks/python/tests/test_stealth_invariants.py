"""Tests verifying conformance/cases/stealth-invariants.json (SI-01..SI-12)."""

from __future__ import annotations

import json
import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from ombrabrowser import binary_info, build_launch_options, launch_context
from tests.conftest import make_fake_engine

STEALTH_CASE_PATH = Path(__file__).with_name("fixtures") / "stealth-invariants.json"
STEALTH_CASE = json.loads(STEALTH_CASE_PATH.read_text(encoding="utf-8"))


def test_packaged_stealth_case_matches_canonical():
    canonical = Path(__file__).resolve().parents[3] / "conformance/cases/stealth-invariants.json"
    if not canonical.is_file():
        pytest.skip("Canonical conformance case is only available in the repository")
    assert STEALTH_CASE_PATH.read_bytes() == canonical.read_bytes()


def _invariants_by_id() -> dict[str, dict]:
    return {item["id"]: item for item in STEALTH_CASE["invariants"]}


def test_cli_flags_obey_stealth_invariants(tmp_path: Path):
    invariants = _invariants_by_id()
    exe = make_fake_engine(tmp_path / "engine")

    opts = build_launch_options(
        binary_path=exe,
        headless=True,
        proxy="socks5://alice:secret@127.0.0.1:1080",
        license_key="om_secret_license_key",
        fingerprint={"seed": 42, "os": "macos", "timezone": "UTC", "locale": "en-US"},
    )
    cmdline = " ".join(opts["args"])

    # SI-05, SI-07, SI-11
    for si_id in ("SI-05", "SI-07", "SI-11"):
        for forbidden in invariants[si_id]["forbidden"]:
            assert forbidden not in opts["args"], f"{si_id}: unexpected flag {forbidden}"

    # SI-06
    for pattern in invariants["SI-06"]["forbidden_patterns"]:
        assert not re.search(pattern, cmdline), f"SI-06 leaked secret matching {pattern}"
    assert "om_secret_license_key" not in cmdline
    assert "secret" not in cmdline


def test_cdp_connect_and_context_obey_si01_to_si04_and_si08(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    exe = make_fake_engine(tmp_path / "engine")
    fake_browser = MagicMock()
    fake_context = MagicMock()
    fake_browser.new_context.return_value = fake_context
    fake_cdp = MagicMock()
    fake_browser.new_browser_cdp_session.return_value = fake_cdp

    mock_pw = MagicMock()
    mock_pw.chromium.connect_over_cdp = MagicMock(return_value=fake_browser)
    mock_pw_cm = MagicMock()
    mock_pw_cm.start.return_value = mock_pw

    orig_new_context = fake_browser.new_context

    import subprocess as _stdlib_subprocess

    real_popen = _stdlib_subprocess.Popen

    # Simulate _wait_for_engine_ready_sync and engine subprocess cleanly
    fake_proc = MagicMock()
    fake_proc.pid = 99999
    fake_proc.poll.return_value = None

    def popen_only_for_engine(cmd, *args, **kwargs):
        if cmd and str(cmd[0]) == str(exe):
            return fake_proc
        return real_popen(cmd, *args, **kwargs)

    with patch("ombrabrowser.launcher.subprocess.Popen", side_effect=popen_only_for_engine), \
         patch("ombrabrowser.launcher._wait_for_engine_ready_sync", return_value=(45555, "ws://127.0.0.1:45555/devtools/browser/1")), \
         patch("playwright.sync_api.sync_playwright", return_value=mock_pw_cm):
        ctx = launch_context(
            binary_path=exe,
            locale="de-DE",
            timezone="Europe/Berlin",
        )
        try:
            # SI-08: endpoint passed to Playwright is strictly loopback
            endpoint_arg = mock_pw.chromium.connect_over_cdp.call_args.args[0]
            assert endpoint_arg.startswith("http://127.0.0.1:")

            # SI-04: no Emulation overrides in new_context; locale/timezone went to engine args
            ctx_kwargs = orig_new_context.call_args.kwargs
            assert ctx_kwargs.get("no_viewport") is True
            assert "locale" not in ctx_kwargs
            assert "timezone_id" not in ctx_kwargs
            assert "user_agent" not in ctx_kwargs

            # SI-01..SI-03: SDK never calls Runtime.enable, Debugger.enable, Log.enable, addScriptToEvaluateOnNewDocument
            assert fake_cdp.send.call_count == 0
        finally:
            ctx.close()


def test_binary_info_obeys_si12(tmp_path: Path):
    exe = make_fake_engine(tmp_path / "engine")
    info = binary_info(binary_path=exe)
    assert info["installed"] is True
    assert re.fullmatch(r"[a-f0-9]{64}", info["sha256"]) is not None
