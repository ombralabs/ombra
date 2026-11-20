# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

In Python and Node.js, `launch()` starts Ombra Chromium and returns a Playwright `Browser`. For Puppeteer in Node.js, use `launchPuppeteer()`.

**[Install](#install)** · <a href="README.ru.md">Русский</a>

<details>
<summary>Languages</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## Fingerprint controls in Chromium

Ombra implements its fingerprint controls in Chromium. They cover canvas, WebGL, audio, fonts, hardware concurrency, element bounds, GPU strings, time zones, and automation signals. The engine uses Chromium’s TLS and HTTP/2 stack and handles humanized input in the browser process.

The SDK starts the engine locally and connects the automation client over the Chrome DevTools Protocol (CDP). You can run it in a script, container, or CI job without installing the Ombra desktop app.

## Status

The examples use the published Python and Node.js alpha packages. This repository also maintains the shared launch contract and scaffolds for eight SDKs.

| Component | Status |
|---|---|
| [SDK contract](docs/sdk-contract.md) | Draft `0.1.0` |
| Python SDK | `0.1.3` alpha · [`ombrabrowser` on PyPI](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` alpha · [`@ombralabs/sdk` on npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Shared schemas](spec/schemas) | Launch options and engine binary metadata |
| [Cross-language conformance](conformance) | Test cases shared by both SDKs |
| [Stealth checkup](docs/stealth-checkup.md) | Test criteria and report template |

## Install

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

For Puppeteer, install `puppeteer-core` in place of `playwright-core`. The [package on npm](https://www.npmjs.com/package/@ombralabs/sdk) lists the supported client and runtime versions.

The SDK first checks the path you pass as `binary_path` in Python or `binaryPath` in Node.js. It then checks `OMBRA_BINARY_PATH`, the desktop app’s engine directory, and the SDK cache, in that order. If it finds no engine, it downloads and verifies one.

To disable downloads, pass `download=False` in Python or `download: false` in Node.js. To prepare the engine without opening a browser, call `ensure_binary()` in Python or `ensureBinary()` in Node.js.

## Quick start

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

With a named profile, open pages in its existing context to reuse cookies and site storage. This example also sets a proxy.

```python
browser = launch(
    profile="pricing-eu",
    headless=False,
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"seed": 20261116, "os": "macos"},
)
page = browser.contexts[0].new_page()
page.goto("https://example.com")
browser.close()
```

**Node.js / TypeScript**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Use `launchPuppeteer()` to get a Puppeteer `Browser`.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Drop-in migration

To migrate a Python script from Playwright, install `ombrabrowser` and change the import and launch call. Page methods, types, and selectors still come from Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

The same change in Node.js takes two lines.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## How it works

```mermaid
flowchart LR
    Script["Your script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP bridge"]
    Engine["Ombra Chromium<br/>patched engine"]
    Client["Native automation client"]
    Profile[("Profile<br/>seed · cookies · extensions")]

    Script -->|launch()| SDK
    SDK -->|spawn| Engine
    SDK -->|connect over CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` locates or downloads the engine and verifies the binary.
2. The SDK selects the profile directory and seed. If the proxy requires authentication, the SDK starts a local relay.
3. It starts Chromium with the selected profile, launch options, and a loopback debugging port.
4. Once `DevToolsActivePort` is ready, the SDK connects Playwright or Puppeteer over CDP and returns that client’s `Browser`.
5. `browser.close()` stops the engine and releases the profile lock.

After launch, the client sends page commands directly to Chromium.

## SDK matrix

| Runtime | Published package | Browser object |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Six more SDKs have directories in this repository. Their planned packages and clients are listed in the [SDK manifest](sdks/manifest.json). The [SDK guide](sdks/README.md) describes the directory layout.

| Target runtime | Planned package | Client or return type |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Launch options

Option names below follow the Python API and the SDK contract. The Node.js equivalents use camelCase, including `timeoutMs`, `userDataDir`, and `binaryPath`.

| Option | Default | Meaning |
|---|---|---|
| `headless` | `true` | Run the engine without a window |
| `proxy` | none | Proxy URL or configuration object. Authenticated proxies use a local relay |
| `fingerprint` | none | Seed and settings for OS, time zone, locale, screen, and GPU |
| `profile` | none | Named profile with persistent cookies, storage, and seed |
| `user_data_dir` | temp | Explicit profile directory, mutually exclusive with `profile` |
| `args` | `[]` | Extra engine flags, passed through unchanged |
| `timeout_ms` | `30000` | Time allowed for launch and CDP connection, in milliseconds |
| `humanize` | engine default | `false`, `true`, or a preset |
| `captcha` | `false` | Enable the engine module with optional limits |
| `binary_path` | resolved | Use a specific engine binary |
| `download` | `true` | Download a missing engine binary |

The [SDK contract](docs/sdk-contract.md) lists all launch options and describes error types and profile behavior.

## Binary management

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

The SDK checks the engine’s SHA-256 checksum before launch. Keep this check enabled in production. `OMBRA_SKIP_CHECKSUM=1` is for local development builds.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `OMBRA_BINARY_PATH` | unset | Explicit engine binary |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Managed binaries and named profiles |
| `OMBRA_DOWNLOAD_URL` | release endpoint | Base URL for binary downloads |
| `OMBRA_VERSION` | latest compatible | Engine version to resolve |
| `OMBRA_AUTO_UPDATE` | `true` | Check for a newer engine on launch |
| `OMBRA_SKIP_CHECKSUM` | `false` | Development only |
| `OMBRA_LICENSE_KEY` | unset | Passed to the engine |
| `OMBRA_TIMEOUT_MS` | `30000` | Default launch timeout in milliseconds |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

The SDK uses the first available value from the launch options, environment, profile metadata, or defaults, in that order.

## Comparison

| Feature | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright or Puppeteer |
| Patch level | none | in-page JavaScript | config flags | engine source |
| Fingerprint seed | no | no | partial | per profile |
| Humanized input | no | no | no | engine |
| Profile isolation | browser context | browser context | no | user-data-directory |
| Drop-in migration | — | import change | rewrite | import change |

Detector results depend on the site, exit IP, and profile. The [checkup](docs/stealth-checkup.md) describes how those results are measured.

## Stealth is a property of the engine

The engine applies fingerprint settings. SDKs pass the profile seed and explicit launch options to it.

| Layer | Where Ombra handles it |
|---|---|
| TLS and HTTP/2 | Chromium's own network stack, version-matched to the engine build |
| Browser identity | Source-level engine patches driven by the profile seed |
| Automation surface | Engine patches cover WebDriver signals. The SDK does not call `Runtime.enable` |
| Input | Humanized pointer, keyboard, and scroll inside the browser process |
| Network coherence | Proxy-aware timezone and locale resolution |
| State | A separate user-data directory for each profile |

### SDK boundaries

- The CDP debugging port accepts only local connections over loopback.
- The SDK keeps proxy credentials, license keys, and cookies out of logs. It sends no telemetry.
- An existing profile keeps its seed unless you explicitly provide a new one.
- The SDK never injects stealth scripts with `addScriptToEvaluateOnNewDocument` or `evaluateOnNewDocument`, or patches page properties.
- To check readiness, the SDK uses the CDP HTTP endpoint or `Browser.getVersion`. It never calls `Runtime.enable` for this check.
- The engine supplies the browser identity. The SDK applies no user agent or identity overrides through Playwright or Puppeteer and makes no calls to `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, or `setDeviceMetricsOverride`.
- The SDK never adds `--enable-automation`, `--disable-blink-features=AutomationControlled`, or `--no-sandbox` on its own.

## Stealth checkup

Run these checks against the engine build, automation client, and profile you intend to use.

| Layer | Example targets | Pass criteria |
|---|---|---|
| L0 Transport | TrackMe, IP/WebRTC leak checks | Only the exit IP is visible. JA4 and HTTP/2 match the engine’s Chromium build |
| L1 Identity | Local probe, Sannysoft, Intoli | No contradictions between UA, UA-CH, platform, GPU, fonts, screen |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | No headless or lie markers. The fingerprint is stable across reloads |
| L3 Automation | rebrowser, brotector, botd | No CDP, init-script, or WebDriver leaks |
| L4 Behavior | Input fidelity, humanize traces, Cloudflare smoke | Trusted events, realistic ordering, challenge resolves |
| L5 Stability | Seed, workers, iframes, cross-origin | Same seed produces the same persona across launches |

The test procedure covers statuses, troubleshooting, and reporting. Read it in [English](docs/stealth-checkup.md) or [Russian](docs/stealth-checkup.ru.md).

Record the engine build, client version, profile settings, proxy exit, and detector version with each result so runs can be reproduced and compared.

## Repository map

```text
.
├── README.md                  # this file (English)
├── README.ru.md               # Russian translation
├── desktop/                   # offline profile manager
├── docs/
│   ├── desktop/               # profile manager documentation
│   ├── architecture.md        # components, launch flow, boundaries
│   ├── sdk-contract.md        # v0 launch contract and SDK behavior
│   ├── stealth-checkup.md     # stealth validation method and runbook
│   ├── stealth-checkup.ru.md  # Russian translation
│   └── versioning.md          # SDK, engine, and client compatibility
├── spec/
│   └── schemas/               # JSON Schema for launch options and binary info
├── sdks/
│   ├── manifest.json          # machine-readable SDK registry
│   ├── README.md              # layout and contribution rules
│   ├── _template/             # scaffold for a new language
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # language-neutral launch and stealth cases
├── tools/check_repo.py        # structure and link validation (CI)
└── .github/workflows/ci.yml
```

This repository contains the SDK scaffolds, launch contract, conformance cases, and the offline profile manager. The Chromium engine and the full Desktop 1.2.1 release have separate repositories. [Desktop source and build guide](desktop/README.md) · [Profile manager documentation](docs/desktop/README.md)

## The contract

- `launch(options)` starts the engine and returns the client’s `Browser`. The client then talks directly to Chromium over CDP.
- Before launch, the SDK checks the engine’s platform and SHA-256 checksum. It downloads a missing binary when downloads are enabled.
- Named profiles keep cookies, site storage, and the profile seed between launches.
- If launch fails, the SDK cleans up the process it started and raises a typed error. The caller decides whether to retry.
- The SDK, engine, and automation client have separate version ranges. To read the engine build, use `binary_info()` in Python or `binaryInfo()` in Node.js.

## Compatibility

| Component | Supported target |
|---|---|
| Engine | SDK-selected build, reported by `binary_info()` or `binaryInfo()` |
| macOS | Apple Silicon and Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ with a supported Playwright release |
| Node.js | 20+ with a supported Playwright or Puppeteer release |

The SDK and engine are versioned independently. If their versions are incompatible, the SDK reports both versions in a typed error.

## Contributing

The [contributing guide](CONTRIBUTING.md) covers the review process. Build instructions are in the [SDK guide](sdks/README.md).

- For an SDK behavior change, update the affected implementation and add a test or shared conformance case.
- For a new SDK language, copy the [SDK template](sdks/_template), register it in the [manifest](sdks/manifest.json), and open a draft PR.
- For a new launch option, update the [SDK contract](docs/sdk-contract.md) and [schemas](spec/schemas) first.
- Changes to engine-level stealth belong in the engine repository. The SDK must still pass the checkup.
- Report security issues privately using the [security policy](SECURITY.md).

## FAQ

### Is this a Playwright fork?

No. The SDK connects the official Playwright client to Ombra Chromium. You can keep using Playwright types, helpers, and page objects.

### Do I need the Ombra desktop app?

The SDK launches the engine directly. The desktop app is optional and lets you manage profiles by hand.

### How does Ombra differ from playwright-stealth?

Ombra’s fingerprint changes are compiled into Chromium. The SDK leaves page scripts alone.

### Does Ombra solve CAPTCHAs?

The engine has an optional CAPTCHA module. Support depends on the task type, engine build, and available models. The SDK passes the per-launch settings and exposes the module’s CDP controls.

### Can I use my own proxy?

Yes. Pass it to `launch()`. For an authenticated proxy, a local relay keeps credentials off the engine’s command line.

### Which Playwright and Puppeteer versions are supported?

Each SDK declares the supported client versions in its package manifest. The clients are separate dependencies. See the [versioning guide](docs/versioning.md) for the supported ranges.

### Will Ombra pass every bot check?

Results depend on the site, region, exit IP reputation, detector version, and profile settings. The [stealth checkup](docs/stealth-checkup.md) documents how to measure a particular configuration.

## License

SDK sources in this repository are licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to the Ombra engine, the Ombra name, or the logo. See [NOTICE](NOTICE) for trademark and third-party attribution.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
