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

- README translations moved to `translations/<locale>/README.md`. Find each language in the [root README](README.md).
- The SDK is a launcher and CDP bridge, not a control-plane client. It spawns the engine, connects Playwright/Puppeteer/chromedp/Ferrum/chromiumoxide, and returns the native browser object.
- The root README and SDK READMEs use `launch()` as the only entry point; the earlier profile-management quick start was removed.

### Fixed

- None yet.

### Security

- The contract requires SHA-256 verification before launch, a loopback-only CDP port, and no proxy credentials or license keys in the process command line.

## [SDKs 0.2.0] — 2026-11-21

Python `ombrabrowser` and Node.js `@ombralabs/sdk` target contract `0.2.0`
(`>=0.2,<0.3`) and engine range `>=151.0.7922.108,<159`. The default Chromium
family is `158.0.8127.37`; the current verified engine release is
`158.0.8127.37-3`.

### Added

- Native mobile page layout through `mobile_viewport` / `mobileViewport`, preserving saved-profile host OS validation and explicit Playwright context viewports.

### Changed

- Download browser releases from GitHub Releases by default with Ed25519, SHA-256, and archive size verification. Explicit legacy mirrors remain supported; GitHub failures do not fall back to GCore.
- Resolve native `Ombra.app/Contents/MacOS/Ombra`, `ombra`, and `ombra.exe` engine layouts while preserving historical Chromium layouts, existing 151 release pins, and verified caches.

### Removed

- **Breaking:** the `captcha` launch option, automatic CAPTCHA flags, and dedicated CAPTCHA CDP helpers, event recorders, types, and module entrypoints. Remove the option and imports from `ombrabrowser.captcha` or `@ombralabs/sdk/captcha` before upgrading. Generic CDP sessions, humanize controls, and native agent commands remain available.

## [0.1.0] — contract draft

The initial contract draft was `0.1.0`. Python packages `0.1.0`–`0.1.3` and the
Node.js package `0.1.0` preceded the `0.2.0` contract release.
