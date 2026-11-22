<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra?style=flat" alt="អាជ្ញាបណ្ណ"></a>
<a href="https://github.com/ombralabs/ombra/commits/main"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="ការដាក់បញ្ជូនចុងក្រោយ"></a>
<br>
<a href="https://github.com/ombralabs/ombra/stargazers"><img src="https://img.shields.io/github/stars/ombralabs/ombra?style=flat" alt="ផ្កាយ"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="ការទាញយក PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="ការទាញយក npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="កំណែចេញផ្សាយ"></a>
</p>

<p align="center">
<a href="#ការដំឡើង"><strong>ការដំឡើង</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-និង-typescript-api">Node.js API</a> ·
<a href="#ការបញ្ចូលបែបមនុស្ស">ការបញ្ចូលបែបមនុស្ស</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>ភាសា</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](README.md)

</details>

<br>

<h3 align="center">Chromium ដែលមានការគ្រប់គ្រងស្នាមម្រាមដៃកម្រិតកូដប្រភព C++ និងការបញ្ចូលបែបមនុស្សដើមនៅខាងក្នុង។</h3>

<table><tr><td>
មិនមែនជាបណ្តុំនៃទង់បញ្ជាបើកដំណើរការ និងមិនមែនជាការចាក់បញ្ចូល JavaScript ពីលើទំព័រនោះទេ។ វាជាឯកសារប្រតិបត្តិ Chromium ពិតប្រាកដដែលមានបំណះកូដស្នាមម្រាមដៃចងក្រងចូលទៅក្នុងកូដប្រភព C++ និងការក្លែងធ្វើការបញ្ចូលដែលដំណើរការនៅខាងក្នុងដំណើរការកម្មវិធីរុករកផ្ទាល់។ តភ្ជាប់ជាមួយ Playwright ឬ Puppeteer ផ្លូវការតាមរយៈ CDP ក្នុងម៉ាស៊ីន — ដោយគ្មានវត្ថុរុំ (wrapper) និងមិនចាំបាច់សរសេរកូដទំព័រឡើងវិញឡើយ។
</td></tr></table>

<br>

<p align="center">
ការជំនួសការបើកដំណើរការដោយផ្ទាល់សម្រាប់ Playwright និង Puppeteer ក្នុង Python និង Node.js។<br>
API ដដែល, selector និងប្រភេទទិន្នន័យដដែល — គ្រាន់តែប្តូរការនាំចូល (import) និងការហៅ <code>launch()</code> ប៉ុណ្ណោះ។
</p>

