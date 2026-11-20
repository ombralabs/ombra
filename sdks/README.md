# SDK sources

One directory per language, one launch contract for all of them.

The machine-readable registry is [`manifest.json`](manifest.json). It is the source of truth for package names, runtimes, source roots, test roots, and status. If a directory and the manifest disagree, the manifest wins and the directory is fixed.

## Matrix

| SDK | Package (target) | Registry | Runtime | `launch()` returns | Status |
|---|---|---|---|---|---|
| [Python](python/README.md) | `ombrabrowser` | PyPI | 3.10+ | Playwright `Browser` | Alpha |
| [Node.js](node/README.md) | `@ombralabs/sdk` | npm | Node 20+ | Playwright `Browser`; Puppeteer via `launchPuppeteer()` | Alpha |
| [.NET](dotnet/README.md) | `Ombra` | NuGet | .NET 8+ | Playwright `IBrowser` | Scaffold |
| [Java](java/README.md) | `dev.ombra:ombra` | Maven Central | 17+ | Playwright `Browser` | Scaffold |
| [Go](go/README.md) | `github.com/ombralabs/ombra/sdks/go` | Go modules | 1.22+ | chromedp-ready session | Scaffold |
| [PHP](php/README.md) | `ombralabs/ombra` | Packagist | 8.2+ | `Ombra\Browser` CDP handle | Scaffold |
| [Ruby](ruby/README.md) | `ombra` | RubyGems | 3.2+ | `Ferrum::Browser` | Scaffold |
| [Rust](rust/README.md) | `ombra` | crates.io | 1.78+ | `chromiumoxide::Browser` | Scaffold |

Package names are targets. Registry availability is verified before the first publish.

## Status

| Status | Meaning |
|---|---|
| `scaffold` | Layout and contract exist; no working launcher |
| `contract` | Options, binary resolution, and error mapping are implemented and reviewed; no release |
| `alpha` | Usable against the current engine; breaking changes allowed |
| `beta` | Feature-complete for contract v0; release candidates |
| `stable` | Published and covered by the support window |

A status moves forward only after the conformance suite passes for that SDK.

## Required contents

Every SDK directory contains:

```text
sdks/<language>/
├── README.md          # status, target API, layout, build and test commands
├── src/ (or the language's idiomatic root)
└── tests/ (or spec/)
```

When implementation starts, it also gains the ecosystem's package manifest and a license header. Do not add generated lockfiles from other languages.

## Layout conventions

Each SDK follows its ecosystem rather than a forced common tree:

| Language | Package manifest | Source | Tests |
|---|---|---|---|
| Python | `pyproject.toml` | `src/ombrabrowser/` | `tests/` |
| Node.js | `package.json` | `src/` | `tests/` |
| .NET | `Ombra.csproj` | `src/Ombra/` | `tests/Ombra.Tests/` |
| Java | `pom.xml` or `build.gradle.kts` | `src/main/java/` | `src/test/java/` |
| Go | `go.mod` | package root | `*_test.go` beside the code |
| PHP | `composer.json` | `src/` | `tests/` |
| Ruby | `ombra.gemspec` | `lib/ombra/` | `spec/` |
| Rust | `Cargo.toml` | `src/` | `tests/` |

The manifest records the exact roots, so tooling does not have to guess.

## What every implementation must include

- `launch(options)` returning the native browser object for that ecosystem.
- Binary resolution, SHA-256 verification, and `binary_info()`.
- Named profiles with a seed and a profile lock.
- Proxy support, including the loopback relay for authenticated proxies.
- Clean shutdown of the engine process tree.
- A typed error hierarchy with stable kinds.
- Tests for option validation, binary resolution, profile locking, and launch.
- No stealth logic, no page API, no telemetry.

See [docs/sdk-contract.md](../docs/sdk-contract.md) for the normative behavior.

## Adding a language

1. Copy [`_template`](_template/README.md) to `sdks/<language>/`.
2. Add an entry to [`manifest.json`](manifest.json) with the correct source and test roots.
3. Write the README: status, package target, runtime, target API, layout, test command.
4. Implement binary resolution, option validation, the launch, and the native client connection.
5. Add at least one conformance case and make it runnable.
6. Add the language to the root README matrix.
7. Run `python3 tools/check_repo.py`.

A language without a conformance path is a documentation-only directory and should not be merged as an SDK.

## Release checklist

- [ ] Launch conformance passes.
- [ ] Profile lock and cleanup tests pass.
- [ ] Stealth invariants pass for the launcher and the client.
- [ ] Cross-SDK parity passes for the same profile and seed.
- [ ] Package manifest version matches the tag (`sdks/<language>/vX.Y.Z`).
- [ ] README and root matrix show the new status.
- [ ] Changelog entry names the contract range and engine build.
- [ ] No secrets, generated artifacts, or registry tokens in the commit.
