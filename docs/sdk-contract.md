# SDK API contract v0.1

> **Status: draft.** This document defines what every official Ombra SDK exposes and guarantees. It is normative for SDK behavior; the engine build is normative for fingerprint behavior. If the two disagree, the engine wins for stealth and this document is corrected.

Every Ombra SDK is a **launcher and CDP bridge**, not a control-plane client. It starts the Ombra Chromium binary, waits for the CDP endpoint, connects the automation client native to that language, and returns that client's browser object. The caller writes normal Playwright, Puppeteer, chromedp, Ferrum, or chromiumoxide code.

The SDK launches the engine as a child process. The Ombra app is an optional product for manual profile management; it is not a dependency and not in the SDK path.

## 1. Scope

In scope:

- Resolving, verifying, and optionally downloading the Ombra engine binary.
- Spawning the engine with a profile directory, proxy, fingerprint seed, and humanize options.
- Waiting for CDP readiness and connecting the automation client.
- Returning a native browser object with the same API the caller already uses.
- Named profiles with persistent seeds and user data.
- Clean shutdown, orphan cleanup, and typed errors.

Out of scope:

- Page automation, selectors, waits, and assertions. The automation client owns them.
- Fingerprint generation, patching, or validation. The engine owns them.
- Proxy rotation, CAPTCHA solving, and RPA scheduling.
- The Ombra desktop app and its product surfaces.
- A new page API that competes with Playwright or Puppeteer.

## 2. Principles

1. **Drop-in over new.** `launch()` returns the browser object the caller already knows. Migration is an import change, not a rewrite.
2. **Stealth is compiled in.** The SDK passes user intent to the engine. It does not inject scripts, patch properties, or add stealth flags on its own.
3. **One launcher, native clients.** The SDK owns process lifecycle and CDP readiness. Playwright, Puppeteer, chromedp, Ferrum, and chromiumoxide own the page.
4. **Explicit lifecycle.** Launch and close are visible. No background reconnection, no silent profile creation, no hidden retries of a failed launch.
5. **Local by default.** Loopback CDP, no telemetry, no phone-home, no credential logging.
6. **Boring errors.** One hierarchy per language, stable kinds, and the engine's stderr preserved for support.

## 3. The launch model

```text
caller
  │ launch(options)
  ▼
SDK ── resolve binary ── verify checksum ── spawn engine
  │                                            │
  │                                  DevToolsActivePort
  │                                            │
  └──────── connect automation client over CDP ┘
  │
  ▼
native client object (Playwright/Puppeteer Browser, chromedp session, Ferrum browser, …)
```

Steps:

1. Resolve the engine binary using the order in §5.
2. Resolve the profile directory and fingerprint seed using §7.
3. Start the authenticated-proxy relay if needed (§8).
4. Spawn the engine with `--remote-debugging-port=0`, the profile directory, and the option flags.
5. Wait for `DevToolsActivePort` or the CDP HTTP endpoint, bounded by `timeout_ms`.
6. Connect the automation client with its CDP-connect call.
7. Return the native browser object.
8. On close, close the automation client, then terminate the engine and wait for the process to exit.

If any step fails, the SDK terminates the child process it started and raises a typed error. It never leaves an orphaned browser behind.

## 4. Launch options

These are the common options. Names are `snake_case` in the contract and follow local conventions on each surface (`timeout_ms`, `TimeoutMs`, `timeoutMs`).

