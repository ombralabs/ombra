"""Public launchers can opt in to the native mobile CSS viewport."""

from __future__ import annotations

import asyncio
import inspect
import json
import subprocess
import sys
from unittest.mock import patch

import pytest

from ombrabrowser import (
    build_launch_options,
    launch,
    launch_async,
    launch_context,
    launch_context_async,
    launch_persistent_context,
    launch_persistent_context_async,
)
from ombrabrowser.errors import InvalidOptionError
from tests.conftest import make_fake_engine

SIZE = {"width": 390, "height": 844}
HOST_OS = {"darwin": "macos", "win32": "windows", "linux": "linux"}[sys.platform]
OTHER_OS = "linux" if HOST_OS != "linux" else "macos"


@pytest.mark.parametrize("width,height", [(1, 10000), (390, 844), (10000, 1)])
def test_mobile_viewport_only_adds_native_layout_switch(tmp_path, width, height):
    options = {
        "binary_path": make_fake_engine(tmp_path),
        "download": False,
        "args": ["--window-size=1200,900"],
    }
    ordinary = build_launch_options(**options)["args"]
    assert not any(arg.startswith("--mobile-layout-viewport") for arg in ordinary)
    assert build_launch_options(**options, mobile_viewport=None)["args"] == ordinary
    mobile = build_launch_options(**options, mobile_viewport={"width": width, "height": height})[
        "args"
    ]
    switch = f"--mobile-layout-viewport={width},{height}"
    assert mobile.count(switch) == 1
    assert [arg for arg in mobile if arg != switch] == ordinary


@pytest.mark.parametrize(
    "size",
    [
        {},
        {"width": 390},
        {"width": 1, "height": 10001},
        {"width": 0, "height": 1},
        {"width": True, "height": 1},
        {"width": 1.5, "height": 1},
        {**SIZE, "depth": 3},
        {**SIZE, 7: 3},
        "390,844",
    ],
)
def test_invalid_mobile_size_is_rejected_before_resolving_a_binary(size):
    with pytest.raises(
        InvalidOptionError, match=r"mobile_viewport(?:\.(?:width|height)| must| option)"
    ):
        build_launch_options(mobile_viewport=size, download=False)


@pytest.mark.parametrize(
    "launcher",
    [
        launch,
        launch_context,
        launch_persistent_context,
        launch_async,
        launch_context_async,
        launch_persistent_context_async,
    ],
)
def test_every_public_launcher_passes_the_layout_size_to_the_process(tmp_path, launcher):
    options = {
        "binary_path": make_fake_engine(tmp_path),
        "download": False,
        "user_data_dir": tmp_path / "profile",
        "mobile_viewport": SIZE,
    }
    run_process = subprocess.Popen
    captured = []

    def capture(command, *args, **kwargs):
        if command[0] == str(options["binary_path"]):
            captured.append(command)
            raise RuntimeError("captured spawn")
        return run_process(command, *args, **kwargs)

    with (
        patch("ombrabrowser.launcher.subprocess.Popen", side_effect=capture),
        pytest.raises(RuntimeError, match="captured spawn"),
    ):
        result = launcher(**options)
        if inspect.isawaitable(result):
            asyncio.run(result)
    assert captured[0].count("--mobile-layout-viewport=390,844") == 1


def test_mobile_layout_checks_the_real_host_and_preserves_existing_errors(tmp_path):
    options = {
        "binary_path": make_fake_engine(tmp_path),
        "download": False,
        "mobile_viewport": SIZE,
    }
    command = build_launch_options(**options, fingerprint={"os": HOST_OS})
    assert "--mobile-layout-viewport=390,844" in command["args"]
    with pytest.raises(InvalidOptionError, match="host OS"):
        build_launch_options(**options, fingerprint={"os": OTHER_OS})
    with pytest.raises(InvalidOptionError, match=r"fingerprint\.os.*android"):
        build_launch_options(**options, fingerprint={"os": "android"})
    with pytest.raises(InvalidOptionError, match="cannot override viewport"):
        launch_persistent_context(tmp_path / "profile", **options, viewport=SIZE)


def test_mobile_layout_rejects_saved_foreign_os_before_rewriting_profile(tmp_path):
    profile_dir = tmp_path / "profile"
    metadata = profile_dir / ".ombra" / "profile.json"
    metadata.parent.mkdir(parents=True)
    original = json.dumps({"seed": 43210, "os": OTHER_OS})
    metadata.write_text(original)
    options = {
        "binary_path": make_fake_engine(tmp_path),
        "mobile_viewport": SIZE,
        "download": False,
    }
    with pytest.raises(InvalidOptionError, match="host OS"):
        build_launch_options(user_data_dir=profile_dir, **options)
    with pytest.raises(InvalidOptionError, match="host OS"):
        launch_persistent_context(profile_dir, **options)
    assert metadata.read_text() == original
