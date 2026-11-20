# Changelog

All notable changes to the SDK contract, the SDK sources, and the shared documentation are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/), with the pre-1.0 rules described in [docs/versioning.md](docs/versioning.md).

## [Unreleased]

### Added

- Existing Python and Node.js SDK implementations, package metadata, build tooling, and regression tests are now included in this repository.
- Repository scaffold for the Ombra SDK monorepo: eight language directories, a machine-readable manifest, and an idiomatic layout per ecosystem.
- English and Russian root READMEs with the drop-in Playwright/Puppeteer positioning, the `launch()` quick start, the SDK matrix, and the stealth design rules.
- `docs/architecture.md` — launcher and CDP-bridge boundaries, the launch sequence, trust boundaries, and failure modes.
- `docs/sdk-contract.md` — the v0.1 launch contract: options, native return types, binary resolution, profiles and seed persistence, proxy relay, humanize switches, errors, and stealth invariants.
- `docs/stealth-checkup.md` and its Russian translation — layers, targets, gates, status model, runbook, per-signal checklist, reporting, CI, and triage.
- `docs/versioning.md` — SDK, engine, and automation-client compatibility, tag conventions, support window, and compatibility matrix.
- JSON Schemas for launch options, binary info, and the conformance report.
- Language-neutral conformance cases for a basic launch, profile locking, and stealth invariants.
- `tools/check_repo.py` — structure, manifest, JSON, and local-link validation for CI.

### Changed

- Python and Node.js download browser releases from GitHub Releases by default, preserving Ed25519, SHA-256, and archive size verification. Explicit legacy mirrors remain supported; GitHub failures do not fall back to GCore.
- README translations moved to `translations/<locale>/README.md`. Find each language in the [root README](README.md).
- The SDK is a launcher and CDP bridge, not a control-plane client. It spawns the engine, connects Playwright/Puppeteer/chromedp/Ferrum/chromiumoxide, and returns the native browser object.
- The root README and SDK READMEs use `launch()` as the only entry point; the earlier profile-management quick start was removed.

### Removed

- The `captcha` launch option, automatic CAPTCHA flags, and dedicated CAPTCHA CDP helpers, event recorders, types, and module entrypoints from Python and Node.js. Existing callers must remove the retired option and imports.

### Fixed

- None yet.

### Security

- The contract requires SHA-256 verification before launch, a loopback-only CDP port, and no proxy credentials or license keys in the process command line.

## [0.1.0] — unreleased

The contract version `0.1.0` is a draft. No SDK package has been published under this version.