| Option | Type | Default | Meaning |
|---|---|---|---|
| `headless` | bool | `true` | Run without a window. The engine uses its current headless mode. |
| `mobile_viewport` | `{width, height}` or null | null | Python/Node.js: native mobile page layout on the host OS; whole CSS pixels from 1 through 10,000. Saved profile OS must match the host; explicit Playwright context viewport takes precedence. |
| `proxy` | string or object | none | Proxy URL or `{type, host, port, username, password}`. |
| `fingerprint` | object | none | Seed and persona hints, see §6. |
| `profile` | string | none | Named persistent profile under the cache directory. |
| `user_data_dir` | path | temp | Explicit profile directory; mutually exclusive with `profile`. |
| `args` | string[] | `[]` | Extra engine arguments. The SDK passes them through and adds none. |
| `binary_path` | path | resolved | Explicit engine binary. |
| `version` | string | env / resolved | Engine version pin; overrides `OMBRA_VERSION`. Include the `-N` release suffix for an exact build. |
| `timeout_ms` | int | `30000` | Deadline for process start and CDP readiness. |
| `humanize` | bool or object | engine default | `false`, `true`, or `{ "preset": "default" \| "careful" \| "fast" }`. |
| `license_key` | string | env | Passed to the engine. The SDK does not validate it. |
| `env` | map | `{}` | Extra environment variables for the engine process. |
| `download` | bool | `true` | Allow the SDK to fetch a missing binary. |

Rules:

- `profile` and `user_data_dir` are mutually exclusive. Passing both is `InvalidOption`.
- `args` is for flags the SDK does not model. It is passed unchanged and is never used to inject stealth patches.
- Unknown options are rejected, not ignored. Silent option loss is how fingerprints drift.
- The SDK never adds `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`, or `--user-agent` on its own.

## 5. Binary resolution

Resolution order, first match wins:

1. `binary_path` option.
2. `OMBRA_BINARY_PATH` environment variable.
3. The engine installed by the Ombra app, when the app is present.
4. The SDK's managed cache for the requested version.
5. A download, when `download` is true and a download URL is configured.

The SDK verifies the binary before launch:

- SHA-256 against the published manifest.
- Platform and architecture match the host.
- Executable permission on POSIX.
- On Windows, the binary is not blocked by the Mark-of-the-Web.

`OMBRA_SKIP_CHECKSUM=1` disables the checksum check for development builds only. It must be loud in the logs and must never be the default.

### Binary utilities

Every SDK exposes:

| Function | Result |
|---|---|
| `binary_info()` | `{version, platform, path, installed, source, sha256}` |
| `ensure_binary()` | Downloads and verifies the binary if missing; returns the path |
| `clear_cache()` | Removes SDK-managed engine binaries; leaves user profiles alone |

`source` is one of `argument`, `env`, `app`, `cache`, `download`, or `none`. `installed` is false until verification succeeds.

## 6. Fingerprint options

The `fingerprint` object is a typed facade over the engine's persona flags. The SDK maps it mechanically and never generates values on its own, except for the initial seed.

| Field | Type | Meaning |
|---|---|---|
| `seed` | uint64 | Persona seed. The only field that determines the whole persona. |
| `os` | `macos` \| `windows` \| `linux` | Target platform. |
| `os_version` | string | Optional OS version hint. |
| `timezone` | IANA name or `auto` | `auto` follows the proxy exit when the engine supports it. |
| `locale` | BCP-47 or `auto` | `auto` follows the proxy exit when the engine supports it. |
| `screen` | `{width, height}` or `auto` | Viewport and screen metrics. |
| `gpu` | `{vendor, renderer}` or `auto` | WebGL strings. |
| `hardware_concurrency` | int or `auto` | Reported core count. |
| `device_memory` | int or `auto` | Reported device memory. |
| `noise` | bool | Enable the engine's canvas/audio/client-rect noise. |

`seed` is required for reproducible personas. If it is absent:

- with a named or explicit profile, the SDK reads the persisted seed;
- without a profile, the SDK generates a random seed for the session and does not persist it.

The SDK must not derive a seed from the proxy, the hostname, the time, or the process ID. A seed is an identity contract, not a cache key.

## 7. Profiles and persistence

A named profile stores cookies, local storage, extensions, and the persona seed.

- Default root: `OMBRA_CACHE_DIR/profiles/<slug>`, with `OMBRA_CACHE_DIR` defaulting to `~/.ombra`.
- The slug is derived from the profile name, lowercased, with unsafe characters replaced. Collisions are resolved with a stable suffix.
- Metadata lives in `.ombra/profile.json`: seed, OS, timezone, locale, humanize preset, creation time, and the engine version that created it. No proxy credentials.
- A lock file prevents two processes from launching the same profile. A stale lock is detected by checking the recorded PID and process start time.
- Deleting a profile is an explicit filesystem operation or an app action; the SDK never deletes profile data as part of cleanup.
- Ephemeral launches use a temporary directory and delete it after the browser exits.

