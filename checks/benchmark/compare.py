#!/usr/bin/env python3
"""
compare.py — compare Ombra local-probe snapshots without a browser.

Reads an export JSON ({"snapshots": [...]}) or one/many snapshot JSON files,
compares every snapshot against a baseline by per-probe hashes and prints a
rule-based verdict. No network, no LLM, stdlib only.

Exit codes:
  0  hard-stable (context changes allowed unless --strict/--fail-on context)
  1  hard probe changed/noisy/missing
  2  context changed and --strict / --fail-on context was requested
  3  no usable snapshots
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
from typing import Any, Dict, Iterable, List, Optional, Tuple

VOLATILE = "volatile"
HARD = "hard"
CONTEXT = "context"


def load_file(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return [item for item in data if is_snapshot(item)]
    if isinstance(data, dict) and isinstance(data.get("snapshots"), list):
        return [item for item in data["snapshots"] if is_snapshot(item)]
    if isinstance(data, dict) and isinstance(data.get("checks"), dict):
        runs = data["checks"].get("runs")
        if isinstance(runs, list):
            return [item for item in runs if is_snapshot(item)]
    if is_snapshot(data):
        return [data]
    raise ValueError(f"{path}: expected snapshot or export with snapshots[]")


def is_snapshot(value: Any) -> bool:
    return isinstance(value, dict) and isinstance(value.get("id"), str) and isinstance(value.get("probes"), dict)


def collect(paths: Iterable[str]) -> List[Dict[str, Any]]:
    snapshots: List[Dict[str, Any]] = []
    for path in paths:
        if os.path.isdir(path):
            files = sorted(glob.glob(os.path.join(path, "*.json")))
            if not files:
                raise ValueError(f"{path}: no *.json files")
            for file_path in files:
                snapshots.extend(load_file(file_path))
        else:
            snapshots.extend(load_file(path))
    unique: Dict[str, Dict[str, Any]] = {}
    for snapshot in snapshots:
        unique[snapshot["id"]] = snapshot
    result = list(unique.values())
    result.sort(key=lambda item: (str(item.get("createdAt") or ""), item["id"]))
    return result


def pick_baseline(snapshots: List[Dict[str, Any]], selector: Optional[str]) -> Dict[str, Any]:
    if not snapshots:
        raise ValueError("no snapshots")
    if not selector:
        return snapshots[0]
    for snapshot in snapshots:
        if snapshot["id"] == selector:
            return snapshot
    lowered = selector.lower()
    matches = [
        snapshot for snapshot in snapshots
        if lowered in str(snapshot.get("label") or "").lower()
    ]
    if not matches:
        raise ValueError(f"baseline not found: {selector}")
    return matches[0]


def probe_class(base_probe: Optional[Dict[str, Any]], current_probe: Optional[Dict[str, Any]]) -> str:
    probe = base_probe or current_probe or {}
    return str(probe.get("c") or HARD)


def status_of(base_probe: Optional[Dict[str, Any]], current_probe: Optional[Dict[str, Any]]) -> str:
    if base_probe is None or current_probe is None:
        return "missing"
    if not base_probe.get("ok") and not current_probe.get("ok"):
        return "absent"
    if not base_probe.get("ok") or not current_probe.get("ok"):
        return "changed"
    if base_probe.get("n") or current_probe.get("n"):
        return "noisy"
    if base_probe.get("h") == current_probe.get("h"):
        return "same"
    return "changed"


def compare(base: Dict[str, Any], current: Dict[str, Any], strict: bool = False) -> Dict[str, Any]:
    base_probes = base.get("probes") or {}
    current_probes = current.get("probes") or {}
    ids = sorted(set(base_probes) | set(current_probes))
    rows: List[Dict[str, Any]] = []

    for probe_id in ids:
        base_probe = base_probes.get(probe_id)
        current_probe = current_probes.get(probe_id)
        rows.append({
            "id": probe_id,
            "cls": probe_class(base_probe, current_probe),
            "status": status_of(base_probe, current_probe),
            "base": base_probe,
            "cur": current_probe,
        })

    def subset(cls: str) -> List[Dict[str, Any]]:
        return [row for row in rows if row["cls"] == cls]

    def metrics(cls: str) -> Dict[str, Any]:
        items = subset(cls)
        denominator = [row for row in items if row["status"] != "absent"]
        same = [row for row in items if row["status"] == "same"]
        return {
            "total": len(items),
            "denominator": len(denominator),
            "same": len(same),
            "pct": round(100.0 * len(same) / len(denominator), 1) if denominator else 100.0,
        }

    hard_rows = subset(HARD)
    context_rows = subset(CONTEXT)
    hard_missing = [row for row in hard_rows if row["status"] == "missing"]
    hard_bad = [row for row in hard_rows if row["status"] in ("changed", "noisy")]
    context_bad = [row for row in context_rows if row["status"] in ("changed", "noisy", "missing")]

    if hard_missing:
        verdict = "INCOMPLETE"
    elif hard_bad:
        verdict = "UNSTABLE"
    elif context_bad and strict:
        verdict = "REVIEW"
    elif context_bad:
        verdict = "STABLE_CONTEXT_CHANGED"
    else:
        verdict = "STABLE"

    return {
        "rows": rows,
        "hard": metrics(HARD),
        "context": metrics(CONTEXT),
        "hard_bad": hard_bad,
        "hard_missing": hard_missing,
        "context_bad": context_bad,
        "verdict": verdict,
    }


def preview(probe: Optional[Dict[str, Any]], limit: int = 180) -> str:
    if not probe:
        return "—"
    if not probe.get("ok"):
        return f"error: {probe.get('err') or 'unavailable'}"
    value = probe.get("v")
    if isinstance(value, dict) and isinstance(value.get("url"), str) and value["url"].startswith("data:image/"):
        return f"canvas {value.get('width')}x{value.get('height')} ({len(value['url'])} chars)"
    if isinstance(value, str):
        text = value
    else:
        try:
            text = json.dumps(value, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            text = str(value)
    text = text.replace("\n", " ")
    if len(text) > limit:
        text = text[:limit] + f"… ({len(text)} chars)"
    return text


def print_report(base: Dict[str, Any], snapshots: List[Dict[str, Any]], strict: bool, fail_on: str) -> int:
    hard = "hard"
    print("Ombra checks — offline comparison")
    print(f"baseline: {base.get('label') or '(no label)'} · {base.get('profile') or 'default'} · "
          f"{base.get('createdAt') or '?'} · id={base['id']}")
    print(f"hard hash: {base.get('hardHash') or '—'}")
    print(f"snapshots: {len(snapshots)}")
    print()

    if len(snapshots) == 1:
        print("Only one snapshot — nothing to compare. Take at least two cold starts.")
        return 0

    failures = 0
    context_changed = False

    for current in snapshots:
        if current["id"] == base["id"]:
            continue
        result = compare(base, current, strict=strict)
        print(f"— {current.get('label') or '(no label)'} · {current.get('profile') or 'default'} · "
              f"{current.get('createdAt') or '?'}")
        print(f"  hard {result['hard']['pct']:.1f}% ({result['hard']['same']}/{result['hard']['denominator']}) · "
              f"context {result['context']['pct']:.1f}% ({result['context']['same']}/{result['context']['denominator']}) · "
              f"verdict {result['verdict']}")

        if result["hard_missing"]:
            for row in result["hard_missing"]:
                print(f"    MISSING hard  {row['id']}")
        for row in result["hard_bad"]:
            print(f"    {row['status'].upper():8} hard  {row['id']}")
            print(f"             base: {preview(row['base'])}")
            print(f"             now : {preview(row['cur'])}")
        for row in result["context_bad"]:
            print(f"    {row['status'].upper():8} ctx   {row['id']}")
            print(f"             base: {preview(row['base'])}")
            print(f"             now : {preview(row['cur'])}")

        if result["verdict"] in ("UNSTABLE", "INCOMPLETE"):
            failures += 1
        if result["context_bad"]:
            context_changed = True
        print()

    context_is_failure = context_changed and (strict or fail_on == "context") and fail_on != "none"
    overall = "FAIL" if failures and fail_on != "none" else ("REVIEW" if context_is_failure else "PASS")
    print(f"OVERALL: {overall}")
    if failures:
        if fail_on == "none":
            print("Hard probes changed, became noisy, or disappeared (ignored by --fail-on none).")
            return 0
        print("Hard probes changed, became noisy, or disappeared. This is a real fingerprint change.")
        return 1
    if context_changed and (strict or fail_on == "context"):
        print("Context changed under strict/fail-on-context mode.")
        return 0 if fail_on == "none" else 2
    if context_changed:
        print("Context changes are present (allowed; use --strict to fail on them).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare FP Stability Auditor snapshots offline.",
    )
    parser.add_argument("paths", nargs="+", help="export JSON, snapshot JSON, or directory")
    parser.add_argument("--baseline", help="snapshot id or label substring (default: first)")
    parser.add_argument("--profile", help="only snapshots with this profile")
    parser.add_argument("--strict", action="store_true", help="context changes count as failure")
    parser.add_argument("--fail-on", choices=("hard", "context", "none"), default="hard",
                        help="which class makes the process fail (default: hard)")
    parser.add_argument("--json", dest="json_out", help="write machine-readable report")
    parser.add_argument("--list", action="store_true", help="list snapshots and exit")
    args = parser.parse_args()

    try:
        snapshots = collect(args.paths)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 3

    if args.profile:
        snapshots = [item for item in snapshots if item.get("profile") == args.profile]
    if not snapshots:
        print("error: no snapshots after filtering", file=sys.stderr)
        return 3

    if args.list:
        for item in snapshots:
            print(f"{item['id']}  {item.get('createdAt') or '?'}  "
                  f"{item.get('profile') or 'default'}  {item.get('label') or ''}")
        return 0

    try:
        base = pick_baseline(snapshots, args.baseline)
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 3

    code = print_report(base, snapshots, args.strict, args.fail_on)

    if args.json_out:
        report = {
            "baseline": base["id"],
            "strict": args.strict,
            "failOn": args.fail_on,
            "comparisons": [
                {
                    "snapshot": item["id"],
                    **compare(base, item, strict=args.strict),
                }
                for item in snapshots if item["id"] != base["id"]
            ],
            "exitCode": code,
        }
        for comparison in report["comparisons"]:
            comparison.pop("rows", None)
        with open(args.json_out, "w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
        print(f"json: {args.json_out}")

    return code


if __name__ == "__main__":
    sys.exit(main())
