<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Lisensya"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Pinakahuling Commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Mga Bituin"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Mga Download sa PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Mga Download sa npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Bersyon ng Release"></a>
</p>

<p align="center">
<a href="#pag-install"><strong>Pag-install</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-at-typescript-api">Node.js API</a> ·
<a href="#mala-taong-input">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Mga wika</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium na may C++ source-level na kontrol sa fingerprint at native na mala-taong input.</h3>

<table><tr><td>
Hindi ito koleksyon ng mga launch flag at hindi rin JavaScript injection sa ibabaw ng pahina. Isa itong totoong Chromium binary na may mga patch sa fingerprint na naka-compile mismo sa C++ source code at simulasyon ng input na tumatakbo sa loob ng proseso ng browser. Ikonekta ang opisyal na Playwright o Puppeteer sa pamamagitan ng lokal na CDP — walang mga wrapper object at walang kailangang baguhin sa code ng pahina.
</td></tr></table>

<br>

<p align="center">
Direktang pamalit sa pag-launch para sa Playwright at Puppeteer sa Python at Node.js.<br>
Parehong API, parehong mga selector at type — palitan lamang ang import at ang tawag sa <code>launch()</code>.
</p>

- **Mga patch sa antas ng source code ng Chromium** — canvas, WebGL, WebGPU, audio, mga font, GPU, screen, mga CSS media query, pag-uulat ng hardware, WebRTC nang walang STUN leak, TLS ClientHello, timezone, locale, at pag-alis ng mga palatandaan ng automation (`navigator.webdriver`, `Runtime.enable`, mga marker ng headless).
- **Native na mala-taong input sa proseso ng browser (`humanize=True`)** — mga trajectory ng pointer (`cursory-rs`), nakatutok na pag-click na may tagal ng pagpindot, ritmo ng pag-type na may kusang pagwawasto ng typo, at pisika ng pag-scroll na tumatakbo sa loob mismo ng Chromium. Direktang nagbabalik ang SDK ng purong native na `Browser` nang walang mga proxy wrapper.
- **Awtonomong pagtakbo nang walang key o account** — ang mga kasalukuyang build ng engine (`158.0.8127.37-2` at mas bago) at ang Ombra Desktop ay tumatakbo nang lokal nang walang sign-up, license key, hardware ID, o licensing server.
- **Awtomatikong pag-install at kriptograpikong pag-verify ng binary** — `pip install ombrabrowser` o `npm install @ombralabs/sdk`; sa unang pag-launch, dina-download ng SDK ang build para sa iyong platform at vine-verify ang Ed25519 signature at SHA-256 checksum nito.
- **Mga persistent na profile at ligtas na proxy relay** — pinananatili ng mga pinangalanang profile ang cookies, `localStorage`, IndexedDB, at `seed` sa bawat pagtakbo na may cross-process locking; ang mga authenticated na proxy (HTTP, HTTPS, SOCKS5) ay dumadaan sa isang lokal na loopback relay upang hindi kailanman lumabas ang mga kredensyal sa mga argumento ng proseso.
- **Offline na tagapamahala ng profile na Ombra Desktop** — isang native na desktop application sa repository na ito ([`desktop/`](../../desktop/README.md)) na may mga handa nang installer para sa macOS, Linux, at Windows.

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

