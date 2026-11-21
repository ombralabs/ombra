# Checks

Release evidence for the Ombra fingerprint surface. This directory turns the
manual procedure in [`docs/stealth-checkup.md`](../docs/stealth-checkup.md)
into a repeatable local benchmark.

The full catalogue of external fingerprint checks, the S0–S10 test plan, and
the manual probe guide are in
[`fingerprint-stability.md`](fingerprint-stability.md).

The benchmark implements three targets from that document:

| Target | Question | Evidence |
|---|---|---|
| `L1-01` | Does the local probe see a coherent, non-automated fingerprint across every run? | All cold-start snapshots: WebDriver, CDP artifacts, `Runtime.enable` leak, native prototype integrity, cross-field OS/GPU/UA coherence, permissions parity, headless markers, UA-CH, hard-probe coverage |
| `L5-01` | Does the same profile and seed produce the same hard fingerprint across launches, and does changing the seed change it? | Five cold starts with identical `hardHash`, 100% hard stability, zero hard noise, plus an alternate-seed control launch verifying `hardHash` changes |
| `L5-02` | Do Main window, DedicatedWorker, same-origin `iframe`, and detached `iframe` agree? | `context.agreement` probe across all cold-start snapshots |

`L0` (transport), `L3` (full SDK CDP audit), and `L4` (behavior) are not
covered by this benchmark. They remain separate checkup targets.

## Layout

```text
checks/
  README.md
  fingerprint-stability.md
  benchmark/
    lib.mjs          # pure parsing, comparison, target/baseline evaluation, redaction
    run.mjs          # engine launcher + CDP runner (no Runtime.enable) + report writer
    compare.py       # offline grouped comparison of reports or raw snapshots
    serve.py         # manual probe server on 127.0.0.1
    tests/           # zero-dependency Node and Python unit tests
    probe/
      index.html     # local-only UI (CSP connect-src 'none')
      fp-core.js     # 78 probes (65 hard, 10 context, 3 volatile); hard-only by default
      app.js
      styles.css
  results/
    .gitkeep
    <run_id>.json    # committed benchmark evidence
```

`results/` is not a scratch directory. Each accepted release keeps its JSON
report; do not delete or rewrite history.

## Current evidence

| Date | Engine | Probe | Mode | `L1-01` | `L5-01` | Hard | Noise |
|---|---|---|---|---|---|---|---|
| 2026-11-19 | 151.0.7922.108-7 | 1.0.0 (legacy) | headless | PASS | PASS | 100% (55/55) | 0 |
| 2026-11-19 | 151.0.7922.108-7 | 1.0.0 (legacy) | headed | PASS | PASS | 100% (55/55) | 0 |

Reports:
[headless](results/2026-11-19T14-34-53Z-151.0.7922.108-7-headless.json),
[headed](results/2026-11-19T14-36-37Z-151.0.7922.108-7-headed.json).

> Note: those two historical v1.0.0 files were recorded before probe v1.1.0
> using `--transport file` and `--no-sandbox`. Starting with v1.1.0, any run
> with skipped hard probes (such as `file://`) or `--no-sandbox` records an
> explicit `known_gap` (`DEGRADED` / `PASS_WITH_GAPS`, exit `1`) instead of a
> full release-gate `PASS`. Re-record with `--transport http` and sandbox
> enabled for a full v1.1.0 `PASS` baseline.

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

By default it runs the **hard-only** subset (65 probes) plus one alternate-seed
control launch (`--seed2`, verifying `hardHash` changes when `--fingerprint`
changes). The runner evaluates the page without sending `Runtime.enable`
(matching conformance invariant `SI-01`) and does not force
`--force-device-scale-factor=1` (pass `--dpr N` if you want an explicit DPR
override). Use `--all-probes` for the full 78-probe suite.

The default transport is a temporary HTTP server on `127.0.0.1`. On hosts where
the engine cannot reach loopback HTTP (some CI/container sandboxes), use
`--transport file`: the runner builds a self-contained inline copy of the same
probe and loads it from `file://`. Because `file://` skips `auto.permissions`
and the Blob Worker portion of `context.agreement`, those targets are marked
`DEGRADED` with an explicit `known_gap` (`PASS_WITH_GAPS`, exit `1`).

```bash
# normal host (full release gate)
node checks/benchmark/run.mjs --headless --runs 5

# cross-OS profile verification
node checks/benchmark/run.mjs --headless --platform windows --runs 5

# restricted host: no loopback HTTP (produces PASS_WITH_GAPS with known_gap)
node checks/benchmark/run.mjs --headless --transport file --runs 5
```

Use `--mode headed` (the default) for the pre-release run. `--headless` is for
CI and quick regression checks; the report records the mode and both modes are
separate baselines.

Other options:

