# Checks

Release evidence for the Ombra fingerprint surface. This directory turns the
manual procedure in [`docs/stealth-checkup.md`](../docs/stealth-checkup.md)
into a repeatable local benchmark.

The full catalogue of external fingerprint checks, the S0–S10 test plan, and
the manual probe guide are in
[`fingerprint-stability.md`](fingerprint-stability.md).

The benchmark implements two targets from that document:

| Target | Question | Evidence |
|---|---|---|
| `L1-01` | Does the local probe see a coherent, non-automated fingerprint? | First cold-start snapshot: WebDriver, CDP artifacts, headless markers, UA-CH, hard-probe coverage |
| `L5-01` | Does the same profile and seed produce the same hard fingerprint across launches? | Five cold starts: identical `hardHash`, 100% hard stability, zero hard noise |

`L0` (transport), `L3` (automation/CDP audit), and `L4` (behavior) are not
covered by this benchmark. They remain separate checkup targets.

## Layout

```text
checks/
  README.md
  fingerprint-stability.md
  benchmark/
    run.mjs          # engine launcher + CDP runner + report writer
    compare.py       # offline comparison of reports or raw snapshots
    serve.py         # manual probe server on 127.0.0.1
    probe/
      index.html     # local-only UI
      fp-core.js     # 69 probes (55 hard); benchmark uses hard-only by default
      app.js
      styles.css
  results/
    .gitkeep
    <run_id>.json    # committed benchmark evidence
```

`results/` is not a scratch directory. Each accepted release keeps its JSON
report; do not delete or rewrite history.

## Current evidence

| Date | Engine | Mode | `L1-01` | `L5-01` | Hard | Noise |
|---|---|---|---|---|---|---|
| 2026-11-19 | 151.0.7922.108-7 | headless | PASS | PASS | 100% (55/55) | 0 |
| 2026-11-19 | 151.0.7922.108-7 | headed | PASS | PASS | 100% (55/55) | 0 |

Reports:
[headless](results/2026-11-19T14-34-53Z-151.0.7922.108-7-headless.json),
[headed](results/2026-11-19T14-36-37Z-151.0.7922.108-7-headed.json).

Both runs used `--transport file` because loopback HTTP was blocked on the
recording host, `--hard-only` (55 hard probes), and `--no-sandbox` because the
host cannot initialize the Chromium sandbox. They are valid `L1-01`/`L5-01`
evidence; they do not assert `L0-01` (launch flags) or full permission/WebRTC
coverage.

## Run

```bash
# selected Ombra engine is auto-detected on macOS
node checks/benchmark/run.mjs --headless --runs 5

# explicit engine
node checks/benchmark/run.mjs \
  --engine "$HOME/Library/Application Support/Ombra/engines/versions/151.0.7922.108-7/Chromium.app/Contents/MacOS/Chromium" \
  --headless --runs 5
```

The runner launches the engine five times with one profile and one
`--fingerprint` seed, calls the probe over CDP, compares the hard probes and
writes:

```text
checks/results/<run_id>.json
```

By default it runs the **hard-only** subset (55 probes). `L1-01` and `L5-01`
only depend on hard probes; skipping context/volatile probes avoids
permission-sensitive APIs on CI. Use `--all-probes` for the full 69-probe
suite in the manual UI or for debugging.

The default transport is a temporary HTTP server on `127.0.0.1`. On hosts where
the engine cannot reach loopback HTTP (some CI/container sandboxes), use
`--transport file`: the runner builds a self-contained inline copy of the same
probe and loads it from `file://`. The report records `environment.transport`.

```bash
# normal host
node checks/benchmark/run.mjs --headless --runs 5

# restricted host: no loopback HTTP
node checks/benchmark/run.mjs --headless --transport file --runs 5
```

Use `--mode headed` (the default) for the pre-release run. `--headless` is for
CI and quick regression checks; the report records the mode and both modes are
separate baselines.

Other options:

```text
--engine PATH      engine binary (or OMBRA_BINARY_PATH)
--profile DIR      reuse an existing test profile
--seed N           passed as --fingerprint=N (default 20261119)
--transport MODE   http (default) or file
--out FILE         override the result path
--baseline FILE    compare with a specific previous report
--no-sandbox       restricted hosts only; recorded in environment.notes
--no-double        skip the probe's noise self-test (not for release evidence)
--no-redact        keep raw probe values (local debugging only)
--all-probes       run context/volatile probes too (default: hard-only)
--runs N           cold starts (default 5)
```

