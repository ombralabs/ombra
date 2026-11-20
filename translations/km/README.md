# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

ក្នុង Python និង Node.js មុខងារ `launch()` ចាប់ផ្ដើម Ombra Chromium ហើយប្រគល់វត្ថុ `Browser` របស់ Playwright។ ប្រសិនបើប្រើ Puppeteer ក្នុង Node.js សូមហៅ `launchPuppeteer()`។

**[ការដំឡើង](#ការដំឡើង)** · <a href="../../README.md">English</a>

<details>
<summary>ភាសា</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](README.md)

</details>

## ការគ្រប់គ្រង fingerprint ក្នុង Chromium

Ombra គ្រប់គ្រង fingerprint របស់កម្មវិធីរុករកនៅក្នុង Chromium ផ្ទាល់។ ការកំណត់នេះរួមមាន canvas, WebGL, សំឡេង ពុម្ពអក្សរ ចំនួន logical processors ទីតាំងនិងទំហំធាតុលើទំព័រ ព័ត៌មានសម្គាល់ GPU តំបន់ពេលវេលា និងសញ្ញានៃការបញ្ជាស្វ័យប្រវត្តិ។ Engine ប្រើប្រព័ន្ធបណ្ដាញ TLS និង HTTP/2 របស់ Chromium។ ការបញ្ចូលដែលត្រាប់តាមសកម្មភាពអ្នកប្រើដំណើរការក្នុងកម្មវិធីរុករក។

SDK ចាប់ផ្ដើមម៉ាស៊ីនកម្មវិធីរុករកនៅលើកុំព្យូទ័ររបស់អ្នក ហើយភ្ជាប់កម្មវិធីបញ្ជាតាម Chrome DevTools Protocol (CDP)។ អ្នកអាចប្រើវាក្នុងស្គ្រីប កុងតឺន័រ ឬ CI ដោយមិនចាំបាច់ដំឡើងកម្មវិធី Ombra Desktop។

## ស្ថានភាព

ឧទាហរណ៍ខាងក្រោមប្រើកញ្ចប់ Python និង Node.js កំណែ alpha ដែលបានបោះផ្សាយ។ ឃ្លាំងកូដនេះក៏ផ្ទុកកិច្ចសន្យាសម្រាប់ការចាប់ផ្ដើមរួម និងគ្រោងដើមសម្រាប់ SDK ចំនួនប្រាំបីផងដែរ។

