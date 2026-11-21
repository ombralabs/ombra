#!/usr/bin/env python3
"""Unit tests for Markdown anchor validation in tools/check_repo.py."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import check_repo


class MarkdownAnchorTests(unittest.TestCase):
    def setUp(self) -> None:
        self._orig_root = check_repo.ROOT
        self._orig_errors = list(check_repo.errors)
        self._orig_warnings = list(check_repo.warnings)
        check_repo.errors.clear()
        check_repo.warnings.clear()

    def tearDown(self) -> None:
        check_repo.ROOT = self._orig_root
        check_repo.errors[:] = self._orig_errors
        check_repo.warnings[:] = self._orig_warnings

    def test_slugify_supports_unicode_and_punctuation(self) -> None:
        self.assertEqual(check_repo.github_heading_slug("Node.js and TypeScript API"), "nodejs-and-typescript-api")
        self.assertEqual(check_repo.github_heading_slug("Установка"), "установка")
        self.assertEqual(check_repo.github_heading_slug("इंस्टॉलेशन"), "इंस्टॉलेशन")
        self.assertEqual(check_repo.github_heading_slug("การติดตั้ง"), "การติดตั้ง")
        self.assertEqual(check_repo.github_heading_slug("12. Stealth invariants"), "12-stealth-invariants")

    def test_valid_and_broken_anchors_same_and_cross_file(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            check_repo.ROOT = root
            doc_a = root / "README.md"
            doc_b = root / "other.md"

            doc_b.write_text(
                "# Guide\n\n## Setup\n\n## Setup\n\n<a id=\"custom-id\"></a>\n",
                encoding="utf-8",
            )
            doc_a.write_text(
                "\n".join(
                    [
                        "# Title",
                        "",
                        "## Установка",
                        "",
                        "[ok same](#установка)",
                        "[bad same](#нет-такого)",
                        "[ok dup](other.md#setup-1)",
                        "[ok id](other.md#custom-id)",
                        "[bad cross](other.md#missing-section)",
                        "<a href=\"#broken-html\">bad html</a>",
                        "```markdown",
                        "[ignored in fence](#does-not-exist)",
                        "```",
                    ]
                ),
                encoding="utf-8",
            )

            cache: dict[Path, set[str]] = {}
            for target in check_repo.iter_link_targets(doc_a):
                check_repo.check_local_link(doc_a, target, cache)

            self.assertEqual(
                check_repo.errors,
                [
                    "README.md: broken anchor: #нет-такого",
                    "README.md: broken anchor: other.md#missing-section",
                    "README.md: broken anchor: #broken-html",
                ],
            )


if __name__ == "__main__":
    unittest.main()
