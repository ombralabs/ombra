# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Sa Python at Node.js, pinapatakbo ng `launch()` ang Ombra Chromium at ibinabalik ang `Browser` ng Playwright. Para sa Puppeteer sa Node.js, gamitin ang `launchPuppeteer()`.

**[Pag-install](#pag-install)** · <a href="../../README.md">English</a>

<details>
<summary>Mga wika</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](README.md) · [ខ្មែរ](../km/README.md)

</details>

## Mga kontrol ng fingerprint sa Chromium

Nasa mismong Chromium ang mga kontrol ng Ombra sa browser fingerprint. Saklaw nito ang canvas, WebGL, audio, mga font, bilang ng lohikal na processor, sukat at posisyon ng mga elemento, mga identifier ng GPU, time zone, at mga senyales ng automation. Ginagamit ng engine ang TLS at HTTP/2 ng Chromium. Sa proseso ng browser nito pinoproseso ang input na tumutulad sa galaw ng gumagamit.

Pinapatakbo ng SDK ang engine sa mismong makina at ikinokonekta ang automation client sa pamamagitan ng Chrome DevTools Protocol (CDP). Maaari itong gamitin sa isang script, container, o CI job kahit walang naka-install na Ombra desktop app.

## Katayuan

Ang mga halimbawa ay gumagamit ng mga nailathalang alpha package para sa Python at Node.js. Nasa repositoryong ito rin ang iisang kontrata sa paglulunsad at ang mga panimulang direktoryo para sa walong SDK.

