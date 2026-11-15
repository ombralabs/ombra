# Versioning and compatibility

Ombra has three independently versioned things. Mixing them up is the most common source of integration pain, so each one gets its own line and its own rules.

| Artifact | Current | Versioned by | Source of truth |
|---|---|---|---|
| SDK contract | `0.1.0` | This repository | [sdk-contract.md](sdk-contract.md) |
| SDK package | `0.1.0` (planned) | Each language package | `sdks/manifest.json` and package manifests |
| Ombra app | external | Product releases | [ombrabrowser.dev](https://ombrabrowser.dev) |
| Ombra engine | external | Engine builds | Engine repository |

## Contract versioning

The contract version describes the **wire behavior and SDK semantics**, not the app or the engine.

While the contract is `0.x`:

- additive, backward-compatible changes bump the **patch** (`0.1.0` → `0.1.1`);
- breaking changes bump the **minor** (`0.1.x` → `0.2.0`);
- a change that removes or renames a field is breaking even if the app keeps an alias.

After `1.0`:

- additive changes bump the minor;
- breaking changes bump the major;
- deprecations are announced one minor ahead and removed no earlier than the next major.

Every SDK declares a supported range, for example:

```toml
# sdks/python/pyproject.toml (planned)
[project]
name = "ombra"
version = "0.1.0"

[tool.ombra]
contract = ">=0.1,<0.2"
```

An SDK that meets an app build outside its range must fail with `unsupported`, naming both versions. It must not attempt a best-effort call.

## App and engine compatibility

The SDK does not pin the app or the engine. It talks to whatever app is running on the loopback endpoint and uses whatever engine that app installed.

Compatibility rules:

- The app is responsible for keeping its Local API within the contract range it advertises.
- The engine is responsible for the fingerprint behavior tested by the checkup.
- The SDK is responsible for the wire mapping and the CDP helper only.
- An SDK release must be tested against the current app build and the previous one.
- An engine release does not require an SDK release unless the wire changes.

`GET /status` is a liveness check and returns empty data in the current app. It is not a version endpoint. Do not build compatibility checks on it.

## Package versioning

Each SDK follows its ecosystem's rules, with one shared constraint: the major version tracks the contract major after `1.0`.

| SDK | Package version | Notes |
|---|---|---|
| Python | PEP 440 | `0.1.0`, `0.1.0rc1` for previews |
| Node.js | Semver | `0.1.0`, `0.1.0-beta.1` |
| .NET | NuGet SemVer 2 | `0.1.0`, `0.1.0-preview.1` |
| Java | Maven SemVer | `0.1.0`, `0.1.0-SNAPSHOT` for local builds only |
| Go | Module semver | `v0.1.0`, tags under `sdks/go/` |
| PHP | Composer semver | `0.1.0`, `0.1.0-beta1` |
| Ruby | RubyGems | `0.1.0`, `0.1.0.pre1` |
| Rust | Cargo semver | `0.1.0`, `0.1.0-alpha.1` |

## Tags and releases

One repository, many packages. Tags are prefixed by the SDK directory so a release tool can find the right package:

```text
spec/v0.1.0
sdks/python/v0.1.0
sdks/node/v0.1.0
sdks/dotnet/v0.1.0
sdks/java/v0.1.0
sdks/go/v0.1.0
sdks/php/v0.1.0
sdks/ruby/v0.1.0
sdks/rust/v0.1.0
```

The `sdks/go/` prefix is required by Go modules; the other prefixes are a repository convention that keeps one release pipeline simple.

A release is allowed only when:

1. The contract tests for that SDK pass.
2. The SDK passes the stealth invariants in [conformance/cases/stealth-invariants.json](../conformance/cases/stealth-invariants.json).
3. The checkup is `PASS` or `PASS_WITH_GAPS` for the engine build the SDK is tested against.
4. [CHANGELOG.md](../CHANGELOG.md) has an entry with the contract range.
5. The package manifest version and the tag agree.

## Deprecation

- Deprecated wire fields keep working for at least one contract minor.
- Deprecated SDK methods keep working for at least one SDK minor and emit a warning once per process, not once per call.
- A deprecation notice names the replacement and the removal version.
- Silent removal is a release blocker.

## Support window

| Item | Supported |
|---|---|
| SDK | Latest minor and the previous minor |
| App | Current build and the previous build |
| Engine | The build installed by the supported app builds |
| Contract | The two most recent minors |

Security fixes are backported to the supported SDK minors. Feature work lands on the latest minor only.

## Compatibility test matrix

| Test | Frequency | Gate |
|---|---|---|
| Contract schema validation | Every PR | Required |
| Repository layout and links | Every PR | Required |
| Python and Node.js wire tests | Every PR | Required |
| Other SDK wire tests | Every PR that touches the SDK | Required for that SDK |
| Cross-SDK parity | Every release | Required |
| Stealth checkup | Weekly and every engine release | Required for release |
| App previous-build compatibility | Every SDK release | Required |

The matrix is intentionally small. A check that cannot run on a contributor's machine belongs in the weekly workflow, not in the PR gate.

## When in doubt

- Wire behavior: read the app's Local API implementation.
- Fingerprint behavior: read the engine's QA documentation.
- SDK behavior: read [sdk-contract.md](sdk-contract.md).
- Release process: read [CONTRIBUTING.md](../CONTRIBUTING.md).

If two sources disagree, the app wins for the wire and the engine wins for the fingerprint. Open an issue, fix the document, then fix the code.
