#!/usr/bin/env python3
"""Validate the Ombra SDK monorepo layout and local Markdown links.

The checker is intentionally dependency-free so it runs on a stock Python
installation in CI and on contributor machines.

Usage:
    python3 tools/check_repo.py
"""

from __future__ import annotations

from collections import Counter
import json
import re
import sys
import unicodedata
import urllib.parse
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_ROOT_FILES = [
    "README.md",
    "translations/ru/README.md",
    "LICENSE",
    "LICENSE-NONCOMMERCIAL",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    "CHANGELOG.md",
    "NOTICE",
    ".gitignore",
    ".editorconfig",
    ".gitattributes",
    ".github/workflows/ci.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "assets/logo.svg",
    "sdks/manifest.json",
    "sdks/README.md",
    "docs/README.md",
    "docs/architecture.md",
    "docs/sdk-contract.md",
    "docs/stealth-checkup.md",
    "docs/stealth-checkup.ru.md",
    "docs/versioning.md",
    "checks/README.md",
    "checks/fingerprint-stability.md",
    "checks/benchmark/lib.mjs",
    "checks/benchmark/external.mjs",
    "checks/benchmark/score.mjs",
    "checks/benchmark/run.mjs",
    "checks/benchmark/compare.py",
    "checks/benchmark/serve.py",
    "checks/benchmark/probe/index.html",
    "checks/benchmark/probe/fp-core.js",
    "checks/benchmark/probe/app.js",
    "tools/check_repo.py",
]

SDK_STATUSES = {"scaffold", "contract", "alpha", "beta", "stable"}
CONTRACT_VERSION = re.compile(r"^\d+\.\d+\.\d+$")
REPORT_VERDICTS = {"PASS", "PASS_WITH_GAPS", "FAIL", "INCOMPLETE"}
TARGET_STATUSES = {"PASS", "DEGRADED", "FAIL", "UNREACHABLE"}
REPORT_MODES = {"headed", "headless"}
PROXY_COUNTRY_RE = re.compile(r"^([A-Z]{2}|direct)$")
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

MD_LINK = re.compile(r"!?\[[^\]]*\]\((?P<target>[^)\s]+)(?:\s+\"[^\"]*\")?\)")
HTML_LINK = re.compile(r"""(?:src|href)=["'](?P<target>[^"']+)["']""")
ATX_HEADING = re.compile(r"^#{1,6}\s+(?P<text>.+?)\s*#*\s*$")
HTML_HEADING = re.compile(r"^\s*<h([1-6])[^>]*>(?P<text>.*?)</h\1>", re.IGNORECASE)
HTML_ANCHOR = re.compile(r"""\b(?:id|name)=["'](?P<id>[^"']+)["']""")
SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*:", re.IGNORECASE)
FENCE = re.compile(r"^\s*(```|~~~)")

errors: List[str] = []
warnings: List[str] = []


def error(message: str) -> None:
    errors.append(message)


def warn(message: str) -> None:
    warnings.append(message)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def load_manifest() -> Dict:
    path = ROOT / "sdks" / "manifest.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        error("sdks/manifest.json is missing")
    except json.JSONDecodeError as exc:
        error("sdks/manifest.json is not valid JSON: %s" % exc)
    return {}


def check_root_files() -> None:
    for name in REQUIRED_ROOT_FILES:
        if not (ROOT / name).exists():
            error("missing required file: %s" % name)

    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8") if (ROOT / "LICENSE").exists() else ""
    if "Apache License" not in license_text:
        error("LICENSE does not look like the Apache License, Version 2.0")

    nc_path = ROOT / "LICENSE-NONCOMMERCIAL"
    nc_text = nc_path.read_text(encoding="utf-8") if nc_path.exists() else ""
    if "PolyForm Noncommercial License 1.0.0" not in nc_text:
        error("LICENSE-NONCOMMERCIAL does not look like the PolyForm Noncommercial License 1.0.0")