| សមាសភាគ | ស្ថានភាព |
|---|---|
| [កិច្ចសន្យា API របស់ SDK](../../docs/sdk-contract.md) | សេចក្ដីព្រាង `0.1.0` |
| SDK សម្រាប់ Python | `0.1.3` alpha · [`ombrabrowser` (PyPI)](https://pypi.org/project/ombrabrowser/) |
| SDK សម្រាប់ Node.js | `0.1.0` alpha · [`@ombralabs/sdk` (npm)](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Schemas រួម](../../spec/schemas) | ជម្រើសចាប់ផ្ដើម និងព័ត៌មានអំពីឯកសារ engine |
| [ការអនុលោមឆ្លងភាសា](../../conformance) | ករណីសាកល្បងដែល SDK ទាំងពីរប្រើរួមគ្នា |
| [ការត្រួតពិនិត្យ stealth](../../docs/stealth-checkup.md) | លក្ខខណ្ឌសាកល្បង និងគំរូរបាយការណ៍ |

## ការដំឡើង

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

សម្រាប់ Puppeteer សូមដំឡើង `puppeteer-core` ជំនួស `playwright-core`។ កំណែ client និង runtime ដែលគាំទ្រមានរាយនៅលើ[ទំព័រកញ្ចប់ npm](https://www.npmjs.com/package/@ombralabs/sdk)។

SDK រក engine តាមទីតាំងដែលផ្ដល់ឱ្យ `binary_path` ក្នុង Python ឬ `binaryPath` ក្នុង Node.js ជាមុន។ បន្ទាប់មកវាពិនិត្យ `OMBRA_BINARY_PATH` ថត engine របស់កម្មវិធី Desktop និង cache របស់ SDK តាមលំដាប់។ បើរកមិនឃើញ SDK នឹងទាញយក engine ហើយផ្ទៀងផ្ទាត់ឯកសារ។

ដើម្បីបិទការទាញយក សូមប្រើ `download=False` ក្នុង Python ឬ `download: false` ក្នុង Node.js។ ដើម្បីត្រៀម engine ដោយមិនបើកកម្មវិធីរុករក សូមហៅ `ensure_binary()` ក្នុង Python ឬ `ensureBinary()` ក្នុង Node.js។

## ចាប់ផ្តើមរហ័ស

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

ដើម្បីប្រើខូគី និងទិន្នន័យគេហទំព័រឡើងវិញ សូមបើកទំព័រក្នុង context ដែលមានស្រាប់របស់ profile ដែលបានដាក់ឈ្មោះ។ ឧទាហរណ៍នេះក៏កំណត់ proxy ផងដែរ។

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

ហៅ `launchPuppeteer()` ដើម្បីទទួលវត្ថុ `Browser` របស់ Puppeteer។

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## ការផ្លាស់ប្តូរដោយមិនសរសេរកូដឡើងវិញ

សម្រាប់ស្គ្រីប Python ដែលប្រើ Playwright សូមដំឡើង `ombrabrowser` រួចប្ដូរ import និងការហៅមុខងារបើកកម្មវិធីរុករក។ អ្នកនៅតែប្រើមុខងារទំព័រ ប្រភេទទិន្នន័យ និង selector របស់ Playwright។

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

ក្នុង Node.js សូមប្ដូរពីរបន្ទាត់នេះ។

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## របៀបដំណើរការ

```mermaid
flowchart LR
    Script["script របស់អ្នក<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + ស្ពាន CDP"]
    Engine["Ombra Chromium<br/>engine ដែលបានកែប្រែ"]
    Client["automation client ដើម"]
    Profile[("Profile<br/>seed · cookies · extensions")]

    Script -->|launch()| SDK
    SDK -->|បង្កើត process| Engine
    SDK -->|ភ្ជាប់តាម CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` រក ឬទាញយក engine ហើយផ្ទៀងផ្ទាត់ឯកសារ binary។
2. SDK ជ្រើសថត profile និងតម្លៃ seed។ ប្រសិនបើ proxy តម្រូវឱ្យផ្ទៀងផ្ទាត់អត្តសញ្ញាណ SDK នឹងចាប់ផ្ដើម relay នៅលើម៉ាស៊ីននេះ។
3. SDK ចាប់ផ្ដើម Chromium ដោយប្រើ profile និងជម្រើសដែលបានកំណត់ ព្រមទាំងច្រក debug នៅលើ loopback។
4. នៅពេល `DevToolsActivePort` រួចរាល់ SDK ភ្ជាប់ Playwright ឬ Puppeteer តាម CDP ហើយប្រគល់វត្ថុ `Browser` របស់ client នោះ។
5. `browser.close()` បញ្ឈប់ engine ហើយដោះសោ profile។

បន្ទាប់ពីចាប់ផ្ដើមរួច client ផ្ញើពាក្យបញ្ជាសម្រាប់ទំព័រទៅ Chromium ដោយផ្ទាល់។

## ម៉ាទ្រីស SDK

| Runtime | កញ្ចប់ដែលបានបោះផ្សាយ | វត្ថុកម្មវិធីរុករក |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

SDK ប្រាំមួយផ្សេងទៀតមានតែគ្រោងដើមនៅក្នុងឃ្លាំងកូដនេះ។ [បញ្ជី SDK](../../sdks/manifest.json) បង្ហាញឈ្មោះកញ្ចប់ និង client ដែលបានគ្រោងទុក។ [មគ្គុទ្ទេសក៍ SDK](../../sdks/README.md) ពន្យល់ពីរចនាសម្ព័ន្ធថត។

| Runtime គោលដៅ | កញ្ចប់ដែលបានគ្រោងទុក | Client ឬប្រភេទវត្ថុដែលទទួលបាន |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## ជម្រើសចាប់ផ្តើម

ឈ្មោះជម្រើសខាងក្រោមប្រើទម្រង់របស់ Python និងកិច្ចសន្យា SDK។ ក្នុង Node.js ឈ្មោះទាំងនេះសរសេរជា camelCase ដូចជា `timeoutMs`, `userDataDir` និង `binaryPath`។

| ជម្រើស | លំនាំដើម | អត្ថន័យ |
|---|---|---|
| `headless` | `true` | ដំណើរការ engine ដោយគ្មានផ្ទាំងបង្អួច |
| `proxy` | គ្មាន | Proxy URL ឬ object; proxy ដែលត្រូវការផ្ទៀងផ្ទាត់ប្រើ loopback relay |
| `fingerprint` | គ្មាន | តម្លៃ seed និងការកំណត់ប្រព័ន្ធប្រតិបត្តិការ តំបន់ពេលវេលា ភាសានិងតំបន់ អេក្រង់ និង GPU |
| `profile` | គ្មាន | Profile ដែលមានឈ្មោះ ជាមួយ cookies, storage និង seed ដែលបន្តរហូត |
| `user_data_dir` | បណ្តោះអាសន្ន | ថត profile ច្បាស់លាស់ ដែលមិនអាចប្រើជាមួយ `profile` បានទេ |
| `args` | `[]` | Flags engine បន្ថែម ដែលឆ្លងកាត់ដោយមិនផ្លាស់ប្តូរ |
| `timeout_ms` | `30000` | ពេលកំណត់សម្រាប់ចាប់ផ្ដើម និងភ្ជាប់ CDP គិតជាមិល្លីវិនាទី |
| `humanize` | លំនាំដើមរបស់ engine | `false`, `true` ឬ preset |
| `captcha` | `false` | បើក module របស់ engine ជាមួយកំណត់ដែនស្រេចចិត្ត |
| `binary_path` | បានស្វែងរក | ប្រើ binary engine ជាក់លាក់ |
| `download` | `true` | ទាញយក binary engine ដែលខ្វះ |

[កិច្ចសន្យា SDK](../../docs/sdk-contract.md) រាយជម្រើសចាប់ផ្ដើមទាំងអស់ ប្រភេទកំហុស និងច្បាប់សម្រាប់ប្រើ profile។

## ការគ្រប់គ្រង binary

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # ទាញយក និងផ្ទៀងផ្ទាត់ engine ដោយមិនចាប់ផ្ដើមវា
clear_cache()     # លុប engine ដែលបានទាញយក ហើយរក្សា profile ទុក
```

មុនចាប់ផ្ដើម SDK ផ្ទៀងផ្ទាត់ checksum SHA-256 របស់ engine។ រក្សាការផ្ទៀងផ្ទាត់នេះឱ្យសកម្មក្នុងប្រព័ន្ធប្រើប្រាស់ជាក់ស្ដែង។ `OMBRA_SKIP_CHECKSUM=1` សម្រាប់តែ build ដែលប្រើពេលអភិវឌ្ឍនៅលើម៉ាស៊ីនផ្ទាល់។

## ការកំណត់

| អថេរ | លំនាំដើម | អត្ថន័យ |
|---|---|---|
| `OMBRA_BINARY_PATH` | មិនកំណត់ | Binary engine ជាក់លាក់ |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Binary ដែលគ្រប់គ្រង និង profile ដែលមានឈ្មោះ |
| `OMBRA_DOWNLOAD_URL` | release endpoint | Base URL សម្រាប់ការទាញយក binary |
| `OMBRA_VERSION` | កំណែចុងក្រោយដែលឆបគ្នា | កំណែ engine ដែលត្រូវស្វែងរក |
| `OMBRA_AUTO_UPDATE` | `true` | ពិនិត្យ engine ថ្មីជាងនៅពេលចាប់ផ្តើម |
| `OMBRA_SKIP_CHECKSUM` | `false` | សម្រាប់តែការអភិវឌ្ឍន៍ |
| `OMBRA_LICENSE_KEY` | មិនកំណត់ | ផ្ញើទៅ engine |
| `OMBRA_TIMEOUT_MS` | `30000` | ពេលរង់ចាំចាប់ផ្ដើមលំនាំដើម គិតជាមិល្លីវិនាទី |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

លំដាប់អាទិភាព៖ ជម្រើសច្បាស់លាស់ បន្ទាប់មកអថេរ environment បន្ទាប់មក metadata របស់ profile និងចុងក្រោយតម្លៃលំនាំដើម។

## ការប្រៀបធៀប

| លក្ខណៈ | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright ឬ Puppeteer |
| កម្រិត patch | គ្មាន | JavaScript ក្នុងទំព័រ | flags config | source របស់ engine |
| Seed fingerprint | គ្មាន | គ្មាន | មួយផ្នែក | តាម profile |
| Humanized input | គ្មាន | គ្មាន | គ្មាន | engine |
| ការបំបែក profile | context កម្មវិធីរុករក | context កម្មវិធីរុករក | គ្មាន | ថត user-data |
| ការផ្លាស់ប្តូរដោយមិនសរសេរកូដឡើងវិញ | — | ប្តូរ import | សរសេរឡើងវិញ | ប្តូរ import |

លទ្ធផលត្រួតពិនិត្យអាស្រ័យលើគេហទំព័រ IP ច្រកចេញ និង profile។ [វិធីត្រួតពិនិត្យ](../../docs/stealth-checkup.md) ពន្យល់ពីរបៀបវាស់លទ្ធផល។

## Stealth ជាលក្ខណៈរបស់ engine

Engine អនុវត្តការកំណត់ fingerprint។ SDK បញ្ជូន seed របស់ profile និងជម្រើសចាប់ផ្តើមច្បាស់លាស់ទៅវា។

| ស្រទាប់ | កន្លែងដែល Ombra គ្រប់គ្រង |
|---|---|
| TLS និង HTTP/2 | network stack ផ្ទាល់របស់ Chromium ដែលត្រូវគ្នានឹងកំណែ engine build |
| អត្តសញ្ញាណកម្មវិធីរុករក | patch engine កម្រិត source ដែលដំណើរការដោយ seed របស់ profile |
| ផ្ទៃស្វ័យប្រវត្តិកម្ម | patch engine សម្រាប់ WebDriver signals; SDK មិនហៅ `Runtime.enable` ទេ |
| ការបញ្ចូល | pointer, keyboard និង scroll បែប humanized នៅក្នុង process របស់កម្មវិធីរុករក |
| ភាពស៊ីសង្វាក់គ្នានៃ network | ការកំណត់ timezone និង locale ដោយយល់ដឹងពី proxy |
| ស្ថានភាព | ថត user-data ដោយឡែកសម្រាប់ profile នីមួយៗ |

### ដែនកំណត់របស់ SDK

- ច្រក debug របស់ CDP ទទួលតែការតភ្ជាប់ពីម៉ាស៊ីនផ្ទាល់តាម loopback ប៉ុណ្ណោះ។
- SDK មិនសរសេរព័ត៌មានសម្ងាត់របស់ proxy សោអាជ្ញាបណ្ណ ឬខូគីចូលក្នុងកំណត់ហេតុទេ។ វាក៏មិនផ្ញើទិន្នន័យ telemetry ដែរ។
- Profile ដែលមានស្រាប់រក្សាតម្លៃ seed របស់វា លុះត្រាតែអ្នកផ្ដល់តម្លៃថ្មីដោយផ្ទាល់។
- SDK មិនបញ្ចូលស្គ្រីប stealth តាមមុខងារ `addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument` និងមិនកែ property របស់ទំព័រទេ។
- ដើម្បីពិនិត្យថាកម្មវិធីរុករករួចរាល់ SDK ប្រើ HTTP endpoint របស់ CDP ឬ `Browser.getVersion`។ វាមិនហៅ `Runtime.enable` សម្រាប់ការពិនិត្យនេះទេ។
- Engine ជាអ្នកកំណត់អត្តសញ្ញាណកម្មវិធីរុករក។ SDK មិនកែអត្តសញ្ញាណនោះតាម Playwright ឬ Puppeteer ហើយមិនហៅមុខងារទាំងនេះទេ (`Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`)។
- SDK មិនបន្ថែម flag ទាំងនេះដោយស្វ័យប្រវត្តិទេ (`--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`)។

## ការត្រួតពិនិត្យ stealth

ដំណើរការការត្រួតពិនិត្យទាំងនេះលើ engine build, automation client និង profile ដែលអ្នកមានបំណងប្រើ។

| ស្រទាប់ | គោលដៅឧទាហរណ៍ | លក្ខខណ្ឌសម្រាប់ជាប់ |
|---|---|---|
| L0 Transport | TrackMe, ការត្រួតពិនិត្យការលេចធ្លាយ IP/WebRTC | តែ exit IP ប៉ុណ្ណោះ; JA4 និង HTTP/2 ត្រូវគ្នានឹង Chromium របស់ engine |
| L1 Identity | Local probe, Sannysoft, Intoli | គ្មានភាពផ្ទុយគ្នារវាង UA, UA-CH, platform, GPU, fonts, screen |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | គ្មានសញ្ញាសម្គាល់ headless ឬ ការកុហក; នៅដដែលពេលផ្ទុកឡើងវិញ |
| L3 Automation | rebrowser, brotector, botd | គ្មានការលេចធ្លាយ CDP, init-script ឬ WebDriver |
| L4 Behavior | ភាពត្រឹមត្រូវនៃការបញ្ចូល, ដាន humanize, Cloudflare smoke | ព្រឹត្តិការណ៍ដែលអាចទុកចិត្ត, លំដាប់បែបពិត, challenge ត្រូវបានដោះស្រាយ |
| L5 Stability | Seed, workers, iframes, cross-origin | Seed ដូចគ្នាបង្កើត persona ដូចគ្នានៅគ្រប់ការចាប់ផ្តើម |

វិធីត្រួតពិនិត្យពន្យល់ពីស្ថានភាពលទ្ធផល ការស្វែងរកមូលហេតុ និងទម្រង់របាយការណ៍។ អានជា[ភាសាអង់គ្លេស](../../docs/stealth-checkup.md) ឬ[ភាសារុស្ស៊ី](../../docs/stealth-checkup.ru.md)។

កត់ត្រា engine build, កំណែ client, ការកំណត់ profile, proxy exit និងកំណែ detector ជាមួយលទ្ធផលនីមួយៗ ដើម្បីឱ្យការដំណើរការអាចធ្វើឡើងវិញ និងប្រៀបធៀបគ្នាបាន។

## ផែនទី repository

```text
.
├── README.md                  # ឯកសារដើមជាភាសាអង់គ្លេស
├── translations/
│   └── <locale>/README.md
├── desktop/                   # កម្មវិធីគ្រប់គ្រង profile ក្រៅបណ្ដាញ
├── docs/
│   ├── desktop/               # ឯកសារកម្មវិធីគ្រប់គ្រង profile
│   ├── architecture.md        # សមាសភាគ ដំណើរការចាប់ផ្តើម ដែនកំណត់
│   ├── sdk-contract.md        # កិច្ចសន្យាចាប់ផ្តើម v0 និងឥរិយាបថ SDK
│   ├── stealth-checkup.md     # វិធីសាស្ត្រផ្ទៀងផ្ទាត់ stealth និង runbook
│   ├── stealth-checkup.ru.md  # កំណែបកប្រែជាភាសារុស្ស៊ី
│   └── versioning.md          # ភាពឆបគ្នារបស់ SDK, engine និង client
├── spec/
│   └── schemas/               # JSON Schema សម្រាប់ជម្រើសចាប់ផ្តើម និងព័ត៌មាន binary
├── sdks/
│   ├── manifest.json          # បញ្ជី SDK ដែលអានដោយម៉ាស៊ីន
│   ├── README.md              # រចនាសម្ព័ន្ធ និងវិធានចូលរួម
│   ├── _template/             # គ្រោងដើមសម្រាប់ភាសាថ្មី
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # ករណីចាប់ផ្តើម និង stealth ដែលមិនអាស្រ័យភាសា
├── tools/check_repo.py        # ការផ្ទៀងផ្ទាត់រចនាសម្ព័ន្ធ និងតំណ (CI)
└── .github/workflows/ci.yml
```

ឃ្លាំងកូដនេះមានគ្រោងដើម SDK កិច្ចសន្យាចាប់ផ្ដើម ករណីសាកល្បងរួម និងកម្មវិធីគ្រប់គ្រង profile ក្រៅបណ្ដាញ។ Engine Chromium និងកំណែពេញលេញរបស់ Desktop 1.2.1 មានឃ្លាំងកូដរៀងៗខ្លួន។ [កូដ និងការបង្កើត Desktop](../../desktop/README.md) · [ឯកសារកម្មវិធីគ្រប់គ្រង profile](../../docs/desktop/README.md)

## កិច្ចសន្យា

- `launch(options)` ចាប់ផ្ដើម engine ហើយប្រគល់វត្ថុ `Browser` របស់ client។ បន្ទាប់មក client ទាក់ទង Chromium ដោយផ្ទាល់តាម CDP។
- មុនចាប់ផ្ដើម SDK ពិនិត្យ platform និង checksum SHA-256 របស់ engine។ ប្រសិនបើគ្មានឯកសារ ហើយការទាញយកត្រូវបានអនុញ្ញាត SDK នឹងទាញយកវា។
- Profile ដែលមានឈ្មោះរក្សាខូគី ទិន្នន័យគេហទំព័រ និងតម្លៃ seed សម្រាប់ការបើកលើកក្រោយ។
- ប្រសិនបើចាប់ផ្ដើមមិនបាន SDK បញ្ឈប់ process ដែលវាបានបង្កើត ហើយរាយការណ៍កំហុសដែលមានប្រភេទជាក់លាក់។ កូដដែលហៅ SDK សម្រេចថាត្រូវសាកម្ដងទៀតឬអត់។
- SDK, engine និង client មានជួរកំណែរៀងៗខ្លួន។ ដើម្បីមើល build របស់ engine សូមប្រើ `binary_info()` ក្នុង Python ឬ `binaryInfo()` ក្នុង Node.js។

## ភាពឆបគ្នា

| ធាតុ | គោលដៅ |
|---|---|
| Engine | Build ដែល SDK ជ្រើស។ ពិនិត្យតាម `binary_info()` ឬ `binaryInfo()` |
| macOS | Apple Silicon និង Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; ជួរដែល Playwright គាំទ្រ |
| Node.js | 20+; ជួរដែល Playwright និង Puppeteer គាំទ្រ |

SDK និង engine មានលេខកំណែដាច់ដោយឡែក។ ប្រសិនបើកំណែទាំងពីរមិនត្រូវគ្នា SDK នឹងរាយការណ៍កំហុស ហើយបង្ហាញលេខកំណែទាំងពីរ។

## ការចូលរួម

[មគ្គុទ្ទេសក៍ចូលរួម](../../CONTRIBUTING.md) ពន្យល់ពីដំណើរការពិនិត្យការកែប្រែ។ សេចក្ដីណែនាំសម្រាប់ build មានក្នុង[មគ្គុទ្ទេសក៍ SDK](../../sdks/README.md)។

- នៅពេលកែឥរិយាបថរបស់ SDK សូមកែកូដដែលពាក់ព័ន្ធ ហើយបន្ថែមតេស្ត ឬករណីសាកល្បងរួម។
- សម្រាប់ SDK ក្នុងភាសាថ្មី សូមចម្លង[គំរូ SDK](../../sdks/_template) បន្ថែមវាទៅក្នុង[បញ្ជី](../../sdks/manifest.json) ហើយបើក pull request ជាសេចក្ដីព្រាង។
- សម្រាប់ជម្រើសចាប់ផ្ដើមថ្មី សូមកែ[កិច្ចសន្យា](../../docs/sdk-contract.md) និង[ស្គីម៉ា](../../spec/schemas) ជាមុន។
- កែប្រែ stealth របស់ engine ក្នុងឃ្លាំងកូដ engine។ SDK នៅតែត្រូវឆ្លងកាត់ការត្រួតពិនិត្យ។
- សូមរាយការណ៍បញ្ហាសុវត្ថិភាពជាឯកជនតាម[គោលការណ៍សុវត្ថិភាព](../../SECURITY.md)។

## សំណួរញឹកញាប់ (FAQ)

### តើនេះជា fork របស់ Playwright មែនទេ?

ទេ។ SDK ភ្ជាប់ client ផ្លូវការរបស់ Playwright ទៅ Ombra Chromium។ អ្នកអាចបន្តប្រើប្រភេទទិន្នន័យ មុខងារជំនួយ និង page object របស់ Playwright។

### តើខ្ញុំត្រូវការកម្មវិធី Ombra desktop ទេ?

SDK ចាប់ផ្ដើម engine ដោយផ្ទាល់។ អ្នកអាចប្រើកម្មវិធី Desktop ប្រសិនបើចង់គ្រប់គ្រង profile ដោយដៃ។

### តើវាខុសពី playwright-stealth យ៉ាងដូចម្តេច?

ការផ្លាស់ប្តូរ fingerprint របស់ Ombra ត្រូវបាន compile ចូលក្នុង Chromium។ SDK មិនបន្ថែម stealth scripts កម្រិតទំព័រទេ។

### តើវាដោះស្រាយ CAPTCHA បានទេ?

Engine មានម៉ូឌុល CAPTCHA ដែលអ្នកអាចជ្រើសបើកបាន។ ការគាំទ្រអាស្រ័យលើប្រភេទកិច្ចការ build របស់ engine និងម៉ូដែលដែលមាន។ SDK បញ្ជូនការកំណត់នៅពេលចាប់ផ្ដើម ហើយផ្ដល់ការចូលប្រើម៉ូឌុលតាម CDP។

### តើខ្ញុំអាចប្រើ proxy ផ្ទាល់ខ្លួនបានទេ?

បាន។ សូមបញ្ជូនវាទៅ `launch()`។ Proxy ដែលត្រូវការផ្ទៀងផ្ទាត់ឆ្លងកាត់ loopback relay ដើម្បីឱ្យ credentials មិនដែលលេចឡើងនៅក្នុង command line របស់ process។

### តើគាំទ្រ Playwright និង Puppeteer កំណែណា?

Manifest របស់កញ្ចប់នីមួយៗបញ្ជាក់កំណែ client ដែលគាំទ្រ។ Client ត្រូវបានចែកចាយជាកញ្ចប់ដាច់ដោយឡែក។ សូមមើលជួរកំណែក្នុង[មគ្គុទ្ទេសក៍កំណែ](../../docs/versioning.md)។

### តើវានឹងឆ្លងកាត់ការត្រួតពិនិត្យ bot ទាំងអស់ទេ?

លទ្ធផលអាស្រ័យលើគេហទំព័រ តំបន់ កេរ្តិ៍ឈ្មោះ exit IP កំណែ detector និងការកំណត់ profile។ សូមប្រើ [stealth checkup](../../docs/stealth-checkup.md) ដើម្បីវាស់ស្ទង់ការកំណត់ជាក់លាក់មួយ។

## អាជ្ញាបណ្ណ

កូដ SDK ក្នុង repository នេះត្រូវបានផ្តល់អាជ្ញាបណ្ណក្រោម [Apache License 2.0](../../LICENSE)។ អាជ្ញាបណ្ណនេះមិនផ្តល់សិទ្ធិលើ engine Ombra ឈ្មោះ Ombra ឬឡូហ្គោទេ។ សូមមើល [NOTICE](../../NOTICE) សម្រាប់ពាណិជ្ជសញ្ញា និងការយោងទៅភាគីទីបី។

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
