<p align="center">
<img src="assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="License"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Last Commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Stars"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI Downloads"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm Downloads"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Release"></a>
</p>

<p align="center">
<a href="#install"><strong>Install</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-and-typescript-api">Node.js API</a> ·
<a href="#humanized-input">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="translations/ru/README.md">Русский</a>
</p>

<details>
<summary>Languages</summary>

[English](README.md) · [Русский](translations/ru/README.md) · [Deutsch](translations/de/README.md) · [Español](translations/es/README.md) ·
[Français](translations/fr/README.md) · [Italiano](translations/it/README.md) · [Nederlands](translations/nl/README.md) · [Polski](translations/pl/README.md) ·
[Português](translations/pt/README.md) · [Română](translations/ro/README.md) · [Türkçe](translations/tr/README.md) · [Українська](translations/uk/README.md) ·
[Tiếng Việt](translations/vi/README.md) · [Bahasa Indonesia](translations/id/README.md) · [简体中文](translations/zh-Hans/README.md) · [繁體中文](translations/zh-Hant/README.md) ·
[日本語](translations/ja/README.md) · [한국어](translations/ko/README.md) · [ไทย](translations/th/README.md) · [हिंदी](translations/hi/README.md) ·
[Filipino](translations/fil/README.md) · [ខ្មែរ](translations/km/README.md)

</details>

<br>

<h3 align="center">Chromium with C++ source-level fingerprint controls and native humanized input.</h3>

<table><tr><td>
Not a bundle of launch flags and not JavaScript injection on top of the page. A real Chromium binary with fingerprint patches compiled into the C++ source and input simulation running inside the browser process. Connect official Playwright or Puppeteer over local CDP — no wrapper objects and no rewriting page code.
</td></tr></table>

<br>

<p align="center">
Drop-in launch replacement for Playwright and Puppeteer in Python and Node.js.<br>
Same API, same selectors and types — just swap the import and the <code>launch()</code> call.
</p>

