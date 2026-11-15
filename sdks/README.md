# SDK sources

One directory per language, one contract for all of them.

The machine-readable registry is [`manifest.json`](manifest.json). It is the source of truth for package names, runtimes, source roots, test roots, and status. If a directory and the manifest disagree, the manifest wins and the directory is fixed.

## Matrix

| SDK | Package (target) | Registry | Runtime | Source root | Status |
|---|---|---|---|---|---|
| [Python](python/README.md) | `ombra` | PyPI | 3.10+ | `src/ombra/` | Scaffold |
| [Node.js](node/README.md) | `@ombra/sdk` | npm | Node 20+ | `src/` | Scaffold |
| [.NET](dotnet/README.md) | `Ombra` | NuGet | .NET 8+ | `src/Ombra/` | Scaffold |
| [Java](java/README.md) | `dev.ombra:ombra` | Maven Central | 17+ | `src/main/java/dev/ombra/` | Scaffold |
| [Go](go/README.md) | `github.com/ombralabs/ombra/sdks/go` | Go modules | 1.22+ | package root | Scaffold |
| [PHP](php/README.md) | `ombralabs/ombra` | Packagist | 8.2+ | `src/` | Scaffold |
| [Ruby](ruby/README.md) | `ombra` | RubyGems | 3.2+ | `lib/ombra/` | Scaffold |
| [Rust](rust/README.md) | `ombra` | crates.io | 1.78+ | `src/` | Scaffold |

Package names are targets. Registry availability is verified before the first publish.

## Status

| Status | Meaning |
|---|---|
| `scaffold` | Layout and contract exist; no working client |
| `contract` | Types and wire mapping are implemented and reviewed; no release |
| `alpha` | Usable against the current app; breaking changes allowed |
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

When implementation starts, it also gains the ecosystem's package manifest, a license header, and a `CHANGELOG.md` link to the repository changelog. Do not add generated lockfiles from other languages.

## Layout conventions

Each SDK follows its ecosystem rather than a forced common tree:

| Language | Package manifest | Source | Tests |
|---|---|---|---|
| Python | `pyproject.toml` | `src/ombra/` | `tests/` |
| Node.js | `package.json` | `src/` | `tests/` |
| .NET | `Ombra.csproj` | `src/Ombra/` | `tests/Ombra.Tests/` |
| Java | `pom.xml` or `build.gradle.kts` | `src/main/java/` | `src/test/java/` |
| Go | `go.mod` | package root | `*_test.go` beside the code |
| PHP | `composer.json` | `src/` | `tests/` |
| Ruby | `ombra.gemspec` | `lib/ombra/` | `spec/` |
| Rust | `Cargo.toml` | `src/` | `tests/` |

The manifest records the exact roots, so tooling does not have to guess.

## What every implementation must include

- A client constructor with endpoint, optional API key, and timeouts.
- `status`, `profiles` (list, get, create, update, delete), `launch`, `active`, `stop`.
- Typed `Profile`, `Session`, and error types.
- A connection helper for the dominant CDP client(s) in that ecosystem.
- A contract version declaration and a check against the supported range.
- Tests for the envelope, error mapping, profile mapping, and session parsing.
- No stealth logic, no page automation, no telemetry.

See [docs/sdk-contract.md](../docs/sdk-contract.md) for the normative behavior.

## Adding a language

1. Copy [`_template`](_template/README.md) to `sdks/<language>/`.
2. Add an entry to [`manifest.json`](manifest.json) with the correct source and test roots.
3. Write the README: status, package target, runtime, target API, layout, test command.
4. Implement the wire client and the error mapping.
5. Add at least one conformance case and make it runnable.
6. Add the language to the root README matrix.
7. Run `python3 tools/check_repo.py`.

A language without a conformance path is a documentation-only directory and should not be merged as an SDK.

## Release checklist

- [ ] Contract tests pass.
- [ ] Stealth invariants pass for the helper.
- [ ] Cross-SDK parity passes for the same profile and seed.
- [ ] Package manifest version matches the tag (`sdks/<language>/vX.Y.Z`).
- [ ] README and root matrix show the new status.
- [ ] Changelog entry names the contract range.
- [ ] No secrets, generated artifacts, or registry tokens in the commit.
