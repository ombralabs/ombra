<div align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="Ombra logo">
  <h1>Ombra SDKs</h1>
  <p><strong>Stealth Chromium for Playwright and Puppeteer.</strong></p>
  <p>Same API. Same code. Swap the import.<br>Eight languages, one patched engine, one launch contract.</p>

  [![License](https://img.shields.io/badge/license-Apache--2.0-202939?style=flat-square)](LICENSE)
  [![Status](https://img.shields.io/badge/status-developer%20preview-6E87E8?style=flat-square)](#status)
  [![SDKs](https://img.shields.io/badge/SDKs-8-6E87E8?style=flat-square)](#sdk-matrix)
  [![Contract](https://img.shields.io/badge/contract-0.1.0-202939?style=flat-square)](docs/sdk-contract.md)
  [![Stealth checkup](https://img.shields.io/badge/docs-stealth%20checkup-202939?style=flat-square)](docs/stealth-checkup.md)

  <sub><a href="README.ru.md">Русская версия</a> · <a href="https://ombrabrowser.dev">ombrabrowser.dev</a></sub>
</div>

---

> **Developer preview.** The API contract is at `0.1.0`; the language folders are scaffolds, and no package has been published to a registry yet. Python and Node.js ship first and define the behavior the other SDKs are held to.

## Stealth that survives a browser update

Most stealth tools work at the configuration level: a JavaScript shim, a patched driver, a different `navigator.webdriver`. They break when Chromium ships, and the patch itself becomes a fingerprint.

Ombra takes the other route. Fingerprint surfaces are modified in Chromium's source and compiled into the browser: canvas, WebGL, audio, fonts, hardware concurrency, client rects, GPU strings, timezone handling, and the automation surface. TLS and HTTP/2 come from Chromium's own network stack, so they match the browser the engine is built from. Input is humanized inside the browser process, not by synthetic DOM events.

The SDKs stay deliberately small. `launch()` starts the engine, waits for the CDP endpoint, connects Playwright or Puppeteer, and returns a normal browser object. There is no new page API to learn, no selector dialect, and no wrapper around your code.

```python
from ombra import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")  # your existing Playwright code
print(page.title())
browser.close()
```

The SDK launches the engine directly, so it works in a script, a container, or CI without a desktop app running.

## Status

| Workstream | State |
|---|---|
| SDK API contract | `0.1.0` draft — [docs/sdk-contract.md](docs/sdk-contract.md) |
| Python, Node.js | Scaffolds; reference implementations land first |
| .NET, Java, Go | Scaffolds |
| PHP, Ruby, Rust | Scaffolds |
| Shared schemas | [spec/schemas](spec/schemas) |
| Cross-language conformance | Cases defined — [conformance](conformance) |
| Stealth checkup | Method defined — [docs/stealth-checkup.md](docs/stealth-checkup.md) |

Package names and install commands below are release targets, not published artifacts. Registry availability is checked before the first release.

## Install

```bash
# Python
pip install ombra

# Node.js
npm install @ombra/sdk
```

The engine binary is resolved on first launch: an explicit `binary_path`, then `OMBRA_BINARY_PATH`, then the engine installed by the Ombra app, then the SDK cache, then a verified download. `ensure_binary()` performs the same step without launching a browser.

## Quick start

**Python**

```python
from ombra import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

With a persistent profile and a proxy:

```python
browser = launch(
    profile="pricing-eu",
    headless=False,
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"seed": 20261116, "os": "macos"},
)
```

**Node.js / TypeScript**

```ts
import { launch } from "@ombra/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Puppeteer uses a separate entry point, because the return type is different:

```ts
import { launchPuppeteer } from "@ombra/sdk";

const browser = await launchPuppeteer({ headless: false });
```

In every language the SDK returns the native client object: a Playwright or Puppeteer browser where those clients exist, a chromedp session in Go, a Ferrum browser in Ruby, and a chromiumoxide browser in Rust. It is never a wrapper.

## Drop-in migration

Existing Playwright code needs one import and one line:

```diff
- from playwright.sync_api import sync_playwright
- playwright = sync_playwright().start()
- browser = playwright.chromium.launch(headless=False)
+ from ombra import launch
+ browser = launch(headless=False)

  page = browser.new_page()
  page.goto("https://example.com")
  # the rest of the script is unchanged
```

Node.js:

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombra/sdk";
+ const browser = await launch();
```

The returned object is a real Playwright `Browser` (or a real Puppeteer `Browser` from `launchPuppeteer()`). Type checks, helper libraries, and existing page objects keep working.

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

1. The SDK resolves and verifies the engine binary, or downloads it on first use.
2. It resolves the profile directory and the persona seed, and starts the proxy relay if the proxy needs authentication.
3. It spawns the engine with a loopback debug port, the profile directory, and the launch options.
4. It waits for `DevToolsActivePort`, connects Playwright or Puppeteer over CDP, and returns the browser.
5. On `browser.close()`, the SDK terminates the engine and releases the profile lock.

The SDK is not in the request path after the CDP connection is established. It cannot rewrite headers, inject scripts, or observe pages. That is what keeps it small and auditable.

## SDK matrix

| Language | Package (target) | Runtime | `launch()` returns | Status |
|---|---|---|---|---|
| Python | `ombra` (PyPI) | 3.10+ | Playwright `Browser` | Scaffold |
| Node.js / TypeScript | `@ombra/sdk` (npm) | Node 20+ | Playwright `Browser`; Puppeteer via `launchPuppeteer()` | Scaffold |
| C# / .NET | `Ombra` (NuGet) | .NET 8+ | Playwright `IBrowser` | Scaffold |
| Java | `dev.ombra:ombra` (Maven Central) | 17+ | Playwright `Browser` | Scaffold |
| Go | `github.com/ombralabs/ombra/sdks/go` | 1.22+ | chromedp-ready session | Scaffold |
| PHP | `ombralabs/ombra` (Packagist) | 8.2+ | `Ombra\Browser` (CDP handle) | Scaffold |
| Ruby | `ombra` (RubyGems) | 3.2+ | `Ferrum::Browser` | Scaffold |
| Rust | `ombra` (crates.io) | 1.78+ | `chromiumoxide::Browser` | Scaffold |

Each SDK follows its ecosystem's layout instead of a forced common tree — `src/ombra` for Python, `src/Ombra` for .NET, `src/main/java` for Java, `lib/ombra` for Ruby, package root for Go. The machine-readable source of truth is [sdks/manifest.json](sdks/manifest.json); the conventions are in [sdks/README.md](sdks/README.md).

## Launch options

| Option | Default | Meaning |
|---|---|---|
| `headless` | `true` | Run the engine without a window |
| `proxy` | none | Proxy URL or object; authenticated proxies use a loopback relay |
| `fingerprint` | none | Seed and persona hints: OS, timezone, locale, screen, GPU |
| `profile` | none | Named profile with persistent cookies, storage, and seed |
| `user_data_dir` | temp | Explicit profile directory, mutually exclusive with `profile` |
| `args` | `[]` | Extra engine flags, passed through unchanged |
| `timeout_ms` | `30000` | Launch and CDP readiness deadline |
| `humanize` | engine default | `false`, `true`, or a preset |
| `captcha` | `false` | Enable the engine module with optional limits |
| `binary_path` | resolved | Use a specific engine binary |

The full option table, error taxonomy, and profile semantics are in [docs/sdk-contract.md](docs/sdk-contract.md).

## Binary management

```python
from ombra import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

The SDK verifies SHA-256 before launch. `OMBRA_SKIP_CHECKSUM=1` exists for local development builds and must never be used in production.

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
| `OMBRA_TIMEOUT_MS` | `30000` | Default launch deadline |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Precedence: explicit option, then environment variable, then profile metadata, then default.

## Comparison

| | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright or Puppeteer |
| Patch level | none | in-page JavaScript | config flags | engine source |
| Fingerprint seed | no | no | partial | per profile |
| Humanized input | no | no | no | engine |
| Profile isolation | browser context | browser context | no | user-data-directory |
| Drop-in migration | — | import change | rewrite | import change |

The comparison is about architecture, not scores. A detector result depends on the site, the exit IP, and the profile; the [checkup](docs/stealth-checkup.md) is how those results are produced.

## Stealth is a property of the engine

The SDKs are deliberately powerless over fingerprint values. That is the design, not a missing feature.

| Layer | Where Ombra handles it |
|---|---|
| TLS and HTTP/2 | Chromium's own network stack, version-matched to the engine build |
| Browser identity | Source-level engine patches driven by the profile seed |
| Automation surface | WebDriver scrub, CDP hygiene, no `Runtime.enable` from the SDK |
| Input | Humanized pointer, keyboard, and scroll inside the browser process |
| Network coherence | Proxy exit and profile timezone/locale are checked together |
| State | One profile, one user-data directory, no cross-profile leakage |

### What every SDK must never do

1. Inject stealth JavaScript — no `addScriptToEvaluateOnNewDocument`, no `evaluateOnNewDocument`, no property shims.
2. Call `Runtime.enable`; readiness uses the CDP HTTP endpoint or `Browser.getVersion`.
3. Use `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, or `setDeviceMetricsOverride`.
4. Add `--enable-automation`, `--disable-blink-features=AutomationControlled`, or `--no-sandbox` behind the user's back.
5. Override the user agent or identity at the Playwright/Puppeteer level.
6. Derive, randomize, or silently change the profile seed.
7. Expose the CDP port beyond loopback.
8. Log proxy credentials, license keys, cookies, or telemetry.

## Stealth checkup

The checkup is organized in layers, from the network to behavior. A release candidate is not accepted on a single happy-path screenshot.

| Layer | Example targets | Hard gate |
|---|---|---|
| L0 Transport | TrackMe, IP/WebRTC leak checks | Exit IP only; JA4 and HTTP/2 match the engine's Chromium |
| L1 Identity | Local probe, Sannysoft, Intoli | No contradictions between UA, UA-CH, platform, GPU, fonts, screen |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | No headless or lie markers; stable across reloads |
| L3 Automation | rebrowser, brotector, botd | No CDP, init-script, or WebDriver leaks |
| L4 Behavior | Input fidelity, humanize traces, Cloudflare smoke | Trusted events, realistic ordering, challenge resolves |
| L5 Stability | Seed, workers, iframes, cross-origin | Same seed produces the same persona across launches |

The full runbook, status model, triage table, and reporting template are in [docs/stealth-checkup.md](docs/stealth-checkup.md). The Russian translation is [docs/stealth-checkup.ru.md](docs/stealth-checkup.ru.md).

We do not publish stealth numbers without the conditions that produced them. The checkup exists so a result can be reproduced, compared with a baseline, and blocked on a regression.

## Repository map

```text
.
├── README.md                  # this file (English)
├── README.ru.md               # Russian translation
├── desktop/                   # local profile catalog and desktop controls
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
│   ├── _template/             # starting point for a new language
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # language-neutral launch and stealth cases
├── tools/check_repo.py        # structure and link validation (CI)
└── .github/workflows/ci.yml
```

The local profile catalog and reusable Desktop controls are maintained in this repository alongside the SDKs. The engine and the full Desktop 1.2.1 release have their own repositories. [Desktop source](desktop/README.md) · [Profile manager documentation](docs/desktop/README.md).

## The contract

- **One entry point.** `launch(options)` starts the engine and returns a native browser object.
- **Binary verified.** SHA-256 and platform checks before spawn; downloads are optional and explicit.
- **Profiles persist the seed.** A named profile keeps cookies, storage, and the persona seed across launches.
- **No control plane.** The SDK talks to the engine over CDP; there is no service between your script and the browser.
- **No hidden retries.** A failed launch is a typed error; the SDK cleans up the process.
- **Versioned.** SDK, engine, and automation client ranges are separate; `binary_info()` reports the engine build.

## Compatibility

| Item | Target |
|---|---|
| Engine | The build resolved by the SDK; reported by `binary_info()` |
| macOS | Apple Silicon and Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; Playwright supported range |
| Node.js | 20+; Playwright and Puppeteer supported ranges |
| .NET | 8+; Microsoft.Playwright supported range |
| Java | 17+; Playwright supported range |

The SDK package version and the engine version move independently. A contract mismatch is reported as a typed error with both versions in the message, never as a silent degradation.

## Contributing

The fastest way to shape the SDKs is to open an issue with the API you wish existed. For code contributions, read [CONTRIBUTING.md](CONTRIBUTING.md), then start with a conformance case before writing a launcher.

- New language? Copy [sdks/_template](sdks/_template), add an entry to [sdks/manifest.json](sdks/manifest.json), and open a draft PR.
- Launch option? Update [docs/sdk-contract.md](docs/sdk-contract.md) and [spec/schemas](spec/schemas) first.
- Stealth change? The engine owns it; the SDK side must stay unchanged and pass the checkup.
- Security issue? Do not open a public issue — see [SECURITY.md](SECURITY.md).

## FAQ

**Is this a Playwright fork?**
No. It returns the official Playwright browser object. You keep using Playwright types, helpers, and page objects.

**Do I need the Ombra desktop app?**
No. The SDK launches the engine directly. The app is for manual profile management and is not in the SDK path.

**How is this different from playwright-stealth?**
`playwright-stealth` injects JavaScript and patches properties after the page starts. Ombra patches Chromium before it is compiled. There is no in-page shim to detect, and the SDK does not add one.

**Does it solve CAPTCHAs?**
The engine has an optional CAPTCHA module, enabled per launch. Support depends on the task type, build, and available models. It is not a guarantee, and it is not implemented in the SDK.

**Can I use my own proxy?**
Yes. Pass it to `launch()`. Authenticated proxies go through a loopback relay so credentials never appear in the process command line.

**Which Playwright and Puppeteer versions are supported?**
The ranges are declared in the package manifest and tracked in [docs/versioning.md](docs/versioning.md). The SDK does not vendor either library.

**Will this pass every bot check?**
No honest project can promise that. Detection is an arms race, and results depend on the site, region, IP reputation, detector version, and profile coherence. Ombra gives you a reproducible checkup instead of a guarantee.

## License

SDK sources in this repository are licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to the Ombra engine, the Ombra name, or the logo. See [NOTICE](NOTICE) for trademark and third-party attribution.

---

<div align="center">
  <sub>Built by <a href="https://github.com/ombralabs">Ombra Labs</a> · <a href="https://ombrabrowser.dev">ombrabrowser.dev</a></sub>
</div>
