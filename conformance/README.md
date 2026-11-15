# Conformance

Conformance is what keeps eight SDKs honest. Every language must launch the same engine, return the native browser type of its ecosystem, and leave the same stealth surface untouched.

This directory is the language-neutral source of truth. It contains declarative cases, the report schema, and (eventually) a runner that drives any SDK through the cases.

## What is checked

| Suite | Question it answers | Runner |
|---|---|---|
| **Launch** | Does `launch()` return a real browser and a usable page? | Launch + native client |
| **Lifecycle** | Do profiles lock, close, and restart the same way everywhere? | Launch + process inspection |
| **Stealth invariants** | Does the SDK add flags, CDP domains, or scripts? | CDP audit + real command line |
| **Parity** | Do two SDKs produce the same canonical fingerprint for the same seed? | Two clients, one profile, one probe |

The suites are independent. A Python SDK can pass launch and fail parity because its Playwright helper enables a domain; that is a real finding.

## Case format

Cases are JSON so a runner can consume them without a YAML dependency. A case is declarative, not a script:

```json
{
  "id": "launch-basic",
  "title": "launch() returns a native browser",
  "contract": "0.1.0",
  "runner": "launch",
  "status": "design",
  "preconditions": ["engine binary available"],
  "steps": [
    { "call": "launch", "as": "browser", "args": { "headless": true } },
    { "call": "browser.new_page", "as": "page" },
    { "call": "page.goto", "args": { "url": "https://example.com" } },
    { "call": "browser.close" }
  ],
  "expect": [
    { "path": "browser.kind", "equals": "native" },
    { "path": "page.url", "matches": "^https://example\\.com" }
  ]
}
```

Rules:

- `$name.field` references a previous step's result.
- `expect_error` marks a step that must fail with a specific SDK error kind.
- `status` is `design`, `active`, or `retired`. Only `active` cases gate a release.
- `contract` is the contract version the case was written against.
- `preconditions` are prose; the runner decides how to satisfy them.
- Cases never contain a real proxy, key, or profile name.

## Stealth invariants

[`cases/stealth-invariants.json`](cases/stealth-invariants.json) is the machine-readable form of the rules in [docs/sdk-contract.md §12](../docs/sdk-contract.md#12-stealth-invariants). Each entry names a check the runner can implement mechanically:

- `cdp-audit` — inspect the commands the client sends over the CDP WebSocket.
- `flags-audit` — inspect the engine process command line.
- `process-audit` — inspect the process list, bound ports, and environment.
- `probe` — compare the browser's answer with the expected value.
- `binary-info` — verify the resolved binary metadata.

A failure is a release blocker for the SDK, even when the engine is correct.

## Report schema

[`schema/report.schema.json`](schema/report.schema.json) is the shared report format for launch, lifecycle, stealth, and parity runs. The stealth checkup uses the same shape, so one dashboard can consume both.

A report has:

- `run_id`, `started_at`, `operator`;
- `sdk`, `engine`, `environment` — enough to reproduce the run;
- `targets` — one entry per check, with `status`, `failures`, `artifacts`, and an optional `known_gap`;
- `verdict` — `PASS`, `PASS_WITH_GAPS`, `FAIL`, or `INCOMPLETE`.

## Running (planned)

The runner does not exist yet. The intended interface:

```bash
# Launch and lifecycle through a language SDK.
python -m conformance run --sdk python --suite launch,lifecycle

# Stealth invariants for one SDK against a local engine build.
python -m conformance run --sdk node --suite stealth --profile conformance

# Parity between two SDKs.
python -m conformance parity --left python --right go --profile conformance
```

Until then, the cases are specifications for SDK authors and reviewers. A pull request that implements a case should also add the runner hook that executes it.

## Adding a case

1. Pick the lowest suite that can express the behavior (launch before lifecycle, lifecycle before stealth).
2. Write the case with a stable `id` and the current contract version.
3. Add the runner hook if the case introduces a new call shape.
4. Run it against at least two SDKs before marking it `active`.
5. Update the table in this README if the suite gains a new category.

Cases that cannot run on a contributor machine belong in the weekly workflow, not in the per-PR gate.