`--no-sandbox` is required in containers and on hosts where the Chromium
sandbox cannot initialize. The report then says so. Such a run is valid
evidence for `L1-01`/`L5-01`, but it is **not** an `L0-01` launch-flags pass.

## Report

The JSON follows
[`conformance/schema/report.schema.json`](../conformance/schema/report.schema.json).
Required fields are populated:

- `run_id`, `started_at`, `operator`;
- `sdk` — the local probe version and contract;
- `engine` — Ombra engine version, SHA-256, artifact name;
- `environment` — OS, `headed`/`headless`, transport, `seed_hash` (never the
  raw seed), proxy country (`direct`), and notes;
- `targets` — `L1-01` and `L5-01` with status, failures, artifacts;
- `verdict` — `PASS`, `PASS_WITH_GAPS`, `FAIL`, or `INCOMPLETE`.

Additional `checks` data is the machine evidence: per-probe hashes/statuses,
hard-hash comparisons, probe count, noise count, baseline, and regressions.
Raw probe values are removed by default before the JSON is written; use
`--no-redact` only for local debugging and never commit that file. The raw
profile is temporary and is not part of the report.

### L1-01 critical checks

The target fails if any of these is visible in the first snapshot:

- `navigator.webdriver` is not `false`;
- a CDP/automation artifact is present in `window`/`document`;
- a headless marker is present (`uaHeadless`, zero screen, zero outer size,
  no Chrome object, no plugins, no languages);
- `mobileNoTouch`, `chromeNoPlugins`, `outerZero`, or `screenZero` is true.

Unavailable hard probes and missing UA-CH are `DEGRADED`, not `PASS`.

With `--transport file`, permission-sensitive probes (`auto.permissions`,
`hw.permissions`, `media.devices`, `media.voices`, WebRTC) are skipped because
the file origin cannot answer them consistently. The report records them under
`checks.skipped`; `L1-01` covers everything else. Use the HTTP transport for a
full permission/WebRTC pass.

### L5-01 stable checks

The target passes only when all cold starts have:

- the same `hardHash`;
- 100% hard stability against the first run;
- zero hard noise;
- no missing hard probes.

Context changes (window position, media devices, permissions) are recorded but
do not fail `L5-01`; hard changes do. The probe's `volatile` class is excluded.
The default hard-only run does not execute context probes; use `--all-probes`
when you need that extra context recorded.

## Regression gate

Every release candidate must add a result JSON. The next run automatically
compares with the latest accepted report (`PASS`/`PASS_WITH_GAPS`) for the same engine name and mode, unless
`--baseline` names another file.

A regression is any of:

- `L1-01` or `L5-01` status dropping: `PASS` → `DEGRADED`/`FAIL`/`UNREACHABLE`;
- hard stability dropping below 100%;
- hard probe coverage decreasing;
- hard noise increasing above zero;
- hard probe errors increasing;
- verdict dropping from `PASS`.

Any regression makes the report `FAIL` and exits non-zero. Fix it, or record a
`known_gap` with owner and expiry per
[`docs/stealth-checkup.md §5`](../docs/stealth-checkup.md#5-status-model)
before shipping. The repository rule is in [`AGENTS.md`](../AGENTS.md).

## Manual probe

For debugging or a human-readable diff:

```bash
python3 checks/benchmark/serve.py
# http://127.0.0.1:8787/
```

The probe makes no network requests: CSP `connect-src 'none'`, no external
scripts, fonts, or images. It stores history only in this browser's
`localStorage`. Export contains raw fingerprint values; treat it as sensitive.

## Offline comparison

`compare.py` reads a benchmark report (`checks.runs`), a raw probe export
(`snapshots`), or a directory of either:

```bash
python3 checks/benchmark/compare.py checks/results/<run_id>.json
python3 checks/benchmark/compare.py checks/results/ --strict
```

Exit codes: `0` hard-stable, `1` hard changed/noisy/missing, `2` context
changed under `--strict`, `3` no data.

## Exit codes of run.mjs

| Code | Meaning |
|---|---|
| `0` | `PASS` |
| `1` | `PASS_WITH_GAPS` or `FAIL` |
| `2` | `INCOMPLETE` — engine/license/runner failure |

## Limits

- This is a **local** probe. It cannot see TLS/JA3/JA4, HTTP/2, TCP/IP, IP
  reputation, DNS, or headers; use L0 targets for those.
- It does not audit CDP commands sent by an SDK; use `L3-04` and the
  conformance cases for that.
- It does not measure behavior; use `L4`.
- A green report is evidence for one seed, one mode, one host, and one engine
  artifact. It is not a promise of undetectability.
