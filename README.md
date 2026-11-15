<div align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="Ombra logo">
  <h1>Ombra SDKs</h1>
  <p><strong>One stealth engine. Eight languages. One contract.</strong></p>
  <p>Official SDKs for the Ombra browser: fingerprint-controlled Chromium, isolated profiles,<br>humanized input, and a local automation API. Product: <a href="https://ombrabrowser.dev">ombrabrowser.dev</a>.</p>

  [![License](https://img.shields.io/badge/license-Apache--2.0-202939?style=flat-square)](LICENSE)
  [![Status](https://img.shields.io/badge/status-developer%20preview-6E87E8?style=flat-square)](#status)
  [![SDKs](https://img.shields.io/badge/SDKs-8-6E87E8?style=flat-square)](#sdk-matrix)
  [![Contract](https://img.shields.io/badge/contract-0.1.0-202939?style=flat-square)](docs/sdk-contract.md)
  [![Stealth checkup](https://img.shields.io/badge/docs-stealth%20checkup-202939?style=flat-square)](docs/stealth-checkup.md)

  <sub><a href="README.ru.md">Русская версия</a></sub>
</div>

---

> **Developer preview.** The wire contract is at `0.1.0`, the language folders are scaffolds, and no package has been published to a registry yet. Python and Node.js ship first and define the behavior the other SDKs are held to. If you are integrating today, use the Local API directly — it is stable, documented, and already implemented in the Ombra app.

## Status

| Workstream | State |
|---|---|
| Wire contract | `0.1.0` draft — [docs/sdk-contract.md](docs/sdk-contract.md) |
| Shared schemas | [spec/schemas](spec/schemas) |
| Python, Node.js | Scaffolds; reference implementations land first |
| .NET, Java, Go | Scaffolds |
| PHP, Ruby, Rust | Scaffolds |
| Cross-language conformance | Cases defined — [conformance](conformance) |
| Stealth checkup | Method defined — [docs/stealth-checkup.md](docs/stealth-checkup.md) |

Package names in the matrix below are targets, not published artifacts. Registry availability is checked before the first release.

## Why this repository exists

Most automation stacks treat stealth as a property of the script: a JavaScript shim, a patched driver, a different `navigator.webdriver`. That approach breaks when Chromium ships, and it makes the same profile behave differently depending on which library is driving it.

Ombra separates the two concerns.

> **Stealth lives in the engine. The SDKs stay boring.**
>
> Fingerprint surfaces are patched in Chromium's source and compiled into the browser. Profile state lives in an isolated user-data directory. Input is humanized inside the browser process, not by synthetic DOM events. The Local API starts and stops profiles and returns a CDP endpoint.
>
> An SDK's job is to speak that API well in your language, expose the profile lifecycle as typed objects, and get out of the way. It does not inject scripts, does not call `Runtime.enable`, does not fake `navigator.webdriver`, and does not reimplement fingerprint logic in eight languages.

That gives three properties teams actually need:

- **No fingerprint drift between languages.** A profile seeded with the same value behaves the same whether it is driven from Python, Node.js, Go, or Rust, because the browser never learns which SDK started it.
- **One fix reaches every SDK.** Detection surfaces change in the engine, not in eight binding layers. The SDKs only track the wire contract.
- **A small surface to audit.** The SDK is a lifecycle client plus a CDP connection helper — not another automation framework.

## The stack

```mermaid
flowchart LR
    Script["Your script<br/>Python · Node · .NET · Java · Go · PHP · Ruby · Rust"]
    SDK["Ombra SDK<br/>typed lifecycle client"]
    API["Local API<br/>127.0.0.1:45678"]
    App["Ombra app"]
    Engine["Ombra Chromium<br/>source-level patches · humanize · CAPTCHA"]
    Profile[("Profile<br/>fingerprint seed · cookies<br/>proxy · extensions")]

    Script --> SDK
    SDK --> API
    API --> App
    App --> Engine
    SDK -. "CDP WebSocket" .-> Engine
    Engine --> Profile
```

The SDK never launches Chromium itself. It asks the Ombra app to start a profile, receives the CDP WebSocket from the Local API response, and hands that address to the automation client you already use.

## Quick start

The snippets below are the target API defined by the [v0 contract](docs/sdk-contract.md). They are not published packages yet.

**Python**

```python
from ombra import Ombra

client = Ombra("http://127.0.0.1:45678")

profile = client.profiles.create(
    name="pricing-eu",
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"os": "macos", "seed": 20261116},
    humanize={"enabled": True, "preset": "default"},
)

session = client.launch(profile.id, headless=False)
browser = session.connect_playwright()
page = browser.new_page()
page.goto("https://example.com")
browser.close()
session.close()
```

**Node.js / TypeScript**

```ts
import { Ombra } from "@ombra/sdk";

const client = new Ombra({ endpoint: "http://127.0.0.1:45678" });

const profile = await client.profiles.create({
  name: "pricing-eu",
  proxy: "socks5://user:pass@proxy:1080",
  fingerprint: { os: "macos", seed: 20261116 },
  humanize: { enabled: true, preset: "default" },
});

const session = await client.launch(profile.id, { headless: false });
const browser = await session.connectPlaywright();
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
await session.close();
```

The same call in Go, Java, .NET, PHP, Ruby, and Rust lives in each SDK's README. Method naming follows the language — `profiles.create`, `Profiles.Create`, `profilesCreate` — while the wire format stays snake_case.

## Use the Local API today

The Local API is the stable seam between the SDKs and the app. It listens on loopback only, accepts `GET` and `POST`, and uses a stable JSON envelope.

```bash
curl -s http://127.0.0.1:45678/api/v2/browser-profile/start \
  -H 'Content-Type: application/json' \
  -d '{"profile_id": "<profile-id>", "headless": false}'
```

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "ws": {
      "puppeteer": "ws://127.0.0.1:9222/devtools/browser/…",
      "selenium": "127.0.0.1:9222"
    },
    "debug_port": "9222",
    "webdriver": ""
  }
}
```

Pass `data.ws.puppeteer` to Playwright, Puppeteer, or any CDP client:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.connect_over_cdp("ws://127.0.0.1:9222/devtools/browser/…")
    page = browser.new_page()
    page.goto("https://example.com")
```

The full endpoint list, envelope rules, and error model are in [docs/sdk-contract.md](docs/sdk-contract.md). An API key is optional and, when enabled in the app, travels as `Authorization: Bearer`.

## SDK matrix

| Language | Package (target) | Runtime | Connect with | Status |
|---|---|---|---|---|
| Python | `ombra` (PyPI) | 3.10+ | Playwright | Scaffold |
| Node.js / TypeScript | `@ombra/sdk` (npm) | Node 20+ | Playwright, Puppeteer | Scaffold |
| C# / .NET | `Ombra` (NuGet) | .NET 8+ | Microsoft.Playwright, Selenium | Scaffold |
| Java | `dev.ombra:ombra` (Maven Central) | 17+ | Playwright, Selenium | Scaffold |
| Go | `github.com/ombralabs/ombra/sdks/go` | 1.22+ | chromedp, playwright-go | Scaffold |
| PHP | `ombralabs/ombra` (Packagist) | 8.2+ | Any CDP WebSocket client | Scaffold |
| Ruby | `ombra` (RubyGems) | 3.2+ | Ferrum | Scaffold |
| Rust | `ombra` (crates.io) | 1.78+ | chromiumoxide | Scaffold |

Each SDK follows its ecosystem's layout instead of a forced common tree — `src/ombra` for Python, `src/Ombra` for .NET, `src/main/java` for Java, `lib/ombra` for Ruby, package root for Go. The machine-readable source of truth is [sdks/manifest.json](sdks/manifest.json); the conventions are in [sdks/README.md](sdks/README.md).

## What an SDK does — and does not do

**Does**

- Discovers the Local API and validates that the app is reachable.
- Creates, reads, updates, and deletes profiles, including proxy, fingerprint seed, humanize, and CAPTCHA settings.
- Starts and stops profiles, waits for readiness, and returns a session with `cdp_url`, `selenium_address`, and `debug_port`.
- Offers a thin connection helper for the dominant CDP clients in that language.
- Maps the `code`/`msg`/`data` envelope to typed results and typed errors with stable codes.
- Reads configuration from `OMBRA_API_URL` and `OMBRA_API_KEY` when explicit arguments are absent.
- Ships with no telemetry enabled by default.

**Does not**

- Automate pages. Use Playwright, Puppeteer, Selenium, chromedp, Ferrum, or chromiumoxide.
- Patch fingerprints client-side. The engine owns every surfaced value.
- Inject scripts into the page, call `Runtime.enable`, or use `Emulation.*` to override identity.
- Rotate proxies or solve CAPTCHAs in the SDK. Both are profile and engine concerns.
- Download or update the browser. The Ombra app owns the browser installation; see [ombrabrowser.dev](https://ombrabrowser.dev).
- Hide retries or suppress errors. Launch is a visible, explicit operation.

## Stealth is a property of the engine

The SDKs are deliberately powerless over fingerprint values. That is the design, not a missing feature.

| Layer | Where Ombra handles it |
|---|---|
| TLS and HTTP/2 | Chromium's own network stack, version-matched to the engine build |
| Browser identity | Source-level engine patches driven by the profile seed |
| Automation surface | WebDriver scrub, CDP hygiene, no `Runtime.enable`, isolated helper world |
| Input | Humanized pointer, keyboard, and scroll inside the browser process |
| Network coherence | Proxy exit drives timezone, locale, and WebRTC candidates |
| State | One profile, one user-data directory, no cross-profile leakage |

The checkup that verifies these claims is documented in [docs/stealth-checkup.md](docs/stealth-checkup.md). It defines the targets, the gates, the status model, and the conditions under which a result is valid. Numbers without that context are marketing, not measurement.

### What every SDK must never do

These are release blockers, not style preferences:

1. Call `Runtime.enable`. It is the most common CDP leak and Ombra never needs it.
2. Inject stealth JavaScript — no `Page.addScriptToEvaluateOnNewDocument`, no `evaluateOnNewDocument`, no property shims.
3. Use `Emulation.setUserAgentOverride`, `setTimezoneOverride`, or `setDeviceMetricsOverride` to "correct" a profile.
4. Add `--enable-automation`, `--disable-blink-features=AutomationControlled`, or `--no-sandbox` behind the user's back.
5. Replace trusted input with `element.click()` or direct DOM value assignment on security-sensitive steps.
6. Randomize, derive, or override the profile seed. The seed is the user's identity contract.
7. Talk to the engine over anything except the returned CDP endpoint and the Local API.
8. Send profile data, proxy credentials, or telemetry to a remote service.

## Stealth checkup

The checkup is organized in layers, from the wire to behavior. A release candidate is not accepted on a single happy-path screenshot.

| Layer | Example targets | Hard gate |
|---|---|---|
| L0 Transport | TrackMe, IP/WebRTC leak checks | Exit IP only; JA4 and HTTP/2 match the engine's Chromium |
| L1 Identity | Local probe, Sannysoft, Intoli | No contradictions between UA, UA-CH, platform, GPU, fonts, screen |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | No headless or lie markers; stable across reloads |
| L3 Automation | rebrowser, brotector, botd | No `Runtime.enable`, init-script, or WebDriver leaks |
| L4 Behavior | Input fidelity, humanize traces, Cloudflare smoke | Trusted events, realistic ordering, challenge resolves |
| L5 Stability | Seed, workers, iframes, cross-origin | Same seed produces the same persona across launches |

Read the full runbook, scoring rules, triage table, and reporting template in [docs/stealth-checkup.md](docs/stealth-checkup.md). The Russian translation is [docs/stealth-checkup.ru.md](docs/stealth-checkup.ru.md).

## Repository map

```text
.
├── README.md                  # this file (English)
├── README.ru.md               # Russian translation
├── docs/
│   ├── architecture.md        # components, boundaries, launch flow
│   ├── sdk-contract.md        # v0 wire contract and SDK behavior
│   ├── stealth-checkup.md     # stealth validation method and runbook
│   ├── stealth-checkup.ru.md  # Russian translation
│   └── versioning.md          # contract, SDK, and engine compatibility
├── spec/
│   └── schemas/               # JSON Schema for wire payloads
├── sdks/
│   ├── manifest.json          # machine-readable SDK registry
│   ├── README.md              # layout and contribution rules
│   ├── _template/             # starting point for a new language
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # language-neutral cases and report schema
├── tools/check_repo.py        # structure and link validation (CI)
└── .github/workflows/ci.yml
```

The engine and the app live in separate repositories. This repository contains the SDK sources, the shared contract, the conformance cases, and the documentation that binds them together.

## The contract

- **Transport.** Loopback HTTP, default `http://127.0.0.1:45678`. `GET` and `POST` are equivalent for compatibility.
- **Envelope.** `{ "code": 0, "msg": "success", "data": { … } }`; `code: -1` on failure, usually with HTTP 200. SDKs must inspect the envelope, not the status code.
- **Naming.** Wire fields are `snake_case`; language surfaces follow local convention.
- **IDs.** Profile IDs are short strings. Do not assume numeric IDs.
- **Retries.** Only idempotent reads retry automatically. Launch is never retried; stop is idempotent and may be retried.
- **Versioning.** Breaking wire changes bump the contract minor while the contract is `0.x`; see [docs/versioning.md](docs/versioning.md).

## Compatibility

| Item | Target |
|---|---|
| Ombra app | Current build; the SDK treats the app as an external service |
| Engine | The build installed by the app; the SDK never selects a build |
| macOS | Apple Silicon and Intel |
| Windows | x64 |
| Linux | x64 |
| Local API | Loopback only; API key optional |

The SDK contract is versioned independently from both the app and the engine. An SDK refuses to start when its supported contract range does not include the contract it implements, and reports that mismatch as a typed error instead of degrading silently.

## Contributing

The fastest way to shape the SDKs is to open an issue with the API you wish existed. For code contributions, read [CONTRIBUTING.md](CONTRIBUTING.md), then start with a conformance case before writing a client.

- New language? Copy [sdks/_template](sdks/_template), add an entry to [sdks/manifest.json](sdks/manifest.json), and open a draft PR.
- Wire change? Update [docs/sdk-contract.md](docs/sdk-contract.md) and [spec/schemas](spec/schemas) first.
- Stealth change? The engine owns it; the SDK side must stay unchanged and pass the checkup.
- Security issue? Do not open a public issue — see [SECURITY.md](SECURITY.md).

## FAQ

**Is Ombra a Playwright replacement?**
No. Playwright, Puppeteer, Selenium, and chromedp remain your automation layer. Ombra replaces the browser and the profile lifecycle behind them, then hands you a CDP endpoint.

**Why not one SDK that every language wraps?**
Because a single native core would still need eight language bindings, plus a build matrix for every platform. A small wire contract is easier to audit, version, and port than a shared native library.

**Is the browser engine open source?**
No. The SDK sources in this repository are Apache-2.0. The Ombra engine and app are proprietary and distributed separately.

**Does it solve CAPTCHAs?**
The engine has an optional CAPTCHA module, enabled per profile. Support depends on the task type, build, and available models. It is not a guarantee, and it is not implemented in the SDK.

**Can I use my own proxy?**
Yes. Set it on the profile. The app routes profile traffic through it, and the engine derives timezone, locale, and WebRTC candidates from the exit.

**Is this legal?**
A browser is a browser. How you use it is your responsibility. Automate only systems you are authorized to access, and respect their terms and applicable law. The project does not endorse abuse.

**Will this pass every bot check?**
No honest project can promise that. Detection is an arms race, and results depend on the site, region, IP reputation, detector version, and profile coherence. Ombra gives you a reproducible checkup instead of a guarantee.

## License

SDK sources in this repository are licensed under the [Apache License 2.0](LICENSE). The license does not grant rights to the Ombra engine, the Ombra name, or the logo. See [NOTICE](NOTICE) for trademark and third-party attribution.

---

<div align="center">
  <sub>Built by <a href="https://github.com/ombralabs">Ombra Labs</a> · <a href="https://ombrabrowser.dev">ombrabrowser.dev</a></sub>
</div>
