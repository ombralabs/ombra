# Versioning and compatibility

Ombra has four independently versioned things. Mixing them up is the most common source of integration pain, so each one gets its own line and its own rules.

| Artifact | Current | Versioned by | Source of truth |
|---|---|---|---|
| SDK API contract | `0.2.0` | This repository | [sdk-contract.md](sdk-contract.md) |
| SDK package | Python `0.2.0`, Node.js `0.2.0`, .NET `0.2.0` (alpha) | Each language package | `sdks/manifest.json` and package manifests |
| Ombra engine | external | Engine builds | Engine releases; reported by `binary_info()` |
| Automation client | external | Upstream | Playwright, Puppeteer, chromedp, Ferrum, chromiumoxide |

## Contract versioning

The contract version describes the **SDK API surface** — options, return types, errors, and launch semantics — not the engine and not the app.

While the contract is `0.x`:

- additive, backward-compatible changes bump the **patch** (`0.1.0` → `0.1.1`);
- breaking changes bump the **minor** (`0.1.x` → `0.2.0`);
- removing or renaming an option is breaking even if the engine keeps a hidden alias.

After `1.0`:

- additive changes bump the minor;
- breaking changes bump the major;
- deprecations are announced one minor ahead and removed no earlier than the next major.

Every SDK declares a supported range, for example:

```toml
# sdks/python/pyproject.toml
[project]
name = "ombrabrowser"
dynamic = ["version"]  # ombrabrowser._version.__version__ = "0.2.0"

[tool.ombra]
contract = ">=0.2,<0.3"
engine = ">=151.0.7922.108,<159"
```

An SDK that meets an engine build outside its range must fail with `UnsupportedEngine`, naming both versions. It must not attempt a best-effort launch.

## SDK 0.2 CAPTCHA API removal

Python and Node.js SDK `0.2.0` remove the `captcha` launch option,
automatic CAPTCHA flags, and dedicated CAPTCHA CDP helpers, event recorders,
types, and module entrypoints. This breaking change advances the contract to
`0.2.0` and the supported range to `>=0.2,<0.3`; existing package versions must
not be republished with the changed API. Remove `captcha` from launch calls and
remove imports from `ombrabrowser.captcha` or `@ombralabs/sdk/captcha`.
Generic CDP sessions, humanize controls, and native agent commands remain available.

## Engine compatibility

The Python and Node.js SDK sources default to Chromium family `158.0.8127.37`
and accept `>=151.0.7922.108,<159`. Existing 151 release pins and verified caches
remain supported; Chromium 159 requires a compatibility update. SDK `0.2.0`
supports engine release `158.0.8127.37-3` and retains legacy engine layouts.

The SDK resolves an engine binary and reports it through `binary_info()`:

```python
{
    "version": "151.0.7922.108",
    "platform": "macos-arm64",
    "path": "…",
    "installed": True,
    "source": "cache",
    "sha256": "…",
}
```

Rules:

- `binary_info().version` is the first thing in a bug report.
- The SDK does not silently upgrade the engine in the middle of a launch.
- `OMBRA_VERSION` pins the engine version; `OMBRA_AUTO_UPDATE` controls update checks.
- A new engine build does not require an SDK release unless it falls outside the declared range or a launch option or flag changes.
- An SDK release is tested against the current engine build and the previous one.

## Automation client compatibility

The SDK returns the automation client's own browser object, so the client version matters as much as the engine version.

| SDK | Client | Declared as | Tested in CI |
|---|---|---|---|
| Python | Playwright | optional dependency with a supported range | Current and previous minor |
| Node.js | Playwright, Puppeteer | optional peer dependencies with ranges | Current and previous minor |
| .NET | Microsoft.Playwright | optional package with a range | Current and previous minor |
| Java | Microsoft Playwright | optional dependency with a range | Current and previous minor |
| Go | chromedp | module range | Current and previous minor |
| PHP | none (CDP handle) | built in | n/a |
| Ruby | Ferrum | optional dependency with a range | Current and previous minor |
| Rust | chromiumoxide | optional feature with a range | Current and previous minor |

The exact ranges live in each package manifest. They are not duplicated here, because a number without a test is a guess.

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

1. The launch and lifecycle conformance cases pass for that SDK.
2. The SDK passes the stealth invariants in [conformance/cases/stealth-invariants.json](../conformance/cases/stealth-invariants.json).
3. The checkup is `PASS` or `PASS_WITH_GAPS` for the engine build the SDK is tested against.
4. [CHANGELOG.md](../CHANGELOG.md) has an entry with the contract range and engine build.
5. The package manifest version and the tag agree.

## Deprecation

- Deprecated options keep working for at least one contract minor.
- Deprecated SDK methods keep working for at least one SDK minor and emit a warning once per process, not once per call.
- A deprecation notice names the replacement and the removal version.
- Silent removal is a release blocker.

## Support window

| Item | Supported |
|---|---|
| SDK | Latest minor and the previous minor |
| Engine | The builds declared in the SDK package manifest |
| Automation client | The ranges declared in the SDK package manifest |
| Contract | The two most recent minors |

Security fixes are backported to the supported SDK minors. Feature work lands on the latest minor only.

## Compatibility test matrix

| Test | Frequency | Gate |
|---|---|---|
| Launch options schema validation | Every PR | Required |
| Repository layout and links | Every PR | Required |
| Python and Node.js launch tests | Every PR | Required |
| Other SDK launch tests | Every PR that touches the SDK | Required for that SDK |
| Cross-SDK parity | Every release | Required |
| Stealth checkup | Weekly and every engine release | Required for release |
| Previous engine build | Every SDK release | Required |

The matrix is intentionally small. A check that cannot run on a contributor's machine belongs in the weekly workflow, not in the PR gate.

## When in doubt

- Launch behavior: read [sdk-contract.md](sdk-contract.md).
- Fingerprint behavior: read the engine's QA documentation.
- Client behavior: read the upstream Playwright, Puppeteer, or chromedp docs.
- Release process: read [CONTRIBUTING.md](../CONTRIBUTING.md).

If two sources disagree, the engine wins for the fingerprint, the automation client wins for the page API, and this repository fixes the contract.
