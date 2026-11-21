"""Tests for named profiles, seed persistence, collision suffixes, and locks."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

import ombrabrowser.profile as profile_module
from ombrabrowser.errors import InvalidOptionError, ProfileBusyError
from ombrabrowser.profile import (
    acquire_profile_lease,
    read_profile_metadata,
    resolve_named_profile_dir,
)


def test_profile_slugification_and_collision_resolution():
    d1 = resolve_named_profile_dir("Pricing EU")
    assert d1.name == "pricing-eu"

    lease1 = acquire_profile_lease(profile="Pricing EU")
    try:
        assert lease1.path == d1
    finally:
        lease1.release()

    # Different raw profile name that slugifies identically gets a deterministic hash suffix.
    d2 = resolve_named_profile_dir("pricing_eu")
    assert d2 == d1 or d2.name != d1.name
    # Explicitly test symbol collision ("Pricing EU" vs "Pricing!EU")
    d3 = resolve_named_profile_dir("Pricing!EU")
    assert d3 != d1
    assert d3.name.startswith("pricing-eu-")


def test_profile_persists_seed_and_updates_when_explicit():
    lease1 = acquire_profile_lease(
        profile="shop-de",
        os_hint="macos",
        timezone="Europe/Berlin",
        locale="de-DE",
        humanize_preset="careful",
        engine_version="151.0.7922.108-7",
    )
    first_seed = lease1.seed
    profile_dir = lease1.path
    lease1.release()

    meta = read_profile_metadata(profile_dir)
    assert meta is not None
    assert meta["seed"] == first_seed
    assert meta["name"] == "shop-de"
    assert meta["os"] == "macos"
    assert meta["timezone"] == "Europe/Berlin"
    assert meta["locale"] == "de-DE"
    assert meta["humanize_preset"] == "careful"
    assert "proxy" not in meta

    # Re-opening without seed preserves persisted seed and metadata.
    lease2 = acquire_profile_lease(profile="shop-de")
    assert lease2.seed == first_seed
    assert lease2.os_hint == "macos"
    assert lease2.timezone == "Europe/Berlin"
    lease2.release()

    # Explicit new seed updates and persists.
    lease3 = acquire_profile_lease(profile="shop-de", explicit_seed=99887766)
    assert lease3.seed == 99887766
    lease3.release()
    assert read_profile_metadata(profile_dir)["seed"] == 99887766


def test_ephemeral_profile_deleted_on_release():
    lease = acquire_profile_lease()
    path = lease.path
    assert lease.ephemeral is True
    assert path.is_dir()
    lease.release()
    assert not path.exists()


def test_same_process_profile_lock_conformance():
    first = acquire_profile_lease(profile="conformance-lock")
    try:
        with pytest.raises(ProfileBusyError) as exc_info:
            acquire_profile_lease(profile="conformance-lock")
        assert exc_info.value.kind == "ProfileBusy"
    finally:
        first.release()

    third = acquire_profile_lease(profile="conformance-lock")
    third.release()


def test_cross_process_profile_lock_and_stale_cleanup(tmp_path: Path):
    src_root = Path(__file__).resolve().parents[1] / "src"
    env = dict(os.environ)
    env["PYTHONPATH"] = str(src_root)
    env["OMBRA_CACHE_DIR"] = str(tmp_path / "ombra-cache")

    holder_script = (
        "import time, sys; "
        "from ombrabrowser.profile import acquire_profile_lease; "
        "lease = acquire_profile_lease(profile='cross-proc'); "
        "print('LOCKED', flush=True); "
        "time.sleep(10)"
    )
    proc = subprocess.Popen(
        [sys.executable, "-c", holder_script],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        line = proc.stdout.readline().strip()
        assert line == "LOCKED"

        with pytest.raises(ProfileBusyError):
            acquire_profile_lease(profile="cross-proc")
    finally:
        proc.kill()
        proc.wait(timeout=5)

    # After child process is killed, flock is released and stale lock recovers cleanly.
    lease = acquire_profile_lease(profile="cross-proc")
    lease.release()

    # Explicit dead-PID lock file without flock also recovers as stale.
    dead_lock = lease.path / ".ombra" / "profile.lock"
    dead_lock.parent.mkdir(parents=True, exist_ok=True)
    dead_lock.write_text(json.dumps({"pid": 99999999, "started_at": "2020-01-01T00:00:00Z"}))
    recovered = acquire_profile_lease(profile="cross-proc")
    recovered.release()


def test_invalid_profile_and_mutually_exclusive(tmp_path: Path):
    with pytest.raises(InvalidOptionError):
        acquire_profile_lease(profile="   ")
    with pytest.raises(InvalidOptionError):
        acquire_profile_lease(profile="a", user_data_dir=tmp_path)


def test_literal_profile_name_cannot_steal_collision_suffix(monkeypatch):
    monkeypatch.setattr(profile_module, "generate_seed", lambda: 222)
    base = acquire_profile_lease(profile="Pricing EU", explicit_seed=111)
    base.release()
    literal = acquire_profile_lease(profile="pricing-eu-a64572d7", explicit_seed=333)
    literal_path = literal.path
    (literal_path / "Cookies").write_text("literal profile cookies", encoding="utf-8")
    literal.release()

    collision = acquire_profile_lease(profile="Pricing!EU")
    try:
        assert collision.path != literal_path
        assert collision.seed == 222
        assert not (collision.path / "Cookies").exists()
        assert read_profile_metadata(literal_path)["name"] == "pricing-eu-a64572d7"
        assert read_profile_metadata(literal_path)["seed"] == 333
        assert (literal_path / "Cookies").read_text(encoding="utf-8") == "literal profile cookies"
    finally:
        collision.release()


def test_suffixed_profile_survives_deleted_base_profile():
    base = acquire_profile_lease(profile="Pricing EU", explicit_seed=111)
    base_path = base.path
    base.release()
    collision = acquire_profile_lease(profile="Pricing!EU", explicit_seed=222)
    collision_path = collision.path
    collision.release()
    shutil.rmtree(base_path)

    reopened = acquire_profile_lease(profile="Pricing!EU")
    try:
        assert reopened.path == collision_path
        assert reopened.seed == 222
    finally:
        reopened.release()


def test_explicit_path_reopening_preserves_named_profile_ownership(monkeypatch):
    monkeypatch.setattr(profile_module, "generate_seed", lambda: 222)
    owner = acquire_profile_lease(profile="Pricing EU", explicit_seed=111)
    owner_path = owner.path
    try:
        (owner_path / "Cookies").write_text("owner cookies", encoding="utf-8")
    finally:
        owner.release()

    explicit = acquire_profile_lease(user_data_dir=owner_path)
    try:
        assert explicit.path == owner_path
        assert explicit.name is None
        assert explicit.seed == 111
        assert explicit.ephemeral is False
    finally:
        explicit.release()
    meta = read_profile_metadata(owner_path)
    assert meta["seed"] == 111
    assert meta.get("name") == "Pricing EU"

    collision = acquire_profile_lease(profile="Pricing!EU")
    try:
        assert collision.path != owner_path
        assert collision.seed == 222
        assert not (collision.path / "Cookies").exists()
    finally:
        collision.release()

    reopened = acquire_profile_lease(profile="Pricing EU")
    try:
        assert reopened.path == owner_path
        assert reopened.seed == 111
        assert (reopened.path / "Cookies").read_text(encoding="utf-8") == "owner cookies"
    finally:
        reopened.release()


def test_unnamed_explicit_directory_preserves_seed_and_data(tmp_path):
    profile_path = tmp_path / "explicit-profile"
    initial = acquire_profile_lease(user_data_dir=profile_path, explicit_seed=111)
    try:
        (profile_path / "Cookies").write_text("explicit cookies", encoding="utf-8")
    finally:
        initial.release()

    reopened = acquire_profile_lease(user_data_dir=profile_path)
    try:
        assert reopened.path == profile_path
        assert reopened.name is None
        assert reopened.seed == 111
        assert reopened.ephemeral is False
        assert (profile_path / "Cookies").read_text(encoding="utf-8") == "explicit cookies"
        assert "name" not in read_profile_metadata(profile_path)
    finally:
        reopened.release()


def test_old_open_lock_handle_cannot_create_second_owner():
    env = dict(os.environ)
    env["PYTHONPATH"] = str(Path(__file__).resolve().parents[1] / "src")
    holder_script = textwrap.dedent("""\
        import sys
        from ombrabrowser.profile import acquire_profile_lease
        lease = acquire_profile_lease(profile="old-handle")
        print("LOCKED", flush=True)
        sys.stdin.readline()
        lease.release()
    """)
    contender_script = textwrap.dedent("""\
        import sys
        import ombrabrowser.profile as profile
        original_acquire = profile._acquire_os_flock
        def acquire_after_release(fh):
            print("OPEN", flush=True)
            sys.stdin.readline()
            return original_acquire(fh)
        profile._acquire_os_flock = acquire_after_release
        lease = profile.acquire_profile_lease(profile="old-handle")
        print("LOCKED", flush=True)
        sys.stdin.readline()
        lease.release()
    """)
    holder = subprocess.Popen(
        [sys.executable, "-c", holder_script], env=env,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    contender = None
    try:
        assert holder.stdout.readline().strip() == "LOCKED"
        contender = subprocess.Popen(
            [sys.executable, "-c", contender_script], env=env,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        assert contender.stdout.readline().strip() == "OPEN"
        holder.communicate(input="release\n", timeout=5)
        assert holder.returncode == 0
        contender.stdin.write("acquire\n")
        contender.stdin.flush()
        assert contender.stdout.readline().strip() == "LOCKED"

        with pytest.raises(ProfileBusyError):
            unexpected = acquire_profile_lease(profile="old-handle")
            unexpected.release()
    finally:
        for proc in (holder, contender):
            if proc is not None:
                if proc.poll() is None:
                    proc.kill()
                proc.communicate(timeout=5)


@pytest.mark.parametrize("failure_stage", ["lock_payload", "profile_metadata"])
def test_acquisition_error_clears_owned_lock_and_allows_retry(monkeypatch, failure_stage):
    profile_path = resolve_named_profile_dir("failed-acquisition")
    with monkeypatch.context() as patch:
        def fail(*args, **kwargs):
            raise OSError("simulated disk failure")

        if failure_stage == "lock_payload":
            patch.setattr(profile_module.os, "fsync", fail)
        else:
            patch.setattr(profile_module, "write_profile_metadata", fail)
        with pytest.raises(OSError, match="simulated disk failure"):
            acquire_profile_lease(profile="failed-acquisition")

    lock_path = profile_path / ".ombra" / "profile.lock"
    assert lock_path.exists()
    assert lock_path.read_text(encoding="utf-8") == ""
    recovered = acquire_profile_lease(profile="failed-acquisition", explicit_seed=444)
    assert recovered.seed == 444
    recovered.release()
    assert lock_path.read_text(encoding="utf-8") == ""


def test_ownership_change_before_lock_does_not_overwrite_profile(monkeypatch):
    owner = acquire_profile_lease(profile="Pricing EU", explicit_seed=111)
    owner_path = owner.path
    owner.release()
    monkeypatch.setattr(profile_module, "resolve_named_profile_dir", lambda name: owner_path)

    with pytest.raises(ProfileBusyError):
        stolen = acquire_profile_lease(profile="Pricing!EU", explicit_seed=222)
        stolen.release()
    assert read_profile_metadata(owner_path)["name"] == "Pricing EU"
    assert read_profile_metadata(owner_path)["seed"] == 111


def test_live_pid_metadata_is_preserved_when_acquisition_is_refused():
    profile_path = resolve_named_profile_dir("live-owner")
    lock_path = profile_path / ".ombra" / "profile.lock"
    lock_path.parent.mkdir(parents=True)
    payload = json.dumps({"pid": os.getpid()})
    lock_path.write_text(payload, encoding="utf-8")

    with pytest.raises(ProfileBusyError):
        acquire_profile_lease(profile="live-owner")
    assert lock_path.read_text(encoding="utf-8") == payload