def check_manifest(manifest: Dict) -> None:
    if manifest.get("schema_version") != 1:
        error("sdks/manifest.json: schema_version must be 1")

    version = manifest.get("contract_version")
    if not isinstance(version, str) or not CONTRACT_VERSION.match(version):
        error("sdks/manifest.json: contract_version must look like 0.1.0")

    sdks = manifest.get("sdks")
    if not isinstance(sdks, list) or not sdks:
        error("sdks/manifest.json: sdks must be a non-empty list")
        return

    seen_ids: Set[str] = set()
    seen_dirs: Set[str] = set()

    for index, sdk in enumerate(sdks):
        where = "sdks/manifest.json: sdks[%d]" % index
        if not isinstance(sdk, dict):
            error("%s must be an object" % where)
            continue

        required = [
            "id",
            "language",
            "directory",
            "package",
            "registry",
            "runtime",
            "source_root",
            "tests_root",
            "cdp_clients",
            "status",
        ]
        for key in required:
            if key not in sdk:
                error("%s is missing %r" % (where, key))

        sdk_id = sdk.get("id")
        if not isinstance(sdk_id, str) or not sdk_id:
            error("%s has an empty id" % where)
            continue
        if sdk_id in seen_ids:
            error("%s duplicates id %r" % (where, sdk_id))
        seen_ids.add(sdk_id)

        directory = sdk.get("directory")
        if not isinstance(directory, str) or not directory.startswith("sdks/"):
            error("%s.directory must start with 'sdks/'" % where)
            continue
        if directory in seen_dirs:
            error("%s duplicates directory %r" % (where, directory))
        seen_dirs.add(directory)

        sdk_dir = ROOT / directory
        if not sdk_dir.is_dir():
            error("%s: directory does not exist: %s" % (where, directory))
            continue
        if not (sdk_dir / "README.md").is_file():
            error("%s: missing %s/README.md" % (where, directory))

        for key in ("source_root", "tests_root"):
            value = sdk.get(key)
            if not isinstance(value, str) or not value.startswith("sdks/"):
                error("%s.%s must start with 'sdks/'" % (where, key))
                continue
            if not (ROOT / value).is_dir():
                error("%s.%s does not exist: %s" % (where, key, value))

        clients = sdk.get("cdp_clients")
        if not isinstance(clients, list) or not clients or not all(isinstance(item, str) for item in clients):
            error("%s.cdp_clients must be a non-empty list of strings" % where)

        status = sdk.get("status")
        if status not in SDK_STATUSES:
            error("%s.status must be one of %s" % (where, ", ".join(sorted(SDK_STATUSES))))

        for key in ("language", "package", "registry", "runtime"):
            if not isinstance(sdk.get(key), str) or not sdk.get(key):
                error("%s.%s must be a non-empty string" % (where, key))

    for directory in (ROOT / "sdks").iterdir():
        if not directory.is_dir() or directory.name.startswith(("_", ".")):
            continue
        if "sdks/%s" % directory.name not in seen_dirs:
            warn("sdks/%s exists but is not listed in sdks/manifest.json" % directory.name)


def strip_code_fences(text: str) -> str:
    result: List[str] = []
    inside = False
    for line in text.splitlines():
        if FENCE.match(line):
            inside = not inside
            result.append("")
            continue
        result.append("" if inside else line)
    return "\n".join(result)


def iter_markdown_files() -> Iterable[Path]:
    for path in sorted(ROOT.rglob("*.md")):
        if any(part.startswith(".") for part in path.relative_to(ROOT).parts):
            continue
        if "node_modules" in path.parts:
            continue
        yield path


