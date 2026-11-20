# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Python और Node.js में `launch()` Ombra Chromium शुरू करता है और Playwright का `Browser` ऑब्जेक्ट लौटाता है। Node.js में Puppeteer के लिए `launchPuppeteer()` इस्तेमाल करें।

**[इंस्टॉलेशन](#इंस्टॉलेशन)** · <a href="../../README.md">English</a>

<details>
<summary>भाषाएँ</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Chromium में फ़िंगरप्रिंट नियंत्रण

Ombra के फ़िंगरप्रिंट नियंत्रण Chromium में ही लागू किए गए हैं। इनमें कैनवास, WebGL, ऑडियो, फ़ॉन्ट, लॉजिकल प्रोसेसर की संख्या, पेज के तत्वों का आकार और स्थिति, GPU की पहचान, समय क्षेत्र और ऑटोमेशन के संकेत शामिल हैं। इंजन Chromium के TLS और HTTP/2 स्टैक का उपयोग करता है। उपयोगकर्ता के इनपुट जैसी गतिविधि ब्राउज़र की प्रक्रिया में ही होती है।

SDK इंजन को स्थानीय मशीन पर शुरू करता है और Chrome DevTools Protocol (CDP) के ज़रिए ऑटोमेशन क्लाइंट से जोड़ता है। इसे स्क्रिप्ट, कंटेनर या CI में चलाने के लिए Ombra डेस्कटॉप ऐप की ज़रूरत नहीं है।

## स्थिति

इन उदाहरणों में Python और Node.js के प्रकाशित अल्फ़ा पैकेज इस्तेमाल हुए हैं। इस रिपॉज़िटरी में साझा लॉन्च कॉन्ट्रैक्ट और आठ SDK के शुरुआती ढाँचे भी हैं।

| घटक | स्थिति |
|---|---|
| [SDK API कॉन्ट्रैक्ट](../../docs/sdk-contract.md) | मसौदा `0.1.0` |
| Python SDK | `0.1.3` अल्फ़ा · [`ombrabrowser` (PyPI)](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` अल्फ़ा · [`@ombralabs/sdk` (npm)](https://www.npmjs.com/package/@ombralabs/sdk) |
| [साझा स्कीमा](../../spec/schemas) | लॉन्च विकल्प और इंजन बाइनरी की जानकारी |
| [भाषाओं के बीच अनुरूपता](../../conformance) | दोनों SDK के लिए साझा परीक्षण |
| [स्टेल्थ जाँच](../../docs/stealth-checkup.md) | परीक्षण के मानदंड और रिपोर्ट का प्रारूप |

## इंस्टॉलेशन

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Puppeteer के लिए `playwright-core` की जगह `puppeteer-core` इंस्टॉल करें। क्लाइंट और रनटाइम के समर्थित संस्करण [npm पैकेज के पेज](https://www.npmjs.com/package/@ombralabs/sdk) पर दिए गए हैं।

SDK पहले Python के `binary_path` या Node.js के `binaryPath` में दिया गया पथ जाँचता है। फिर वह क्रम से `OMBRA_BINARY_PATH`, डेस्कटॉप ऐप की इंजन डायरेक्टरी और SDK का कैश देखता है। इंजन न मिलने पर SDK उसे डाउनलोड करके सत्यापित करता है।

डाउनलोड बंद करने के लिए Python में `download=False` या Node.js में `download: false` दें। ब्राउज़र खोले बिना इंजन तैयार करने के लिए Python में `ensure_binary()` या Node.js में `ensureBinary()` कॉल करें।

## क्विक स्टार्ट

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

नाम वाले प्रोफ़ाइल की कुकी और साइट डेटा दोबारा इस्तेमाल करने के लिए पेज उसी प्रोफ़ाइल के मौजूदा ब्राउज़र कॉन्टेक्स्ट में खोलें। इस उदाहरण में प्रॉक्सी भी सेट की गई है।

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

Puppeteer का `Browser` पाने के लिए `launchPuppeteer()` कॉल करें।

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## ड्रॉप-इन माइग्रेशन

Playwright वाली Python स्क्रिप्ट में `ombrabrowser` इंस्टॉल करें और इम्पोर्ट तथा ब्राउज़र शुरू करने वाली कॉल बदलें। पेज मेथड, टाइप और सेलेक्टर अब भी Playwright के ही हैं।

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Node.js में ये दो पंक्तियाँ बदलें।

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## यह कैसे काम करता है

```mermaid
flowchart LR
    Script["आपकी स्क्रिप्ट<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP ब्रिज"]
    Engine["Ombra Chromium<br/>पैच किया गया इंजन"]
    Client["नेटिव ऑटोमेशन क्लाइंट"]
    Profile[("प्रोफ़ाइल<br/>सीड · कुकीज़ · एक्सटेंशन")]

    Script -->|launch()| SDK
    SDK -->|स्पॉन| Engine
    SDK -->|CDP से कनेक्ट| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` इंजन को ढूँढ़ता या डाउनलोड करता है और उसकी बाइनरी सत्यापित करता है।
2. SDK प्रोफ़ाइल की डायरेक्टरी और seed चुनता है। अगर प्रॉक्सी के लिए प्रमाणीकरण ज़रूरी है तो SDK एक स्थानीय रिले शुरू करता है।
3. SDK चुने गए प्रोफ़ाइल, लॉन्च विकल्पों और लूपबैक डीबग पोर्ट के साथ Chromium शुरू करता है।
4. `DevToolsActivePort` तैयार होने पर SDK Playwright या Puppeteer को CDP से जोड़ता है और उस क्लाइंट का `Browser` लौटाता है।
5. `browser.close()` इंजन बंद करता है और प्रोफ़ाइल का लॉक हटा देता है।

लॉन्च के बाद क्लाइंट पेज के कमांड सीधे Chromium को भेजता है।

## SDK मैट्रिक्स

| रनटाइम | प्रकाशित पैकेज | ब्राउज़र ऑब्जेक्ट |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

छह अन्य SDK के लिए अभी शुरुआती ढाँचे हैं। उनके प्रस्तावित पैकेज और क्लाइंट [SDK मैनिफ़ेस्ट](../../sdks/manifest.json) में दिए गए हैं। डायरेक्टरी की संरचना [SDK गाइड](../../sdks/README.md) में समझाई गई है।

| लक्षित रनटाइम | प्रस्तावित पैकेज | क्लाइंट या रिटर्न टाइप |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## लॉन्च विकल्प

नीचे Python API और SDK कॉन्ट्रैक्ट में दिए विकल्पों के नाम हैं। Node.js में इनके नाम camelCase में लिखे जाते हैं, जैसे `timeoutMs`, `userDataDir` और `binaryPath`।

| विकल्प | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `headless` | `true` | इंजन को बिना विंडो के चलाएँ |
| `proxy` | कोई नहीं | प्रॉक्सी URL या ऑब्जेक्ट; प्रमाणीकरण वाली प्रॉक्सी लूपबैक रिले उपयोग करती हैं |
| `fingerprint` | कोई नहीं | seed और OS, समय क्षेत्र, लोकेल, स्क्रीन व GPU की सेटिंग |
| `profile` | कोई नहीं | स्थायी कुकीज़, स्टोरेज और सीड वाली नामित प्रोफ़ाइल |
| `user_data_dir` | अस्थायी | स्पष्ट प्रोफ़ाइल निर्देशिका, `profile` के साथ परस्पर अनन्य |
| `args` | `[]` | अतिरिक्त इंजन फ़्लैग, बिना बदलाव के पास किए जाते हैं |
| `timeout_ms` | `30000` | लॉन्च और CDP कनेक्शन के लिए समय सीमा, मिलीसेकंड में |
| `humanize` | इंजन डिफ़ॉल्ट | `false`, `true` या कोई प्रीसेट |
| `binary_path` | निर्धारित | किसी विशिष्ट इंजन बाइनरी का उपयोग करें |
| `download` | `true` | अनुपस्थित इंजन बाइनरी डाउनलोड करें |

[SDK कॉन्ट्रैक्ट](../../docs/sdk-contract.md) में सभी लॉन्च विकल्प, त्रुटियों के प्रकार और प्रोफ़ाइल के नियम दिए गए हैं।

## बाइनरी प्रबंधन

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # इंजन चलाए बिना डाउनलोड और सत्यापित करें
clear_cache()     # डाउनलोड किए गए इंजन हटाएँ और प्रोफ़ाइल सुरक्षित रखें
```

लॉन्च से पहले SDK इंजन का SHA-256 चेकसम जाँचता है। प्रोडक्शन में यह जाँच चालू रखें। `OMBRA_SKIP_CHECKSUM=1` केवल स्थानीय डेवलपमेंट बिल्ड के लिए है।

## कॉन्फ़िगरेशन

| वेरिएबल | डिफ़ॉल्ट | अर्थ |
|---|---|---|
| `OMBRA_BINARY_PATH` | सेट नहीं | स्पष्ट इंजन बाइनरी |
| `OMBRA_CACHE_DIR` | `~/.ombra` | प्रबंधित बाइनरी और नामित प्रोफ़ाइल |
| `OMBRA_DOWNLOAD_URL` | रिलीज़ एंडपॉइंट | बाइनरी डाउनलोड के लिए बेस URL |
| `OMBRA_VERSION` | नवीनतम संगत | निर्धारित किया जाने वाला इंजन संस्करण |
| `OMBRA_AUTO_UPDATE` | `true` | लॉन्च पर नए इंजन की जाँच करें |
| `OMBRA_SKIP_CHECKSUM` | `false` | केवल डेवलपमेंट के लिए |
| `OMBRA_LICENSE_KEY` | सेट नहीं | इंजन को पास किया जाता है |
| `OMBRA_TIMEOUT_MS` | `30000` | लॉन्च की डिफ़ॉल्ट समय सीमा, मिलीसेकंड में |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

प्राथमिकता: पहले स्पष्ट विकल्प, फिर एनवायरनमेंट वेरिएबल, फिर प्रोफ़ाइल मेटाडेटा, और अंत में डिफ़ॉल्ट।

## तुलना

| विशेषता | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright या Puppeteer |
| पैच स्तर | कोई नहीं | पेज के भीतर JavaScript | कॉन्फ़िग फ़्लैग | इंजन सोर्स |
| फ़िंगरप्रिंट सीड | नहीं | नहीं | आंशिक | प्रति प्रोफ़ाइल |
| मानव-सदृश इनपुट | नहीं | नहीं | नहीं | इंजन |
| प्रोफ़ाइल आइसोलेशन | ब्राउज़र कॉन्टेक्स्ट | ब्राउज़र कॉन्टेक्स्ट | नहीं | यूज़र डेटा निर्देशिका |
| ड्रॉप-इन माइग्रेशन | — | इम्पोर्ट बदलना | दोबारा लिखना | इम्पोर्ट बदलना |

जाँच का परिणाम साइट, एग्ज़िट IP और प्रोफ़ाइल पर निर्भर करता है। मापने का तरीका [जाँच की प्रक्रिया](../../docs/stealth-checkup.md) में दिया गया है।

## स्टेल्थ इंजन का गुण है

फ़िंगरप्रिंट सेटिंग्स इंजन लागू करता है। SDK उसे प्रोफ़ाइल सीड और स्पष्ट लॉन्च विकल्प पास करते हैं।

| परत | Ombra इसे कहाँ संभालता है |
|---|---|
| TLS और HTTP/2 | Chromium का अपना नेटवर्क स्टैक, जो इंजन बिल्ड के संस्करण से मेल खाता है |
| ब्राउज़र पहचान | प्रोफ़ाइल सीड से नियंत्रित सोर्स-स्तरीय इंजन पैच |
| ऑटोमेशन सरफ़ेस | WebDriver सिग्नल के लिए इंजन पैच; SDK `Runtime.enable` कॉल नहीं करता |
| इनपुट | ब्राउज़र प्रक्रिया के भीतर मानव-सदृश पॉइंटर, कीबोर्ड और स्क्रॉल |
| नेटवर्क सुसंगति | प्रॉक्सी-सजग टाइम ज़ोन और लोकेल निर्धारण |
| स्टेट | प्रत्येक प्रोफ़ाइल के लिए अलग यूज़र डेटा निर्देशिका |

### SDK सीमाएँ

- CDP का डीबग पोर्ट केवल लूपबैक पर स्थानीय कनेक्शन स्वीकार करता है।
- प्रॉक्सी क्रेडेंशियल, लाइसेंस कुंजियाँ और कुकी लॉग में दर्ज नहीं किए जाते। SDK टेलीमेट्री नहीं भेजता।
- मौजूदा प्रोफ़ाइल का seed तभी बदलता है जब आप स्पष्ट रूप से नया मान देते हैं।
- SDK पेज में स्टेल्थ स्क्रिप्ट डालने वाले मेथड (`addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument`) इस्तेमाल नहीं करता और पेज की प्रॉपर्टी नहीं बदलता।
- ब्राउज़र की तैयारी जाँचने के लिए SDK, CDP के HTTP एंडपॉइंट या `Browser.getVersion` का उपयोग करता है। इस जाँच के लिए `Runtime.enable` कॉल नहीं किया जाता।
- ब्राउज़र की पहचान इंजन तय करता है। SDK उसे Playwright या Puppeteer के ज़रिए नहीं बदलता और न ही ये मेथड कॉल करता है (`Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`)।
- SDK अपने आप ये फ़्लैग नहीं जोड़ता (`--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`)।

## स्टेल्थ जाँच

इन जाँचों को उस इंजन बिल्ड, ऑटोमेशन क्लाइंट और प्रोफ़ाइल पर चलाएँ जिन्हें आप उपयोग करना चाहते हैं।

| परत | उदाहरण लक्ष्य | सफलता के मानदंड |
|---|---|---|
| L0 ट्रांसपोर्ट | TrackMe, IP/WebRTC लीक जाँच | केवल एग्ज़िट IP; JA4 और HTTP/2 इंजन के Chromium से मेल खाते हैं |
| L1 पहचान | स्थानीय प्रोब, Sannysoft, Intoli | UA, UA-CH, प्लेटफ़ॉर्म, GPU, फ़ॉन्ट, स्क्रीन के बीच कोई अंतर्विरोध नहीं |
| L2 फ़िंगरप्रिंट | CreepJS, FingerprintJS, BrowserScan | हेडलेस या झूठ के कोई मार्कर नहीं; रीलोड के बावजूद स्थिर |
| L3 ऑटोमेशन | rebrowser, brotector, botd | CDP, इनिट-स्क्रिप्ट या WebDriver का कोई लीक नहीं |
| L4 व्यवहार | इनपुट की प्रामाणिकता, humanize ट्रेस, Cloudflare स्मोक | विश्वसनीय इवेंट, वास्तविक जैसा क्रम, चैलेंज का हल होना |
| L5 स्थिरता | सीड, वर्कर, iframe, क्रॉस-ओरिजिन | एक ही सीड हर लॉन्च पर एक ही पर्सोना बनाता है |

जाँच की प्रक्रिया में परिणामों की स्थितियाँ, समस्याओं की पड़ताल और रिपोर्ट का प्रारूप दिया गया है। इसे [अंग्रेज़ी](../../docs/stealth-checkup.md) या [रूसी](../../docs/stealth-checkup.ru.md) में पढ़ें।

हर परिणाम के साथ इंजन बिल्ड, क्लाइंट संस्करण, प्रोफ़ाइल सेटिंग्स, प्रॉक्सी एग्ज़िट और डिटेक्टर संस्करण दर्ज करें, ताकि रन दोबारा चलाए जा सकें और उनकी तुलना हो सके।

## रिपॉज़िटरी मैप

```text
.
├── README.md                  # अंग्रेज़ी मूल
├── translations/
│   └── <locale>/README.md
├── desktop/                   # ऑफ़लाइन प्रोफ़ाइल मैनेजर
├── docs/
│   ├── desktop/               # प्रोफ़ाइल मैनेजर का दस्तावेज़
│   ├── architecture.md        # घटक, लॉन्च प्रवाह, सीमाएँ
│   ├── sdk-contract.md        # v0 लॉन्च कॉन्ट्रैक्ट और SDK व्यवहार
│   ├── stealth-checkup.md     # स्टेल्थ सत्यापन विधि और रनबुक
│   ├── stealth-checkup.ru.md  # रूसी अनुवाद
│   └── versioning.md          # SDK, इंजन और क्लाइंट की संगतता
├── spec/
│   └── schemas/               # लॉन्च विकल्पों और बाइनरी जानकारी के लिए JSON Schema
├── sdks/
│   ├── manifest.json          # मशीन-पठनीय SDK रजिस्ट्री
│   ├── README.md              # लेआउट और योगदान नियम
│   ├── _template/             # नई भाषा के लिए शुरुआती ढाँचा
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # भाषा-निरपेक्ष लॉन्च और स्टेल्थ केस
├── tools/check_repo.py        # संरचना और लिंक का सत्यापन (CI)
└── .github/workflows/ci.yml
```

इस रिपॉज़िटरी में SDK के शुरुआती ढाँचे, लॉन्च कॉन्ट्रैक्ट, साझा परीक्षण और ऑफ़लाइन प्रोफ़ाइल मैनेजर हैं। Chromium इंजन और Desktop 1.2.1 की पूरी रिलीज़ अलग-अलग रिपॉज़िटरी में हैं। [Desktop का सोर्स और बिल्ड गाइड](../../desktop/README.md) · [प्रोफ़ाइल मैनेजर के दस्तावेज़](../../docs/desktop/README.md)

## कॉन्ट्रैक्ट

- `launch(options)` इंजन शुरू करता है और क्लाइंट का `Browser` लौटाता है। फिर क्लाइंट CDP के ज़रिए सीधे Chromium से बात करता है।
- लॉन्च से पहले SDK इंजन का प्लेटफ़ॉर्म और SHA-256 चेकसम जाँचता है। बाइनरी मौजूद न हो और डाउनलोड की अनुमति हो तो SDK उसे डाउनलोड करता है।
- नाम वाला प्रोफ़ाइल कुकी, साइट डेटा और seed को अगले लॉन्च के लिए सहेजता है।
- लॉन्च विफल होने पर SDK अपनी शुरू की हुई प्रक्रिया बंद करता है और एक निश्चित टाइप की त्रुटि देता है। दोबारा कोशिश करने का निर्णय कॉल करने वाले कोड का है।
- SDK, इंजन और ऑटोमेशन क्लाइंट के संस्करणों की सीमाएँ अलग-अलग हैं। इंजन बिल्ड देखने के लिए Python में `binary_info()` या Node.js में `binaryInfo()` इस्तेमाल करें।

## संगतता

| आइटम | लक्ष्य |
|---|---|
| इंजन | SDK का चुना हुआ बिल्ड। इसे `binary_info()` या `binaryInfo()` से देखें |
| macOS | Apple Silicon और Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; Playwright की समर्थित रेंज |
| Node.js | 20+; Playwright और Puppeteer की समर्थित रेंजें |

SDK और इंजन के संस्करण स्वतंत्र रूप से बदलते हैं। उनमें असंगति होने पर SDK एक टाइपयुक्त त्रुटि देता है, जिसमें दोनों संस्करण दर्ज होते हैं।

## योगदान

समीक्षा की प्रक्रिया [योगदान गाइड](../../CONTRIBUTING.md) में और बिल्ड के निर्देश [SDK गाइड](../../sdks/README.md) में हैं।

- SDK का व्यवहार बदलते समय संबंधित इम्प्लीमेंटेशन अपडेट करें और उसके लिए परीक्षण या एक साझा कॉन्ट्रैक्ट टेस्ट जोड़ें।
- नई भाषा के SDK के लिए [टेम्पलेट](../../sdks/_template) कॉपी करें, उसे [मैनिफ़ेस्ट](../../sdks/manifest.json) में दर्ज करें और एक ड्राफ़्ट पुल रिक्वेस्ट खोलें।
- नया लॉन्च विकल्प जोड़ते समय पहले [कॉन्ट्रैक्ट](../../docs/sdk-contract.md) और [स्कीमा](../../spec/schemas) अपडेट करें।
- इंजन के स्टेल्थ व्यवहार में बदलाव इंजन की रिपॉज़िटरी में करें। SDK को जाँच में सफल होना चाहिए।
- सुरक्षा संबंधी समस्या की निजी तौर पर रिपोर्ट करने के लिए [सुरक्षा नीति](../../SECURITY.md) में दिए निर्देश अपनाएँ।

## सामान्य प्रश्न

### क्या यह Playwright का फ़ोर्क है?

नहीं। SDK आधिकारिक Playwright क्लाइंट को Ombra Chromium से जोड़ता है। आप Playwright के परिचित टाइप, हेल्पर और पेज ऑब्जेक्ट इस्तेमाल कर सकते हैं।

### क्या मुझे Ombra डेस्कटॉप ऐप चाहिए?

SDK इंजन को सीधे शुरू करता है। डेस्कटॉप ऐप वैकल्पिक है और उससे आप प्रोफ़ाइल हाथ से प्रबंधित कर सकते हैं।

### यह playwright-stealth से कैसे अलग है?

Ombra के फ़िंगरप्रिंट बदलाव Chromium में कंपाइल किए जाते हैं। SDK पेज-स्तर के स्टेल्थ स्क्रिप्ट नहीं जोड़ता।

### क्या मैं अपनी प्रॉक्सी उपयोग कर सकता हूँ?

हाँ। इसे `launch()` में पास करें। प्रमाणीकरण वाली प्रॉक्सी लूपबैक रिले से होकर जाती हैं, इसलिए क्रेडेंशियल कभी प्रक्रिया की कमांड लाइन में नहीं दिखते।

### कौन-से Playwright और Puppeteer संस्करण समर्थित हैं?

हर पैकेज के मैनिफ़ेस्ट में समर्थित क्लाइंट संस्करण दिए गए हैं। क्लाइंट अलग निर्भरताओं के रूप में आते हैं। संस्करणों की सीमा [संस्करण गाइड](../../docs/versioning.md) में देखें।

### क्या यह हर बॉट जाँच पास करेगा?

परिणाम साइट, क्षेत्र, एग्ज़िट IP की प्रतिष्ठा, डिटेक्टर संस्करण और प्रोफ़ाइल सेटिंग्स पर निर्भर करते हैं। किसी विशिष्ट कॉन्फ़िगरेशन को मापने के लिए [स्टेल्थ जाँच](../../docs/stealth-checkup.md) उपयोग करें।

## लाइसेंस

इस रिपॉज़िटरी के SDK सोर्स [Apache License 2.0](../../LICENSE) के अंतर्गत लाइसेंस प्राप्त हैं। यह लाइसेंस Ombra इंजन, Ombra नाम या लोगो पर कोई अधिकार नहीं देता। ट्रेडमार्क और तृतीय-पक्ष एट्रिब्यूशन के बारे में [NOTICE](../../NOTICE) देखें।

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