Sinusuportahan din ang Puppeteer sa pamamagitan ng `import { launch } from "@ombralabs/sdk/puppeteer"` o `launchPuppeteer()` ([mga detalye](#puppeteer)).

**Para sa mga site na may proteksyong anti-bot**, pagsamahin ang isang residential proxy, isang persistent na profile, at magkakatugmang setting ng environment:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # mas mainam ang residential IP kaysa datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # itugma ang timezone at locale sa exit ng proxy
    headless=False,                                      # may mga site na nakakadetect ng pagkakaiba sa headless
    humanize=True,                                       # native na simulasyon ng mouse, keyboard, at scroll
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

Tingnan ang [Pag-troubleshoot](#pag-troubleshoot) para sa mga karaniwang isyu sa Linux, sa mga container, at sa mga protektadong target.

## Pag-install

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opsyonal: awtomatikong tukuyin ang timezone at locale mula sa exit ng proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Gamit ang Playwright (1.60.0+, hindi na kailangang mag-download ng stock na Chromium)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# O gamit ang Puppeteer
npm install @ombralabs/sdk puppeteer-core

# Opsyonal: offline na GeoIP database reader para sa timezone: "auto" at locale: "auto"
npm install mmdb-lib
```

---

Sa pag-launch, hinahanap ng SDK ang engine sa mahigpit na pagkakasunod-sunod: `binary_path` (`binaryPath` sa Node.js), `OMBRA_BINARY_PATH`, ang direktoryo ng engine ng Ombra Desktop, at ang cache ng SDK (`~/.ombra/engines`). Kung walang mahanap na tugmang engine, magda-download ang SDK ng build mula sa nilagdaang release channel, ive-verify ang Ed25519 signature at SHA-256 checksum nito, at ika-cache ito nang lokal. Hindi kailangang patakbuhin ang `playwright install chromium`.

Upang i-disable ang awtomatikong pag-download, ipasa ang `download=False` (`download: false` sa Node.js). Upang i-download at i-verify nang maaga ang engine (halimbawa habang nagbi-build ng container), tawagin ang `ensure_binary()` (`ensureBinary()`) o gamitin ang CLI command na `install`.

> **Awtonomong pag-launch:** libre ang mga kasalukuyang build ng engine (`158.0.8127.37-2` at mas bago) at hindi nangangailangan ng account o license key. Nananatiling available ang `OMBRA_LICENSE_KEY` at ang utos na `login` para lamang sa compatibility sa mga mas lumang lisensyadong build.

**Dalawang linya lamang ang kailangan sa paglipat mula sa Playwright** — nananatiling hindi nagbabago ang lahat ng operasyon sa pahina, mga locator, at mga wait:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # gumagana pa rin ang natitirang bahagi ng iyong code nang walang pagbabago
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **I-star** ang repository kung nakakatulong ito sa iyo, at **[Subaybayan ang mga release](https://github.com/ombralabs/ombra/subscription)** upang maabisuhan tungkol sa mga bagong build ng engine, SDK, at Ombra Desktop.

---

## Kasalukuyang status at mga release

Ang bawat bahagi sa ecosystem ay sumusunod sa pinagsasaluhang kontrata ng pag-launch at hiwalay na binibigyan ng bersyon.

| Bahagi | Status / bersyon | Lokasyon |
|---|---|---|
| **Kontrata ng SDK** | Draft `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.1.3` | [`ombrabrowser` sa PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.1.0` | [`@ombralabs/sdk` sa npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium engine** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Standalone browser** | `v158.0.8127.37-2` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-2) |
| **Mga schema at conformance** | JSON Schema + mga shared case | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Paraan ng stealth checkup** | 6 na layer (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Kasama sa mga kasalukuyang release:

- **Mga patch sa antas ng source code** — pagkuha ng magkatugmang fingerprint mula sa `seed`, pag-aayos ng WebGL / WebGPU at mga extension, makatotohanang mga talahanayan ng font bawat OS, native na TLS ClientHello profile (`chrome-<major>`), pagsugpo sa mga leak ng stack mula sa `Runtime.enable` at `UtilityScript`, at proteksyon laban sa WebRTC host IP leak.
- **Browser-level na `Ombra` CDP domain** — live na kontrol sa mala-taong input (`getHumanizeState`, `setHumanize`) sa Python at Node.js nang hindi nire-restart ang browser.
- **Native na simulasyon ng input sa proseso ng browser** — `cursory-rs` pointer planner, mga profile ng scroll para sa wheel at trackpad, ritmo ng pag-type na may kusang pagwawasto ng typo, at ligtas na pag-paste ng mahabang teksto sa pamamagitan ng hiwalay na clipboard.
- **Mga awtonomong build na walang key** — ang mga kasalukuyang build ng engine (`158.0.8127.37-2`) at Ombra Desktop `1.2.2` ay ganap na tumatakbo nang lokal nang walang account, key, o telemetry.
- **Pag-pin ng bersyon ng engine (`version`)** — i-pin ang eksaktong build gamit ang `launch(version="158.0.8127.37-2")`, `OMBRA_VERSION`, o ang CLI command na `install --version`.
- **Pinag-isang proxy relay** — mga HTTP, HTTPS, at SOCKS5 authenticated na proxy nang hindi inilalantad ang mga kredensyal sa command line ng Chromium, mga log, o metadata ng profile.
- **Mga persistent na pinangalanang profile** — nag-iimbak ng `seed`, cookies, `localStorage`, at IndexedDB sa ilalim ng `~/.ombra/profiles/<slug>` na may cross-process locking (`ProfileBusyError`).
- **Mga kriptograpikong pagsusuri sa supply chain** — pag-verify ng Ed25519 signature ng mga release envelope at pag-verify ng SHA-256 ng mga archive bago i-extract.

Tingnan ang [CHANGELOG.md](../../CHANGELOG.md) para sa kumpletong kasaysayan ng mga release.

## Bakit Ombra

- **Madaling masira ang mga patch sa antas ng config at JS.** Ang mga tool gaya ng `playwright-stealth`, `puppeteer-extra`, at `undetected-chromedriver` ay nag-i-inject ng JavaScript sa mga pahina o nag-aayos ng mga launch flag. Madalas silang nasisira ng mga update ng Chrome, at natutukoy mismo ng mga modernong detector ang mga patch (`Function.prototype.toString`, mga anomalya sa prototype, `addScriptToEvaluateOnNewDocument`).
- **Naka-compile ang mga pagbabago sa mismong source code ng Chromium.** Binubuo ang mga fingerprint sa antas ng C++ at pare-parehong inilalapat sa main frame, mga worker, at mga iframe. Walang ini-inject na script ang SDK sa mga pahina at hindi ito gumagawa ng mga `Emulation.*` override.
- **Nasa proseso ng browser ang simulasyon ng input, hindi nakapatong sa Playwright.** Dahil sa loob mismo ng Chromium pinangangasiwaan ang mga trajectory ng mouse, mga keystroke, at pag-scroll, hindi binabalot ng SDK ang mga object ng Playwright o Puppeteer — patuloy na gumagana nang normal ang bawat locator, frame, at third-party na library.
- **Lokal na arkitektura nang walang karagdagang serbisyo.** Walang background control-plane daemon at walang dagdag na network hop sa pagitan ng iyong script at ng browser: isang proseso ng engine, lokal na loopback CDP sa `127.0.0.1`, at walang limitasyon sa bilang ng profile o concurrency.

## Ombra Desktop

**Isang lokal at offline na tagapamahala ng profile na may GUI.** Direktang nasa repository na ito ang source code nito ([`desktop/`](../../desktop/README.md)) at ginawa ito gamit ang Tauri (Rust + Vue).

- **Ganap na offline at lokal** — nakaimbak ang catalog ng mga profile sa isang lokal na SQLite database sa iyong makina na may lokal na encryption key; hindi kailangan ng account, serbisyong cloud, o koneksyon sa network.
- **Organisadong pamamahala ng profile** — gumawa ng mga profile, maghanap ayon sa pangalan, tala, o numero, mag-edit ng mga paglalarawan, at ayusin ang mga entry gamit ang mga grupo, tag, label, at bookmark sa Rust catalog.
- **Ligtas na Trash** — kapag inilipat ang isang profile sa Trash, nananatili ang mga file nito sa disk upang maibalik mo ito sa ibang pagkakataon.
- **Walang limitasyon bawat profile** — walang mga tier bawat profile o cloud quota: nananatiling sa iyo ang lahat ng data.
- **Mga handa nang installer** — macOS Apple Silicon (`.dmg`, nilagdaan ng Apple Developer ID at notarized), Linux (`.deb` at `.rpm`), at Windows x64 (`setup.exe`).
- **Magkakahiwalay na catalog** — itakda ang `OMBRA_DESKTOP_DATA_DIR` upang gumamit ng hiwalay na test catalog o kopya ng backup.

[I-download ang `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [Gabay sa mga profile at lokal na key](../../docs/desktop/README.md)

## Pag-verify ng fingerprint at stealth checkup

Sa halip na magbigay ng malawakang pangakong "100% undetectable", nakabatay ang Ombra sa isang mauulit na pamamaraan ng pag-verify sa ilalim ng mga nakatalang kondisyon. Palaging nakadepende ang aktwal na resulta sa anumang site sa reputasyon ng exit IP, rehiyon, kasaysayan ng profile, bersyon ng detector, at konpigurasyon ng pag-launch.

### Mga surface na pinangangasiwaan ng engine at SDK

| Surface / signal | Stock na Playwright | Ombra | Implementasyon |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ engine patch |
| `window.chrome` | nawawala sa headless | kumpletong object | Katugma ng karaniwang Chrome |
| `navigator.plugins` | `0` sa headless | magkatugmang hanay ng plugin | Antas ng engine |
| User-Agent at Client Hints | `HeadlessChrome`, hindi tugmang brand | `Google Chrome` + magkatugmang `Sec-CH-UA*` | Patch `010-user-agent-and-webdriver` |
| Mga CDP artifact (`Runtime.enable`, `UtilityScript`) | napupuna ng mga detector | sinusugpo ng engine; hindi kailanman tumatawag ang SDK ng `Runtime.enable` | Patch `110-runtime-enable` + invariant `SI-02` |
| WebRTC IP leak | naglalantad ng lokal/host IP | nag-uulat ng exit IP nang hindi nagpapadala ng totoong STUN | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS at HTTP/2 | nakadepende sa setup | Chromium network stack + `chrome-<major>` ClientHello profile | Patch `210-tls-network-persona` |
| WebGL at WebGPU | software renderer / hindi tugmang GPU | pinag-isang limitasyon at talahanayan ng extension para sa WebGL/WebGPU | Mga patch na `070`, `071`, `075`, `955` |
| Mga font, locale, at timezone | mga halaga ng host, pagkakaiba sa `Intl` | magkakatugmang talahanayan ng font, ICU locale, at timezone | Mga patch na `040`, `090`, `092`, `230` |
| Simulasyon ng input | biglaang paglipat ng cursor, instant na `fill()` | mga kurba ng `cursory-rs`, ritmo ng pag-type, pisika ng pag-scroll | Patch `135-ombra-humanize` sa proseso ng browser |
| Katatagan ng fingerprint | nagbabago o naglalabas ng data ng host | deterministic bawat `seed` sa bawat restart at frame | Mga patch na `001`, `002` + persistent na profile |

### Anim na layer ng checkup

Bago mag-release o mag-deploy ng isang konpigurasyon, patakbuhin ang lahat ng anim na layer ng checkup laban sa eksaktong build ng engine, automation client, at proxy na gagamitin mo:

| Layer | Mga halimbawang target | Pamantayan sa pagpasa |
|---|---|---|
| **L0 Transport** | TrackMe, mga pahina ng IP/WebRTC leak, header echo | Tanging ang exit IP ng proxy ang nakikita; tugma ang JA4 at HTTP/2 sa build ng Chromium; walang kredensyal ng proxy sa argv |
| **L1 Identity** | Lokal na probe, Sannysoft, Intoli, pagsusuri ng UA-CH | Walang salungatan sa pagitan ng UA, Client Hints, platform, GPU, mga font, screen, at locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Walang headless o `lie` marker; nananatiling matatag ang fingerprint sa bawat pag-reload |
| **L3 Automation** | rebrowser, brotector, botd, audit ng mga utos ng CDP | Walang leak ng `Runtime.enable`, init-script, binding, o `navigator.webdriver` |
| **L4 Behavior** | Probe ng katumpakan ng input, mga trace ng humanize, live challenge smoke | Mga event na may `isTrusted: true`, natural na pagkakasunod-sunod at tiyempo, makatotohanang kurba ng pointer at pag-scroll |
| **L5 Stability** | Paulit-ulit na pag-launch, mga worker, same/cross-origin iframe, pagkakapareho sa iba't ibang SDK | Ang parehong `seed` ay nagbubunga ng eksaktong parehong fingerprint sa lahat ng context |

Kumpletong pamamaraan, mga status (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), checklist ng mga signal, at template ng ulat: [Ingles (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) at [Russian (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Paghahambing

| Tampok | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| Automation API | Playwright | Playwright | Selenium | **Playwright at Puppeteer** |
| Antas ng patch | Wala | JS injection sa loob ng pahina | Mga config flag | **C++ source (Chromium)** |
| Magkatugmang fingerprint `seed` | Hindi | Hindi | Bahagya | **Oo, bawat profile at eTLD+1** |
| Simulasyon ng input (`humanize`) | Hindi | Hindi | Hindi | **Naka-built-in sa proseso ng browser** |
| Pagsugpo sa leak ng `Runtime.enable` / CDP | Hindi | Hindi | Bahagya | **Engine patch + mga invariant ng SDK** |
| Mga authenticated na proxy nang walang CLI leak | Hindi | Hindi | Limitado | **Lokal na loopback relay** |
| Pagbubukod ng profile | Browser context | Browser context | Hindi | **Direktoryo ng profile + file lock** |
| Offline na tagapamahala ng profile (GUI) | Hindi | Hindi | Hindi | **Ombra Desktop (macOS, Linux, Windows)** |
| Paglipat mula sa Playwright | — | Pagpalit ng import | Muling pagsulat ng code | **Pagpalit ng import at `launch()`** |

## Paano ito gumagana

```mermaid
flowchart LR
    Script["Ang iyong script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP bridge"]
    Relay["Lokal na proxy relay<br/>kapag kailangan ng auth"]
    Engine["Ombra Chromium<br/>engine na may C++ patch"]
    Client["Native na client<br/>Playwright · Puppeteer"]
    Profile[("Profile<br/>seed · cookies · storage")]

    Script -->|"launch()"| SDK
    SDK -->|"i-verify + i-spawn"| Engine
    SDK -.->|"auth ng proxy"| Relay
    Relay -.-> Engine
    SDK -->|"kumonekta sa CDP"| Client
    Script -->|"page API"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **Hinahanap o dina-download ng `launch()` ang engine** at vine-verify ang Ed25519 signature at SHA-256 checksum nito.
2. **Inihahanda ang profile at `seed`.** Kumukuha ng cross-process lock ang pinangalanang profile; kung nangangailangan ng mga kredensyal ang proxy, magsisimula ang SDK ng isang in-memory na loopback relay.
3. **Nagsisimula ang Ombra Chromium** gamit ang napiling profile, mga opsyon sa fingerprint, at isang lokal na debugging port (`--remote-debugging-port=0`).
4. **Kumokonekta ang opisyal na client.** Kapag lumitaw ang `DevToolsActivePort`, ikinakabit ng SDK ang Playwright (nang may `no_defaults=True`) o Puppeteer sa pamamagitan ng `127.0.0.1` at ibinabalik ang native na `Browser` object.
5. **Malinis na pag-shutdown.** Nagpapadala ang `browser.close()` ng `Browser.close`, tinatapos ang process tree ng engine, hinihinto ang relay, at pinapakawalan ang lock ng profile.

Pagkatapos ng pag-launch, umaalis na ang SDK sa landas ng data: direktang naglalakbay ang lahat ng utos sa pahina mula sa Playwright o Puppeteer patungo sa Chromium.

### Mga hangganan ng SDK at stealth invariants

Nagpapatupad ang [v0.1 SDK contract (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) ng mahihigpit na invariant sa bawat opisyal na SDK:

- **Walang mga stealth script sa mga pahina.** Hindi kailanman tumatawag ang SDK ng `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` at hindi nagpa-patch ng mga property ng DOM.
- **Walang `Runtime.enable`.** Ang mga pagsusuri sa kahandaan ay gumagamit lamang ng lokal na CDP HTTP endpoint o `Browser.getVersion`; hindi kailanman ine-enable ng SDK ang `Runtime`, `Debugger`, o `Log`.
- **Walang mga `Emulation.*` override.** Hindi kailanman tumatawag ang SDK ng `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, o `setDeviceMetricsOverride` — nagmumula mismo sa engine ang pagkakakilanlan ng browser.
- **Walang mga ipinagbabawal na flag bilang default.** Hindi kailanman nagdadagdag nang kusa ang SDK ng `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`, o `--user-agent`.
- **Loopback CDP lamang.** Palaging naka-bind ang debug port sa `127.0.0.1`; tinatanggihan ang pagpasa ng hindi loopback na `--remote-debugging-address`.
- **Walang telemetry at walang leak ng mga lihim na data.** Binubura (redacted) sa mga log at mensahe ng error ang mga kredensyal ng proxy, key, at cookies.

## Python API

### `launch()`

```python
from ombrabrowser import launch

# Pangunahing pag-launch (headless bilang default)
browser = launch()

# Browser window na may GUI (headed)
browser = launch(headless=False)

# HTTP o SOCKS5 proxy (pinangangasiwaan ang mga kredensyal sa lokal na loopback relay)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Proxy object na may bypass list
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

# Mga kontrol sa fingerprint (seed, OS, auto timezone/locale mula sa proxy, screen, GPU)
# Para sa timezone="auto" / locale="auto", i-install: pip install "ombrabrowser[geoip]"
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

# Native na simulasyon ng mouse, keyboard, at scroll
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# I-pin ang eksaktong build ng engine at magpasa ng karagdagang Chromium flags
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Nagbabalik ng karaniwang `playwright.sync_api.Browser`. Gumagana nang normal ang lahat ng method ng Playwright (`new_page()`, `new_context()`, `close()`, atbp.). Naka-default ang mga bagong pahina sa `no_viewport=True` upang hindi mapalitan ang sukat ng window ng profile.

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

### `launch_context()` at `launch_context_async()`

Maginhawang helper na nagla-launch ng browser at direktang nagbabalik ng `BrowserContext` (tinatapos din ng pagsara ng context ang proseso ng engine). Ipinapasa ang mga karagdagang keyword argument sa `browser.new_context()` — gaya ng `storage_state`, `permissions`, o `extra_http_headers`:

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

Katumbas na async: `await launch_context_async(...)`.

### `launch_persistent_context()` at `launch_persistent_context_async()`

Nagla-launch ng browser na may persistent na profile at ibinabalik ang default na `BrowserContext` nito. Napananatili ang cookies, `localStorage`, IndexedDB, cache, at ang fingerprint `seed` sa bawat session.

- Ang pagpasa ng `profile="pricing-eu"` ay lumilikha ng profile sa ilalim ng `~/.ombra/profiles/pricing-eu` na may metadata sa `.ombra/profile.json` at isang lock file.
- Ang pagpasa ng `user_data_dir="./my-profile"` (o positional path argument) ay gumagamit ng tahasang direktoryong iyon.
- Ang sabayang pag-launch ng parehong profile mula sa ibang proseso ay naglalabas ng `ProfileBusyError` sa halip na sirain ang data ng profile.

```python
from ombrabrowser import launch_persistent_context

# Gamit ang pinangalanang profile (nakaimbak sa ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # napananatili ang cookies, storage, at seed

# Gamit ang tahasang path (halimbawa, para mag-load ng mga extension sa Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Katumbas na async: `await launch_persistent_context_async(...)`.

### Mga utility function at diagnostics (Python)

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

# Suriin ang natukoy na engine binary
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# I-download at i-verify ang engine nang hindi nagla-launch ng browser
ensure_binary(version="158.0.8127.37-2")

# Alisin ang mga engine binary na pinamamahalaan ng SDK (hindi ginagalaw ang mga profile sa ~/.ombra/profiles)
clear_cache()

# Suriin ang nabuong utos ng pag-launch nang hindi nag-i-spawn ng Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Basahin ang runtime metadata (CDP port, ws_url, seed, pid) at i-verify ang kalusugan ng proseso
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # i-download at i-verify ang engine (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-2  # mag-install ng partikular na build ng engine
ombrabrowser info                                # diagnostics ng environment, binary, at dependency (alias: doctor)
ombrabrowser info --quick --json                 # mabilis na machine-readable na ulat nang hindi pinapatakbo ang binary
ombrabrowser info --proxy socks5://user:pass@host:1080  # subukan ang pagtukoy ng exit IP, timezone, at locale sa pamamagitan ng proxy
ombrabrowser update                              # suriin ang release channel at i-update ang naka-cache na engine
ombrabrowser clear-cache                         # burahin ang mga naka-cache na engine binary (pinapanatili ang mga profile)
ombrabrowser login                               # i-save ang license key sa ~/.ombra/license.key (para sa mga lumang build lamang)
ombrabrowser logout                              # alisin ang naka-save na license key
```

Available din ang parehong mga utos sa pamamagitan ng `python -m ombrabrowser <command>`.

## Node.js at TypeScript API

Nagpapadala ang `@ombralabs/sdk` ng dual ESM + CommonJS build na may kumpletong TypeScript definitions (`.d.ts`). Parehong tumatakbo ang Playwright at Puppeteer sa iisang engine sa ilalim.

### Playwright (default)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Pangunahing pag-launch na may proxy, fingerprint, at simulasyon ng input
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

// Maginhawang pag-launch: browser + context sa isang tawag
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Persistent na profile — napananatili ang cookies, localStorage, at seed sa bawat pagtakbo
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Standalone ang bawat snippet sa itaas. Upang ilipat ang isang kasalukuyang Playwright launcher, maaari mo ring palitan ang import ng `import * as chromium from "@ombralabs/sdk"` at panatilihin ang `await chromium.launch(...)`.

### Puppeteer

Gamitin ang `launchPuppeteer()` mula sa `@ombralabs/sdk` o mag-import mula sa `@ombralabs/sdk/puppeteer`:

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

> **Paalala tungkol sa Puppeteer:** Mas maraming default na trapiko ng CDP ang ipinapadala ng Puppeteer kaysa sa Playwright na gumagamit ng `connectOverCDP({ noDefaults: true })`. Para sa mga site na may mahigpit na pagsusuri sa CDP, inirerekomenda ang Playwright.

### Mga utility at CLI (Node.js)

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
await ensureBinary({ version: "158.0.8127.37-2" });
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

## Mala-taong input

Sa Ombra, ang simulasyon ng input (`humanize`) ay **native na naka-compile sa proseso ng browser ng Chromium** (pinapagana ng `cursory-rs` at ng input scheduler ng engine) sa halip na ipinatupad bilang isang JS wrapper sa paligid ng automation client. Ibig sabihin nito:

- Bawat karaniwang aksyon ng Playwright at Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) ay dumadaan sa iisang per-tab input queue sa loob ng browser.
- Ang mga parameter ng pag-uugali ay deterministic na kinukuha mula sa `seed` ng profile (`--fingerprint-humanize-seed`).
- Hindi kailanman binabalot ng SDK ang `Page` o `Browser` sa mga proxy class — nananatiling buo ang mga native type at kilos ng client.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Ang nagbabago kapag may `humanize=True`:**

| Aksyon | Nang walang `humanize` | May `humanize=True` |
|---|---|---|
| Paggalaw ng mouse | Biglaang teleport | Mga kurba ng `cursory-rs` na may acceleration, mga paghinto, at bahagyang overshoot |
| Mga pag-click at pag-drag | Biglaang pindot | Puntiryang punto sa loob ng target, paghinto bago mag-click, at tagal ng pagpindot |
| Pag-type ng teksto | Agarang pagtatakda ng halaga | Pag-type bawat karakter ayon sa nakatakdang ritmo at layout ng keyboard, paminsan-minsang typo at kusang pagwawasto; ang napakahabang teksto ay ipine-paste gamit ang hiwalay na clipboard nang hindi ginagalaw ang system clipboard |
| Pag-scroll | Isang biglaang talon | Sunod-sunod na wheel/trackpad event na sumusunod sa nasukat na mga profile ng deceleration |
| Mga sandaling walang ginagawa (idle) | Nakahintong cursor | Sa preset na `careful`, banayad na paggalaw ng cursor sa pagitan ng mga aksyon |

**Mga preset** — `default` (normal na bilis), `careful` (mas mabagal, maingat, may maliliit na idle na galaw), at `fast` (mas mabilis na ritmo). Ipasa ang `humanize=False` (`humanize: false`) upang tahasang i-disable ang simulasyon ng input.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Maaari mong i-toggle ang mode o magpalit ng mga preset habang tumatakbo (runtime) nang hindi nire-restart ang browser sa pamamagitan ng `Ombra` CDP domain:

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

## Pamamahala ng fingerprint at profile

Kumukuha ang engine ng isang magkatugmang konpigurasyon ng browser mula sa iisang `seed`. Kapag hindi ibinigay ang `seed`:

| Senaryo | Pag-uugali |
|---|---|
| **`launch()` nang walang profile** | Gumagawa ang SDK ng random na `seed` para sa session at lumilikha ng pansamantalang direktoryo na binubura pagkatapos ng `close()`. |
| **`profile="name"` o `user_data_dir="./dir"`** | Sine-save ang `seed` sa `.ombra/profile.json` at muling ginagamit sa bawat pag-launch — nakikita ng mga site ang isang bumabalik na bisita na may parehong device at cookies. |
| **`fingerprint={"seed": N, ...}`** | Deterministic na fingerprint mula sa tahasang `seed`; ino-override ng mga karagdagang field ang mga indibidwal na setting habang pinapanatiling magkatugma ang iba pa. |

Ang ingay (noise) sa canvas/audio ay naka-key sa bawat `eTLD+1` (matatag sa parehong site, hindi mapag-uugnay sa iba't ibang site). Ang pixel noise para sa 2D canvas at WebGL `readPixels` ay naka-disable bilang default upang maiwasang ma-trigger ang mga detector ng "Canvas Tampering / Masking", at maaaring tahasang i-enable sa pamamagitan ng `--fingerprint-pixel-noise`.

> **Tip:** kapag muling bumibisita sa parehong site, gumamit ng persistent na profile (`profile="name"` o `launch_persistent_context()`) sa halip na magpasa ng nakapirming `seed` sa isang pansamantalang `launch()` — sa ganoong paraan, nananatiling magkakatugma ang cookies, cache, at `localStorage` kasabay ng fingerprint.

### Mga field ng `fingerprint` object

Sumusunod sa Python (`snake_case`) ang mga pangalan ng field sa ibaba; tumatanggap ang Node.js ng parehong `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) at `snake_case`:

| Field | Uri | Paglalarawan |
|---|---|---|
| `seed` | `int` (`>= 0`) | Generator seed na nagtatakda ng pangkalahatang konpigurasyon ng fingerprint |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Target na OS (`navigator.platform`, UA, mga pool ng GPU at font) |
| `os_version` | `string` | Pahiwatig ng bersyon ng OS para sa Client Hints |
| `timezone` | IANA zone o `"auto"` | Timezone (hal. `"Europe/Berlin"`). Tinutukoy ng `"auto"` ang zone mula sa exit ng proxy sa pamamagitan ng GeoIP |
| `locale` | BCP-47 o `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). Tinutukoy ng `"auto"` ang locale mula sa exit ng proxy |
| `screen` | `{"width", "height"}` o `"auto"` | Mga sukat ng screen at work-area na isinasaalang-alang ang taskbar / menu bar ng target na OS |
| `gpu` | `{"vendor", "renderer"}` o `"auto"` | Tahasang mga string ng WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` o `"auto"` | Inuulat na `navigator.hardwareConcurrency` |
| `device_memory` | `int` o `"auto"` | Inuulat na `navigator.deviceMemory` (sa GB) |
| `noise` | `bool` | I-enable/i-disable ang fingerprint noise (ipinapasa ng `False` ang `--disable-fingerprint-noise`) |

> Panatilihin ang `seed` bilang pangunahing pinagmulan ng mga parameter ng fingerprint: ang pag-override ng mga indibidwal na halaga nang hindi pinapanatiling magkatugma ang mga ito (gaya ng pagpapares ng isang OS sa hindi tugmang GPU) ay maaaring magdulot ng mga salungatan para sa mga detector.

### Karagdagang mga engine flag (`args`)

Mga flag na sinusuportahan ng engine na hindi awtomatikong itinatakda ng SDK (ipasa sa pamamagitan ng `args=[...]`):

| Flag | Layunin |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Brand ng browser sa `Sec-CH-UA` (naka-default ang SDK sa `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | TLS ClientHello profile na katugma ng tinukoy na major version ng Chrome (awtomatikong itinatakda ng SDK mula sa bersyon ng engine) |
| `--webrtc-ip=<ip>` | Pamalit na IP address sa mga WebRTC ICE candidate nang hindi nagpapadala ng totoong trapiko ng STUN |
| `--fingerprint-location=<lat,lon>` | Mga coordinate na inuulat ng `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Storage quota na inuulat ng `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Bilang ng mga touch point (`navigator.maxTouchPoints` at mga pointer media query) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Pixel density ng display (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Color depth ng screen |
| `--disable-gpu-fingerprint` | Direktang gamitin ang totoong GPU ng host (mga string, limitasyon, at extension ng WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | Direktang gamitin ang totoong mga string ng GPU habang pinapanatili ang iba pang setting ng profile |
| `--disable-fingerprint-noise` | I-disable ang noise sa canvas/WebGL/audio habang pinapanatiling aktibo ang mga parameter ng pagkakakilanlan |
| `--fingerprint-pixel-noise` | I-enable ang opt-in na idempotent pixel noise para sa 2D canvas at `readPixels` |
| `--profile-label=<text>` | Label ng profile na ipinapakita sa address bar ng browser (para sa UI lamang; hindi nakikita ng mga web page) |

### Pag-setup ng font sa Linux

Madalas kulang sa mga emoji at CJK font ang mga minimal na Linux server at container, na nagiging sanhi upang magbunga ng hindi pangkaraniwang hash ang pag-render ng nakatagong canvas text at emoji.

**1. Pangunahing layer (emoji at CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Mga font ng Windows para sa mga Windows profile (`os="windows"`):**
Kapag nagpapatakbo ng konpigurasyon ng Windows sa Linux, malaki ang naitutulong sa pagkakapare-pareho ng font enumeration kapag nag-install ng mga totoong font mula sa `C:\Windows\Fonts\` (kabilang ang `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`):

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Mga font ng macOS para sa mga macOS profile (`os="macos"`):**
Gayundin, kapag gumagamit ng `os="macos"` sa Linux, kopyahin ang mga font mula sa `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/`, at `/Library/Fonts/` patungo sa `~/.local/share/fonts/mac/` at patakbuhin ang `fc-cache -f`.

Sa isang `Dockerfile`, ilagay ang mga font sa direktoryo ng system na `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Mga opsyon sa pag-launch, konpigurasyon, at mga error

### Mga opsyon sa `launch()`

Sumusunod ang mga pangalan ng opsyon sa Python API at sa [kontrata ng SDK](../../docs/sdk-contract.md); gumagamit ang Node.js ng mga katumbas na `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) at tumatanggap din ng mga alias na `snake_case`. Tinatanggihan ang mga hindi kilalang opsyon nang may `InvalidOptionError`.

| Opsyon | Default | Paglalarawan |
|---|---|---|
| `headless` | `true` | Patakbuhin nang walang window (`--headless=new`) |
| `proxy` | wala | URL ng proxy (`http`, `https`, `socks5`) o object; gumagamit ng loopback relay ang mga authenticated na proxy |
| `fingerprint` | wala | Mga setting para sa `seed`, OS, timezone, locale, screen, GPU, memory, at noise |
| `profile` | wala | Pinangalanang persistent na profile sa ilalim ng `~/.ombra/profiles/<slug>` (hindi maaaring isabay sa `user_data_dir`) |
| `user_data_dir` | temp | Tahasang path ng direktoryo ng profile (hindi maaaring isabay sa `profile`) |
| `args` | `[]` | Mga karagdagang argumento ng Chromium (ipinapasa nang walang pagbabago) |
| `binary_path` | awtomatikong tinutukoy | Tahasang path patungo sa isang engine executable |
| `version` | env / auto | Pag-pin ng bersyon ng engine (halimbawa, `158.0.8127.37-2`), nangingibabaw sa `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Palugit para sa pagsisimula ng engine at pagkonekta sa CDP (1000–600000 ms) |
| `humanize` | default ng engine | `False`, `True`, o `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / file | Key para sa mga lumang lisensyadong build (hindi kailangan sa `158.0.8127.37-2+`; hindi kailanman inilalagay sa log) |
| `env` | `{}` | Mga karagdagang environment variable para sa proseso ng engine |
| `download` | `True` | Pahintulutan ang awtomatikong pag-download ng nawawalang engine binary |

### Mga environment variable

Pagkakasunod-sunod ng priyoridad: **tahasang opsyon sa pag-launch → environment variable → metadata ng profile → default**.

| Variable | Default | Paglalarawan |
|---|---|---|
| `OMBRA_BINARY_PATH` | hindi nakatakda | Tahasang path patungo sa isang engine binary |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Direktoryo para sa mga naka-cache na engine at pinangalanang profile |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Base URL / mirror para sa mga pag-download ng engine (idi-disable ng `none`/`off` ang pag-download) |
| `OMBRA_VERSION` | pinakabagong tugma | Naka-pin na bersyon ng engine (halimbawa, `158.0.8127.37-2`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Release channel ng engine: `stable` o `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Suriin kung may mas bagong build ng engine sa pag-launch |
| `OMBRA_SKIP_CHECKSUM` | `false` | Para sa lokal na development lamang: idi-disable ang pag-verify ng SHA-256 (naglalagay ng babala sa log) |
| `OMBRA_LICENSE_KEY` | hindi nakatakda | Key para sa mga lumang lisensyadong build (hindi kailanman inilalagay sa log) |
| `OMBRA_TIMEOUT_MS` | `30000` | Default na timeout ng pag-launch (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Antas ng detalye ng log: `error`, `warn`, `info`, `debug` |

### Mga typed error

Sa anumang pagkabigo, tinatapos ng SDK ang na-spawn na proseso ng engine, pinapakawalan ang lock ng profile, at naglalabas ng isang subclass ng `OmbraError` na may matatag na `kind` at `details` na walang nakalantad na lihim na data:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Nakadokumento ang kumpletong klasipikasyon ng error at mga panuntunan sa muling pagsubok sa [kontrata ng SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Mga platform, integrasyon, at container

### Mga sinusuportahang platform at runtime

| Bahagi | Suporta | Mga Tala |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Awtonomong build na `158.0.8127.37-2`; nilagdaan ng Developer ID at notarized ang Ombra Desktop |
| **macOS x64 (Intel)** | — | Walang kasalukuyang release ng Chromium 158 |
| **Linux x64** | ✅ | Awtonomong build na `158.0.8127.37-2`; nangangailangan ng `xz-utils` (`xz`) upang i-extract ang `.tar.xz` |
| **Windows x64** | ✅ | Awtonomong build na `158.0.8127.37-2` at installer ng Ombra Desktop |
| **Python** | `3.10+` | Awtomatikong nai-install ang Playwright `>=1.60,<2.0` kasama ng `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` o Puppeteer `>=22` (nangangailangan ang Puppeteer 25+ ng Node.js `>=22.12`) |

### Mga integrasyon sa framework at AI agent

Gumagana ang Ombra sa anumang automation tool o AI agent framework na tumatanggap ng custom na Chromium binary o kumokonekta sa pamamagitan ng CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain`, at iba pa):

```python
# Opsyon 1: tukuyin ang na-verify na path ng binary at mga argumento ng engine para sa sarili mong runner
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opsyon 2: mag-launch sa pamamagitan ng Ombra SDK at ibigay ang lokal na CDP endpoint sa iyong framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Ikonekta ang iyong framework sa ws_url o cdp_http — tumatakbo sa loob ng engine ang
# mga setting ng fingerprint at humanize at nananatiling aktibo para sa sinumang CDP client
```

### Pagpapatakbo sa Docker at mga Linux server

Halimbawang `Dockerfile` na nagda-download at nagve-verify nang maaga ng engine habang bini-build ang image:

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

> **Mga container at web server:**
> - Kung hindi makapag-initialize ng Chromium sandbox ang iyong container, ipasa nang tahasan ang `--no-sandbox` gamit ang `args=["--no-sandbox"]` (hindi kailanman kusa itong idinadagdag ng SDK).
> - Upang patakbuhin nang may `headless=False` sa isang headless server, gumamit ng `Xvfb` (tingnan sa [ibaba](#pag-troubleshoot)).
> - Kapag nagpapatakbo sa ilalim ng `uvicorn` na may `uvloop`, ipasa ang `--loop asyncio` upang maiwasan ang pag-hang ng subprocess pipe.

## Pag-troubleshoot

### Hinaharang ng site ang headless mode

Sinusuri ng ilang sistemang anti-bot ang mga pagkakaiba sa pag-uugali at pag-render sa headless mode kahit na may mga C++ patch. Patakbuhin nang may `headless=False` sa isang virtual display gamit ang `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Pagkatapos ay mag-launch gamit ang residential SOCKS5/HTTP proxy, persistent na profile, tugmang timezone/locale, `headless=False`, at `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Kung nagpapatuloy ang pagharang sa Linux, suriin ang [Pag-setup ng font sa Linux](#pag-setup-ng-font-sa-linux).

### Naghahamon ng beripikasyon ang site sa bawat pagbisita

Ang pagtawag sa `launch()` nang walang `profile` ay nagsisimula sa isang walang lamang pansamantalang direktoryo at bagong `seed` sa bawat pagkakataon, kaya itinuturing ng site ang bawat pagtakbo bilang isang ganap na bagong bisita na walang cookies. Lumipat sa `profile="..."` o `launch_persistent_context(...)` upang madala ang cookies, `localStorage`, at `seed` sa bawat pagtakbo.

### `ProfileBusyError`

Isang proseso lamang ang maaaring magbukas nang sabay ng isang pinangalanang profile o `user_data_dir`. Magtalaga ng natatanging pangalan ng profile para sa bawat parallel worker (`profile=f"worker-{i}"`). Awtomatikong natutukoy at nililinis ang mga naiwang lock mula sa mga nag-crash na proseso.

### Kailangan ko bang patakbuhin ang `playwright install chromium`?

Hindi. Pinatatakbo ng Ombra ang sarili nitong engine binary at hindi gumagamit ng stock na Chromium ng Playwright. Sa Linux, mga system library at `xz-utils` lamang ang kailangan mo:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Pag-update, paglipat ng channel, at pag-roll back ng engine

I-update ang SDK sa pinakabagong release:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Subukan ang `beta` channel o i-pin/i-roll back sa isang eksaktong build ng engine:

```python
# I-pin ang eksaktong build para sa isang partikular na pag-launch
browser = launch(version="158.0.8127.37-2")
```

```bash
# O i-configure sa pamamagitan ng mga environment variable / CLI
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# O ituro sa isang lokal na na-build na binary
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Hinaharang ng Gatekeeper ang lokal na build

Ang mga opisyal na release ng Ombra para sa Apple Silicon macOS ay nilagdaan gamit ang Apple Developer ID certificate at notarized. Kung nagpapatakbo ka ng lokal na hindi nilagdaang developer build at inilagay ito ng macOS sa quarantine, alisin nang isang beses ang quarantine attribute:

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### Paghihintay sa isang pahina sa synchronous Python

Sa synchronous Playwright, ang iisang mahabang `time.sleep(15)` pagkatapos ng `page.goto()` ay nagpapahinto sa event loop ng Playwright, na maaaring magpatigil sa mga pahina ng beripikasyon. Sa halip, maghintay nang maiikling pagitan na may magaan na tawag sa context:

```python
import time

for _ in range(15):
    page.context.cookies()  # pinananatiling gumagana ang Playwright nang hindi ginagalaw ang DOM ng pahina
    time.sleep(1)
```

Sa async Python, gamitin ang `await asyncio.sleep(...)`; sa Node.js, gamitin ang `await new Promise(r => setTimeout(r, ms))`. Iwasan din ang madalas na `page.wait_for_timeout()` at mga hindi kinakailangang tawag sa `page.evaluate()` bago ang mga pagsusuri upang hindi makagawa ng karagdagang trapiko ng CDP.

## Seguridad

- **Pagiging tunay at integridad ng engine.** Bago i-extract, vine-verify ng SDK ang Ed25519 signature ng release envelope gamit ang isang naka-pin na public key at sinusuri ang SHA-256 digest ng parehong archive at executable.
- **Lokal na CDP lamang.** Mahigpit na naka-bind ang debug port sa `127.0.0.1`. Huwag kailanman ilantad ang isang CDP port sa pampublikong network nang walang karagdagang pagpapatotoo — nagbibigay ang CDP ng ganap na kontrol sa browser.
- **Pagbubukod ng mga lihim na data.** Nananatili lamang sa memorya ng lokal na loopback relay ang mga kredensyal ng proxy at hindi kailanman lumalabas sa mga command line ng proseso, metadata ng profile, mga log, o detalye ng error.
- **Walang telemetry.** Walang ipinapadalang analytics, crash report, o mga nakatagong network ping ang SDK.

Iulat nang pribado ang mga isyu sa seguridad alinsunod sa [SECURITY.md](../../SECURITY.md).

## Mapa ng repository

```text
.
├── README.md                    # Pangunahing README (English)
├── translations/
│   ├── fil/README.md            # ang file na ito (Filipino)
│   └── <locale>/README.md       # 20 karagdagang lokalisasyon
├── desktop/                     # Ombra Desktop (Tauri: Rust catalog + Vue UI)
├── docs/
│   ├── architecture.md          # arkitektura, mga trust boundary, lifecycle
│   ├── sdk-contract.md          # v0.1 na kontrata ng pag-launch, mga opsyon, error, invariant
│   ├── stealth-checkup.md       # paraan ng checkup (Ingles)
│   ├── stealth-checkup.ru.md    # paraan ng checkup (Russian)
│   ├── versioning.md            # pagbebersyon ng SDK, engine, at client
│   └── desktop/                 # mga gabay sa lokal na profile at key ng Desktop
├── spec/
│   └── schemas/                 # mga JSON Schema para sa mga opsyon sa pag-launch at metadata ng binary
├── sdks/
│   ├── manifest.json            # machine-readable na registry ng SDK
│   ├── README.md                # istruktura ng SDK at mga panuntunan sa pag-ambag
│   ├── python/                  # Python SDK (inilathala bilang ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (inilathala bilang @ombralabs/sdk)
│   └── ...                      # mga scaffold ng kontrata para sa ibang wika (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # mga kaso para sa cross-language na pag-launch at stealth invariant
├── tools/check_repo.py          # tagapag-validate ng istruktura, schema, at link (CI)
└── .github/workflows/ci.yml
```

Matatagpuan sa repository na ito ang kontrata ng SDK, mga schema, mga kaso ng conformance, dokumentasyon, at ang source code ng Ombra Desktop. Pinananatili sa hiwalay na repository ang mga patch ng Chromium engine, at inilalathala ang mga na-compile na build sa pamamagitan ng download channel at [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## Mga Madalas Itanong (FAQ)

### Fork ba ito ng Playwright?

Hindi. Ikinokonekta ng SDK ang opisyal na client ng Playwright (o Puppeteer) sa Ombra Chromium sa pamamagitan ng lokal na CDP. Nananatiling karaniwan ang lahat ng type, locator, wait, at page object.

### Libre ba ang Ombra, at kailangan ko ba ng license key?

Open source ang source code ng SDK sa repository na ito sa ilalim ng Apache License 2.0. Libre at awtonomong tumatakbo ang mga kasalukuyang build ng engine (`158.0.8127.37-2` at mas bago) at ang lokal na tagapamahala ng profile na Ombra Desktop (`desktop-v1.2.2`) — nang walang account, license key, hardware ID, o limitasyon sa bilang ng profile. Kailangan lamang ang `license_key` at `OMBRA_LICENSE_KEY` para sa mga mas lumang lisensyadong build.

### Kailangan ko bang i-install ang Ombra Desktop para magamit ang SDK?

Hindi. Direktang nag-i-spawn ang SDK ng engine bilang isang child process, kaya angkop ito para sa mga script, container, at CI. Opsyonal ang Ombra Desktop kung gusto mong pamahalaan ang isang lokal na catalog ng profile sa pamamagitan ng GUI.

### Paano naiiba ang Ombra sa `playwright-stealth`?

Nag-i-inject ang `playwright-stealth` ng JavaScript sa mga pahina sa ibabaw ng karaniwang browser, at madalas na natutukoy ng mga modernong detector ang mismong mga patch. Kino-compile ng Ombra ang mga pagbabago nito sa mismong source code ng Chromium, at walang ini-inject na script ang SDK sa mga pahina.

### Maaari ko bang gamitin ang sarili kong proxy?

Oo. Magpasa ng `http://`, `https://`, o `socks5://` na proxy sa `proxy`. Kapag may mga kredensyal, nagpapatakbo ang SDK ng lokal na loopback relay upang hindi kailanman lumabas ang mga ito sa mga argumento ng proseso. Tandaan na maaaring laktawan ng sariling `context.request` / `page.request` client ng Playwright ang mga setting ng proxy sa antas ng browser — upang matiyak na dadaan sa proxy ang trapiko, tumawag ng `fetch()` mula sa context ng pahina.

### Aling mga bersyon ng Playwright at Puppeteer ang sinusuportahan?

Nangangailangan ang Python SDK ng Playwright `>=1.60,<2.0` (awtomatikong nai-install kasama ng `ombrabrowser`). Sinusuportahan ng Node.js SDK ang `playwright-core@^1.60.0` o `puppeteer-core >=22.0.0`. Tingnan ang [gabay sa pagbebersyon](../../docs/versioning.md) para sa mga panuntunan sa compatibility.

### Ginagarantiya ba ng Ombra na makakapasa sa bawat bot check?

Hindi. Patuloy na nagbabago ang detection at nakadepende ito sa site, rehiyon, reputasyon ng IP, kasaysayan ng profile, at bersyon ng detector. Gamitin ang [paraan ng stealth checkup](../../docs/stealth-checkup.md) upang masukat at masubaybayan nang obhetibo ang isang partikular na konpigurasyon.

### Para sa anong mga gamit ginawa ang Ombra?

Ginawa ang Ombra para sa awtorisadong automation, QA testing, pagsubaybay, pananaliksik, at pamamahala ng magkakahiwalay na work profile. Hindi sinusuportahan ang hindi awtorisadong pag-access, credential stuffing, at pang-aabuso.

## Pag-ambag

Nasa [CONTRIBUTING.md](../../CONTRIBUTING.md) ang mga gabay sa pag-ambag, nasa [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) ang mga pamantayan ng komunidad, at nasa [sdks/README.md](../../sdks/README.md) ang mga tagubilin para sa SDK.

- I-update ang [kontrata ng SDK](../../docs/sdk-contract.md) at [mga schema](../../spec/schemas) bago magdagdag ng bagong opsyon sa pag-launch.
- Kapag binabago ang pag-uugali ng SDK, i-update ang implementasyon, mga pagsubok, at mga shared case sa [conformance](../../conformance/README.md).
- Patakbuhin ang `python3 tools/check_repo.py` bago magbukas ng pull request upang i-validate ang istruktura at mga link ng repository.

## Lisensya

Lisensyado ang source code ng SDK sa repository na ito sa ilalim ng [Apache License 2.0](../../LICENSE). Hindi nagbibigay ang lisensya ng mga karapatan sa mga trademark ng Ombra, sa Ombra Chromium engine, o sa Ombra Desktop — tingnan ang [NOTICE](../../NOTICE) para sa mga tuntunin sa trademark at third-party.

## Mga Link

- 🌐 **Website** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Mga Release (engine at Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Changelog** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Mga bug at hiling na tampok** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organisasyon** — [Ombra Labs](https://github.com/ombralabs)
