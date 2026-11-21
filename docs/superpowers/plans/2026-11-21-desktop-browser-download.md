# Desktop browser downloader implementation plan

> **For agentic workers:** execute the backend and UI tasks in their assigned scopes; root coordinates the final review.

**Goal:** A verified native browser download/install flow in Desktop1.2.3.
**Architecture:** Rust owns release discovery and installation; one Vue component owns browser state independently of the profile catalog.
**Tech Stack:** Existing Tauri2/Vue3/Rust, existing platform archive and verification crates.
**Spec:** [Desktop download design](../specs/2026-11-21-desktop-browser-download-design.md)

## Global constraints

Public tokenless GitHub only; pinned Ed25519 and SHA256 enforced; immutable existing browser versions; no profile/key writes; no startup network; EN/RU;20853.19MiB swap ceiling and20GiB free disk floor.

## Review focus

Wrong/duplicate release assets and SDK tags; tampered/truncated archives; path or symlink escapes; cancellation/concurrent install preserving the old browser; unavailable/private GitHub keeping the catalog usable.

## Task1: Rust installer

Files: desktop/src-tauri/src/browser*.rs, lib.rs, main.rs, build.rs, capabilities/main.json, Cargo manifests.
- [x] Add targeted failing tests for signed metadata, streaming integrity and extraction/atomic-install boundaries.
- [x] Implement the spec's four commands using a separate engines directory and existing filesystem locking.
- [x] Run the Rust suite and native app feature checks using the existing target cache.

## Task2: Browser UI and release version

Files: desktop/src/components/BrowserDownload.vue, App.vue/App.test.ts, EN/RU messages and component tests; Desktop package/Cargo/Tauri manifests and locks; Desktop README.
- [x] Add failing integration tests proving the new section and explicit action behavior.
- [x] Implement local status, check/install/update, Channel progress, cancel and actionable errors with existing controls.
- [x] Verify success/error/cancel paths without changing catalog tests' assertions.
- [x] Run Vue check/build, inspect rendered960px and530px EN/RU, then bump all Desktop version declarations to1.2.3.
- [ ] Review the whole diff, run final relevant checks, commit/push and create a reviewable PR. Do not merge or publish a Desktop binary without an explicit request.

Verified results are recorded in [the validation record](../../desktop/browser-download-validation-20261121.md). Source publication is the final handoff step.