def github_heading_slug(heading: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", heading)
    text = text.replace("`", "")
    text = re.sub(r"<[^>]+>", "", text).strip().lower()
    out: List[str] = []
    for ch in text:
        if ch == " ":
            out.append("-")
        elif ch in ("-", "_"):
            out.append(ch)
        elif unicodedata.category(ch)[0] in ("L", "M", "N"):
            out.append(ch)
    return "".join(out)


def extract_markdown_anchors(path: Path) -> Set[str]:
    text = strip_code_fences(path.read_text(encoding="utf-8"))
    anchors: Set[str] = set()
    counts: Counter[str] = Counter()
    for line in text.splitlines():
        match = ATX_HEADING.match(line) or HTML_HEADING.match(line)
        if match:
            base = github_heading_slug(match.group("text"))
            if base:
                slug = base if counts[base] == 0 else "%s-%d" % (base, counts[base])
                counts[base] += 1
                anchors.add(slug)
    for match in HTML_ANCHOR.finditer(text):
        anchors.add(match.group("id"))
    return anchors


def check_local_link(
    source: Path,
    target: str,
    anchor_cache: Optional[Dict[Path, Set[str]]] = None,
) -> Optional[Path]:
    target = target.strip()
    if not target:
        return None
    if target.startswith("<") or "{" in target or target.startswith("mailto:"):
        return None
    if SCHEME.match(target):
        return None
    if target.startswith("//"):
        return None

    path_part, _, raw_fragment = target.partition("#")
    fragment = urllib.parse.unquote(raw_fragment).strip()
    clean = urllib.parse.unquote(path_part.split("?", 1)[0])

    if not clean:
        resolved = source.resolve()
    else:
        resolved = (ROOT / clean.lstrip("/")) if clean.startswith("/") else (source.parent / clean)
        try:
            resolved = resolved.resolve()
            resolved.relative_to(ROOT)
        except (OSError, ValueError):
            error("%s: link escapes the repository: %s" % (rel(source), target))
            return None

        if not resolved.exists():
            error("%s: broken link: %s" % (rel(source), target))
            return None

    if fragment and resolved.is_file() and resolved.suffix.lower() == ".md":
        if anchor_cache is None:
            anchors = extract_markdown_anchors(resolved)
        else:
            anchors = anchor_cache.get(resolved)
            if anchors is None:
                anchors = extract_markdown_anchors(resolved)
                anchor_cache[resolved] = anchors
        if fragment not in anchors:
            error("%s: broken anchor: %s" % (rel(source), target))
            return None

    return resolved if clean else None


def iter_link_targets(path: Path) -> Iterable[str]:
    text = strip_code_fences(path.read_text(encoding="utf-8"))
    for pattern in (MD_LINK, HTML_LINK):
        for match in pattern.finditer(text):
            yield match.group("target")


def check_markdown_links() -> int:
    readmes = set((ROOT / "translations").glob("*/README.md"))
    readmes.add(ROOT / "README.md")
    anchor_cache: Dict[Path, Set[str]] = {}
    checked = 0
    for path in iter_markdown_files():
        linked_paths = set()
        for target in iter_link_targets(path):
            destination = check_local_link(path, target, anchor_cache)
            if destination is not None:
                linked_paths.add(destination)
            checked += 1
        if path in readmes:
            for missing in sorted(readmes - linked_paths - {path}):
                warn("%s does not link to %s" % (rel(path), rel(missing)))
    return checked


def check_json_files() -> int:
    count = 0
    for path in sorted(ROOT.rglob("*.json")):
        if any(part in {".git", "node_modules", "target", "bin", "obj"} for part in path.parts):
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            error("%s: invalid JSON: %s" % (rel(path), exc))
        except OSError as exc:
            error("%s: cannot read: %s" % (rel(path), exc))
        count += 1
    return count


def check_benchmark_reports() -> int:
    results_dir = ROOT / "checks" / "results"
    if not results_dir.is_dir():
        return 0
    count = 0
    for path in sorted(results_dir.glob("*.json")):
        count += 1
        where = rel(path)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue  # Already reported by check_json_files
        if not isinstance(data, dict):
            error("%s: report root must be an object" % where)
            continue

        for key in ("run_id", "started_at", "operator", "sdk", "engine", "environment", "targets", "verdict"):
            if key not in data:
                error("%s: missing required report field %r" % (where, key))

        verdict = data.get("verdict")
        if verdict not in REPORT_VERDICTS:
            error("%s: invalid verdict %r" % (where, verdict))

        for comp_key in ("sdk", "engine"):
            comp = data.get(comp_key)
            if not isinstance(comp, dict) or not comp.get("name") or not comp.get("version"):
                error("%s: %s must have non-empty name and version" % (where, comp_key))

        env = data.get("environment")
        if isinstance(env, dict):
            if not isinstance(env.get("os"), str) or not env.get("os"):
                error("%s: environment.os must be a non-empty string" % where)
            if env.get("mode") not in REPORT_MODES:
                error("%s: environment.mode must be headed or headless" % where)
            seed_hash = env.get("seed_hash")
            if not isinstance(seed_hash, str) or not seed_hash.startswith("sha256:"):
                error("%s: environment.seed_hash must start with 'sha256:'" % where)
            proxy_country = env.get("proxy_country")
            if proxy_country is not None and (not isinstance(proxy_country, str) or not PROXY_COUNTRY_RE.match(proxy_country)):
                error("%s: environment.proxy_country must be ISO alpha-2 or 'direct'" % where)
        else:
            error("%s: environment must be an object" % where)

        targets = data.get("targets")
        if not isinstance(targets, list) or not targets:
            error("%s: targets must be a non-empty array" % where)
        else:
            for idx, target in enumerate(targets):
                t_where = "%s: targets[%d]" % (where, idx)
                if not isinstance(target, dict):
                    error("%s must be an object" % t_where)
                    continue
                if not isinstance(target.get("id"), str) or not target.get("id"):
                    error("%s missing non-empty id" % t_where)
                status = target.get("status")
                if status not in TARGET_STATUSES:
                    error("%s invalid status %r" % (t_where, status))
                if not isinstance(target.get("failures"), list):
                    error("%s failures must be a list" % t_where)
                if status == "DEGRADED":
                    gap = target.get("known_gap")
                    if not isinstance(gap, dict):
                        error("%s DEGRADED target must include known_gap" % t_where)
                    else:
                        if not isinstance(gap.get("owner"), str) or not gap.get("owner"):
                            error("%s known_gap.owner must be non-empty" % t_where)
                        if not isinstance(gap.get("reason"), str) or not gap.get("reason"):
                            error("%s known_gap.reason must be non-empty" % t_where)
                        expires = gap.get("expires")
                        if not isinstance(expires, str) or not ISO_DATE_RE.match(expires):
                            error("%s known_gap.expires must be YYYY-MM-DD" % t_where)

        checks = data.get("checks")
        if isinstance(checks, dict):
            flags = checks.get("flags") or []
            for flag in flags:
                if isinstance(flag, str) and (
                    flag.startswith("--fingerprint=")
                    or flag.startswith("--user-data-dir=")
                    or flag.startswith("--proxy-server=")
                ):
                    error("%s: sensitive flag leaked in checks.flags (%s)" % (where, flag.split("=", 1)[0]))
            quality = checks.get("quality")
            if quality is not None:
                if not isinstance(quality, dict):
                    error("%s: checks.quality must be an object" % where)
                else:
                    q_score = quality.get("score")
                    if not isinstance(q_score, (int, float)) or q_score < 0 or q_score > 100:
                        error("%s: checks.quality.score must be a number in 0..100" % where)
                    if quality.get("grade") not in {"A+", "A", "B", "C", "D", "F"}:
                        error("%s: checks.quality.grade is invalid (%r)" % (where, quality.get("grade")))
                    if not isinstance(quality.get("layers"), dict):
                        error("%s: checks.quality.layers must be an object" % where)
            for r_idx, run in enumerate(checks.get("runs") or []):
                probes = run.get("probes") if isinstance(run, dict) else None
                if isinstance(probes, dict):
                    raw_keys = [pid for pid, item in probes.items() if isinstance(item, dict) and "v" in item]
                    if raw_keys:
                        error("%s: checks.runs[%d] contains unredacted raw probe values (%s)" % (
                            where, r_idx, ", ".join(raw_keys[:3])
                        ))
                        break
    return count
def main() -> int:
    check_root_files()
    manifest = load_manifest()
    if manifest:
        check_manifest(manifest)
    json_count = check_json_files()
    check_benchmark_reports()
    checked_links = check_markdown_links()

    for message in warnings:
        print("warning: %s" % message)
    for message in errors:
        print("error: %s" % message)

    if errors:
        print("\n%d error(s), %d warning(s)" % (len(errors), len(warnings)))
        return 1

    sdk_count = len(manifest.get("sdks", []))
    print(
        "OK: %d SDKs, %d JSON files, %d links checked, %d warning(s)"
        % (sdk_count, json_count, checked_links, len(warnings))
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
