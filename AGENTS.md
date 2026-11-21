# Repository rules

## README translations

Keep the canonical English README at the repository root. Put each translation
in `translations/<locale>/README.md`, using the language tag as the directory
name (for example, `ru`, `zh-Hans`, or `zh-Hant`). When adding or moving a
translation, update the relative links in every README's language menu.

Store charts, diagrams, and screenshots with language-specific text in
`translations/<locale>/assets/`. For example, a Russian chart goes in
`translations/ru/assets/` and is linked from the Russian README as
`assets/chart.svg`. For English graphics with text, use `translations/en/assets/`.
Keep language-neutral graphics such as the logo in the shared root `assets/`.

## Benchmark quality must not regress between releases

The local fingerprint benchmark in `checks/` is release evidence, not an optional demo.

- Every release candidate must run `node checks/benchmark/run.mjs` against the engine artifact under test and commit the resulting JSON under `checks/results/`. On hosts where loopback HTTP is blocked, add `--transport file`; the report records the transport and any skipped probes as `known_gap`.
- Do not delete, rewrite, or silently replace earlier results. The history is the baseline.
- Compare the new result with the previous accepted result for the same engine mode, OS, transport, and probe version (the runner does this automatically; `--baseline` can name a specific report).
- Quality must not decrease from release to release. A regression is any of:
  - `L1-01`, `L5-01`, or `L5-02` dropping from `PASS` to `DEGRADED`, `FAIL`, or `UNREACHABLE`;
  - hard stability dropping below `100%`;
  - executed hard probe coverage decreasing;
  - hard noise rate rising above `0`;
  - hard probe error rate increasing;
  - the report verdict dropping from `PASS`.
- A regression blocks the release. Fix it, or record a `known_gap` with an owner and expiry date under `docs/stealth-checkup.md` §5 before shipping.
- Run both `headed` and `headless` modes for a full release; each mode has its own baseline. `--headless` alone is not a substitute for the headed pass.
- A `--no-sandbox` run is allowed only on hosts where the Chromium sandbox cannot initialize. The report records this as `DEGRADED` with `known_gap`; do not treat it as an `L0-01` launch-flags pass.
- Do not lower thresholds, remove probes, mark a failing target as `DEGRADED` without a gap entry, or delete a result to make a release pass.

See `checks/README.md` for the commands, report format, and target definitions.