- **Source-level Chromium patches** — canvas, WebGL, WebGPU, audio, fonts, GPU, screen, CSS media queries, hardware reporting, WebRTC without STUN leaks, TLS ClientHello, timezone, locale, and automation signal removal (`navigator.webdriver`, `Runtime.enable`, headless markers).
- **Native humanized input in the browser process (`humanize=True`)** — pointer trajectories (`cursory-rs`), aimed clicks with hold duration, typing cadence with typo self-correction, and scroll physics run inside Chromium. The SDK returns a plain native `Browser` with no proxy wrappers.
- **Autonomous operation with no keys or accounts** — current engine builds and Ombra Desktop run locally without sign-up, license keys, hardware IDs, or a licensing server.
- **Automatic install and cryptographic binary verification** — `pip install ombrabrowser` or `npm install @ombralabs/sdk`; on first launch, the SDK downloads a compatible build from [GitHub Releases](https://github.com/ombralabs/ombra/releases) and verifies its Ed25519 signature and SHA-256 checksum.
- **Persistent profiles and safe proxy relay** — named profiles keep cookies, `localStorage`, IndexedDB, and `seed` across runs with cross-process locking; authenticated proxies (HTTP, HTTPS, SOCKS5) run through a local loopback relay so credentials never appear in process arguments.
- **Offline Ombra Desktop profile manager** — a native desktop application in this repository ([`desktop/`](desktop/README.md)) with prebuilt installers for macOS, Linux, and Windows.

**Python (Playwright):**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

**Node.js / TypeScript (Playwright):**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Puppeteer is also supported via `import { launch } from "@ombralabs/sdk/puppeteer"` or `launchPuppeteer()` ([details](#puppeteer)).

**For sites with anti-bot protection**, combine a residential proxy, a persistent profile, and coherent environment settings:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # residential IP is preferred over datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # match timezone and locale to proxy exit
    headless=False,                                      # some sites detect headless differences
    humanize=True,                                       # native mouse, keyboard, and scroll simulation
)
page = context.new_page()
page.goto("https://example.com")
context.close()
```

```ts
import { launchPersistentContext } from "@ombralabs/sdk";

const context = await launchPersistentContext({
  profile: "pricing-eu",
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
});
const page = await context.newPage();
await page.goto("https://example.com");
await context.close();
```

See [Troubleshooting](#troubleshooting) for common issues on Linux, in containers, and on protected targets.

## Install

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Optional: auto-detect timezone and locale from proxy exit (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# With Playwright (1.60.0+, no stock Chromium download needed)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Or with Puppeteer (Puppeteer 25+ requires Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Optional: offline GeoIP database reader for timezone: "auto" and locale: "auto"
npm install mmdb-lib
```

---

On launch, the SDK resolves the engine in strict order: `binary_path` (`binaryPath` in Node.js), `OMBRA_BINARY_PATH`, the Ombra Desktop engine directory, and the SDK cache (`~/.ombra/engines`). If no compatible engine is found, the SDK downloads a build from [GitHub Releases](https://github.com/ombralabs/ombra/releases), verifies its Ed25519 signature and SHA-256 checksum, and caches it locally. Running `playwright install chromium` is not required.

To disable automatic downloads, pass `download=False` (`download: false` in Node.js). To download and verify the engine ahead of time (for example during a container build), call `ensure_binary()` (`ensureBinary()`) or use the CLI `install` command.

> **Autonomous launch:** current engine builds are free and require no account or license key. `OMBRA_LICENSE_KEY` and the `login` command remain available only for compatibility with older licensed builds.

**Migrating from Playwright** takes two lines — all page operations, locators, and waits stay unchanged:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # the rest of your code works unchanged
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Star** the repository if you find it useful, and **[Watch releases](https://github.com/ombralabs/ombra/subscription)** to get notified about new engine, SDK, and Ombra Desktop builds.

---

## Current status and releases

Each component in the ecosystem follows the shared launch contract and is versioned independently.

| Component | Status / version | Location |
|---|---|---|
| **SDK contract** | Draft `0.1.0` | [`docs/sdk-contract.md`](docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.1.3` | [`ombrabrowser` on PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.1.0` | [`@ombralabs/sdk` on npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium engine** | SDK range `>=151.0.7922.108,<152` | Auto-downloaded by the SDK from [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Offline profile manager | [`desktop/`](desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Standalone browser** | Chromium `158+` (standalone only; current `0.1.x` SDKs accept `151.*` and reject `158.*` with `UnsupportedEngineError`) | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Schemas and conformance** | JSON Schema + shared cases | [`spec/schemas`](spec/schemas) · [`conformance`](conformance/README.md) |
| **Stealth checkup method** | 6 layers (`L0`–`L5`) | [`docs/stealth-checkup.md`](docs/stealth-checkup.md) |

See [CHANGELOG.md](CHANGELOG.md) for full release history.

## Why Ombra

- **Config-level and JS patches break easily.** Tools such as `playwright-stealth`, `puppeteer-extra`, and `undetected-chromedriver` inject JavaScript into pages or tweak launch flags. Chrome updates regularly break them, and modern detectors spot the patches themselves (`Function.prototype.toString`, prototype anomalies, `addScriptToEvaluateOnNewDocument`).
- **Changes are compiled into Chromium source code.** Fingerprints are generated at the C++ level and applied consistently across the main frame, workers, and iframes. The SDK injects no scripts into pages and makes no `Emulation.*` overrides.
- **Input simulation lives in the browser process, not on top of Playwright.** Because mouse trajectories, keystrokes, and scrolling are handled inside Chromium itself, the SDK does not wrap Playwright or Puppeteer objects — every locator, frame, and third-party library keeps working normally.
- **Local architecture with no extra services.** No background control-plane daemon and no network hop between your script and the browser: one engine process, local loopback CDP on `127.0.0.1`, and no caps on profile count or concurrency.

## Ombra Desktop

**A local offline profile manager with a GUI.** Its source lives directly in this repository ([`desktop/`](desktop/README.md)) and is built with Tauri (Rust + Vue).

- **Completely offline and local** — the profile catalog lives in a local SQLite database on your machine with a local encryption key; no account, cloud service, or network access required.
- **Structured profile management** — create profiles, search by name, note, or number, edit descriptions, and organize entries with groups, tags, labels, and bookmarks in the Rust catalog.
- **Safe Trash** — moving a profile to Trash keeps its files on disk so you can restore it later.
- **No per-profile limits** — no per-profile tiers or cloud quotas: all data stays yours.
- **Prebuilt installers** — macOS Apple Silicon (`.dmg`, Apple Developer ID signed and notarized), Linux (`.deb` and `.rpm`), and Windows x64 (`setup.exe`).
- **Isolated catalogs** — set `OMBRA_DESKTOP_DATA_DIR` to work with a separate test catalog or a backup copy.

[Download latest release →](https://github.com/ombralabs/ombra/releases) · [Desktop README](desktop/README.md) · [Profiles and local keys guide](docs/desktop/README.md)

## Fingerprint verification and stealth checkup

Instead of making blanket "100% undetectable" promises, Ombra relies on a repeatable verification procedure under recorded conditions. Real-world results on any site always depend on exit IP reputation, region, profile history, detector version, and launch configuration.

### Surfaces handled by the engine and SDK

| Surface / signal | Stock Playwright | Ombra | Implementation |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ engine patch |
| `window.chrome` | missing in headless | full object | Matches regular Chrome |
| `navigator.plugins` | `0` in headless | coherent plugin set | Engine-level |
| User-Agent and Client Hints | `HeadlessChrome`, brand mismatch | `Google Chrome` + aligned `Sec-CH-UA*` | Patch `010-user-agent-and-webdriver` |
| CDP artifacts (`Runtime.enable`, `UtilityScript`) | flagged by detectors | suppressed by engine; SDK never calls `Runtime.enable` | Patch `110-runtime-enable` + invariant `SI-01` |
| WebRTC IP leak | exposes local/host IP | reports exit IP without sending real STUN | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS and HTTP/2 | depends on setup | Chromium network stack + `chrome-<major>` ClientHello profile | Patch `210-tls-network-persona` |
| WebGL and WebGPU | software renderer / GPU mismatch | unified WebGL/WebGPU limits and extension tables | Patches `070`, `071`, `075`, `955` |
| Fonts, locale, and timezone | host values, `Intl` drift | coherent font tables, ICU locale, and timezone | Patches `040`, `090`, `092`, `230` |
| Input simulation | cursor teleport, instant `fill()` | `cursory-rs` curves, typing rhythm, scroll physics | Patch `135-ombra-humanize` in browser process |
| Fingerprint stability | changes or leaks host | deterministic per `seed` across restarts and frames | Patches `001`, `002` + persistent profile |

### Six layers of the checkup

Before releasing or deploying a configuration, run all six checkup layers against the exact engine build, automation client, and proxy you intend to use:

| Layer | Example targets | Pass criteria |
|---|---|---|
| **L0 Transport** | TrackMe, IP/WebRTC leak pages, header echo | Only the proxy exit IP is visible; JA4 and HTTP/2 match the Chromium build; no proxy credentials in argv |
| **L1 Identity** | Local probe, Sannysoft, Intoli, UA-CH check | No contradictions between UA, Client Hints, platform, GPU, fonts, screen, and locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | No headless or `lie` markers; fingerprint stays stable across reloads |
| **L3 Automation** | rebrowser, brotector, botd, CDP command audit | No `Runtime.enable`, init-script, binding, or `navigator.webdriver` leaks |
| **L4 Behavior** | Input fidelity probe, humanize traces, live challenge smoke | `isTrusted: true` events, natural ordering and timing, realistic pointer curves and scrolling |
| **L5 Stability** | Repeated launches, workers, same/cross-origin iframes, cross-SDK parity | The same `seed` reproduces an identical fingerprint across all contexts |

Full procedure, statuses (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), signal checklist, and report template: [English (`docs/stealth-checkup.md`)](docs/stealth-checkup.md) and [Russian (`docs/stealth-checkup.ru.md`)](docs/stealth-checkup.ru.md).

## Comparison

| Feature | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| Automation API | Playwright | Playwright | Selenium | **Playwright and Puppeteer** |
| Patch level | None | In-page JS injection | Config flags | **C++ source (Chromium)** |
| Coherent fingerprint `seed` | No | No | Partial | **Yes, per profile and eTLD+1** |
| Input simulation (`humanize`) | No | No | No | **Built into browser process** |
| `Runtime.enable` / CDP leak suppression | No | No | Partial | **Engine patch + SDK invariants** |
| Authenticated proxies without CLI leaks | No | No | Limited | **Local loopback relay** |
| Profile isolation | Browser context | Browser context | No | **Profile directory + file lock** |
| Offline profile manager (GUI) | No | No | No | **Ombra Desktop (macOS, Linux, Windows)** |
| Migration from Playwright | — | Import change | Code rewrite | **Import and `launch()` swap** |

## How it works

```mermaid
flowchart LR
    Script["Your script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP bridge"]
    Relay["Local proxy relay<br/>when auth is required"]
    Engine["Ombra Chromium<br/>C++-patched engine"]
    Client["Native client<br/>Playwright · Puppeteer"]
    Profile[("Profile<br/>seed · cookies · storage")]

    Script -->|"launch()"| SDK
    SDK -->|"verify + spawn"| Engine
    SDK -.->|"proxy auth"| Relay
    Relay -.-> Engine
    SDK -->|"connect over CDP"| Client
    Script -->|"page API"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **`launch()` locates or downloads the engine** and verifies its Ed25519 signature and SHA-256 checksum.
2. **Profile and `seed` are prepared.** A named profile acquires a cross-process lock; if the proxy requires credentials, the SDK starts an in-memory loopback relay.
3. **Ombra Chromium starts** with the selected profile, fingerprint options, and a local debugging port (`--remote-debugging-port=0`).
4. **The official client connects.** Once `DevToolsActivePort` appears, the SDK attaches Playwright (with `no_defaults=True`) or Puppeteer over `127.0.0.1` and returns the native `Browser` object.
5. **Clean shutdown.** `browser.close()` sends `Browser.close`, terminates the engine process tree, stops the relay, and releases the profile lock.

After launch, the SDK leaves the data path: all page commands travel directly from Playwright or Puppeteer to Chromium.

### SDK boundaries and stealth invariants

The [v0.1 SDK contract (`docs/sdk-contract.md`)](docs/sdk-contract.md) enforces strict invariants on every official SDK:

- **No stealth scripts on pages.** The SDK never calls `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` and never patches DOM properties.
- **No `Runtime.enable`.** Readiness checks use only the local CDP HTTP endpoint or `Browser.getVersion`; the SDK never enables `Runtime`, `Debugger`, or `Log`.
- **No `Emulation.*` overrides.** The SDK never calls `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, or `setDeviceMetricsOverride` — browser identity comes from the engine.
- **No forbidden flags by default.** The SDK never injects `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`, or `--user-agent` on its own.
- **Loopback CDP only.** The debug port always binds to `127.0.0.1`; passing a non-loopback `--remote-debugging-address` is rejected.
- **No telemetry and no secret leaks.** Proxy credentials, keys, and cookies are redacted from logs and error messages.

## Python API

### `launch()`

```python
from ombrabrowser import launch

# Basic launch (headless by default)
browser = launch()

# Headed browser window
browser = launch(headless=False)

# HTTP or SOCKS5 proxy (credentials handled via local loopback relay)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Proxy object with bypass list
browser = launch(
    proxy={
        "type": "socks5",
        "host": "proxy.example.com",
        "port": 1080,
        "username": "user",
        "password": "pass",
        "bypass": ".local,127.0.0.1",
    }
)

# Fingerprint controls (seed, OS, auto timezone/locale from proxy, screen, GPU)
# For timezone="auto" / locale="auto", install: pip install "ombrabrowser[geoip]"
browser = launch(
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={
        "seed": 20261116,
        "os": "macos",
        "timezone": "auto",
        "locale": "auto",
        "screen": {"width": 1440, "height": 900},
    },
)

# Native mouse, keyboard, and scroll simulation
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Pin an exact engine build and pass extra Chromium flags
browser = launch(
    version="151.0.7922.108-9",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Returns a standard `playwright.sync_api.Browser`. All Playwright methods work normally (`new_page()`, `new_context()`, `close()`, etc.). New pages default to `no_viewport=True` so the profile's window dimensions are not overwritten.

### `launch_async()`

```python
import asyncio
from ombrabrowser import launch_async

async def main() -> None:
    browser = await launch_async(headless=False, humanize=True)
    page = await browser.new_page()
    await page.goto("https://example.com")
    print(await page.title())
    await browser.close()

asyncio.run(main())
```

### `launch_context()` and `launch_context_async()`

Convenience helper that launches the browser and returns a `BrowserContext` directly (closing the context also terminates the engine process). Extra keyword arguments are forwarded to `browser.new_context()` — such as `storage_state`, `permissions`, or `extra_http_headers`:

```python
from ombrabrowser import launch_context

context = launch_context(
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
    storage_state="state.json",
)
page = context.new_page()
page.goto("https://example.com")
context.storage_state(path="state.json")
context.close()
```

Async counterpart: `await launch_context_async(...)`.

### `launch_persistent_context()` and `launch_persistent_context_async()`

Launches the browser with a persistent profile and returns its default `BrowserContext`. Cookies, `localStorage`, IndexedDB, cache, and the fingerprint `seed` persist across sessions.

- Passing `profile="pricing-eu"` creates the profile under `~/.ombra/profiles/pricing-eu` with metadata in `.ombra/profile.json` and a lock file.
- Passing `user_data_dir="./my-profile"` (or a positional path argument) uses that explicit directory.
- Launching the same profile concurrently from another process raises `ProfileBusyError` instead of corrupting profile data.

```python
from ombrabrowser import launch_persistent_context

# By named profile (stored in ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookies, storage, and seed are persisted

# By explicit path (for example, to load Chrome extensions)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Async counterpart: `await launch_persistent_context_async(...)`.

### Utility functions and diagnostics (Python)

```python
from ombrabrowser import (
    binary_info,
    build_launch_options,
    check_engine_health,
    clear_cache,
    ensure_binary,
    last_launch_info,
    launch,
)

# Inspect the resolved engine binary
print(binary_info())
# {'version': '151.0.7922.108-9', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Download and verify the engine without launching a browser
ensure_binary(version="151.0.7922.108-9")

# Remove SDK-managed engine binaries (profiles under ~/.ombra/profiles are untouched)
clear_cache()

# Dry-run preview of the resolved launch command without spawning Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Read runtime metadata (CDP port, ws_url, seed, pid) and verify process health
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # download and verify the engine (Ed25519 + SHA-256)
ombrabrowser install --version 151.0.7922.108-9  # install a specific engine build
ombrabrowser info                                # environment, binary, and dependency diagnostics (alias: doctor)
ombrabrowser info --quick --json                 # fast machine-readable report without spawning the binary
ombrabrowser info --proxy socks5://user:pass@host:1080  # test exit IP, timezone, and locale resolution via proxy
ombrabrowser update                              # check GitHub Releases and update cached engine
ombrabrowser clear-cache                         # clear cached engine binaries (profiles preserved)
ombrabrowser login                               # save license key to ~/.ombra/license.key (legacy builds only)
ombrabrowser logout                              # remove saved license key
```

The same commands are available via `python -m ombrabrowser <command>`.

## Node.js and TypeScript API

`@ombralabs/sdk` ships dual ESM + CommonJS builds with full TypeScript definitions (`.d.ts`). Both Playwright and Puppeteer run on the same engine underneath.

### Playwright (default)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Basic launch with proxy, fingerprint, and input simulation
const browser = await launch({
  profile: "pricing-eu",
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: {
    seed: 20261116,
    os: "macos",
    timezone: "auto",
    locale: "auto",
    screen: { width: 1440, height: 900 },
  },
  headless: false,
  humanize: { preset: "careful" },
});

// Convenience launch: browser + context in one call
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Persistent profile — cookies, localStorage, and seed persist across runs
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Each snippet above is standalone. To migrate an existing Playwright launcher, you can also replace the import with `import * as chromium from "@ombralabs/sdk"` and keep `await chromium.launch(...)`.

### Puppeteer

Use `launchPuppeteer()` from `@ombralabs/sdk` or import from `@ombralabs/sdk/puppeteer`:

```ts
import { launch } from "@ombralabs/sdk/puppeteer";

const browser = await launch({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
});
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
```

> **Note on Puppeteer:** Puppeteer sends more default CDP traffic than Playwright using `connectOverCDP({ noDefaults: true })`. For sites with strict CDP checks, Playwright is recommended.

### Utilities and CLI (Node.js)

```ts
import {
  binaryInfo,
  buildLaunchOptions,
  checkEngineHealth,
  clearCache,
  ensureBinary,
  lastLaunchInfo,
} from "@ombralabs/sdk";

console.log(await binaryInfo());
await ensureBinary({ version: "151.0.7922.108-9" });
await clearCache();
```

```bash
npx --no-install ombra-sdk install [--version <v>] [--channel <stable|beta>]
npx --no-install ombra-sdk info [--quick] [--json] [--proxy <url>]
npx --no-install ombra-sdk doctor
npx --no-install ombra-sdk update [--channel <stable|beta>]
npx --no-install ombra-sdk clear-cache
npx --no-install ombra-sdk login [<license-key>]
npx --no-install ombra-sdk logout
```

## Humanized input

In Ombra, input simulation (`humanize`) is compiled **natively into the Chromium browser process** (powered by `cursory-rs` and the engine's input scheduler) rather than implemented as a JS wrapper around the automation client. This means:

- Every standard Playwright and Puppeteer action (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) flows through a single per-tab input queue inside the browser.
- Behavioral parameters are derived deterministically from the profile `seed` (`--fingerprint-humanize-seed`).
- The SDK never wraps `Page` or `Browser` in proxy classes — native types and client behavior stay intact.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**What changes with `humanize=True`:**

| Action | Without `humanize` | With `humanize=True` |
|---|---|---|
| Mouse movement | Instant teleport | `cursory-rs` curves with acceleration, pauses, and slight overshoot |
| Clicks and drags | Instant press | Aim point within the target, pre-click pause, and hold duration |
| Text input | Instant value set | Per-character typing with configured cadence and keyboard layout, occasional typos and self-correction; very long text is pasted via an isolated clipboard without touching the system clipboard |
| Scrolling | Single jump | Wheel/trackpad event series following measured deceleration profiles |
| Idle intervals | Static cursor | In the `careful` preset, subtle idle cursor drift between actions |

**Presets** — `default` (normal pace), `careful` (slower, deliberate, with idle micro-movements), and `fast` (faster pace). Pass `humanize=False` (`humanize: false`) to disable input simulation explicitly.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

You can toggle the mode or switch presets at runtime without restarting the browser through the `Ombra` CDP domain:

```python
from ombrabrowser import ombra_cdp

with ombra_cdp(browser) as cdp:
    cdp.set_humanize(enabled=True, preset="careful")
    print(cdp.get_humanize_state())
```

```ts
import { ombraCdp } from "@ombralabs/sdk";

const cdp = await ombraCdp(browser);
await cdp.setHumanize({ enabled: true, preset: "careful" });
console.log(await cdp.getHumanizeState());
```

## Fingerprint and profile management

The engine derives a coherent browser configuration from a single `seed`. When `seed` is omitted:

| Scenario | Behavior |
|---|---|
| **`launch()` without a profile** | The SDK generates a random `seed` for the session and creates a temporary directory that is removed after `close()`. |
| **`profile="name"` or `user_data_dir="./dir"`** | The `seed` is saved to `.ombra/profile.json` and reused on every launch — sites see a returning visitor with the same device and cookies. |
| **`fingerprint={"seed": N, ...}`** | Deterministic fingerprint from the explicit `seed`; additional fields override individual settings while keeping the rest coherent. |

Canvas/audio noise is keyed per `eTLD+1` (stable on the same site, unlinkable across different sites). Pixel noise for 2D canvas and WebGL `readPixels` is disabled by default to avoid triggering "Canvas Tampering / Masking" detectors, and can be opted into explicitly via `--fingerprint-pixel-noise`.

> **Tip:** when revisiting the same site, use a persistent profile (`profile="name"` or `launch_persistent_context()`) rather than passing a fixed `seed` to an ephemeral `launch()` — that way cookies, cache, and `localStorage` stay consistent alongside the fingerprint.

### `fingerprint` object fields

Field names below follow Python (`snake_case`); Node.js accepts both `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) and `snake_case`:

| Field | Type | Description |
|---|---|---|
| `seed` | `int` (`>= 0`) | Generator seed determining the overall fingerprint configuration |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Target OS (`navigator.platform`, UA, GPU and font pools) |
| `os_version` | `string` | OS version hint for Client Hints |
| `timezone` | IANA zone or `"auto"` | Timezone (e.g. `"Europe/Berlin"`). `"auto"` resolves the zone from the proxy exit via GeoIP |
| `locale` | BCP-47 or `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` resolves locale from the proxy exit |
| `screen` | `{"width", "height"}` or `"auto"` | Screen and work-area dimensions accounting for the target OS taskbar / menu bar |
| `gpu` | `{"vendor", "renderer"}` or `"auto"` | Explicit WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` strings |
| `hardware_concurrency` | `int` or `"auto"` | Reported `navigator.hardwareConcurrency` |
| `device_memory` | `int` or `"auto"` | Reported `navigator.deviceMemory` (in GB) |
| `noise` | `bool` | Enable/disable fingerprint noise (`False` passes `--disable-fingerprint-noise`) |

> Keep `seed` as the primary source of fingerprint parameters: overriding individual values without keeping them aligned (such as pairing an OS with an incompatible GPU) can introduce contradictions for detectors.

### Additional engine flags (`args`)

Additional engine flags (set or override via `args=[...]`):

| Flag | Purpose |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Browser brand in `Sec-CH-UA` (the SDK defaults to `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | TLS ClientHello profile matching the specified Chrome major version (auto-set by the SDK from the engine version) |
| `--webrtc-ip=<ip>` | Substitute IP address in WebRTC ICE candidates without sending real STUN traffic |
| `--fingerprint-location=<lat,lon>` | Coordinates reported by `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Storage quota reported by `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Touch point count (`navigator.maxTouchPoints` and pointer media queries) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Display pixel density (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Screen color depth |
| `--disable-gpu-fingerprint` | Pass through the host's real GPU (WebGL/WebGPU strings, limits, and extensions) |
| `--disable-gpu-string-spoof` | Pass through real GPU strings while keeping other profile settings |
| `--disable-fingerprint-noise` | Disable canvas/WebGL/audio noise while keeping identity parameters active (also set by `fingerprint={"noise": False}`) |
| `--fingerprint-pixel-noise` | Enable opt-in idempotent pixel noise for 2D canvas and `readPixels` |
| `--profile-label=<text>` | Profile label shown in the browser address bar (UI only; auto-set from `profile`, pass via `args` only when `profile` is unset) |

### Font setup on Linux

Minimal Linux servers and containers often lack emoji and CJK fonts, causing hidden canvas text and emoji rendering to produce unusual hashes.

**1. Baseline layer (emoji and CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows fonts for Windows profiles (`os="windows"`):**
When running a Windows configuration on Linux, installing real fonts from `C:\Windows\Fonts\` (including `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) significantly improves font-enumeration coherence:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS fonts for macOS profiles (`os="macos"`):**
Similarly, when using `os="macos"` on Linux, copy fonts from `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/`, and `/Library/Fonts/` into `~/.local/share/fonts/mac/` and run `fc-cache -f`.

In a `Dockerfile`, place fonts in the system directory `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Launch options, configuration, and errors

### `launch()` options

Option names follow the Python API and [SDK contract](docs/sdk-contract.md); Node.js uses `camelCase` equivalents (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) and also accepts `snake_case` aliases. Unknown options are rejected with `InvalidOptionError`.

| Option | Default | Description |
|---|---|---|
| `headless` | `true` | Run without a window (`--headless=new`) |
| `proxy` | none | Proxy URL (`http`, `https`, `socks5`) or object; authenticated proxies use a loopback relay |
| `fingerprint` | none | Settings for `seed`, OS, timezone, locale, screen, GPU, memory, and noise |
| `profile` | none | Named persistent profile under `~/.ombra/profiles/<slug>` (mutually exclusive with `user_data_dir`) |
| `user_data_dir` | temp | Explicit profile directory path (mutually exclusive with `profile`) |
| `args` | `[]` | Extra Chromium arguments (passed through unchanged) |
| `binary_path` | resolved | Explicit path to an engine executable |
| `version` | env / auto | Engine version pin (for example, `151.0.7922.108-9`), overrides `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Deadline for engine startup and CDP connection (1000–600000 ms) |
| `humanize` | engine default | `False`, `True`, or `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / file | Key for legacy licensed builds (not needed on current builds; never logged) |
| `env` | `{}` | Extra environment variables for the engine process |
| `download` | `True` | Allow automatic download of a missing engine binary |

### Environment variables

Precedence order: **explicit launch option → environment variable → profile metadata → default**.

| Variable | Default | Description |
|---|---|---|
| `OMBRA_BINARY_PATH` | unset | Explicit path to an engine binary |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Directory for cached engines and named profiles |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Engine download source; a custom URL enables legacy mirror mode (`none`/`off` disables downloads) |
| `OMBRA_VERSION` | latest compatible | Pinned engine version (for example, `151.0.7922.108-9`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Engine release channel: `stable` (GitHub releases) or `beta` (GitHub prereleases) |
| `OMBRA_AUTO_UPDATE` | `true` | Check for newer engine builds on launch |
| `OMBRA_SKIP_CHECKSUM` | `false` | Local development only: disables SHA-256 verification (logs a warning) |
| `OMBRA_LICENSE_KEY` | unset | Key for legacy licensed builds (never logged) |
| `OMBRA_TIMEOUT_MS` | `30000` | Default launch timeout (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Log verbosity: `error`, `warn`, `info`, `debug` |

### Typed errors

On any failure, the SDK terminates the spawned engine process, releases the profile lock, and raises an `OmbraError` subclass carrying a stable `kind` and secret-redacted `details`:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Full error taxonomy and retry rules are documented in the [SDK contract (`docs/sdk-contract.md`)](docs/sdk-contract.md).

## Platforms, integrations, and containers

### Supported platforms and runtimes

| Component | Support | Notes |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Autonomous engine builds via GitHub Releases; Ombra Desktop is Developer ID signed and notarized |
| **macOS x64 (Intel)** | ⚠️ | Supported by the SDK when a matching `darwin-x64` build is published or supplied via `binary_path` (older `-7` builds require a license key) |
| **Linux x64** | ✅ | Autonomous engine builds via GitHub Releases; Node.js SDK requires `xz-utils` (`xz`) to extract `.tar.xz` |
| **Windows x64** | ✅ | Autonomous engine builds via GitHub Releases and Ombra Desktop installer |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` is installed automatically with `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` or Puppeteer `>=22` (Puppeteer 25+ requires Node.js `>=22.12`) |

### Framework and AI agent integrations

Ombra works with any automation tool or AI agent framework that accepts a custom Chromium binary or connects over CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain`, and others):

```python
# Option 1: resolve the verified binary path and runnable engine args for your own runner
# Note: build_launch_options() is a dry-run helper — pass explicit user_data_dir and seed
# (named profiles and authenticated proxies require Option 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Option 2: launch via Ombra SDK and hand the local CDP endpoint to your framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Connect your framework to ws_url or cdp_http — fingerprint settings and humanize
# run inside the engine and remain active for any CDP client
```

### Running in Docker and on Linux servers

Example `Dockerfile` that pre-downloads and verifies the engine at image build time:

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    xz-utils xvfb \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir ombrabrowser "ombrabrowser[geoip]" \
    && playwright install-deps chromium \
    && ombrabrowser install

WORKDIR /app
COPY your_script.py /app/
CMD ["python", "/app/your_script.py"]
```

> **Containers and web servers:**
> - If your container cannot initialize the Chromium sandbox, pass `--no-sandbox` explicitly via `args=["--no-sandbox"]` (the SDK never adds this flag on its own).
> - To run with `headless=False` on a headless server, use `Xvfb` (see [below](#troubleshooting)).
> - When running under `uvicorn` with `uvloop`, pass `--loop asyncio` to avoid subprocess pipe hangs.

## Troubleshooting

### Site blocks headless mode

Some anti-bot systems check behavioral and rendering differences in headless mode even with C++ patches. Run with `headless=False` on a virtual display using `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Then launch with a residential SOCKS5/HTTP proxy, a persistent profile, matched timezone/locale, `headless=False`, and `humanize=True` (see the `launch_persistent_context()` example at the top of this README).

If blocks continue on Linux, check [Font setup on Linux](#font-setup-on-linux).

### Site challenges every visit

Calling `launch()` without `profile` starts from an empty temporary directory and a new `seed` every time, so the site treats every run as a brand-new visitor with no cookies. Switch to `profile="..."` or `launch_persistent_context(...)` so cookies, `localStorage`, and `seed` carry over between runs.

### `ProfileBusyError`

A named profile or `user_data_dir` can only be open in one process at a time. Assign a distinct profile name to each parallel worker (`profile=f"worker-{i}"`). Stale locks left behind by crashed processes are detected and cleaned up automatically.

### Do I need to run `playwright install chromium`?

No. Ombra runs its own engine binary and does not use Playwright's stock Chromium. On Linux, you only need system libraries and `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Updating, switching channels, and rolling back the engine

Update the SDK to the latest release:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Test the `beta` channel or pin/roll back to an exact engine build:

```python
# Pin an exact build for a specific launch
browser = launch(version="151.0.7922.108-9")
```

```bash
# Test the beta channel (unset OMBRA_VERSION — an exact -N pin ignores the channel)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Or pin / roll back to an exact engine build
export OMBRA_VERSION=151.0.7922.108-9
ombrabrowser install --version 151.0.7922.108-9

# Or point to a locally built binary
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper blocks a local build

Official Ombra releases for Apple Silicon macOS are signed with an Apple Developer ID certificate and notarized. If you run a local unsigned developer build and macOS quarantines it, clear the quarantine attribute once:

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### Waiting on a page in synchronous Python

In synchronous Playwright, a single long `time.sleep(15)` after `page.goto()` pauses Playwright's event loop, which can stall verification pages. Wait in short increments with a light context call instead:

```python
import time

for _ in range(15):
    page.context.cookies()  # keeps Playwright processing without touching page DOM
    time.sleep(1)
```

In async Python use `await asyncio.sleep(...)`; in Node.js use `await new Promise(r => setTimeout(r, ms))`. Also avoid frequent `page.wait_for_timeout()` and unnecessary `page.evaluate()` calls before checks so you do not generate extra CDP traffic.

## Security

- **Engine authenticity and integrity.** Before extraction, the SDK verifies the Ed25519 signature of the release envelope against a pinned public key and checks the SHA-256 digest of both the archive and the executable.
- **Local-only CDP.** The debug port binds strictly to `127.0.0.1`. Never expose a CDP port to a public network without additional authentication — CDP grants full control over the browser.
- **Secret isolation.** Proxy credentials live only in the memory of the local loopback relay and never appear in process command lines, profile metadata, logs, or error details.
- **No telemetry.** The SDK sends no analytics, crash reports, or hidden network pings.

Report security issues privately according to [SECURITY.md](SECURITY.md).

## Repository map

```text
.
├── README.md                    # this file (English)
├── translations/
│   ├── ru/README.md             # Russian translation
│   └── <locale>/README.md       # 20 additional localizations
├── desktop/                     # Ombra Desktop (Tauri: Rust catalog + Vue UI)
├── docs/
│   ├── architecture.md          # architecture, trust boundaries, lifecycle
│   ├── sdk-contract.md          # v0.1 launch contract, options, errors, invariants
│   ├── stealth-checkup.md       # checkup method (English)
│   ├── stealth-checkup.ru.md    # checkup method (Russian)
│   ├── versioning.md            # SDK, engine, and client versioning
│   └── desktop/                 # Desktop local profile and key guides
├── spec/
│   └── schemas/                 # JSON Schemas for launch options and binary metadata
├── sdks/
│   ├── manifest.json            # machine-readable SDK registry
│   ├── README.md                # SDK layout and contribution rules
│   ├── python/                  # Python SDK (published as ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (published as @ombralabs/sdk)
│   └── ...                      # contract scaffolds for other languages (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # cross-language launch and stealth-invariant cases
├── tools/check_repo.py          # structure, schema, and link validator (CI)
└── .github/workflows/ci.yml
```

This repository hosts the SDK contract, schemas, conformance cases, documentation, and Ombra Desktop source code. Chromium engine patches are maintained in a separate repository, with compiled builds published via [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### Is this a Playwright fork?

No. The SDK connects the official Playwright (or Puppeteer) client to Ombra Chromium over local CDP. All types, locators, waits, and page objects remain standard.

### Is Ombra free, and do I need a license key?

SDK source code in this repository is open source under the Apache License 2.0. Current engine builds and the local Ombra Desktop profile manager run free and autonomously — with no account, license key, hardware ID, or profile count limit. `license_key` and `OMBRA_LICENSE_KEY` are only needed for legacy licensed builds.

### Do I need to install Ombra Desktop to use the SDK?

No. The SDK spawns the engine directly as a child process, making it suitable for scripts, containers, and CI. Ombra Desktop is optional if you want to manage a local profile catalog through a GUI.

### How does Ombra differ from `playwright-stealth`?

`playwright-stealth` injects JavaScript into pages on top of a regular browser, and modern detectors frequently identify the patches themselves. Ombra compiles its modifications into Chromium source code, and the SDK injects no scripts into pages.

### Can I use my own proxy?

Yes. Pass an `http://`, `https://`, or `socks5://` proxy in `proxy`. When credentials are present, the SDK runs a local loopback relay so they never appear in process arguments. Note that Playwright's own `context.request` / `page.request` client may bypass browser-level proxy settings — to guarantee traffic goes through the proxy, issue `fetch()` from page context.

### Which Playwright and Puppeteer versions are supported?

The Python SDK requires Playwright `>=1.60,<2.0` (installed automatically with `ombrabrowser`). The Node.js SDK supports `playwright-core@^1.60.0` or `puppeteer-core >=22.0.0`. See the [versioning guide](docs/versioning.md) for compatibility rules.

### Does Ombra guarantee passing every bot check?

No. Detection is a moving target that depends on the site, region, IP reputation, profile history, and detector version. Use the [stealth checkup method](docs/stealth-checkup.md) to measure and track a specific configuration objectively.

### What use cases is Ombra built for?

Ombra is built for authorized automation, QA testing, monitoring, research, and managing isolated work profiles. Unauthorized access, credential stuffing, and abuse are not supported.

## Contributing

Contribution guidelines are in [CONTRIBUTING.md](CONTRIBUTING.md), community standards in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and SDK instructions in [sdks/README.md](sdks/README.md).

- Update the [SDK contract](docs/sdk-contract.md) and [schemas](spec/schemas) before adding a new launch option.
- When changing SDK behavior, update the implementation, tests, and shared cases in [conformance](conformance/README.md).
- Run `python3 tools/check_repo.py` before opening a pull request to validate repository layout and links.

## License

SDK source code in this repository is licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to Ombra trademarks, the Ombra Chromium engine, or Ombra Desktop — see [NOTICE](NOTICE) for trademark and third-party terms.

## Links

- 🌐 **Website** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Releases (engine & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Changelog** — [CHANGELOG.md](CHANGELOG.md)
- 🐛 **Bugs & feature requests** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organization** — [Ombra Labs](https://github.com/ombralabs)
