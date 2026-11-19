# Repository rules

## Benchmark quality must not regress between releases

The local fingerprint benchmark in `checks/` is release evidence, not an optional demo.

- Every release candidate must run `node checks/benchmark/run.mjs` against the engine artifact under test and commit the resulting JSON under `checks/results/`. On hosts where loopback HTTP is blocked, add `--transport file`; the report records the transport.
- Do not delete, rewrite, or silently replace earlier results. The history is the baseline.
- Compare the new result with the previous accepted result for the same engine mode (the runner does this automatically; `--baseline` can name a specific report).
- Quality must not decrease from release to release. A regression is any of:
  - `L1-01` or `L5-01` dropping from `PASS` to `DEGRADED`, `FAIL`, or `UNREACHABLE`;
  - hard stability dropping below `100%`;
  - hard probe coverage decreasing;
  - hard noise rising above `0`;
  - hard probe errors increasing;
  - the report verdict dropping from `PASS`.
- A regression blocks the release. Fix it, or record a `known_gap` with an owner and expiry date under `docs/stealth-checkup.md` §5 before shipping.
- Run both `headed` and `headless` modes for a full release; each mode has its own baseline. `--headless` alone is not a substitute for the headed pass.
- A `--no-sandbox` run is allowed only on hosts where the Chromium sandbox cannot initialize. The report records this; do not treat it as an `L0-01` launch-flags pass.
- Do not lower thresholds, remove probes, mark a failing target as `DEGRADED` without a gap entry, or delete a result to make a release pass.

See `checks/README.md` for the commands, report format, and target definitions.
