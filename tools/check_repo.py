#!/usr/bin/env python3
"""Validate the Ombra SDK monorepo layout and local Markdown links.

The checker is intentionally dependency-free so it runs on a stock Python
installation in CI and on contributor machines.

Usage:
    python3 tools/check_repo.py
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
from pathlib import Path
from typing import Dict, Iterable, List, Set

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_ROOT_FILES = [
    "README.md",
    "README.ru.md",
    "LICENSE",
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
    "spec/README.md",
    "spec/schemas/launch-options.schema.json",
    "spec/schemas/binary-info.schema.json",
    "conformance/README.md",
    "conformance/schema/report.schema.json",
    "conformance/cases/launch-basic.json",
    "conformance/cases/launch-profile-lock.json",
    "conformance/cases/stealth-invariants.json",
    "tools/check_repo.py",
]

SDK_STATUSES = {"scaffold", "contract", "alpha", "beta", "stable"}
CONTRACT_VERSION = re.compile(r"^\d+\.\d+\.\d+$")

MD_LINK = re.compile(r"!?\[[^\]]*\]\((?P<target>[^)\s]+)(?:\s+\"[^\"]*\")?\)")
HTML_LINK = re.compile(r"""(?:src|href)=["'](?P<target>[^"']+)["']""")
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


def check_local_link(source: Path, target: str) -> None:
    target = target.strip()
    if not target or target.startswith("#"):
        return
    if target.startswith("<") or "{" in target or target.startswith("mailto:"):
        return
    if SCHEME.match(target):
        return
    if target.startswith("//"):
        return

    clean = urllib.parse.unquote(target.split("#", 1)[0].split("?", 1)[0])
    if not clean:
        return

    resolved = (ROOT / clean.lstrip("/")) if clean.startswith("/") else (source.parent / clean)
    try:
        resolved = resolved.resolve()
        resolved.relative_to(ROOT)
    except (OSError, ValueError):
        error("%s: link escapes the repository: %s" % (rel(source), target))
        return

    if not resolved.exists():
        error("%s: broken link: %s" % (rel(source), target))


def check_markdown_links() -> int:
    files = list(iter_markdown_files())
    checked = 0
    for path in files:
        text = strip_code_fences(path.read_text(encoding="utf-8"))
        for match in MD_LINK.finditer(text):
            check_local_link(path, match.group("target"))
            checked += 1
        for match in HTML_LINK.finditer(text):
            check_local_link(path, match.group("target"))
            checked += 1
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


def check_readme_pair() -> None:
    english = (ROOT / "README.md").read_text(encoding="utf-8")
    russian = (ROOT / "README.ru.md").read_text(encoding="utf-8")
    if "README.ru.md" not in english:
        warn("README.md does not link to README.ru.md")
    if "README.md" not in russian:
        warn("README.ru.md does not link back to README.md")


def main() -> int:
    check_root_files()
    manifest = load_manifest()
    if manifest:
        check_manifest(manifest)
    check_readme_pair()
    json_count = check_json_files()
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