If a profile exists and `fingerprint.seed` is absent, the persisted seed wins. If `fingerprint.seed` is present and differs, the new seed wins and is persisted; this is an explicit persona change and is recorded in the profile metadata and the launch log.

## 8. Proxy handling

- An unauthenticated proxy is passed to the engine as a proxy server flag.
- An authenticated proxy is exposed through a loopback relay started by the SDK, because Chromium does not accept credentials in the proxy server argument. The engine sees `socks5://127.0.0.1:<port>` or `http://127.0.0.1:<port>` without credentials.
- The relay holds credentials in memory only. They must not appear in the process command line, logs, crash reports, or profile metadata.
- The relay binds to loopback and accepts only the engine process.
- If the relay cannot start, launch fails with `ProxyError` before the engine is spawned.
- Proxy rotation is out of scope. One launch, one exit.

Timezone and locale alignment with the proxy exit is the caller's responsibility unless `fingerprint.timezone` or `fingerprint.locale` is `auto` and the engine supports the lookup. The checkup treats a mismatch as a finding, not as an SDK bug, unless the SDK claimed to align them.

## 9. Humanize

`humanize` is a launch-time switch over the engine's humanized input.

- `humanize: false` disables the engine's humanized input for this launch.
- `humanize: true` uses the engine default preset.
- `humanize: {preset}` selects `default`, `careful`, or `fast`.

CAPTCHA configuration and custom CAPTCHA commands/events are outside the SDK API.

## 10. Return types

| Language | Function | Returns |
|---|---|---|
| Python | `launch()` | `playwright.sync_api.Browser` |
| Python | `launch_async()` | `playwright.async_api.Browser` |
| Python | `launch_context()` | `playwright.sync_api.BrowserContext` |
| Node.js | `launch()` | `playwright.Browser` |
| Node.js | `launchPuppeteer()` | `puppeteer.Browser` |
| .NET | `Ombra.LaunchAsync()` | `Microsoft.Playwright.IBrowser` |
| Java | `Ombra.launch()` | `com.microsoft.playwright.Browser` |
| Go | `ombra.Launch(ctx)` | `*ombra.Session`; `Session.Context()` is a chromedp-ready context |
| PHP | `Ombra\launch()` | `Ombra\Browser`, a thin CDP handle |
| Ruby | `Ombra.launch()` | `Ferrum::Browser` |
| Rust | `ombra::launch()` | `chromiumoxide::Browser` |

The returned object must be a normal instance of the automation client. Do not wrap it in a proxy that hides methods, changes types, or intercepts page calls. If the SDK needs to expose launch metadata, put it on a separate object or module-level function.

The close call on the returned object closes the automation connection. The SDK must also terminate the engine process and release the profile lock, even when the caller forgets to call an SDK-specific `close()`.

## 11. Errors

| Kind | When |
|---|---|
| `InvalidOption` | Unknown option, conflicting options, bad type |
| `BinaryNotFound` | No binary at any resolution step and download disabled |
| `DownloadFailed` | Network, HTTP, or disk failure while fetching |
| `ChecksumMismatch` | SHA-256 does not match the manifest |
| `UnsupportedPlatform` | No build for the host OS or architecture |
| `UnsupportedEngine` | The resolved engine build is outside the SDK's supported range |
| `LicenseError` | The engine refused to start because of the license |
| `ProxyError` | The relay could not start or the proxy is invalid |
| `ProfileBusy` | Another process holds the profile lock |
| `LaunchTimeout` | The CDP endpoint did not appear within `timeout_ms` |
| `CDPConnectError` | The endpoint appeared but the client could not connect |
| `EngineExited` | The engine exited during launch or immediately after |
| `EngineCrashed` | The engine died while the browser was open |

Each error carries a stable `kind`, a human message, and optional `details` with the binary path, exit code, or stderr tail. Proxy credentials and license keys are redacted.

