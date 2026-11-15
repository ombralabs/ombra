# Conformance

Conformance is what keeps eight SDKs honest. Every language must produce the same observable behavior for the same profile, the same wire calls, and the same CDP hygiene.

This directory is the language-neutral source of truth. It contains declarative cases, the report schema, and (eventually) a runner that drives any SDK through the cases.

## What is checked

| Suite | Question it answers | Runner |
|---|---|---|
| **Wire** | Does the SDK map the Local API correctly? | HTTP against a running app |
| **Lifecycle** | Does create → launch → stop → delete behave the same everywhere? | HTTP + process inspection |
| **Stealth invariants** | Does the SDK or its helper add flags, CDP domains, or scripts? | CDP audit + real command line |
| **Parity** | Do two SDKs produce the same canonical fingerprint for the same seed? | Two clients, one profile, one probe |

The suites are independent. A Python SDK can pass wire and fail parity because its Playwright helper enables a domain; that is a real finding.

## Case format

Cases are JSON so a runner can consume them without a YAML dependency. A case is declarative, not a script:

```json
{
  "id": "launch-lifecycle",
  "title": "Create, launch, stop, delete",
  "contract": "0.1.0",
  "runner": "lifecycle",
  "status": "design",
  "preconditions": ["app running", "engine installed"],
  "steps": [
    { "call": "profiles.create", "as": "profile", "args": { "name": "conformance" } },
    { "call": "launch", "args": { "profile": "$profile.id" }, "as": "session" },
    { "call": "stop", "args": { "profile": "$profile.id" } },
    { "call": "profiles.delete", "args": { "ids": ["$profile.id"] } }
  ],
  "expect": [
    { "path": "session.cdp_url", "matches": "^wss?://" },
    { "path": "active.status", "equals": "Inactive" }
  ]
}
```

Rules:

- `$name.field` references a previous step's result.
- `status` is `design`, `active`, or `retired`. Only `active` cases gate a release.
- `contract` is the contract version the case was written against.
- `preconditions` are prose; the runner decides how to satisfy them.
- Cases never contain a real proxy, key, or profile name.

## Stealth invariants

[`cases/stealth-invariants.json`](cases/stealth-invariants.json) is the machine-readable form of the rules in [docs/sdk-contract.md §11](../docs/sdk-contract.md#11-stealth-invariants). Each entry names a check the runner can implement mechanically:

- `cdp-audit` — inspect the commands the client sends over the CDP WebSocket.
- `flags-audit` — inspect the engine process command line.
- `launch-response` — inspect the Local API payload.
- `probe` — compare the browser's answer with the expected value.

A failure is a release blocker for the SDK, even when the engine is correct.

## Report schema

[`schema/report.schema.json`](schema/report.schema.json) is the shared report format for wire, lifecycle, and stealth runs. The stealth checkup uses the same shape, so one dashboard can consume both.

A report has:

- `run_id`, `started_at`, `operator`;
- `sdk`, `engine`, `environment` — enough to reproduce the run;
- `targets` — one entry per check, with `status`, `failures`, `artifacts`, and an optional `known_gap`;
- `verdict` — `PASS`, `PASS_WITH_GAPS`, `FAIL`, or `INCOMPLETE`.

## Running (planned)

The runner does not exist yet. The intended interface:

```bash
# Wire and lifecycle through a language SDK.
python -m conformance run --sdk python --suite wire,lifecycle

# Stealth invariants for one SDK against a running app.
python -m conformance run --sdk node --suite stealth --profile conformance

# Parity between two SDKs.
python -m conformance parity --left python --right go --profile conformance
```

Until then, the cases are specifications for SDK authors and reviewers. A pull request that implements a case should also add the runner hook that executes it.

## Adding a case

1. Pick the lowest suite that can express the behavior (wire before lifecycle, lifecycle before stealth).
2. Write the case with a stable `id` and the current contract version.
3. Add the runner hook if the case introduces a new call shape.
4. Run it against at least two SDKs before marking it `active`.
5. Update the table in this README if the suite gains a new category.

Cases that cannot run on a contributor machine belong in the weekly workflow, not in the per-PR gate.
