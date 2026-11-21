#!/usr/bin/env python3
"""
compare.py — compare Ombra local-probe snapshots without a browser.

Reads benchmark reports ({"checks": {"runs": [...]}}), export JSONs
({"snapshots": [...]}), single snapshot JSONs, or directories of any of them.
Compares snapshots within each compatible group (by engine/mode/os/probe or
profile, unless --no-group or --baseline is given) and prints a rule-based
verdict. No network, no LLM, stdlib only.

Exit codes:
  0  hard-stable (context changes allowed unless --strict/--fail-on context)
  1  hard probe changed/noisy/missing or single-snapshot hard noise/errors
  2  context changed and --strict / --fail-on context was requested
  3  no usable snapshots
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
from collections import OrderedDict
from typing import Any, Dict, Iterable, List, Optional, Tuple

VOLATILE = "volatile"
HARD = "hard"
CONTEXT = "context"


def is_snapshot(value: Any) -> bool:
    return isinstance(value, dict) and isinstance(value.get("id"), str) and isinstance(value.get("probes"), dict)


def _attach_meta(snapshot: Dict[str, Any], group_key: str, source: str) -> Dict[str, Any]:
    copy = dict(snapshot)
    copy["_group"] = group_key
    copy["_source"] = source
    return copy


def load_file(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    if isinstance(data, list):
        return [
            _attach_meta(item, str(item.get("profile") or "default"), path)
            for item in data if is_snapshot(item)
        ]
    if isinstance(data, dict) and isinstance(data.get("snapshots"), list):
        return [
            _attach_meta(item, str(item.get("profile") or "default"), path)
            for item in data["snapshots"] if is_snapshot(item)
        ]
    if isinstance(data, dict) and isinstance(data.get("checks"), dict):
        runs = data["checks"].get("runs")
        if isinstance(runs, list):
            env = data.get("environment") or {}
            eng = data.get("engine") or {}
            probe_ver = data["checks"].get("probe_version") or "unknown"
            mode = env.get("mode") or "unknown"
            os_name = env.get("os") or "unknown"
            eng_ver = eng.get("version") or "unknown"
            platform_part = f" · platform={env['profile_platform']}" if env.get("profile_platform") else ""
            group_key = f"{eng_ver} · {mode} · {os_name} · probe {probe_ver}{platform_part}"
            return [
                _attach_meta(item, group_key, path)
                for item in runs if is_snapshot(item)
            ]
    if is_snapshot(data):
        return [_attach_meta(data, str(data.get("profile") or "default"), path)]
    raise ValueError(f"{path}: expected snapshot, export with snapshots[], or report with checks.runs[]")


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


def group_snapshots(snapshots: List[Dict[str, Any]], group_by_context: bool) -> List[Tuple[str, List[Dict[str, Any]]]]:
    if not group_by_context:
        return [("all", snapshots)]
    groups: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()
    for snapshot in snapshots:
        key = str(snapshot.get("_group") or snapshot.get("profile") or "default")
        groups.setdefault(key, []).append(snapshot)
    return list(groups.items())


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


def skipped_reason(probe: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(probe, dict):
        return None
    short = probe.get("s")
    if isinstance(short, str) and short:
        return short
    val = probe.get("v")
    if isinstance(val, dict) and isinstance(val.get("skipped"), str) and val["skipped"]:
        return val["skipped"]
    return None


def status_of(base_probe: Optional[Dict[str, Any]], current_probe: Optional[Dict[str, Any]]) -> str:
    if base_probe is None or current_probe is None:
        return "missing"
    if not base_probe.get("ok") and not current_probe.get("ok"):
        return "absent"
    if not base_probe.get("ok") or not current_probe.get("ok"):
        return "changed"
    base_skip = skipped_reason(base_probe)
    cur_skip = skipped_reason(current_probe)
    if base_skip and cur_skip:
        return "skipped"
    if base_skip or cur_skip:
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
        denominator = [row for row in items if row["status"] not in ("absent", "skipped")]
        same = [row for row in items if row["status"] == "same"]
        skipped = [row for row in items if row["status"] == "skipped"]
        if denominator:
            pct = round(100.0 * len(same) / len(denominator), 1)
        elif items:
            pct = 0.0
        else:
            pct = 100.0
        return {
            "total": len(items),
            "denominator": len(denominator),
            "same": len(same),
            "skipped": len(skipped),
            "pct": pct,
        }

    hard_rows = subset(HARD)
    context_rows = subset(CONTEXT)
    hard_metrics = metrics(HARD)
    context_metrics = metrics(CONTEXT)
    hard_missing = [row for row in hard_rows if row["status"] == "missing"]
    hard_skipped = [row for row in hard_rows if row["status"] == "skipped"]
    hard_bad = [row for row in hard_rows if row["status"] in ("changed", "noisy")]
    context_bad = [row for row in context_rows if row["status"] in ("changed", "noisy", "missing")]

    if hard_bad:
        verdict = "UNSTABLE"
    elif hard_missing or not hard_rows or hard_metrics["denominator"] == 0:
        verdict = "INCOMPLETE"
    elif context_bad and strict:
        verdict = "REVIEW"
    elif context_bad:
        verdict = "STABLE_CONTEXT_CHANGED"
    else:
        verdict = "STABLE"

    return {
        "rows": rows,
        "hard": hard_metrics,
        "context": context_metrics,
        "hard_bad": hard_bad,
        "hard_missing": hard_missing,
        "hard_skipped": hard_skipped,
        "context_bad": context_bad,
        "verdict": verdict,
    }


def preview(probe: Optional[Dict[str, Any]], limit: int = 180) -> str:
    if not probe:
        return "—"
    if not probe.get("ok"):
        return f"error: {probe.get('err') or 'unavailable'}"
    skip = skipped_reason(probe)
    if skip:
        return f"skipped ({skip})"
    if "v" not in probe:
        digest = probe.get("h")
        return f"hash={digest} (redacted)" if digest else "(redacted)"
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


def evaluate_group(
    group_name: str,
    base: Dict[str, Any],
    snapshots: List[Dict[str, Any]],
    strict: bool,
    fail_on: str,
) -> Tuple[int, Dict[str, Any]]:
    print(f"=== Group: {group_name} ===")
    print(f"baseline: {base.get('label') or '(no label)'} · {base.get('profile') or 'default'} · "
          f"{base.get('createdAt') or '?'} · id={base['id']}")
    print(f"hard hash: {base.get('hardHash') or '—'}")
    print(f"snapshots: {len(snapshots)}")
    print()

    if len(snapshots) == 1:
        noisy = list(base.get("hardNoisy") or [])
        errs = list(base.get("hardErr") or [])
        if (noisy or errs) and fail_on != "none":
            if noisy:
                print(f"  NOISY   hard  {', '.join(noisy)}")
            if errs:
                print(f"  ERROR   hard  {', '.join(errs)}")
            print("GROUP RESULT: FAIL (single snapshot already has hard noise or hard probe errors)")
            print()
            return 1, {"group": group_name, "baseline": base["id"], "comparisons": [], "exitCode": 1}
        print("Only one snapshot — nothing to compare. Take at least two cold starts.")
        print()
        return 0, {"group": group_name, "baseline": base["id"], "comparisons": [], "exitCode": 0}

    failures = 0
    context_changed = False
    comparisons_out: List[Dict[str, Any]] = []

    for current in snapshots:
        if current["id"] == base["id"]:
            continue
        result = compare(base, current, strict=strict)
        skip_suffix = f" · skipped {result['hard']['skipped']}" if result["hard"]["skipped"] else ""
        print(f"— {current.get('label') or '(no label)'} · {current.get('profile') or 'default'} · "
              f"{current.get('createdAt') or '?'}")
        print(f"  hard {result['hard']['pct']:.1f}% ({result['hard']['same']}/{result['hard']['denominator']}){skip_suffix} · "
              f"context {result['context']['pct']:.1f}% ({result['context']['same']}/{result['context']['denominator']}) · "
              f"verdict {result['verdict']}")

        for row in result["hard_missing"]:
            print(f"    MISSING  hard  {row['id']}")
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

        entry = {"snapshot": current["id"], **result}
        entry.pop("rows", None)
        comparisons_out.append(entry)

    context_is_failure = context_changed and (strict or fail_on == "context") and fail_on != "none"
    if failures and fail_on != "none":
        code = 1
        status = "FAIL"
    elif context_is_failure:
        code = 2
        status = "REVIEW"
    else:
        code = 0
        status = "PASS"

    print(f"GROUP RESULT: {status}")
    print()
    return code, {
        "group": group_name,
        "baseline": base["id"],
        "comparisons": comparisons_out,
        "exitCode": code,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare Ombra local-probe snapshots offline.",
    )
    parser.add_argument("paths", nargs="+", help="report JSON, export JSON, snapshot JSON, or directory")
    parser.add_argument("--baseline", help="snapshot id or label substring (disables auto-grouping)")
    parser.add_argument("--profile", help="only snapshots with this profile")
    parser.add_argument("--no-group", action="store_true", help="compare all loaded snapshots against one baseline")
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
                  f"{item.get('profile') or 'default'}  [{item.get('_group')}]  {item.get('label') or ''}")
        return 0

    use_groups = not args.no_group and not args.baseline
    groups = group_snapshots(snapshots, group_by_context=use_groups)

    print("Ombra checks — offline comparison")
    print(f"groups: {len(groups)} · snapshots: {len(snapshots)}")
    print()

    worst_code = 0
    group_reports: List[Dict[str, Any]] = []
    for group_name, items in groups:
        try:
            base = pick_baseline(items, args.baseline)
        except ValueError as error:
            print(f"error: {error}", file=sys.stderr)
            return 3
        code, group_report = evaluate_group(group_name, base, items, args.strict, args.fail_on)
        group_reports.append(group_report)
        if code == 1:
            worst_code = 1
        elif code == 2 and worst_code == 0:
            worst_code = 2

    overall = "FAIL" if worst_code == 1 else ("REVIEW" if worst_code == 2 else "PASS")
    print(f"OVERALL: {overall}")
    if worst_code == 1:
        print("Hard probes changed, became noisy, or disappeared. This is a real fingerprint change.")
    elif worst_code == 2:
        print("Context changed under strict/fail-on-context mode.")

    if args.json_out:
        payload: Dict[str, Any] = {
            "strict": args.strict,
            "failOn": args.fail_on,
            "groups": group_reports,
            "exitCode": worst_code,
        }
        if len(group_reports) == 1:
            payload["baseline"] = group_reports[0]["baseline"]
            payload["comparisons"] = group_reports[0]["comparisons"]
        with open(args.json_out, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
        print(f"json: {args.json_out}")

    return worst_code


if __name__ == "__main__":
    sys.exit(main())