Retries:

- Download may retry twice with backoff.
- Launch is never retried automatically. A retry creates a second browser and a second profile lock.
- `CDPConnectError` may be retried once only when the endpoint is still alive and the timeout has not expired.

## 12. Stealth invariants

These are MUST-level requirements. A violation is a release blocker.

1. **No stealth scripts.** No `Page.addScriptToEvaluateOnNewDocument`, no `evaluateOnNewDocument`, no property shims, no prototype patches.
2. **No `Runtime.enable`.** The SDK must not enable `Runtime`, `Debugger`, or `Log` for readiness or logging. Readiness uses the CDP HTTP endpoint or `Browser.getVersion`.
3. **No `Emulation.*` overrides.** No user agent, timezone, locale, device metrics, or touch emulation from the SDK.
4. **No automation flags.** No `--enable-automation`, no `--disable-blink-features=AutomationControlled`, no `--no-sandbox` by default. `--no-sandbox` is allowed only through an explicit `args` entry in a container, and the SDK warns.
5. **No UA or header overrides.** The engine's identity is the identity. Header mutation is the caller's explicit choice, not an SDK default.
6. **No disabled security.** No `--disable-web-security`, no certificate-error bypass, no `--ignore-certificate-errors` by default.
7. **Loopback CDP only.** The debug port binds to `127.0.0.1`. Never expose it on `0.0.0.0`.
8. **Clean process tree.** On timeout, exception, or `close()`, terminate the engine and its children. A leaked browser is a stealth and security failure.
9. **No telemetry.** No analytics, crash reporting, or usage pings without explicit, documented opt-in.
10. **No secret logging.** Proxy credentials, license keys, cookies, and full CDP URLs with tokens are never logged.

The automation client may enable domains internally. That is a client property, measured separately by the checkup; the SDK must not add any.

## 13. Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `OMBRA_BINARY_PATH` | unset | Explicit engine binary |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Managed binaries and named profiles |
| `OMBRA_DOWNLOAD_URL` | release endpoint | Base URL for binary downloads |
| `OMBRA_VERSION` | latest compatible | Engine version to resolve |
| `OMBRA_AUTO_UPDATE` | `true` | Check for a newer engine on launch |
| `OMBRA_SKIP_CHECKSUM` | `false` | Development only; disables SHA-256 verification |
| `OMBRA_LICENSE_KEY` | unset | Passed to the engine |
| `OMBRA_TIMEOUT_MS` | `30000` | Default launch deadline |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Precedence: explicit option > environment variable > profile metadata > default.

## 14. Versioning

- The API contract is `0.1.0`.
- While the contract is `0.x`, additive changes bump the patch and breaking changes bump the minor.
- Every SDK declares the contract range it implements and the engine range it supports.
- `binary_info().version` is the engine version actually used. It is the first thing to include in a bug report.
- Automation clients (Playwright, Puppeteer, chromedp, Ferrum, chromiumoxide) are peer dependencies with documented supported ranges. The SDK must not vendor them.
- An SDK release is tested against the current engine build and the previous one.

## 15. Open questions

These block the `0.1.0` freeze:

1. **Binary distribution.** Does the SDK download the engine, always use the app-installed engine, or support both? The contract currently supports both with download as a fallback.
2. **License passing.** Is `OMBRA_LICENSE_KEY` read by the engine directly, passed as a flag, or read from a file? The SDK needs one stable answer.
3. **Authenticated proxy relay.** Is a loopback relay acceptable, or will the engine grow native credential support?
4. **Puppeteer parity.** Does `launchPuppeteer()` support every launch option, or a documented subset?
5. **Profile metadata.** Is `.ombra/profile.json` the long-term format, and does the app read it?
6. **Auto-update.** Should the SDK update the engine automatically, pin to a version, or only report availability?
7. **Humanize mapping.** Which engine flags are stable enough to be part of the SDK contract?

Until these are resolved, SDKs implement the documented behavior and return `UnsupportedEngine` or `InvalidOption` for the unclear edges instead of guessing.