- **បំណះកូដ Chromium កម្រិតកូដប្រភព** — canvas, WebGL, WebGPU, សំឡេង, ពុម្ពអក្សរ, GPU, អេក្រង់, CSS media queries, ការរាយការណ៍ផ្នែករឹង, WebRTC ដោយគ្មានការលេចធ្លាយ STUN, TLS ClientHello, តំបន់ពេលវេលា, ភាសាតំបន់ និងការដកចេញនូវសញ្ញាស្វ័យប្រវត្តិកម្ម (`navigator.webdriver`, `Runtime.enable`, សញ្ញាសម្គាល់ headless)។
- **ការបញ្ចូលបែបមនុស្សដើមនៅក្នុងដំណើរការកម្មវិធីរុករក (`humanize=True`)** — គន្លងចលនាទស្សន៍ទ្រនិច (`cursory-rs`), ការចុចតម្រង់គោលដៅជាមួយរយៈពេលសង្កត់, ចង្វាក់វាយអក្សរជាមួយការកែកំហុសវាយអក្សរដោយស្វ័យប្រវត្តិ និងរូបវិទ្យានៃការរមូរ ដំណើរការនៅខាងក្នុង Chromium។ SDK ត្រឡប់វត្ថុ `Browser` ដើមសុទ្ធដោយគ្មានថ្នាក់រុំ proxy ឡើយ។
- **ដំណើរការដោយឯករាជ្យ ដោយគ្មានកូនសោ ឬគណនី** — កំណែស្ថាបនាម៉ាស៊ីនបច្ចុប្បន្ន និង Ombra Desktop ដំណើរការក្នុងម៉ាស៊ីនដោយមិនចាំបាច់ចុះឈ្មោះ កូនសោអាជ្ញាបណ្ណ លេខសម្គាល់ផ្នែករឹង ឬម៉ាស៊ីនមេផ្តល់អាជ្ញាបណ្ណឡើយ។
- **ការដំឡើងដោយស្វ័យប្រវត្តិ និងការផ្ទៀងផ្ទាត់ឯកសារប្រតិបត្តិដោយគ្រីបតូក្រាហ្វី** — `pip install ombrabrowser` ឬ `npm install @ombralabs/sdk`; នៅពេលបើកដំណើរការលើកដំបូង SDK នឹងទាញយកកំណែស្ថាបនាដែលឆបគ្នាពី [GitHub Releases](https://github.com/ombralabs/ombra/releases) ហើយផ្ទៀងផ្ទាត់ហត្ថលេខា Ed25519 និងតម្លៃផ្ទៀងផ្ទាត់ SHA-256 របស់វា។
- **ប្រវត្តិរូបអចិន្ត្រៃយ៍ និងប្រព័ន្ធបញ្ជូនបន្តប្រូកស៊ីដែលមានសុវត្ថិភាព** — ប្រវត្តិរូបដែលមានឈ្មោះរក្សាទុកខូគី, `localStorage`, IndexedDB និង `seed` ឆ្លងកាត់ការដំណើរការជាមួយការចាក់សោឆ្លងដំណើរការ; ប្រូកស៊ីដែលមានការផ្ទៀងផ្ទាត់ (HTTP, HTTPS, SOCKS5) ដំណើរការតាមរយៈប្រព័ន្ធបញ្ជូនបន្ត loopback ក្នុងម៉ាស៊ីន ដូច្នេះព័ត៌មានផ្ទៀងផ្ទាត់មិនដែលបង្ហាញនៅក្នុងអាគុយម៉ង់ដំណើរការឡើយ។
- **កម្មវិធីគ្រប់គ្រងប្រវត្តិរូបក្រៅបណ្តាញ Ombra Desktop** — កម្មវិធីកុំព្យូទ័រដើមនៅក្នុងឃ្លាំងកូដនេះ ([`desktop/`](../../desktop/README.md)) ដែលមានកម្មវិធីដំឡើងបង្កើតស្រាប់សម្រាប់ macOS, Linux និង Windows។

**Python (Playwright)៖**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

**Node.js / TypeScript (Playwright)៖**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Puppeteer ក៏ត្រូវបានគាំទ្រផងដែរតាមរយៈ `import { launch } from "@ombralabs/sdk/puppeteer"` ឬ `launchPuppeteer()` ([ព័ត៌មានលម្អិត](#puppeteer))។

**សម្រាប់គេហទំព័រដែលមានការការពារប្រឆាំងបូត** សូមរួមបញ្ចូលប្រូកស៊ីលំនៅឋាន ប្រវត្តិរូបអចិន្ត្រៃយ៍ និងការកំណត់បរិស្ថានដែលស៊ីសង្វាក់គ្នា៖

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # ប្រើ IP លំនៅឋានប្រសើរជាង IP មជ្ឈមណ្ឌលទិន្នន័យ
    fingerprint={"timezone": "auto", "locale": "auto"},  # ផ្គូផ្គងតំបន់ពេលវេលា និងភាសាតំបន់ទៅនឹងច្រកចេញប្រូកស៊ី
    headless=False,                                      # គេហទំព័រខ្លះរកឃើញភាពខុសគ្នានៃរបៀប headless
    humanize=True,                                       # ការក្លែងធ្វើកណ្តុរ ក្តារចុច និងការរមូរដើមក្នុងកម្មវិធីរុករក
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

សូមមើល [ការដោះស្រាយបញ្ហា](#ការដោះស្រាយបញ្ហា) សម្រាប់បញ្ហាទូទៅនៅលើ Linux នៅក្នុងកុងតឺន័រ និងនៅលើគេហទំព័រគោលដៅដែលមានការការពារ។

## ការដំឡើង

**Python (3.10+)៖**

```bash
python -m pip install ombrabrowser

# ជាជម្រើស៖ រកឃើញតំបន់ពេលវេលា និងភាសាតំបន់ដោយស្វ័យប្រវត្តិពីច្រកចេញប្រូកស៊ី (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+)៖**

```bash
# ជាមួយ Playwright (1.60.0+ មិនចាំបាច់ទាញយក Chromium ដើមទេ)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# ឬជាមួយ Puppeteer (Puppeteer 25+ ត្រូវការ Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# ជាជម្រើស៖ កម្មវិធីអានមូលដ្ឋានទិន្នន័យ GeoIP ក្រៅបណ្តាញសម្រាប់ timezone: "auto" និង locale: "auto"
npm install mmdb-lib
```

---

នៅពេលបើកដំណើរការ SDK នឹងស្វែងរកម៉ាស៊ីនតាមលំដាប់តឹងរ៉ឹង៖ `binary_path` (`binaryPath` ក្នុង Node.js), `OMBRA_BINARY_PATH`, ថតម៉ាស៊ីនរបស់ Ombra Desktop និងឃ្លាំងសម្ងាត់ SDK (`~/.ombra/engines`)។ ប្រសិនបើរកមិនឃើញម៉ាស៊ីនដែលឆបគ្នាទេ SDK នឹងទាញយកកំណែស្ថាបនាពី [GitHub Releases](https://github.com/ombralabs/ombra/releases) ផ្ទៀងផ្ទាត់ហត្ថលេខា Ed25519 និងតម្លៃផ្ទៀងផ្ទាត់ SHA-256 រួចរក្សាទុកក្នុងឃ្លាំងសម្ងាត់ក្នុងម៉ាស៊ីន។ មិនចាំបាច់ដំណើរការ `playwright install chromium` ឡើយ។

ដើម្បីបិទការទាញយកដោយស្វ័យប្រវត្តិ សូមបញ្ជូន `download=False` (`download: false` ក្នុង Node.js)។ ដើម្បីទាញយក និងផ្ទៀងផ្ទាត់ម៉ាស៊ីនជាមុន (ឧទាហរណ៍ ក្នុងអំឡុងពេលបង្កើតកុងតឺន័រ) សូមហៅ `ensure_binary()` (`ensureBinary()`) ឬប្រើពាក្យបញ្ជា CLI `install`។

> **ការបើកដំណើរការដោយឯករាជ្យ៖** កំណែស្ថាបនាម៉ាស៊ីនបច្ចុប្បន្ន គឺឥតគិតថ្លៃ ហើយមិនត្រូវការគណនី ឬកូនសោអាជ្ញាបណ្ណឡើយ។ `OMBRA_LICENSE_KEY` និងពាក្យបញ្ជា `login` នៅតែមានសម្រាប់តែភាពឆបគ្នាជាមួយកំណែស្ថាបនាចាស់ៗដែលត្រូវការអាជ្ញាបណ្ណប៉ុណ្ណោះ។

**ការផ្លាស់ប្តូរពី Playwright** ត្រូវការតែពីរបន្ទាត់ប៉ុណ្ណោះ — ប្រតិបត្តិការទំព័រ, locator និងការរង់ចាំទាំងអស់នៅដដែលមិនប្រែប្រួល៖

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # កូដដែលនៅសល់របស់អ្នកដំណើរការដូចដើមដោយមិនចាំបាច់កែប្រែ
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **ដាក់ផ្កាយ (Star)** លើឃ្លាំងកូដប្រសិនបើអ្នកយល់ថាវាមានប្រយោជន៍ ហើយ **[តាមដានកំណែចេញផ្សាយ](https://github.com/ombralabs/ombra/subscription)** ដើម្បីទទួលបានការជូនដំណឹងអំពីកំណែស្ថាបនាថ្មីៗនៃម៉ាស៊ីន, SDK និង Ombra Desktop។

---

## ស្ថានភាពបច្ចុប្បន្ន និងកំណែចេញផ្សាយ

សមាសធាតុនីមួយៗនៅក្នុងប្រព័ន្ធអេកូឡូស៊ីអនុវត្តតាមកិច្ចសន្យាបើកដំណើរការរួម ហើយត្រូវបានកំណត់កំណែដោយឯករាជ្យ។

| សមាសធាតុ | ស្ថានភាព / កំណែ | ទីតាំង |
|---|---|---|
| **កិច្ចសន្យា SDK** | សេចក្តីព្រាង `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.2.0` | [`ombrabrowser` នៅលើ PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.2.0` | [`@ombralabs/sdk` នៅលើ npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **ម៉ាស៊ីន Ombra Chromium** | ចន្លោះកំណែ SDK `>=151.0.7922.108,<159` | ទាញយកដោយស្វ័យប្រវត្តិដោយ SDK ពី [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | កម្មវិធីគ្រប់គ្រងប្រវត្តិរូបក្រៅបណ្តាញ | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **កម្មវិធីរុករកឯករាជ្យ** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **គ្រោងការណ៍ និងការអនុលោមតាម** | JSON Schema + ករណីសាកល្បងរួម | [`spec/schemas`](../../AGENTS.md#sdk-launch-options-and-binary-info-schemas) · [`conformance`](../../AGENTS.md#sdk-conformance-and-stealth-invariants) |
| **វិធីសាស្ត្រត្រួតពិនិត្យភាពលាក់កំបាំង** | 6 ស្រទាប់ (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

សូមមើល [CHANGELOG.md](../../CHANGELOG.md) សម្រាប់ប្រវត្តិកំណែចេញផ្សាយពេញលេញ។

## ហេតុអ្វីត្រូវជ្រើសរើស Ombra

- **បំណះកម្រិតការកំណត់រចនាសម្ព័ន្ធ និង JS ងាយនឹងខូច។** ឧបករណ៍ដូចជា `playwright-stealth`, `puppeteer-extra` និង `undetected-chromedriver` ចាក់បញ្ចូល JavaScript ទៅក្នុងទំព័រ ឬកែសម្រួលទង់បញ្ជាបើកដំណើរការ។ ការធ្វើបច្ចុប្បន្នភាពរបស់ Chrome តែងតែធ្វើឱ្យពួកវាខូចជាប្រចាំ ហើយប្រព័ន្ធរកឃើញទំនើបអាចចាប់បានបំណះទាំងនោះផ្ទាល់ (`Function.prototype.toString`, ភាពមិនប្រក្រតីនៃ prototype, `addScriptToEvaluateOnNewDocument`)។
- **ការកែប្រែត្រូវបានចងក្រងចូលទៅក្នុងកូដប្រភព Chromium។** ស្នាមម្រាមដៃត្រូវបានបង្កើតនៅកម្រិត C++ ហើយអនុវត្តយ៉ាងស៊ីសង្វាក់គ្នានៅទូទាំងហ្វ្រេមមេ, workers និង iframes។ SDK មិនចាក់បញ្ចូលស្គ្រីបណាមួយទៅក្នុងទំព័រ និងមិនធ្វើការជំនួស `Emulation.*` ឡើយ។
- **ការក្លែងធ្វើការបញ្ចូលស្ថិតនៅក្នុងដំណើរការកម្មវិធីរុករក មិនមែនពីលើ Playwright ទេ។** ដោយសារគន្លងកណ្តុរ ការចុចគ្រាប់ចុច និងការរមូរត្រូវបានគ្រប់គ្រងនៅខាងក្នុង Chromium ផ្ទាល់ SDK មិនរុំវត្ថុ Playwright ឬ Puppeteer ទេ — រាល់ locator, ហ្វ្រេម និងបណ្ណាល័យភាគីទីបីទាំងអស់នៅតែបន្តដំណើរការធម្មតា។
- **ស្ថាបត្យកម្មក្នុងម៉ាស៊ីនដោយគ្មានសេវាកម្មបន្ថែម។** គ្មានដំណើរការផ្ទៃខាងក្រោយ (daemon) គ្រប់គ្រង និងគ្មានការបញ្ជូនឆ្លងបណ្តាញរវាងស្គ្រីបរបស់អ្នក និងកម្មវិធីរុករកឡើយ៖ មានតែដំណើរការម៉ាស៊ីនមួយ, loopback CDP ក្នុងម៉ាស៊ីនលើ `127.0.0.1` និងគ្មានដែនកំណត់លើចំនួនប្រវត្តិរូប ឬការដំណើរការស្របគ្នាឡើយ។

## Ombra Desktop

**កម្មវិធីគ្រប់គ្រងប្រវត្តិរូបក្រៅបណ្តាញក្នុងម៉ាស៊ីនដែលមានចំណុចប្រទាក់ក្រាហ្វិក (GUI)។** កូដប្រភពរបស់វាស្ថិតនៅដោយផ្ទាល់ក្នុងឃ្លាំងកូដនេះ ([`desktop/`](../../desktop/README.md)) ហើយត្រូវបានបង្កើតឡើងដោយប្រើ Tauri (Rust + Vue)។

- **ក្រៅបណ្តាញ និងក្នុងម៉ាស៊ីនទាំងស្រុង** — កាតាឡុកប្រវត្តិរូបស្ថិតនៅក្នុងមូលដ្ឋានទិន្នន័យ SQLite ក្នុងម៉ាស៊ីនរបស់អ្នកជាមួយកូនសោអ៊ិនគ្រីបក្នុងម៉ាស៊ីន; មិនចាំបាច់មានគណនី សេវាកម្មពពក ឬការតភ្ជាប់បណ្តាញឡើយ។
- **ការគ្រប់គ្រងប្រវត្តិរូបដែលមានរចនាសម្ព័ន្ធ** — បង្កើតប្រវត្តិរូប ស្វែងរកតាមឈ្មោះ កំណត់ចំណាំ ឬលេខ កែសម្រួលការពិពណ៌នា និងរៀបចំធាតុជាមួយក្រុម ស្លាក ផ្លាកសញ្ញា និងចំណាំនៅក្នុងកាតាឡុក Rust។
- **ធុងសំរាមមានសុវត្ថិភាព** — ការផ្លាស់ទីប្រវត្តិរូបទៅធុងសំរាមរក្សាទុកឯកសាររបស់វានៅលើថាស ដើម្បីឱ្យអ្នកអាចស្តារវាឡើងវិញនៅពេលក្រោយ។
- **គ្មានដែនកំណត់តាមប្រវត្តិរូប** — គ្មានកម្រិតគិតថ្លៃតាមប្រវត្តិរូប ឬកូតាពពកឡើយ៖ ទិន្នន័យទាំងអស់នៅតែជារបស់អ្នក។
- **កម្មវិធីដំឡើងបង្កើតស្រាប់** — macOS Apple Silicon (`.dmg`, ចុះហត្ថលេខា Apple Developer ID និងបញ្ជាក់ភាពត្រឹមត្រូវ), Linux (`.deb` និង `.rpm`) និង Windows x64 (`setup.exe`)។
- **កាតាឡុកដាច់ដោយឡែក** — កំណត់ `OMBRA_DESKTOP_DATA_DIR` ដើម្បីធ្វើការជាមួយកាតាឡុកសាកល្បងដាច់ដោយឡែក ឬច្បាប់ចម្លងបម្រុងទុក។

[ទាញយកកំណែចេញផ្សាយចុងក្រោយ →](https://github.com/ombralabs/ombra/releases) · [ឯកសារ README របស់ Desktop](../../desktop/README.md) · [មគ្គុទ្ទេសក៍ប្រវត្តិរូប និងកូនសោក្នុងម៉ាស៊ីន](../../docs/desktop/README.md)

## ការផ្ទៀងផ្ទាត់ស្នាមម្រាមដៃ និងការត្រួតពិនិត្យភាពលាក់កំបាំង

ជំនួសឱ្យការសន្យាទូលំទូលាយថា "មិនអាចរកឃើញ 100%" Ombra ពឹងផ្អែកលើនីតិវិធីផ្ទៀងផ្ទាត់ដែលអាចធ្វើឡើងវិញបានក្រោមលក្ខខណ្ឌដែលបានកត់ត្រាទុក។ លទ្ធផលជាក់ស្តែងនៅលើគេហទំព័រណាមួយតែងតែអាស្រ័យលើកេរ្តិ៍ឈ្មោះនៃ IP ច្រកចេញ តំបន់ ប្រវត្តិនៃប្រវត្តិរូប កំណែប្រព័ន្ធរកឃើញ និងការកំណត់រចនាសម្ព័ន្ធបើកដំណើរការ។

### ផ្ទៃផ្សេងៗដែលគ្រប់គ្រងដោយម៉ាស៊ីន និង SDK

| ផ្ទៃ / សញ្ញា | Playwright ដើម | Ombra | ការអនុវត្ត |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | បំណះកូដម៉ាស៊ីន C++ |
| `window.chrome` | បាត់នៅក្នុងរបៀប headless | វត្ថុពេញលេញ | ត្រូវគ្នានឹង Chrome ធម្មតា |
| `navigator.plugins` | `0` នៅក្នុងរបៀប headless | សំណុំ plugin ដែលស៊ីសង្វាក់គ្នា | កម្រិតម៉ាស៊ីន |
| User-Agent និង Client Hints | `HeadlessChrome`, ម៉ាកមិនត្រូវគ្នា | `Google Chrome` + `Sec-CH-UA*` ដែលតម្រឹមគ្នា | បំណះកូដ `010-user-agent-and-webdriver` |
| ស្នាម CDP (`Runtime.enable`, `UtilityScript`) | ត្រូវបានសម្គាល់ដោយប្រព័ន្ធរកឃើញ | ទប់ស្កាត់ដោយម៉ាស៊ីន; SDK មិនដែលហៅ `Runtime.enable` ទេ | បំណះកូដ `110-runtime-enable` + លក្ខខណ្ឌថេរ `SI-01` |
| ការលេចធ្លាយ IP តាម WebRTC | បង្ហាញ IP ក្នុងម៉ាស៊ីន/ម៉ាស៊ីនមេ | រាយការណ៍ IP ច្រកចេញដោយមិនបញ្ជូន STUN ពិតប្រាកដ | បំណះកូដ `100-webrtc-leak` (`--webrtc-ip`) |
| TLS និង HTTP/2 | អាស្រ័យលើការកំណត់ | ជង់បណ្តាញ Chromium + ប្រវត្តិរូប ClientHello `chrome-<major>` | បំណះកូដ `210-tls-network-persona` |
| WebGL និង WebGPU | កម្មវិធីបង្ហាញតាមសូហ្វវែរ / GPU មិនត្រូវគ្នា | ដែនកំណត់ និងតារាងផ្នែកបន្ថែម WebGL/WebGPU រួម | បំណះកូដ `070`, `071`, `075`, `955` |
| ពុម្ពអក្សរ ភាសាតំបន់ និងតំបន់ពេលវេលា | តម្លៃរបស់ម៉ាស៊ីនមេ, ភាពខុសគ្នា `Intl` | តារាងពុម្ពអក្សរ, ភាសាតំបន់ ICU និងតំបន់ពេលវេលាដែលស៊ីសង្វាក់គ្នា | បំណះកូដ `040`, `090`, `092`, `230` |
| ការក្លែងធ្វើការបញ្ចូល | ទស្សន៍ទ្រនិចលោតភ្លាមៗ, `fill()` ភ្លាមៗ | ខ្សែកោង `cursory-rs`, ចង្វាក់វាយអក្សរ, រូបវិទ្យារមូរ | បំណះកូដ `135-ombra-humanize` ក្នុងដំណើរការកម្មវិធីរុករក |
| ស្ថិរភាពស្នាមម្រាមដៃ | ផ្លាស់ប្តូរ ឬលេចធ្លាយម៉ាស៊ីនមេ | កំណត់ច្បាស់តាម `seed` ឆ្លងកាត់ការចាប់ផ្តើមឡើងវិញ និងហ្វ្រេម | បំណះកូដ `001`, `002` + ប្រវត្តិរូបអចិន្ត្រៃយ៍ |

### ស្រទាប់ទាំងប្រាំមួយនៃការត្រួតពិនិត្យ

មុនពេលចេញផ្សាយ ឬដាក់ឱ្យប្រើប្រាស់ការកំណត់រចនាសម្ព័ន្ធណាមួយ សូមដំណើរការស្រទាប់ត្រួតពិនិត្យទាំងប្រាំមួយលើកំណែស្ថាបនាម៉ាស៊ីន កម្មវិធីអតិថិជនស្វ័យប្រវត្តិកម្ម និងប្រូកស៊ីជាក់លាក់ដែលអ្នកគ្រោងប្រើប្រាស់៖

| ស្រទាប់ | ឧទាហរណ៍គោលដៅសាកល្បង | លក្ខណៈវិនិច្ឆ័យឆ្លងផុត |
|---|---|---|
| **L0 ការដឹកជញ្ជូន** | TrackMe, ទំព័រលេចធ្លាយ IP/WebRTC, ការបង្ហាញបឋមកថា (header echo) | បង្ហាញតែ IP ច្រកចេញរបស់ប្រូកស៊ីប៉ុណ្ណោះ; JA4 និង HTTP/2 ត្រូវគ្នានឹងកំណែស្ថាបនា Chromium; គ្មានព័ត៌មានផ្ទៀងផ្ទាត់ប្រូកស៊ីក្នុង argv |
| **L1 អត្តសញ្ញាណ** | ការសាកល្បងក្នុងម៉ាស៊ីន, Sannysoft, Intoli, ការពិនិត្យ UA-CH | គ្មានភាពផ្ទុយគ្នារវាង UA, Client Hints, វេទិកា, GPU, ពុម្ពអក្សរ, អេក្រង់ និងភាសាតំបន់ |
| **L2 ស្នាមម្រាមដៃ** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | គ្មានសញ្ញាសម្គាល់ headless ឬ `lie`; ស្នាមម្រាមដៃរក្សាស្ថិរភាពឆ្លងកាត់ការផ្ទុកឡើងវិញ |
| **L3 ស្វ័យប្រវត្តិកម្ម** | rebrowser, brotector, botd, សវនកម្មពាក្យបញ្ជា CDP | គ្មានការលេចធ្លាយ `Runtime.enable`, init-script, binding ឬ `navigator.webdriver` |
| **L4 ឥរិយាបថ** | ការសាកល្បងភាពជាក់លាក់នៃការបញ្ចូល, ដាន humanize, ការសាកល្បងបញ្ហាប្រឈមផ្ទាល់ | ព្រឹត្តិការណ៍ `isTrusted: true`, លំដាប់ និងពេលវេលាធម្មជាតិ, ខ្សែកោងទស្សន៍ទ្រនិច និងការរមូរជាក់ស្តែង |
| **L5 ស្ថិរភាព** | ការបើកដំណើរការដដែលៗ, workers, iframes ប្រភពដូច/ខុសគ្នា, ភាពស្មើគ្នាឆ្លង SDK | `seed` ដដែលបង្កើតស្នាមម្រាមដៃដូចគ្នាបេះបិទនៅទូទាំងបរិបទទាំងអស់ |

នីតិវិធីពេញលេញ ស្ថានភាព (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`) បញ្ជីផ្ទៀងផ្ទាត់សញ្ញា និងគំរូរបាយការណ៍៖ [ភាសាអង់គ្លេស (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) និង [ភាសារុស្ស៊ី (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md)។

## ការប្រៀបធៀប

| មុខងារ | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API ស្វ័យប្រវត្តិកម្ម | Playwright | Playwright | Selenium | **Playwright និង Puppeteer** |
| កម្រិតបំណះកូដ | គ្មាន | ការចាក់បញ្ចូល JS ក្នុងទំព័រ | ទង់បញ្ជាកំណត់រចនាសម្ព័ន្ធ | **កូដប្រភព C++ (Chromium)** |
| `seed` ស្នាមម្រាមដៃស៊ីសង្វាក់គ្នា | ទេ | ទេ | មួយផ្នែក | **បាទ/ចាស តាមប្រវត្តិរូប និង eTLD+1** |
| ការក្លែងធ្វើការបញ្ចូល (`humanize`) | ទេ | ទេ | ទេ | **បង្កើតស្រាប់ក្នុងដំណើរការកម្មវិធីរុករក** |
| ការទប់ស្កាត់ការលេចធ្លាយ `Runtime.enable` / CDP | ទេ | ទេ | មួយផ្នែក | **បំណះកូដម៉ាស៊ីន + លក្ខខណ្ឌថេរ SDK** |
| ប្រូកស៊ីមានការផ្ទៀងផ្ទាត់ដោយគ្មានការលេចធ្លាយ CLI | ទេ | ទេ | មានកម្រិត | **ប្រព័ន្ធបញ្ជូនបន្ត loopback ក្នុងម៉ាស៊ីន** |
| ការញែកប្រវត្តិរូបដាច់ដោយឡែក | បរិបទកម្មវិធីរុករក | បរិបទកម្មវិធីរុករក | ទេ | **ថតប្រវត្តិរូប + ការចាក់សោឯកសារ** |
| កម្មវិធីគ្រប់គ្រងប្រវត្តិរូបក្រៅបណ្តាញ (GUI) | ទេ | ទេ | ទេ | **Ombra Desktop (macOS, Linux, Windows)** |
| ការផ្លាស់ប្តូរពី Playwright | — | ប្តូរការនាំចូល | សរសេរកូដឡើងវិញ | **ប្តូរការនាំចូល និង `launch()`** |

## របៀបដំណើរការ

```mermaid
flowchart LR
    Script["ស្គ្រីបរបស់អ្នក<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + ស្ពានតភ្ជាប់ CDP"]
    Relay["ប្រព័ន្ធបញ្ជូនបន្តប្រូកស៊ីក្នុងម៉ាស៊ីន<br/>នៅពេលត្រូវការផ្ទៀងផ្ទាត់"]
    Engine["Ombra Chromium<br/>ម៉ាស៊ីនដែលបំណះកូដ C++"]
    Client["កម្មវិធីអតិថិជនដើម<br/>Playwright · Puppeteer"]
    Profile[("ប្រវត្តិរូប<br/>seed · ខូគី · ទំហំផ្ទុក")]

    Script -->|"launch()"| SDK
    SDK -->|"ផ្ទៀងផ្ទាត់ + បង្កើតដំណើរការ"| Engine
    SDK -.->|"ផ្ទៀងផ្ទាត់ប្រូកស៊ី"| Relay
    Relay -.-> Engine
    SDK -->|"តភ្ជាប់តាម CDP"| Client
    Script -->|"page API"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **`launch()` ស្វែងរក ឬទាញយកម៉ាស៊ីន** ហើយផ្ទៀងផ្ទាត់ហត្ថលេខា Ed25519 និងតម្លៃផ្ទៀងផ្ទាត់ SHA-256 របស់វា។
2. **ប្រវត្តិរូប និង `seed` ត្រូវបានរៀបចំ។** ប្រវត្តិរូបដែលមានឈ្មោះទទួលបានសោឆ្លងដំណើរការ; ប្រសិនបើប្រូកស៊ីត្រូវការព័ត៌មានផ្ទៀងផ្ទាត់ SDK នឹងចាប់ផ្តើមប្រព័ន្ធបញ្ជូនបន្ត loopback ក្នុងអង្គចងចាំ។
3. **Ombra Chromium ចាប់ផ្តើមដំណើរការ** ជាមួយប្រវត្តិរូបដែលបានជ្រើសរើស ជម្រើសស្នាមម្រាមដៃ និងច្រកបំបាត់កំហុសក្នុងម៉ាស៊ីន (`--remote-debugging-port=0`)។
4. **កម្មវិធីអតិថិជនផ្លូវការតភ្ជាប់។** នៅពេល `DevToolsActivePort` លេចឡើង SDK នឹងភ្ជាប់ Playwright (ជាមួយ `no_defaults=True`) ឬ Puppeteer តាមរយៈ `127.0.0.1` ហើយត្រឡប់វត្ថុ `Browser` ដើម។
5. **ការបិទដំណើរការយ៉ាងស្អាត។** `browser.close()` បញ្ជូន `Browser.close` បញ្ចប់ដើមឈើដំណើរការរបស់ម៉ាស៊ីន បញ្ឈប់ប្រព័ន្ធបញ្ជូនបន្ត និងដោះសោប្រវត្តិរូប។

បន្ទាប់ពីបើកដំណើរការ SDK នឹងដកខ្លួនចេញពីផ្លូវទិន្នន័យ៖ រាល់ពាក្យបញ្ជាទំព័រទាំងអស់ធ្វើដំណើរដោយផ្ទាល់ពី Playwright ឬ Puppeteer ទៅកាន់ Chromium។

### ដែនកំណត់ SDK និងលក្ខខណ្ឌថេរនៃភាពលាក់កំបាំង

[កិច្ចសន្យា SDK v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) អនុវត្តលក្ខខណ្ឌថេរតឹងរ៉ឹងលើ SDK ផ្លូវការទាំងអស់៖

- **គ្មានស្គ្រីបលាក់កំបាំងលើទំព័រ។** SDK មិនដែលហៅ `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` និងមិនដែលកែប្រែលក្ខណសម្បត្តិ DOM ឡើយ។
- **គ្មាន `Runtime.enable`។** ការពិនិត្យភាពរួចរាល់ប្រើតែចំណុចបញ្ចប់ CDP HTTP ក្នុងម៉ាស៊ីន ឬ `Browser.getVersion` ប៉ុណ្ណោះ; SDK មិនដែលបើកដំណើរការ `Runtime`, `Debugger` ឬ `Log` ឡើយ។
- **គ្មានការជំនួស `Emulation.*`។** SDK មិនដែលហៅ `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ឬ `setDeviceMetricsOverride` ទេ — អត្តសញ្ញាណកម្មវិធីរុករកបានមកពីម៉ាស៊ីនផ្ទាល់។
- **គ្មានទង់បញ្ជាហាមឃាត់តាមលំនាំដើម។** SDK មិនដែលបញ្ចូល `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` ឬ `--user-agent` ដោយខ្លួនឯងឡើយ។
- **ប្រើតែ Loopback CDP ប៉ុណ្ណោះ។** ច្រកបំបាត់កំហុសតែងតែភ្ជាប់ទៅ `127.0.0.1`; ការបញ្ជូន `--remote-debugging-address` ដែលមិនមែនជា loopback នឹងត្រូវបានបដិសេធ។
- **គ្មានទិន្នន័យតេឡេម៉ែត្រី និងគ្មានការលេចធ្លាយព័ត៌មានសម្ងាត់។** ព័ត៌មានផ្ទៀងផ្ទាត់ប្រូកស៊ី កូនសោ និងខូគីត្រូវបានលុបបិទបាំងចេញពីកំណត់ហេតុ និងសារកំហុស។

## Python API

### `launch()`

```python
from ombrabrowser import launch

# ការបើកដំណើរការមូលដ្ឋាន (របៀប headless ជាលំនាំដើម)
browser = launch()

# ផ្ទាំងកម្មវិធីរុករកដែលមានការបង្ហាញ (headed)
browser = launch(headless=False)

# ប្រូកស៊ី HTTP ឬ SOCKS5 (ព័ត៌មានផ្ទៀងផ្ទាត់ត្រូវបានគ្រប់គ្រងតាមប្រព័ន្ធបញ្ជូនបន្ត loopback ក្នុងម៉ាស៊ីន)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# វត្ថុប្រូកស៊ីដែលមានបញ្ជីលើកលែង (bypass)
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

# ការគ្រប់គ្រងស្នាមម្រាមដៃ (seed, ប្រព័ន្ធប្រតិបត្តិការ, តំបន់ពេលវេលា/ភាសាតំបន់ស្វ័យប្រវត្តិពីប្រូកស៊ី, អេក្រង់, GPU)
# សម្រាប់ timezone="auto" / locale="auto" សូមដំឡើង៖ pip install "ombrabrowser[geoip]"
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

# ការក្លែងធ្វើកណ្តុរ ក្តារចុច និងការរមូរដើមក្នុងកម្មវិធីរុករក
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# ភ្ជាប់កំណែស្ថាបនាម៉ាស៊ីនជាក់លាក់ និងបញ្ជូនទង់បញ្ជា Chromium បន្ថែម
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

ត្រឡប់វត្ថុ `playwright.sync_api.Browser` ស្តង់ដារ។ រាល់វិធីសាស្ត្រ Playwright ទាំងអស់ដំណើរការធម្មតា (`new_page()`, `new_context()`, `close()` ជាដើម)។ ទំព័រថ្មីមានលំនាំដើមជា `no_viewport=True` ដើម្បីកុំឱ្យទំហំបង្អួចរបស់ប្រវត្តិរូបត្រូវបានសរសេរជាន់ពីលើ។

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

### `launch_context()` និង `launch_context_async()`

អនុគមន៍ជំនួយងាយស្រួលដែលបើកដំណើរការកម្មវិធីរុករក និងត្រឡប់ `BrowserContext` ដោយផ្ទាល់ (ការបិទបរិបទក៏នឹងបញ្ចប់ដំណើរការម៉ាស៊ីនផងដែរ)។ អាគុយម៉ង់ពាក្យគន្លឹះបន្ថែមត្រូវបានបញ្ជូនបន្តទៅ `browser.new_context()` — ដូចជា `storage_state`, `permissions` ឬ `extra_http_headers`៖

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

កំណែអសមកាល (async)៖ `await launch_context_async(...)`។

### `launch_persistent_context()` និង `launch_persistent_context_async()`

បើកដំណើរការកម្មវិធីរុករកជាមួយប្រវត្តិរូបអចិន្ត្រៃយ៍ ហើយត្រឡប់ `BrowserContext` លំនាំដើមរបស់វា។ ខូគី, `localStorage`, IndexedDB, ឃ្លាំងសម្ងាត់ និង `seed` ស្នាមម្រាមដៃត្រូវបានរក្សាទុកឆ្លងកាត់សម័យប្រើប្រាស់។

- ការបញ្ជូន `profile="pricing-eu"` បង្កើតប្រវត្តិរូបក្រោម `~/.ombra/profiles/pricing-eu` ជាមួយមេតាទិន្នន័យក្នុង `.ombra/profile.json` និងឯកសារចាក់សោ។
- ការបញ្ជូន `user_data_dir="./my-profile"` (ឬអាគុយម៉ង់ផ្លូវតាមទីតាំង) ប្រើថតឯកសារជាក់លាក់នោះ។
- ការបើកដំណើរការប្រវត្តិរូបដដែលព្រមគ្នាពីដំណើរការផ្សេងទៀតនឹងបង្កើតកំហុស `ProfileBusyError` ជំនួសឱ្យការធ្វើឱ្យខូចទិន្នន័យប្រវត្តិរូប។

```python
from ombrabrowser import launch_persistent_context

# តាមប្រវត្តិរូបដែលមានឈ្មោះ (រក្សាទុកក្នុង ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # ខូគី ទំហំផ្ទុក និង seed ត្រូវបានរក្សាទុកអចិន្ត្រៃយ៍

# តាមផ្លូវឯកសារជាក់លាក់ (ឧទាហរណ៍ ដើម្បីផ្ទុកផ្នែកបន្ថែម Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

កំណែអសមកាល (async)៖ `await launch_persistent_context_async(...)`។

### អនុគមន៍ជំនួយ និងការវិនិច្ឆ័យ (Python)

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

# ពិនិត្យមើលឯកសារប្រតិបត្តិម៉ាស៊ីនដែលបានកំណត់
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# ទាញយក និងផ្ទៀងផ្ទាត់ម៉ាស៊ីនដោយមិនចាំបាច់បើកកម្មវិធីរុករក
ensure_binary(version="158.0.8127.37-3")

# លុបឯកសារប្រតិបត្តិម៉ាស៊ីនដែលគ្រប់គ្រងដោយ SDK (ប្រវត្តិរូបក្រោម ~/.ombra/profiles មិនត្រូវបានប៉ះពាល់ទេ)
clear_cache()

# មើលជាមុនបែបសាកល្បង (dry-run) នូវពាក្យបញ្ជាបើកដំណើរការដែលបានកំណត់ដោយមិនបើកដំណើរការ Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# អានមេតាទិន្នន័យពេលដំណើរការ (ច្រក CDP, ws_url, seed, pid) និងផ្ទៀងផ្ទាត់ស្ថានភាពដំណើរការ
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # ទាញយក និងផ្ទៀងផ្ទាត់ម៉ាស៊ីន (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # ដំឡើងកំណែស្ថាបនាម៉ាស៊ីនជាក់លាក់
ombrabrowser info                                # ការវិនិច្ឆ័យបរិស្ថាន ឯកសារប្រតិបត្តិ និងភាពអាស្រ័យ (ឈ្មោះផ្សេង៖ doctor)
ombrabrowser info --quick --json                 # របាយការណ៍លឿនដែលម៉ាស៊ីនអាចអានបានដោយមិនបើកដំណើរការឯកសារប្រតិបត្តិ
ombrabrowser info --proxy socks5://user:pass@host:1080  # សាកល្បងការកំណត់ IP ច្រកចេញ តំបន់ពេលវេលា និងភាសាតំបន់តាមរយៈប្រូកស៊ី
ombrabrowser update                              # ពិនិត្យ GitHub Releases និងធ្វើបច្ចុប្បន្នភាពម៉ាស៊ីនក្នុងឃ្លាំងសម្ងាត់
ombrabrowser clear-cache                         # សម្អាតឯកសារប្រតិបត្តិម៉ាស៊ីនក្នុងឃ្លាំងសម្ងាត់ (រក្សាទុកប្រវត្តិរូប)
ombrabrowser login                               # រក្សាទុកកូនសោអាជ្ញាបណ្ណទៅ ~/.ombra/license.key (សម្រាប់កំណែចាស់ៗប៉ុណ្ណោះ)
ombrabrowser logout                              # លុបកូនសោអាជ្ញាបណ្ណដែលបានរក្សាទុក
```

ពាក្យបញ្ជាដូចគ្នានេះក៏អាចប្រើបានតាមរយៈ `python -m ombrabrowser <command>` ផងដែរ។

## Node.js និង TypeScript API

`@ombralabs/sdk` ផ្តល់ជូនកំណែស្ថាបនាទ្វេ ESM + CommonJS ជាមួយនិយមន័យ TypeScript ពេញលេញ (`.d.ts`)។ ទាំង Playwright និង Puppeteer ដំណើរការលើម៉ាស៊ីនតែមួយនៅខាងក្រោម។

### Playwright (លំនាំដើម)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// ការបើកដំណើរការមូលដ្ឋានជាមួយប្រូកស៊ី ស្នាមម្រាមដៃ និងការក្លែងធ្វើការបញ្ចូល
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

// ការបើកដំណើរការងាយស្រួល៖ កម្មវិធីរុករក + context ក្នុងការហៅតែមួយ
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// ប្រវត្តិរូបអចិន្ត្រៃយ៍ — ខូគី, localStorage និង seed ត្រូវបានរក្សាទុកឆ្លងកាត់ការដំណើរការ
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> កំណាត់កូដនីមួយៗខាងលើដំណើរការដោយឯករាជ្យ។ ដើម្បីផ្លាស់ប្តូរកម្មវិធីបើកដំណើរការ Playwright ដែលមានស្រាប់ អ្នកក៏អាចជំនួសការនាំចូលដោយ `import * as chromium from "@ombralabs/sdk"` ហើយរក្សា `await chromium.launch(...)` ដដែល។

### Puppeteer

ប្រើ `launchPuppeteer()` ពី `@ombralabs/sdk` ឬនាំចូលពី `@ombralabs/sdk/puppeteer`៖

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

> **កំណត់ចំណាំអំពី Puppeteer៖** Puppeteer បញ្ជូនចរាចរណ៍ CDP លំនាំដើមច្រើនជាង Playwright ដែលប្រើ `connectOverCDP({ noDefaults: true })`។ សម្រាប់គេហទំព័រដែលមានការត្រួតពិនិត្យ CDP តឹងរ៉ឹង Playwright ត្រូវបានណែនាំ។

### អនុគមន៍ជំនួយ និង CLI (Node.js)

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
await ensureBinary({ version: "158.0.8127.37-3" });
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

## ការបញ្ចូលបែបមនុស្ស

នៅក្នុង Ombra ការក្លែងធ្វើការបញ្ចូល (`humanize`) ត្រូវបានចងក្រង **ដោយផ្ទាល់ចូលទៅក្នុងដំណើរការកម្មវិធីរុករក Chromium** (ដំណើរការដោយ `cursory-rs` និងកម្មវិធីកំណត់កាលវិភាគការបញ្ចូលរបស់ម៉ាស៊ីន) ជាជាងអនុវត្តជាថ្នាក់រុំ JS ជុំវិញកម្មវិធីអតិថិជនស្វ័យប្រវត្តិកម្ម។ នេះមានន័យថា៖

- រាល់សកម្មភាពស្តង់ដាររបស់ Playwright និង Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) ឆ្លងកាត់ជួរការបញ្ចូលតែមួយតាមផ្ទាំងនីមួយៗនៅខាងក្នុងកម្មវិធីរុករក។
- ប៉ារ៉ាម៉ែត្រឥរិយាបថត្រូវបានទាញយកយ៉ាងច្បាស់លាស់ពី `seed` របស់ប្រវត្តិរូប (`--fingerprint-humanize-seed`)។
- SDK មិនដែលរុំ `Page` ឬ `Browser` នៅក្នុងថ្នាក់ proxy ឡើយ — ប្រភេទទិន្នន័យដើម និងឥរិយាបថកម្មវិធីអតិថិជននៅដដែល។

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**អ្វីដែលផ្លាស់ប្តូរជាមួយ `humanize=True`៖**

| សកម្មភាព | ដោយគ្មាន `humanize` | ជាមួយ `humanize=True` |
|---|---|---|
| ចលនាកណ្តុរ | លោតភ្លាមៗ | ខ្សែកោង `cursory-rs` ដែលមានសំទុះ ការផ្អាក និងការហួសគោលដៅបន្តិចបន្តួច |
| ការចុច និងការអូស | ចុចភ្លាមៗ | ចំណុចតម្រង់នៅក្នុងគោលដៅ ការផ្អាកមុនចុច និងរយៈពេលសង្កត់ |
| ការបញ្ចូលអត្ថបទ | កំណត់តម្លៃភ្លាមៗ | ការវាយតាមតួអក្សរនីមួយៗជាមួយចង្វាក់ និងប្លង់ក្តារចុចដែលបានកំណត់ មានកំហុសវាយអក្សរ និងការកែដោយស្វ័យប្រវត្តិម្តងម្កាល; អត្ថបទវែងខ្លាំងត្រូវបានបិទភ្ជាប់តាមរយៈក្ដារតម្បៀតខ្ទាស់ដាច់ដោយឡែកដោយមិនប៉ះពាល់ដល់ក្ដារតម្បៀតខ្ទាស់ប្រព័ន្ធ |
| ការរមូរ | លោតតែម្តង | ស៊េរីព្រឹត្តិការណ៍កង់កណ្តុរ/trackpad តាមប្រវត្តិរូបការបន្ថយល្បឿនដែលបានវាស់វែង |
| ចន្លោះពេលទំនេរ | ទស្សន៍ទ្រនិចនៅស្ងៀម | នៅក្នុងការកំណត់ជាមុន `careful` មានការរសាត់ទស្សន៍ទ្រនិចតិចៗនៅចន្លោះសកម្មភាព |

**ការកំណត់ជាមុន (Presets)** — `default` (ល្បឿនធម្មតា), `careful` (យឺតជាង ប្រុងប្រយ័ត្នជាង ជាមួយចលនាតិចៗពេលទំនេរ) និង `fast` (ល្បឿនលឿនជាង)។ បញ្ជូន `humanize=False` (`humanize: false`) ដើម្បីបិទការក្លែងធ្វើការបញ្ចូលដោយជាក់លាក់។

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

អ្នកអាចបើក/បិទរបៀប ឬប្តូរការកំណត់ជាមុននៅពេលដំណើរការ ដោយមិនចាំបាច់ចាប់ផ្តើមកម្មវិធីរុករកឡើងវិញតាមរយៈដែន CDP `Ombra`៖

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

## ការគ្រប់គ្រងស្នាមម្រាមដៃ និងប្រវត្តិរូប

ម៉ាស៊ីនទាញយកការកំណត់រចនាសម្ព័ន្ធកម្មវិធីរុករកដែលស៊ីសង្វាក់គ្នាពី `seed` តែមួយ។ នៅពេល `seed` ត្រូវបានលុបចោលមិនបញ្ជូន៖

| សេណារីយ៉ូ | ឥរិយាបថ |
|---|---|
| **`launch()` ដោយគ្មានប្រវត្តិរូប** | SDK បង្កើត `seed` ចៃដន្យសម្រាប់សម័យប្រើប្រាស់ ហើយបង្កើតថតបណ្តោះអាសន្នដែលនឹងត្រូវលុបចេញបន្ទាប់ពី `close()`។ |
| **`profile="name"` ឬ `user_data_dir="./dir"`** | `seed` ត្រូវបានរក្សាទុកក្នុង `.ombra/profile.json` ហើយប្រើឡើងវិញរាល់ពេលបើកដំណើរការ — គេហទំព័រមើលឃើញអ្នកចូលមើលត្រឡប់មកវិញជាមួយឧបករណ៍ និងខូគីដដែល។ |
| **`fingerprint={"seed": N, ...}`** | ស្នាមម្រាមដៃកំណត់ច្បាស់ពី `seed` ជាក់លាក់; វាលបន្ថែមជំនួសការកំណត់នីមួយៗខណៈពេលរក្សាផ្នែកដែលនៅសល់ឱ្យស៊ីសង្វាក់គ្នា។ |

សំឡេងរំខាន (noise) របស់ Canvas/audio ត្រូវបានភ្ជាប់តាម `eTLD+1` នីមួយៗ (មានស្ថិរភាពលើគេហទំព័រដដែល មិនអាចភ្ជាប់ទំនាក់ទំនងឆ្លងគេហទំព័រផ្សេងគ្នាបានទេ)។ សំឡេងរំខានភីកសែលសម្រាប់ 2D canvas និង WebGL `readPixels` ត្រូវបានបិទតាមលំនាំដើម ដើម្បីជៀសវាងការបង្កឱ្យប្រព័ន្ធរកឃើញ "Canvas Tampering / Masking" ដំណើរការ ហើយអាចជ្រើសរើសបើកដោយជាក់លាក់តាមរយៈ `--fingerprint-pixel-noise`។

> **គន្លឹះ៖** នៅពេលចូលមើលគេហទំព័រដដែលឡើងវិញ សូមប្រើប្រវត្តិរូបអចិន្ត្រៃយ៍ (`profile="name"` ឬ `launch_persistent_context()`) ជាជាងបញ្ជូន `seed` ថេរទៅ `launch()` បណ្តោះអាសន្ន — ធ្វើបែបនេះ ខូគី, ឃ្លាំងសម្ងាត់ និង `localStorage` នឹងរក្សាភាពស៊ីសង្វាក់គ្នាជាមួយស្នាមម្រាមដៃ។

### វាលនៃវត្ថុ `fingerprint`

ឈ្មោះវាលខាងក្រោមអនុវត្តតាម Python (`snake_case`); Node.js ទទួលយកទាំង `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) និង `snake_case`៖

| វាល | ប្រភេទ | ការពិពណ៌នា |
|---|---|---|
| `seed` | `int` (`>= 0`) | តម្លៃ seed របស់កម្មវិធីបង្កើតដែលកំណត់ការកំណត់រចនាសម្ព័ន្ធស្នាមម្រាមដៃទាំងមូល |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | ប្រព័ន្ធប្រតិបត្តិការគោលដៅ (`navigator.platform`, UA, សំណុំ GPU និងពុម្ពអក្សរ) |
| `os_version` | `string` | តម្រុយកំណែប្រព័ន្ធប្រតិបត្តិការសម្រាប់ Client Hints |
| `timezone` | តំបន់ IANA ឬ `"auto"` | តំបន់ពេលវេលា (ឧ. `"Europe/Berlin"`)។ `"auto"` កំណត់តំបន់ពីច្រកចេញប្រូកស៊ីតាមរយៈ GeoIP |
| `locale` | BCP-47 ឬ `"auto"` | ភាសាតំបន់ (`Accept-Language`, `navigator.languages`, ICU `Intl`)។ `"auto"` កំណត់ភាសាតំបន់ពីច្រកចេញប្រូកស៊ី |
| `screen` | `{"width", "height"}` ឬ `"auto"` | វិមាត្រអេក្រង់ និងផ្ទៃការងារដោយគិតបញ្ចូលរបារភារកិច្ច / របារម៉ឺនុយរបស់ប្រព័ន្ធប្រតិបត្តិការគោលដៅ |
| `gpu` | `{"vendor", "renderer"}` ឬ `"auto"` | ខ្សែអក្សរ WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` ជាក់លាក់ |
| `hardware_concurrency` | `int` ឬ `"auto"` | តម្លៃ `navigator.hardwareConcurrency` ដែលត្រូវរាយការណ៍ |
| `device_memory` | `int` ឬ `"auto"` | តម្លៃ `navigator.deviceMemory` ដែលត្រូវរាយការណ៍ (គិតជា GB) |
| `noise` | `bool` | បើក/បិទសំឡេងរំខានស្នាមម្រាមដៃ (`False` បញ្ជូន `--disable-fingerprint-noise`) |

> រក្សា `seed` ជាប្រភពចម្បងនៃប៉ារ៉ាម៉ែត្រស្នាមម្រាមដៃ៖ ការជំនួសតម្លៃនីមួយៗដោយមិនរក្សាភាពស៊ីសង្វាក់គ្នា (ដូចជាការផ្គូផ្គងប្រព័ន្ធប្រតិបត្តិការជាមួយ GPU ដែលមិនឆបគ្នា) អាចបង្កើតភាពផ្ទុយគ្នាសម្រាប់ប្រព័ន្ធរកឃើញ។

### ទង់បញ្ជាបន្ថែមរបស់ម៉ាស៊ីន (`args`)

ទង់បញ្ជាបន្ថែមរបស់ម៉ាស៊ីន (កំណត់ ឬជំនួសតាមរយៈ `args=[...]`)៖

| ទង់បញ្ជា | គោលបំណង |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | ម៉ាកកម្មវិធីរុករកនៅក្នុង `Sec-CH-UA` (SDK កំណត់លំនាំដើមជា `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | ប្រវត្តិរូប TLS ClientHello ដែលត្រូវគ្នានឹងកំណែចម្បងរបស់ Chrome ដែលបានបញ្ជាក់ (កំណត់ដោយស្វ័យប្រវត្តិដោយ SDK ពីកំណែម៉ាស៊ីន) |
| `--webrtc-ip=<ip>` | ជំនួសអាសយដ្ឋាន IP នៅក្នុងបេក្ខជន WebRTC ICE ដោយមិនបញ្ជូនចរាចរណ៍ STUN ពិតប្រាកដ |
| `--fingerprint-location=<lat,lon>` | កូអរដោនេដែលរាយការណ៍ដោយ `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | កូតាទំហំផ្ទុកដែលរាយការណ៍ដោយ `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | ចំនួនចំណុចប៉ះ (`navigator.maxTouchPoints` និង pointer media queries) |
| `--fingerprint-device-pixel-ratio=<ratio>` | ដង់ស៊ីតេភីកសែលអេក្រង់ (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | ជម្រៅពណ៌អេក្រង់ |
| `--disable-gpu-fingerprint` | បញ្ជូនឆ្លង GPU ពិតរបស់ម៉ាស៊ីនមេ (ខ្សែអក្សរ ដែនកំណត់ និងផ្នែកបន្ថែម WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | បញ្ជូនឆ្លងខ្សែអក្សរ GPU ពិត ខណៈពេលរក្សាការកំណត់ប្រវត្តិរូបផ្សេងទៀត |
| `--disable-fingerprint-noise` | បិទសំឡេងរំខាន canvas/WebGL/audio ខណៈពេលរក្សាប៉ារ៉ាម៉ែត្រអត្តសញ្ញាណឱ្យនៅសកម្ម (ក៏ត្រូវបានកំណត់ដោយ `fingerprint={"noise": False}` ផងដែរ) |
| `--fingerprint-pixel-noise` | បើកសំឡេងរំខានភីកសែលបែប idempotent តាមការជ្រើសរើសសម្រាប់ 2D canvas និង `readPixels` |
| `--profile-label=<text>` | ផ្លាកប្រវត្តិរូបដែលបង្ហាញក្នុងរបារអាសយដ្ឋានកម្មវិធីរុករក (សម្រាប់តែ UI; កំណត់ដោយស្វ័យប្រវត្តិពី `profile`, បញ្ជូនតាម `args` តែនៅពេល `profile` មិនបានកំណត់ប៉ុណ្ណោះ) |

### ការដំឡើងពុម្ពអក្សរនៅលើ Linux

ម៉ាស៊ីនមេ Linux និងកុងតឺន័រកម្រិតអប្បបរមាជារឿយៗខ្វះពុម្ពអក្សរ emoji និង CJK ដែលធ្វើឱ្យការបង្ហាញអត្ថបទ canvas លាក់កំបាំង និង emoji បង្កើតតម្លៃ hash ខុសប្រក្រតី។

**1. ស្រទាប់មូលដ្ឋាន (emoji និង CJK)៖**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. ពុម្ពអក្សរ Windows សម្រាប់ប្រវត្តិរូប Windows (`os="windows"`)៖**
នៅពេលដំណើរការការកំណត់រចនាសម្ព័ន្ធ Windows នៅលើ Linux ការដំឡើងពុម្ពអក្សរពិតពី `C:\Windows\Fonts\` (រួមមាន `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) ធ្វើឱ្យភាពស៊ីសង្វាក់គ្នានៃការរាប់បញ្ជីពុម្ពអក្សរប្រសើរឡើងយ៉ាងខ្លាំង៖

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. ពុម្ពអក្សរ macOS សម្រាប់ប្រវត្តិរូប macOS (`os="macos"`)៖**
ស្រដៀងគ្នានេះដែរ នៅពេលប្រើ `os="macos"` នៅលើ Linux សូមចម្លងពុម្ពអក្សរពី `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` និង `/Library/Fonts/` ទៅក្នុង `~/.local/share/fonts/mac/` រួចដំណើរការ `fc-cache -f`។

នៅក្នុង `Dockerfile` សូមដាក់ពុម្ពអក្សរនៅក្នុងថតប្រព័ន្ធ `/usr/local/share/fonts/`៖

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## ជម្រើសបើកដំណើរការ ការកំណត់រចនាសម្ព័ន្ធ និងកំហុស

### ជម្រើសរបស់ `launch()`

ឈ្មោះជម្រើសអនុវត្តតាម Python API និង [កិច្ចសន្យា SDK](../../docs/sdk-contract.md); Node.js ប្រើឈ្មោះសមមូល `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) ហើយក៏ទទួលយកឈ្មោះផ្សេង `snake_case` ផងដែរ។ ជម្រើសដែលមិនស្គាល់នឹងត្រូវបានបដិសេធដោយ `InvalidOptionError`។

| ជម្រើស | លំនាំដើម | ការពិពណ៌នា |
|---|---|---|
| `headless` | `true` | ដំណើរការដោយគ្មានបង្អួច (`--headless=new`) |
| `proxy` | គ្មាន | URL ប្រូកស៊ី (`http`, `https`, `socks5`) ឬវត្ថុ; ប្រូកស៊ីមានការផ្ទៀងផ្ទាត់ប្រើប្រព័ន្ធបញ្ជូនបន្ត loopback |
| `fingerprint` | គ្មាន | ការកំណត់សម្រាប់ `seed`, ប្រព័ន្ធប្រតិបត្តិការ, តំបន់ពេលវេលា, ភាសាតំបន់, អេក្រង់, GPU, អង្គចងចាំ និងសំឡេងរំខាន |
| `profile` | គ្មាន | ប្រវត្តិរូបអចិន្ត្រៃយ៍ដែលមានឈ្មោះក្រោម `~/.ombra/profiles/<slug>` (មិនអាចប្រើរួមគ្នាជាមួយ `user_data_dir`) |
| `user_data_dir` | បណ្តោះអាសន្ន | ផ្លូវថតប្រវត្តិរូបជាក់លាក់ (មិនអាចប្រើរួមគ្នាជាមួយ `profile`) |
| `args` | `[]` | អាគុយម៉ង់ Chromium បន្ថែម (បញ្ជូនឆ្លងដោយមិនកែប្រែ) |
| `binary_path` | កំណត់ស្វ័យប្រវត្តិ | ផ្លូវជាក់លាក់ទៅឯកសារប្រតិបត្តិម៉ាស៊ីន |
| `version` | env / auto | ការភ្ជាប់កំណែម៉ាស៊ីន (ឧទាហរណ៍ `158.0.8127.37-3`), ជំនួស `OMBRA_VERSION` |
| `timeout_ms` | `30000` | កាលកំណត់សម្រាប់ការចាប់ផ្តើមម៉ាស៊ីន និងការតភ្ជាប់ CDP (1000–600000 ms) |
| `humanize` | លំនាំដើមម៉ាស៊ីន | `False`, `True`, ឬ `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / file | កូនសោសម្រាប់កំណែស្ថាបនាចាស់ដែលមានអាជ្ញាបណ្ណ (មិនចាំបាច់លើកំណែស្ថាបនាបច្ចុប្បន្ន; មិនដែលកត់ត្រាក្នុងកំណត់ហេតុ) |
| `env` | `{}` | អថេរបរិស្ថានបន្ថែមសម្រាប់ដំណើរការម៉ាស៊ីន |
| `download` | `True` | អនុញ្ញាតការទាញយកឯកសារប្រតិបត្តិម៉ាស៊ីនដែលបាត់ដោយស្វ័យប្រវត្តិ |

### អថេរបរិស្ថាន

លំដាប់អាទិភាព៖ **ជម្រើសបើកដំណើរការជាក់លាក់ → អថេរបរិស្ថាន → មេតាទិន្នន័យប្រវត្តិរូប → លំនាំដើម**។

| អថេរ | លំនាំដើម | ការពិពណ៌នា |
|---|---|---|
| `OMBRA_BINARY_PATH` | មិនបានកំណត់ | ផ្លូវជាក់លាក់ទៅឯកសារប្រតិបត្តិម៉ាស៊ីន |
| `OMBRA_CACHE_DIR` | `~/.ombra` | ថតសម្រាប់ម៉ាស៊ីនក្នុងឃ្លាំងសម្ងាត់ និងប្រវត្តិរូបដែលមានឈ្មោះ |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | ប្រភពទាញយកម៉ាស៊ីន; URL ផ្ទាល់ខ្លួនបើករបៀបម៉ាស៊ីនមេកញ្ចក់ចាស់ (`none`/`off` បិទការទាញយក) |
| `OMBRA_VERSION` | ថ្មីបំផុតដែលឆបគ្នា | កំណែម៉ាស៊ីនដែលបានភ្ជាប់ (ឧទាហរណ៍ `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | បណ្តាញចេញផ្សាយម៉ាស៊ីន៖ `stable` (កំណែចេញផ្សាយ GitHub) ឬ `beta` (កំណែចេញផ្សាយសាកល្បង GitHub) |
| `OMBRA_AUTO_UPDATE` | `true` | ពិនិត្យរកកំណែស្ថាបនាម៉ាស៊ីនថ្មីជាងនៅពេលបើកដំណើរការ |
| `OMBRA_SKIP_CHECKSUM` | `false` | សម្រាប់ការអភិវឌ្ឍក្នុងម៉ាស៊ីនតែប៉ុណ្ណោះ៖ បិទការផ្ទៀងផ្ទាត់ SHA-256 (កត់ត្រាការព្រមាន) |
| `OMBRA_LICENSE_KEY` | មិនបានកំណត់ | កូនសោសម្រាប់កំណែស្ថាបនាចាស់ដែលមានអាជ្ញាបណ្ណ (មិនដែលកត់ត្រាក្នុងកំណត់ហេតុ) |
| `OMBRA_TIMEOUT_MS` | `30000` | រយៈពេលអស់កំណត់លំនាំដើមនៃការបើកដំណើរការ (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | កម្រិតលម្អិតនៃកំណត់ហេតុ៖ `error`, `warn`, `info`, `debug` |

### កំហុសដែលមានប្រភេទច្បាស់លាស់

នៅពេលមានការបរាជ័យណាមួយ SDK នឹងបញ្ចប់ដំណើរការម៉ាស៊ីនដែលបានបង្កើត ដោះសោប្រវត្តិរូប និងបង្កើតថ្នាក់រងរបស់ `OmbraError` ដែលមាន `kind` ថេរ និង `details` ដែលបានបិទបាំងព័ត៌មានសម្ងាត់៖

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

ចំណាត់ថ្នាក់កំហុសពេញលេញ និងច្បាប់សាកល្បងឡើងវិញត្រូវបានកត់ត្រានៅក្នុង [កិច្ចសន្យា SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md)។

## វេទិកា ការរួមបញ្ចូល និងកុងតឺន័រ

### វេទិកា និងបរិស្ថានប្រតិបត្តិការដែលគាំទ្រ

| សមាសធាតុ | ការគាំទ្រ | កំណត់ចំណាំ |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | កំណែស្ថាបនាម៉ាស៊ីនឯករាជ្យតាម GitHub Releases; Ombra Desktop ចុះហត្ថលេខា Developer ID និងបញ្ជាក់ភាពត្រឹមត្រូវ |
| **macOS x64 (Intel)** | — | មិនមានការចេញផ្សាយ Chromium 158 បច្ចុប្បន្នទេ |
| **Linux x64** | ✅ | កំណែស្ថាបនាម៉ាស៊ីនឯករាជ្យតាម GitHub Releases; Node.js SDK ត្រូវការ `xz-utils` (`xz`) ដើម្បីពន្លា `.tar.xz` |
| **Windows x64** | ✅ | កំណែស្ថាបនាម៉ាស៊ីនឯករាជ្យតាម GitHub Releases និងកម្មវិធីដំឡើង Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` ត្រូវបានដំឡើងដោយស្វ័យប្រវត្តិជាមួយ `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` ឬ Puppeteer `>=22` (Puppeteer 25+ ត្រូវការ Node.js `>=22.12`) |

### ការរួមបញ្ចូលជាមួយក្របខណ្ឌការងារ និង AI agent

Ombra ដំណើរការជាមួយឧបករណ៍ស្វ័យប្រវត្តិកម្ម ឬក្របខណ្ឌការងារ AI agent ណាមួយដែលទទួលយកឯកសារប្រតិបត្តិ Chromium ផ្ទាល់ខ្លួន ឬតភ្ជាប់តាម CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` និងផ្សេងៗទៀត)៖

```python
# ជម្រើសទី 1៖ កំណត់ផ្លូវឯកសារប្រតិបត្តិដែលបានផ្ទៀងផ្ទាត់ និងអាគុយម៉ង់ម៉ាស៊ីនដែលអាចដំណើរការបានសម្រាប់កម្មវិធីដំណើរការផ្ទាល់ខ្លួនរបស់អ្នក
# ចំណាំ៖ build_launch_options() គឺជាមុខងារជំនួយបែបសាកល្បង (dry-run) — សូមបញ្ជូន user_data_dir និង seed ឱ្យច្បាស់លាស់
# (ប្រវត្តិរូបដែលមានឈ្មោះ និងប្រូកស៊ីដែលមានការផ្ទៀងផ្ទាត់ត្រូវការជម្រើសទី 2)។
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# ជម្រើសទី 2៖ បើកដំណើរការតាម Ombra SDK ហើយបញ្ជូនចំណុចបញ្ចប់ CDP ក្នុងម៉ាស៊ីនទៅក្របខណ្ឌការងាររបស់អ្នក
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# ភ្ជាប់ក្របខណ្ឌការងាររបស់អ្នកទៅ ws_url ឬ cdp_http — ការកំណត់ស្នាមម្រាមដៃ និង humanize
# ដំណើរការនៅខាងក្នុងម៉ាស៊ីន ហើយនៅតែសកម្មសម្រាប់កម្មវិធីអតិថិជន CDP ណាមួយ
```

### ការដំណើរការក្នុង Docker និងលើម៉ាស៊ីនមេ Linux

ឧទាហរណ៍ `Dockerfile` ដែលទាញយក និងផ្ទៀងផ្ទាត់ម៉ាស៊ីនជាមុននៅពេលបង្កើតរូបភាពកុងតឺន័រ៖

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

> **កុងតឺន័រ និងម៉ាស៊ីនមេគេហទំព័រ៖**
> - ប្រសិនបើកុងតឺន័ររបស់អ្នកមិនអាចចាប់ផ្តើមប្រអប់ខ្សាច់ (sandbox) របស់ Chromium បានទេ សូមបញ្ជូន `--no-sandbox` ដោយជាក់លាក់តាមរយៈ `args=["--no-sandbox"]` (SDK មិនដែលបន្ថែមទង់បញ្ជានេះដោយខ្លួនឯងទេ)។
> - ដើម្បីដំណើរការជាមួយ `headless=False` នៅលើម៉ាស៊ីនមេដែលគ្មានអេក្រង់ សូមប្រើ `Xvfb` (សូមមើល [ខាងក្រោម](#ការដោះស្រាយបញ្ហា))។
> - នៅពេលដំណើរការក្រោម `uvicorn` ជាមួយ `uvloop` សូមបញ្ជូន `--loop asyncio` ដើម្បីជៀសវាងការគាំងបំពង់ដំណើរការរង (subprocess pipe)។

## ការដោះស្រាយបញ្ហា

### គេហទំព័ររារាំងរបៀប headless

ប្រព័ន្ធប្រឆាំងបូតខ្លះពិនិត្យភាពខុសគ្នានៃឥរិយាបថ និងការបង្ហាញរូបភាពនៅក្នុងរបៀប headless ទោះបីជាមានបំណះកូដ C++ ក៏ដោយ។ សូមដំណើរការជាមួយ `headless=False` នៅលើអេក្រង់និម្មិតដោយប្រើ `Xvfb`៖

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

បន្ទាប់មកបើកដំណើរការជាមួយប្រូកស៊ីលំនៅឋាន SOCKS5/HTTP, ប្រវត្តិរូបអចិន្ត្រៃយ៍, តំបន់ពេលវេលា/ភាសាតំបន់ដែលផ្គូផ្គងគ្នា, `headless=False` និង `humanize=True` (សូមមើលឧទាហរណ៍ `launch_persistent_context()` នៅផ្នែកខាងលើនៃឯកសារ README នេះ)។

ប្រសិនបើការរារាំងនៅតែបន្តនៅលើ Linux សូមពិនិត្យ [ការដំឡើងពុម្ពអក្សរនៅលើ Linux](#ការដំឡើងពុម្ពអក្សរនៅលើ-linux)។

### គេហទំព័រស្នើសុំការផ្ទៀងផ្ទាត់រាល់ពេលចូលមើល

ការហៅ `launch()` ដោយគ្មាន `profile` ចាប់ផ្តើមពីថតបណ្តោះអាសន្នទទេ និង `seed` ថ្មីរាល់ពេល ដូច្នេះគេហទំព័រចាត់ទុករាល់ការដំណើរការថាជាអ្នកចូលមើលថ្មីស្រឡាងដែលគ្មានខូគី។ សូមប្តូរទៅប្រើ `profile="..."` ឬ `launch_persistent_context(...)` ដើម្បីឱ្យខូគី, `localStorage` និង `seed` ត្រូវបានរក្សាទុកឆ្លងកាត់ការដំណើរការ។

### `ProfileBusyError`

ប្រវត្តិរូបដែលមានឈ្មោះ ឬ `user_data_dir` អាចបើកបានតែក្នុងដំណើរការមួយប៉ុណ្ណោះក្នុងពេលតែមួយ។ សូមកំណត់ឈ្មោះប្រវត្តិរូបផ្សេងគ្នាសម្រាប់កម្មវិធីដំណើរការស្របគ្នានីមួយៗ (`profile=f"worker-{i}"`)។ សោចាស់ដែលនៅសេសសល់ដោយដំណើរការគាំងត្រូវបានរកឃើញ និងសម្អាតដោយស្វ័យប្រវត្តិ។

### តើខ្ញុំត្រូវដំណើរការ `playwright install chromium` ដែរឬទេ?

ទេ។ Ombra ដំណើរការឯកសារប្រតិបត្តិម៉ាស៊ីនផ្ទាល់ខ្លួន ហើយមិនប្រើ Chromium ដើមរបស់ Playwright ឡើយ។ នៅលើ Linux អ្នកត្រូវការតែបណ្ណាល័យប្រព័ន្ធ និង `xz-utils` ប៉ុណ្ណោះ៖

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### ការធ្វើបច្ចុប្បន្នភាព ការប្តូរបណ្តាញ និងការត្រឡប់កំណែម៉ាស៊ីនវិញ

ធ្វើបច្ចុប្បន្នភាព SDK ទៅកំណែចេញផ្សាយចុងក្រោយបំផុត៖

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

សាកល្បងបណ្តាញ `beta` ឬភ្ជាប់/ត្រឡប់ទៅកំណែស្ថាបនាម៉ាស៊ីនជាក់លាក់មួយ៖

```python
# ភ្ជាប់កំណែស្ថាបនាជាក់លាក់សម្រាប់ការបើកដំណើរការជាក់លាក់មួយ
browser = launch(version="158.0.8127.37-3")
```

```bash
# សាកល្បងបណ្តាញ beta (លុបការកំណត់ OMBRA_VERSION — ការភ្ជាប់កំណែ -N ជាក់លាក់នឹងមិនអើពើបណ្តាញឡើយ)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# ឬភ្ជាប់ / ត្រឡប់ទៅកំណែស្ថាបនាម៉ាស៊ីនជាក់លាក់
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# ឬចង្អុលទៅឯកសារប្រតិបត្តិដែលបានបង្កើតក្នុងម៉ាស៊ីន
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS៖ Gatekeeper រារាំងកំណែស្ថាបនាក្នុងម៉ាស៊ីន

កំណែចេញផ្សាយផ្លូវការរបស់ Ombra សម្រាប់ Apple Silicon macOS ត្រូវបានចុះហត្ថលេខាជាមួយវិញ្ញាបនបត្រ Apple Developer ID និងបញ្ជាក់ភាពត្រឹមត្រូវ។ ប្រសិនបើអ្នកដំណើរការកំណែស្ថាបនាអ្នកអភិវឌ្ឍន៍ក្នុងម៉ាស៊ីនដែលគ្មានហត្ថលេខា ហើយ macOS ដាក់វាក្នុងការដាក់ឱ្យនៅដាច់ដោយឡែក (quarantine) សូមលុបគុណលក្ខណៈ quarantine តែម្តងប៉ុណ្ណោះ៖

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### ការរង់ចាំនៅលើទំព័រក្នុង Python បែប synchronous

នៅក្នុង Playwright បែប synchronous ការហៅ `time.sleep(15)` វែងតែមួយដងបន្ទាប់ពី `page.goto()` នឹងផ្អាករង្វិលជុំព្រឹត្តិការណ៍ (event loop) របស់ Playwright ដែលអាចធ្វើឱ្យទំព័រផ្ទៀងផ្ទាត់គាំង។ សូមរង់ចាំជាចន្លោះខ្លីៗជាមួយការហៅបរិបទស្រាលមួយជំនួសវិញ៖

```python
import time

for _ in range(15):
    page.context.cookies()  # រក្សាឱ្យ Playwright បន្តដំណើរការដោយមិនប៉ះពាល់ដល់ DOM របស់ទំព័រ
    time.sleep(1)
```

នៅក្នុង Python បែប async សូមប្រើ `await asyncio.sleep(...)`; នៅក្នុង Node.js សូមប្រើ `await new Promise(r => setTimeout(r, ms))`។ សូមជៀសវាងការហៅ `page.wait_for_timeout()` ញឹកញាប់ និងការហៅ `page.evaluate()` ដែលមិនចាំបាច់មុនពេលត្រួតពិនិត្យ ដើម្បីកុំឱ្យបង្កើតចរាចរណ៍ CDP បន្ថែម។

## សុវត្ថិភាព

- **ភាពត្រឹមត្រូវ និងបូរណភាពនៃម៉ាស៊ីន។** មុនពេលពន្លា SDK នឹងផ្ទៀងផ្ទាត់ហត្ថលេខា Ed25519 នៃកញ្ចប់ចេញផ្សាយធៀបនឹងកូនសោសាធារណៈដែលបានភ្ជាប់ ហើយពិនិត្យតម្លៃ SHA-256 នៃទាំងបណ្ណសារ និងឯកសារប្រតិបត្តិ។
- **CDP ក្នុងម៉ាស៊ីនតែប៉ុណ្ណោះ។** ច្រកបំបាត់កំហុសភ្ជាប់យ៉ាងតឹងរ៉ឹងទៅ `127.0.0.1`។ កុំបើកចំហច្រក CDP ទៅកាន់បណ្តាញសាធារណៈដោយគ្មានការផ្ទៀងផ្ទាត់បន្ថែម — CDP ផ្តល់ការគ្រប់គ្រងពេញលេញលើកម្មវិធីរុករក។
- **ការញែកព័ត៌មានសម្ងាត់ដាច់ដោយឡែក។** ព័ត៌មានផ្ទៀងផ្ទាត់ប្រូកស៊ីស្ថិតនៅក្នុងអង្គចងចាំនៃប្រព័ន្ធបញ្ជូនបន្ត loopback ក្នុងម៉ាស៊ីនតែប៉ុណ្ណោះ ហើយមិនដែលបង្ហាញក្នុងបន្ទាត់ពាក្យបញ្ជាដំណើរការ មេតាទិន្នន័យប្រវត្តិរូប កំណត់ហេតុ ឬព័ត៌មានលម្អិតអំពីកំហុសឡើយ។
- **គ្មានទិន្នន័យតេឡេម៉ែត្រី។** SDK មិនបញ្ជូនទិន្នន័យវិភាគ របាយការណ៍គាំង ឬសញ្ញាបណ្តាញលាក់កំបាំងណាមួយឡើយ។

សូមរាយការណ៍បញ្ហាសុវត្ថិភាពជាលក្ខណៈឯកជនតាម [SECURITY.md](../../SECURITY.md)។

## ផែនទីឃ្លាំងកូដ

```text
.
├── README.md                    # ឯកសារ README គោល (ភាសាអង់គ្លេស)
├── translations/
│   ├── km/README.md             # ឯកសារនេះ (ខ្មែរ)
│   ├── ru/README.md             # ការបកប្រែជាភាសារុស្ស៊ី
│   └── <locale>/README.md       # ការបកប្រែជាភាសាផ្សេងទៀតចំនួន 19
├── desktop/                     # Ombra Desktop (Tauri៖ កាតាឡុក Rust + ចំណុចប្រទាក់ Vue)
├── docs/
│   ├── architecture.md          # ស្ថាបត្យកម្ម ដែនកំណត់ទំនុកចិត្ត វដ្តជីវិត
│   ├── sdk-contract.md          # កិច្ចសន្យាបើកដំណើរការ v0.2, ជម្រើស, កំហុស, លក្ខខណ្ឌថេរ
│   ├── stealth-checkup.md       # វិធីសាស្ត្រត្រួតពិនិត្យភាពលាក់កំបាំង (ភាសាអង់គ្លេស)
│   ├── stealth-checkup.ru.md    # វិធីសាស្ត្រត្រួតពិនិត្យភាពលាក់កំបាំង (ភាសារុស្ស៊ី)
│   ├── versioning.md            # ការកំណត់កំណែ SDK, ម៉ាស៊ីន និងកម្មវិធីអតិថិជន
│   └── desktop/                 # មគ្គុទ្ទេសក៍ប្រវត្តិរូប និងកូនសោក្នុងម៉ាស៊ីនរបស់ Desktop
├── sdks/
│   ├── manifest.json            # បញ្ជីចុះឈ្មោះ SDK ដែលម៉ាស៊ីនអាចអានបាន
│   ├── README.md                # ប្លង់ SDK និងច្បាប់រួមចំណែក
│   ├── python/                  # Python SDK (បោះពុម្ពជា ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (បោះពុម្ពជា @ombralabs/sdk)
│   └── ...                      # គ្រោងកិច្ចសន្យាសម្រាប់ភាសាផ្សេងទៀត (Go, Rust, C#, Java, PHP, Ruby)
├── tools/check_repo.py          # ឧបករណ៍ផ្ទៀងផ្ទាត់រចនាសម្ព័ន្ធ គ្រោងការណ៍ និងតំណភ្ជាប់ (CI)
└── .github/workflows/ci.yml
```

ឃ្លាំងកូដនេះផ្ទុកកិច្ចសន្យា SDK, គ្រោងការណ៍, ករណីអនុលោមតាម, ឯកសារ និងកូដប្រភព Ombra Desktop។ បំណះកូដម៉ាស៊ីន Chromium ត្រូវបានថែទាំក្នុងឃ្លាំងកូដដាច់ដោយឡែក ដោយមានកំណែស្ថាបនាចងក្រងស្រាប់បោះពុម្ពផ្សាយតាមរយៈ [GitHub Releases](https://github.com/ombralabs/ombra/releases)។

## សំណួរដែលសួរញឹកញាប់ (FAQ)

### តើនេះជា fork របស់ Playwright ឬ?

ទេ។ SDK តភ្ជាប់កម្មវិធីអតិថិជន Playwright (ឬ Puppeteer) ផ្លូវការទៅកាន់ Ombra Chromium តាមរយៈ CDP ក្នុងម៉ាស៊ីន។ ប្រភេទទិន្នន័យ, locator, ការរង់ចាំ និងវត្ថុទំព័រទាំងអស់នៅតែជាស្តង់ដារ។

### តើ Ombra ឥតគិតថ្លៃដែរឬទេ ហើយតើខ្ញុំត្រូវការកូនសោអាជ្ញាបណ្ណឬ?

កូដប្រភព SDK នៅក្នុងឃ្លាំងកូដនេះគឺជាប្រភពបើកចំហក្រោម Apache License 2.0។ កំណែស្ថាបនាម៉ាស៊ីនបច្ចុប្បន្ន និងកម្មវិធីគ្រប់គ្រងប្រវត្តិរូបក្នុងម៉ាស៊ីន Ombra Desktop ដំណើរការដោយឥតគិតថ្លៃ និងឯករាជ្យ — ដោយគ្មានគណនី កូនសោអាជ្ញាបណ្ណ លេខសម្គាល់ផ្នែករឹង ឬដែនកំណត់ចំនួនប្រវត្តិរូបឡើយ។ `license_key` និង `OMBRA_LICENSE_KEY` ត្រូវការតែសម្រាប់កំណែស្ថាបនាចាស់ៗដែលមានអាជ្ញាបណ្ណប៉ុណ្ណោះ។

### តើខ្ញុំត្រូវដំឡើង Ombra Desktop ដើម្បីប្រើ SDK ដែរឬទេ?

ទេ។ SDK បង្កើតដំណើរការម៉ាស៊ីនដោយផ្ទាល់ជាដំណើរការកូន (child process) ដែលធ្វើឱ្យវាស័ក្តិសមសម្រាប់ស្គ្រីប កុងតឺន័រ និង CI។ Ombra Desktop គឺជាជម្រើសបន្ថែម ប្រសិនបើអ្នកចង់គ្រប់គ្រងកាតាឡុកប្រវត្តិរូបក្នុងម៉ាស៊ីនតាមរយៈ GUI។

### តើ Ombra ខុសពី `playwright-stealth` យ៉ាងដូចម្តេច?

`playwright-stealth` ចាក់បញ្ចូល JavaScript ទៅក្នុងទំព័រពីលើកម្មវិធីរុករកធម្មតា ហើយប្រព័ន្ធរកឃើញទំនើបតែងតែកំណត់អត្តសញ្ញាណបំណះទាំងនោះផ្ទាល់។ Ombra ចងក្រងការកែប្រែរបស់វាចូលទៅក្នុងកូដប្រភព Chromium ហើយ SDK មិនចាក់បញ្ចូលស្គ្រីបណាមួយទៅក្នុងទំព័រឡើយ។

### តើខ្ញុំអាចប្រើប្រូកស៊ីផ្ទាល់ខ្លួនបានទេ?

បាន។ បញ្ជូនប្រូកស៊ី `http://`, `https://` ឬ `socks5://` នៅក្នុង `proxy`។ នៅពេលមានព័ត៌មានផ្ទៀងផ្ទាត់ SDK នឹងដំណើរការប្រព័ន្ធបញ្ជូនបន្ត loopback ក្នុងម៉ាស៊ីន ដើម្បីកុំឱ្យព័ត៌មានទាំងនោះបង្ហាញក្នុងអាគុយម៉ង់ដំណើរការ។ សូមចំណាំថាកម្មវិធីអតិថិជន `context.request` / `page.request` ផ្ទាល់របស់ Playwright អាចរំលងការកំណត់ប្រូកស៊ីកម្រិតកម្មវិធីរុករក — ដើម្បីធានាថាចរាចរណ៍ឆ្លងកាត់ប្រូកស៊ី សូមហៅ `fetch()` ពីបរិបទទំព័រ។

### តើកំណែ Playwright និង Puppeteer ណាខ្លះដែលត្រូវបានគាំទ្រ?

Python SDK ត្រូវការ Playwright `>=1.60,<2.0` (ដំឡើងដោយស្វ័យប្រវត្តិជាមួយ `ombrabrowser`)។ Node.js SDK គាំទ្រ `playwright-core@^1.60.0` ឬ `puppeteer-core >=22.0.0`។ សូមមើល [មគ្គុទ្ទេសក៍ការកំណត់កំណែ](../../docs/versioning.md) សម្រាប់ច្បាប់ភាពឆបគ្នា។

### តើ Ombra ធានាថាឆ្លងផុតការត្រួតពិនិត្យបូតទាំងអស់ដែរឬទេ?

ទេ។ ការរកឃើញគឺជាគោលដៅដែលផ្លាស់ប្តូរជានិច្ច ដែលអាស្រ័យលើគេហទំព័រ តំបន់ កេរ្តិ៍ឈ្មោះ IP ប្រវត្តិប្រវត្តិរូប និងកំណែប្រព័ន្ធរកឃើញ។ សូមប្រើ [វិធីសាស្ត្រត្រួតពិនិត្យភាពលាក់កំបាំង](../../docs/stealth-checkup.md) ដើម្បីវាស់វែង និងតាមដានការកំណត់រចនាសម្ព័ន្ធជាក់លាក់មួយដោយវត្ថុបំណង។

### តើ Ombra ត្រូវបានបង្កើតឡើងសម្រាប់ករណីប្រើប្រាស់អ្វីខ្លះ?

Ombra ត្រូវបានបង្កើតឡើងសម្រាប់ស្វ័យប្រវត្តិកម្មដែលមានការអនុញ្ញាត ការធ្វើតេស្ត QA ការតាមដាន ការស្រាវជ្រាវ និងការគ្រប់គ្រងប្រវត្តិរូបការងារដាច់ដោយឡែក។ ការចូលប្រើដោយគ្មានការអនុញ្ញាត ការលួចសាកល្បងព័ត៌មានសម្ងាត់ (credential stuffing) និងការរំលោភបំពានមិនត្រូវបានគាំទ្រឡើយ។

## ការរួមចំណែក

គោលការណ៍ណែនាំអំពីការរួមចំណែកមាននៅក្នុង [CONTRIBUTING.md](../../CONTRIBUTING.md), ស្តង់ដារសហគមន៍មាននៅក្នុង [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) និងការណែនាំ SDK មាននៅក្នុង [sdks/README.md](../../sdks/README.md)។

- ធ្វើបច្ចុប្បន្នភាព [កិច្ចសន្យា SDK](../../docs/sdk-contract.md) និង [គ្រោងការណ៍](../../AGENTS.md#sdk-launch-options-and-binary-info-schemas) មុនពេលបន្ថែមជម្រើសបើកដំណើរការថ្មី។
- នៅពេលផ្លាស់ប្តូរឥរិយាបថ SDK សូមធ្វើបច្ចុប្បន្នភាពការអនុវត្ត ការធ្វើតេស្ត និងករណីរួមនៅក្នុង [conformance](../../AGENTS.md#sdk-conformance-and-stealth-invariants)។
- ដំណើរការ `python3 tools/check_repo.py` មុនពេលបើក pull request ដើម្បីផ្ទៀងផ្ទាត់ប្លង់ឃ្លាំងកូដ និងតំណភ្ជាប់។

## អាជ្ញាបណ្ណ

កូដប្រភព SDK នៅក្នុងឃ្លាំងកូដនេះត្រូវបានផ្តល់អាជ្ញាបណ្ណក្រោម [Apache License 2.0](../../LICENSE)។ អាជ្ញាបណ្ណនេះមិនផ្តល់សិទ្ធិលើពាណិជ្ជសញ្ញារបស់ Ombra ម៉ាស៊ីន Ombra Chromium ឬ Ombra Desktop ទេ — សូមមើល [NOTICE](../../NOTICE) សម្រាប់លក្ខខណ្ឌពាណិជ្ជសញ្ញា និងភាគីទីបី។

## តំណភ្ជាប់

- 🌐 **គេហទំព័រ** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **កំណែចេញផ្សាយ (ម៉ាស៊ីន និង Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **កំណត់ត្រាការផ្លាស់ប្តូរ** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **កំហុស និងសំណើមុខងារ** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **អង្គការ** — [Ombra Labs](https://github.com/ombralabs)
