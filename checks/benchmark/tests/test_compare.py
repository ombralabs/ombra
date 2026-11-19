#!/usr/bin/env python3
"""Unit tests for checks/benchmark/compare.py (stdlib only)."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BENCH_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BENCH_DIR))

import compare as cmp_mod  # noqa: E402


def make_snapshot(snap_id: str, probes: dict, **extra) -> dict:
    snap = {
        "id": snap_id,
        "createdAt": "2026-11-19T18:00:00.000Z",
        "label": snap_id,
        "profile": "benchmark-headless",
        "hardHash": "abcd1234",
        "hardNoisy": [],
        "hardErr": [],
        "probes": probes,
    }
    snap.update(extra)
    return snap


class CompareTests(unittest.TestCase):
    def test_denominator_zero_returns_zero_pct_and_incomplete(self) -> None:
        base = make_snapshot("b", {"a": {"c": "hard", "ok": False, "h": None}})
        cur = make_snapshot("c", {"a": {"c": "hard", "ok": False, "h": None}})
        res = cmp_mod.compare(base, cur)
        self.assertEqual(res["hard"]["denominator"], 0)
        self.assertEqual(res["hard"]["pct"], 0.0)
        self.assertEqual(res["verdict"], "INCOMPLETE")

    def test_hard_bad_takes_precedence_over_hard_missing(self) -> None:
        base = make_snapshot("b", {
            "a": {"c": "hard", "ok": True, "h": "111", "n": False},
            "b": {"c": "hard", "ok": True, "h": "222", "n": False},
        })
        cur = make_snapshot("c", {
            "a": {"c": "hard", "ok": True, "h": "999", "n": False},
        })
        res = cmp_mod.compare(base, cur)
        self.assertEqual(res["verdict"], "UNSTABLE")

    def test_skipped_probes_excluded_from_denominator(self) -> None:
        base = make_snapshot("b", {
            "a": {"c": "hard", "ok": True, "h": "111", "n": False},
            "perm": {"c": "hard", "ok": True, "h": "skip", "s": "file-origin", "n": False},
        })
        cur = make_snapshot("c", {
            "a": {"c": "hard", "ok": True, "h": "111", "n": False},
            "perm": {"c": "hard", "ok": True, "h": "skip", "s": "file-origin", "n": False},
        })
        res = cmp_mod.compare(base, cur)
        self.assertEqual(res["hard"]["denominator"], 1)
        self.assertEqual(res["hard"]["skipped"], 1)
        self.assertEqual(res["hard"]["pct"], 100.0)
        self.assertEqual(cmp_mod.preview(base["probes"]["perm"]), "skipped (file-origin)")

    def test_preview_shows_hash_for_redacted_probes(self) -> None:
        redacted_probe = {"c": "hard", "ok": True, "h": "4d4ebaa5a446381f", "n": False}
        self.assertEqual(cmp_mod.preview(redacted_probe), "hash=4d4ebaa5a446381f (redacted)")

    def test_single_snapshot_with_hard_noise_fails(self) -> None:
        snap = make_snapshot(
            "only-1",
            {"a": {"c": "hard", "ok": True, "h": "111", "n": True}},
            hardNoisy=["a"],
        )
        code, _ = cmp_mod.evaluate_group("g", snap, [snap], strict=False, fail_on="hard")
        self.assertEqual(code, 1)

    def test_directory_grouping_separates_headless_and_headed_reports(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            headless = {
                "engine": {"version": "151.0.7922.108-7"},
                "environment": {"mode": "headless", "os": "darwin arm64"},
                "checks": {
                    "probe_version": "1.1.0",
                    "runs": [
                        make_snapshot("hl-1", {"screen.geometry": {"c": "hard", "ok": True, "h": "aaaa", "n": False}}),
                        make_snapshot("hl-2", {"screen.geometry": {"c": "hard", "ok": True, "h": "aaaa", "n": False}}),
                    ],
                },
            }
            headed = {
                "engine": {"version": "151.0.7922.108-7"},
                "environment": {"mode": "headed", "os": "darwin arm64"},
                "checks": {
                    "probe_version": "1.1.0",
                    "runs": [
                        make_snapshot("hd-1", {"screen.geometry": {"c": "hard", "ok": True, "h": "bbbb", "n": False}}),
                        make_snapshot("hd-2", {"screen.geometry": {"c": "hard", "ok": True, "h": "bbbb", "n": False}}),
                    ],
                },
            }
            (tmp_path / "headless.json").write_text(json.dumps(headless), encoding="utf-8")
            (tmp_path / "headed.json").write_text(json.dumps(headed), encoding="utf-8")

            grouped = subprocess.run(
                [sys.executable, str(BENCH_DIR / "compare.py"), str(tmp_path)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(grouped.returncode, 0, grouped.stdout + grouped.stderr)
            self.assertIn("OVERALL: PASS", grouped.stdout)

            ungrouped = subprocess.run(
                [sys.executable, str(BENCH_DIR / "compare.py"), "--no-group", str(tmp_path)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(ungrouped.returncode, 1)
            self.assertIn("hash=aaaa (redacted)", ungrouped.stdout)
            self.assertIn("hash=bbbb (redacted)", ungrouped.stdout)


if __name__ == "__main__":
    unittest.main()