| Component | Estado |
|---|---|
| [Kontrata ng API ng SDK](../../docs/sdk-contract.md) | Burador `0.1.0` |
| Python SDK | `0.1.3` alpha · [`ombrabrowser` (PyPI)](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` alpha · [`@ombralabs/sdk` (npm)](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Mga shared schema](../../spec/schemas) | Mga opsyon sa paglulunsad at detalye ng engine binary |
| [Conformance sa iba't ibang wika](../../conformance) | Mga test case para sa parehong SDK |
| [Pagsusuri ng stealth](../../docs/stealth-checkup.md) | Pamantayan sa pagsusuri at template ng ulat |

## Pag-install

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Para sa Puppeteer, i-install ang `puppeteer-core` kapalit ng `playwright-core`. Makikita ang mga suportadong bersyon ng client at runtime sa [pahina ng package sa npm](https://www.npmjs.com/package/@ombralabs/sdk).

Unang tinitingnan ng SDK ang path na ibinigay sa `binary_path` sa Python o `binaryPath` sa Node.js. Susunod nitong tinitingnan ang `OMBRA_BINARY_PATH`, ang direktoryo ng engine ng desktop app, at ang cache ng SDK, sa ganoong pagkakasunod. Kung wala roon ang engine, dina-download at bineberipika ito ng SDK.

Para patayin ang awtomatikong pag-download, itakda ang `download=False` sa Python o `download: false` sa Node.js. Para ihanda ang engine nang hindi binubuksan ang browser, tawagin ang `ensure_binary()` sa Python o `ensureBinary()` sa Node.js.

## Mabilisang simula

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Para magamit muli ang cookies at data ng site sa isang pinangalanang profile, buksan ang pahina sa kasalukuyang browser context ng profile. May proxy rin ang halimbawang ito.

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

Gamitin ang `launchPuppeteer()` para makuha ang `Browser` ng Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Drop-in na migrasyon

Para ilipat ang isang Python script mula sa Playwright, i-install ang `ombrabrowser` at palitan ang import at ang tawag na naglulunsad ng browser. Mula pa rin sa Playwright ang mga page method, type, at selector.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Dalawang linya ang papalitan sa Node.js.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Paano ito gumagana

```mermaid
flowchart LR
    Script["Ang script mo<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP bridge"]
    Engine["Ombra Chromium<br/>naka-patch na engine"]
    Client["Native na automation client"]
    Profile[("Profile<br/>seed · cookies · mga extension")]

    Script -->|launch()| SDK
    SDK -->|spawn| Engine
    SDK -->|koneksyon sa CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. Hinahanap o dina-download ng `launch()` ang engine at bineberipika ang binary.
2. Pinipili ng SDK ang direktoryo at seed ng profile. Kung nangangailangan ng authentication ang proxy, nagsisimula ito ng lokal na relay.
3. Sinisimulan nito ang Chromium gamit ang napiling profile, mga opsyon sa paglulunsad, at isang debug port sa loopback.
4. Kapag handa na ang `DevToolsActivePort`, ikinokonekta ng SDK ang Playwright o Puppeteer sa pamamagitan ng CDP at ibinabalik ang `Browser` ng client.
5. Pinatitigil ng `browser.close()` ang engine at inaalis ang lock sa profile.

Pagkatapos ng paglulunsad, direktang ipinapadala ng client sa Chromium ang mga utos para sa pahina.

## Matrix ng SDK

| Runtime | Nailathalang package | Browser object |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

May mga panimulang direktoryo para sa anim pang SDK. Nakalista sa [manifest ng SDK](../../sdks/manifest.json) ang mga planong package at client. Inilalarawan ng [gabay sa SDK](../../sdks/README.md) ang ayos ng mga direktoryo.

| Target na runtime | Planong package | Client o uri ng ibinabalik na object |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Mga opsyon sa launch

Ginagamit dito ang mga pangalan ng opsyon sa Python at sa kontrata ng SDK. Sa Node.js, nasa camelCase ang mga katumbas na pangalan gaya ng `timeoutMs`, `userDataDir`, at `binaryPath`.

| Opsyon | Default | Kahulugan |
|---|---|---|
| `headless` | `true` | Patakbuhin ang engine nang walang window |
| `proxy` | wala | Proxy URL o object; gumagamit ang mga authenticated na proxy ng loopback relay |
| `fingerprint` | wala | Seed at mga setting para sa OS, time zone, locale, screen, at GPU |
| `profile` | wala | Named profile na may persistent na cookies, storage, at seed |
| `user_data_dir` | temp | Tahasang direktoryo ng profile, hindi maaaring gamitin kasabay ng `profile` |
| `args` | `[]` | Karagdagang flag ng engine, ipinapasa nang walang pagbabago |
| `timeout_ms` | `30000` | Oras sa millisecond para mailunsad ang engine at maikonekta ang CDP |
| `humanize` | default ng engine | `false`, `true`, o isang preset |
| `binary_path` | niresolba | Gumamit ng partikular na binary ng engine |
| `download` | `true` | I-download ang nawawalang binary ng engine |

Nakalista sa [kontrata ng SDK](../../docs/sdk-contract.md) ang lahat ng opsyon sa paglulunsad, mga uri ng error, at mga tuntunin para sa profile.

## Pamamahala ng binary

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # i-download at beripikahin ang engine nang hindi ito inilulunsad
clear_cache()     # alisin ang mga na-download na engine at panatilihin ang mga profile
```

Bago ilunsad ang engine, sinusuri ng SDK ang SHA-256 checksum nito. Panatilihing aktibo ang pagsusuri sa production. Para lamang sa mga lokal na development build ang `OMBRA_SKIP_CHECKSUM=1`.

## Konfigurasyon

| Variable | Default | Kahulugan |
|---|---|---|
| `OMBRA_BINARY_PATH` | hindi nakatakda | Tahasang binary ng engine |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Mga managed na binary at named profile |
| `OMBRA_DOWNLOAD_URL` | release endpoint | Base URL para sa mga download ng binary |
| `OMBRA_VERSION` | pinakabagong compatible | Bersyon ng engine na ireresolba |
| `OMBRA_AUTO_UPDATE` | `true` | Mag-check ng mas bagong engine sa launch |
| `OMBRA_SKIP_CHECKSUM` | `false` | Para sa development lamang |
| `OMBRA_LICENSE_KEY` | hindi nakatakda | Ipinapasa sa engine |
| `OMBRA_TIMEOUT_MS` | `30000` | Default na tagal ng paghihintay sa paglulunsad, sa millisecond |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Prayoridad: tahasang opsyon, pagkatapos ay environment variable, pagkatapos ay metadata ng profile, at panghuli ang default.

## Paghahambing

| Katangian | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright o Puppeteer |
| Antas ng patch | wala | JavaScript sa loob ng page | mga config flag | source ng engine |
| Seed ng fingerprint | wala | wala | bahagya | bawat profile |
| Humanized na input | wala | wala | wala | engine |
| Isolation ng profile | context ng browser | context ng browser | wala | user-data directory |
| Drop-in na migrasyon | — | pagpalit ng import | muling pagsulat | pagpalit ng import |

Nakadepende ang resulta ng deteksyon sa site, exit IP, at profile. Inilalarawan ng [pamamaraan ng pagsusuri](../../docs/stealth-checkup.md) kung paano ito sinusukat.

## Ang stealth ay katangian ng engine

Ang engine ang naglalapat ng mga setting ng fingerprint. Ipinapasa dito ng mga SDK ang seed ng profile at ang mga tahasang opsyon sa launch.

| Layer | Saan ito ginagawa ng Ombra |
|---|---|
| TLS at HTTP/2 | Sariling network stack ng Chromium, tugma ang bersyon sa build ng engine |
| Pagkakakilanlan ng browser | Mga patch sa source ng engine na pinapagana ng seed ng profile |
| Automation surface | Mga patch ng engine para sa mga signal ng WebDriver; hindi tumatawag ang SDK ng `Runtime.enable` |
| Input | Humanized na pointer, keyboard, at scroll sa loob ng process ng browser |
| Pagkakaugnay ng network | Pagresolba ng timezone at locale na isinasaalang-alang ang proxy |
| Estado | Hiwalay na user-data directory para sa bawat profile |

### Mga hangganan ng SDK

- Mga lokal na koneksyon lamang sa loopback ang tinatanggap ng CDP debug port.
- Hindi isinusulat ng SDK sa mga log ang proxy credentials, license key, o cookies. Hindi ito nagpapadala ng telemetry.
- Pinananatili ng isang profile ang kasalukuyang seed maliban kung tahasan kang magbigay ng bago.
- Hindi nagsisingit ang SDK ng stealth script gamit ang `addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument` at hindi nito pinapalitan ang mga property ng pahina.
- Ginagamit ng SDK ang HTTP endpoint ng CDP o `Browser.getVersion` para malaman kung handa na ang browser. Hindi nito tinatawag ang `Runtime.enable` para rito.
- Ang engine ang nagbibigay ng pagkakakilanlan ng browser. Hindi ito pinapalitan ng SDK sa Playwright o Puppeteer. Hindi rin nito tinatawag ang mga paraang `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`.
- Hindi kusang idinaragdag ng SDK ang mga flag na `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`.

## Pagsusuri ng stealth

Patakbuhin ang mga pagsusuring ito sa build ng engine, automation client, at profile na balak mong gamitin.

| Layer | Mga halimbawang target | Pamantayan sa pagpasa |
|---|---|---|
| L0 Transport | TrackMe, mga leak check ng IP/WebRTC | Exit IP lamang; tugma ang JA4 at HTTP/2 sa Chromium ng engine |
| L1 Pagkakakilanlan | Lokal na probe, Sannysoft, Intoli | Walang kontradiksyon sa pagitan ng UA, UA-CH, platform, GPU, font, at screen |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | Walang headless o lie marker; stable sa mga reload |
| L3 Automation | rebrowser, brotector, botd | Walang leak ng CDP, init-script, o WebDriver |
| L4 Pag-uugali | Fidelity ng input, mga humanize trace, Cloudflare smoke | Mga trusted event, makatotohanang pagkakasunod-sunod, nalulutas ang challenge |
| L5 Katatagan | Seed, worker, iframe, cross-origin | Parehong persona ang nalilikha ng parehong seed sa mga launch |

Nasa pamamaraan ng pagsusuri ang mga posibleng resulta, mga hakbang sa pagsisiyasat, at format ng ulat. Basahin ito sa [Ingles](../../docs/stealth-checkup.md) o [Ruso](../../docs/stealth-checkup.ru.md).

Itala ang build ng engine, bersyon ng client, mga setting ng profile, proxy exit, at bersyon ng detector kasama ng bawat resulta para ma-reproduce at maikumpara ang mga run.

## Mapa ng repository

```text
.
├── README.md                  # orihinal sa English
├── translations/
│   └── <locale>/README.md
├── desktop/                   # offline na tagapamahala ng profile
├── docs/
│   ├── desktop/               # dokumentasyon ng tagapamahala ng profile
│   ├── architecture.md        # mga component, daloy ng launch, mga hangganan
│   ├── sdk-contract.md        # kontrata ng launch v0 at pag-uugali ng SDK
│   ├── stealth-checkup.md     # paraan ng stealth validation at runbook
│   ├── stealth-checkup.ru.md  # salin sa Russian
│   └── versioning.md          # pagkakatugma ng SDK, engine, at client
├── spec/
│   └── schemas/               # JSON Schema para sa mga opsyon sa launch at info ng binary
├── sdks/
│   ├── manifest.json          # registry ng SDK na nababasa ng makina
│   ├── README.md              # layout at mga patakaran sa pag-aambag
│   ├── _template/             # panimulang template para sa bagong wika
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # mga case ng launch at stealth na hindi nakatali sa wika
├── tools/check_repo.py        # pag-validate ng structure at link (CI)
└── .github/workflows/ci.yml
```

Nasa repositoryong ito ang mga panimulang direktoryo ng SDK, kontrata sa paglulunsad, mga test case, at offline na tagapamahala ng profile. May magkahiwalay na repositoryo ang Chromium engine at ang buong Desktop 1.2.1 release. [Source code at gabay sa pagbuo ng Desktop](../../desktop/README.md) · [Dokumentasyon ng tagapamahala ng profile](../../docs/desktop/README.md)

## Ang kontrata

- Sinisimulan ng `launch(options)` ang engine at ibinabalik ang `Browser` ng client. Pagkatapos, direktang nakikipag-ugnayan ang client sa Chromium sa pamamagitan ng CDP.
- Bago ilunsad ang engine, sinusuri ng SDK ang platform at SHA-256 checksum. Dina-download nito ang nawawalang binary kapag pinahihintulutan ang pag-download.
- Pinananatili ng pinangalanang profile ang cookies, data ng site, at seed nito sa bawat paglulunsad.
- Kung pumalya ang paglulunsad, pinatitigil ng SDK ang prosesong sinimulan nito at nag-uulat ng error na may tiyak na uri. Ang tumawag sa SDK ang magpapasya kung susubukang muli.
- Magkakahiwalay ang mga saklaw ng bersyon ng SDK, engine, at automation client. Para makita ang engine build, gamitin ang `binary_info()` sa Python o `binaryInfo()` sa Node.js.

## Pagkakatugma

| Item | Target |
|---|---|
| Engine | Build na pinili ng SDK, na makikita sa `binary_info()` o `binaryInfo()` |
| macOS | Apple Silicon at Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; sinusuportahang range ng Playwright |
| Node.js | 20+; sinusuportahang mga range ng Playwright at Puppeteer |

Magkahiwalay ang mga bersyon ng SDK at engine. Kung hindi magkatugma ang mga ito, nakasaad ang parehong bersyon sa mensahe ng error.

## Pag-aambag

Inilalarawan ng [gabay sa pag-aambag](../../CONTRIBUTING.md) ang proseso ng pagsusuri. Nasa [gabay sa SDK](../../sdks/README.md) ang mga hakbang sa pagbuo ng package.

- Kung magbabago ng pag-uugali ng SDK, baguhin ang kaukulang implementasyon at magdagdag ng test o isang test case na magagamit ng parehong SDK.
- Para sa SDK sa bagong wika, kopyahin ang [template](../../sdks/_template), idagdag ito sa [manifest](../../sdks/manifest.json), at magbukas ng draft na pull request.
- Para sa bagong opsyon sa paglulunsad, unahing baguhin ang [kontrata](../../docs/sdk-contract.md) at [mga schema](../../spec/schemas).
- Sa repositoryo ng engine ginagawa ang pagbabago sa stealth ng engine. Kailangang pumasa pa rin ang SDK sa pagsusuri.
- Iulat nang pribado ang mga isyu sa seguridad ayon sa [patakaran sa seguridad](../../SECURITY.md).

## FAQ

### Fork ba ito ng Playwright?

Hindi. Ikinokonekta ng SDK ang opisyal na Playwright client sa Ombra Chromium. Magagamit mo pa rin ang mga type, helper, at page object ng Playwright.

### Kailangan ko ba ang Ombra desktop app?

Direktang inilulunsad ng SDK ang engine. Opsyonal ang desktop app at magagamit ito para pamahalaan ang mga profile nang mano-mano.

### Ano ang kaibahan nito sa playwright-stealth?

Ang mga pagbabago ng Ombra sa fingerprint ay naka-compile sa Chromium. Hindi nagdaragdag ang SDK ng stealth script sa antas ng page.

### Maaari ba akong gumamit ng sarili kong proxy?

Oo. Ipasa ito sa `launch()`. Ang mga authenticated na proxy ay dumadaan sa loopback relay para hindi kailanman lumabas ang mga credential sa command line ng process.

### Aling mga bersyon ng Playwright at Puppeteer ang sinusuportahan?

Nakalista sa manifest ng bawat package at sa [gabay sa mga bersyon](../../docs/versioning.md) ang mga suportadong client. Hiwalay na dependency ang bawat client.

### Malalampasan ba nito ang bawat bot check?

Nakadepende ang mga resulta sa site, rehiyon, reputasyon ng exit IP, bersyon ng detector, at mga setting ng profile. Gamitin ang [pagsusuri ng stealth](../../docs/stealth-checkup.md) para sukatin ang isang partikular na configuration.

## Lisensya

Ang mga source ng SDK sa repository na ito ay lisensyado sa ilalim ng [Apache License 2.0](../../LICENSE). Hindi nagbibigay ng mga karapatan sa Ombra engine, sa pangalang Ombra, o sa logo ang lisensya. Tingnan ang [NOTICE](../../NOTICE) para sa trademark at third-party attribution.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