```text
--engine PATH            engine binary (or OMBRA_BINARY_PATH)
--profile DIR            reuse an existing test profile
--seed VALUE             passed as --fingerprint=VALUE (default 20261119)
--seed2 VALUE            alternate seed for L5-01 sensitivity check
--no-seed-check          skip the alternate-seed sensitivity check
--platform OS            pass --fingerprint-platform (windows|macos|linux|android)
--timezone TZ            pass --fingerprint-timezone=TZ
--location LOC           pass --fingerprint-location=LOC
--profile-preset NAME    pass --fingerprint-profile=NAME
--dpr N                  pass --fingerprint-device-pixel-ratio=N
--transport MODE         http (default) or file
--out FILE               override the result path
--baseline FILE          compare with a specific previous report (missing fails)
--no-sandbox             restricted hosts only; marks L1-01 DEGRADED with known_gap
--no-double              skip the probe's noise self-test (not for release evidence)
--no-redact              keep raw probe values (local debugging only)
--all-probes             run context/volatile probes too (default: hard-only)
--runs N                 cold starts (default 5)
--known-gap-owner NAME   owner recorded in known_gap on DEGRADED targets
--known-gap-expires DATE YYYY-MM-DD expiry recorded in known_gap on DEGRADED targets
```

`--no-sandbox` is required in containers and on hosts where the Chromium
sandbox cannot initialize. The runner records a `known_gap` and reports
`PASS_WITH_GAPS` (exit `1`), so a `--no-sandbox` run can never silently become a
`PASS` release-gate baseline for a sandboxed host.

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

The target evaluates **all** cold-start snapshots and fails if any run shows:

- `navigator.webdriver` is not `false`;
- a CDP/automation artifact is present in `window`/`document`/`navigator`;
- `auto.runtimeLeak.leaked === true` (`Runtime.enable` leak);
- `js.error.sourceUrlLeak === true` or `js.native.allNative === false`;
- `auto.permissions.mismatch === true`;
- a headless marker is present (`uaHeadless`, zero screen, zero outer size,
  no Chrome object, no plugins on desktop, no languages);
- `mobileNoTouch`, `chromeNoPlugins` (desktop), `outerZero`, `screenZero`,
  `innerExceedsOuter`, `windowExceedsScreen`, `uaPlatformMismatch`,
  `uaMobileMismatch`, `uaArchMismatch`, `gpuOsMismatch`, `osFontMismatch`,
  or `webdriverOwnProp` is true.

Unavailable hard probes, missing UA-CH, skipped hard probes (for example
`auto.permissions` on `file://`), and `--no-sandbox` are `DEGRADED` with an
explicit `known_gap`, never `PASS`.

### L5-01 stable checks

The target passes only when all expected cold starts complete and have:

- the same `hardHash`;
- 100% hard stability against the first run (`denominator > 0`);
- zero hard noise;
- no missing, errored, or skipped hard probes;
- a different `hardHash` on the alternate-seed control launch (`--seed2`).

### L5-02 cross-context agreement

`context.agreement` verifies that Main window, DedicatedWorker (Blob),
same-origin `iframe`, and detached `iframe` agree on `navigator`, `Intl`,
`screen`, and `OffscreenCanvas`. Any mismatch fails `L5-02`; if the worker
check is skipped (on `file://`), `L5-02` is `DEGRADED` with `known_gap`.

## Regression gate

Every release candidate must add a result JSON. The next run automatically
compares with the latest compatible accepted report (`PASS`/`PASS_WITH_GAPS`)
matching the same engine name, mode, OS, transport, probe version, probe subset,
profile platform, and sandbox level, unless `--baseline` names another file
(a missing explicit `--baseline` fails the run with exit code `2`).

A regression is any of:

- `L1-01`, `L5-01`, or `L5-02` status dropping: `PASS` → `DEGRADED`/`FAIL`/`UNREACHABLE`;
- overall `verdict` dropping (for example `PASS` → `PASS_WITH_GAPS`);
- hard stability dropping below 100%;
- executed hard probe coverage decreasing;
- hard noise rate (`noise_per_run`) increasing;
- hard probe error rate (`hard_errors_per_run`) increasing.

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
scripts, fonts, or images (`frame-src 'self' blob: about:; worker-src 'self' blob:`
are enabled solely for local `L5-02` cross-context checks). It stores history
only in this browser's `localStorage`. Export contains raw fingerprint values;
treat it as sensitive.

## Offline comparison

`compare.py` reads a benchmark report (`checks.runs`), a raw probe export
(`snapshots`), or a directory of either. When given a directory containing
multiple modes (such as `headless` and `headed`), it groups snapshots by
compatible `(engine, mode, os, probe)` context automatically (use `--no-group`
to compare across groups):

```bash
python3 checks/benchmark/compare.py checks/results/<run_id>.json
python3 checks/benchmark/compare.py checks/results/ --strict
```

## Self-tests

```bash
node --test checks/benchmark/tests/*.test.mjs
python3 -m unittest discover -s checks/benchmark/tests -p "test_*.py" -v
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
