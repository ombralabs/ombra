<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="लाइसेंस"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="अंतिम कमिट"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="स्टार्स"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI डाउनलोड"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm डाउनलोड"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="रिलीज़"></a>
</p>

<p align="center">
<a href="#इंस्टॉलेशन"><strong>इंस्टॉलेशन</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-और-typescript-api">Node.js API</a> ·
<a href="#मानवीकृत-इनपुट">मानवीकृत इनपुट</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>भाषाएँ</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">C++ सोर्स-लेवल फ़िंगरप्रिंट नियंत्रण और नेटिव मानवीकृत इनपुट के साथ Chromium।</h3>

<table><tr><td>
यह न तो लॉन्च फ़्लैग्स का कोई बंडल है और न ही पेज के ऊपर JavaScript इंजेक्शन। यह एक वास्तविक Chromium बाइनरी है जिसमें फ़िंगरप्रिंट पैच C++ सोर्स कोड में कंपाइल किए गए हैं और इनपुट सिमुलेशन सीधे ब्राउज़र प्रोसेस के भीतर चलता है। लोकल CDP के माध्यम से आधिकारिक Playwright या Puppeteer कनेक्ट करें — बिना किसी रैपर ऑब्जेक्ट के और बिना पेज कोड को दोबारा लिखे।
</td></tr></table>

<br>

<p align="center">
Python और Node.js में Playwright तथा Puppeteer के लिए सीधा ड्रॉप-इन लॉन्च विकल्प।<br>
वही API, वही सेलेक्टर और टाइप — बस इम्पोर्ट और <code>launch()</code> कॉल बदलें।
</p>

- **सोर्स-लेवल Chromium पैच** — canvas, WebGL, WebGPU, ऑडियो, फ़ॉन्ट, GPU, स्क्रीन, CSS मीडिया क्वेरी, हार्डवेयर रिपोर्टिंग, STUN लीक के बिना WebRTC, TLS ClientHello, टाइमज़ोन, लोकेल, और ऑटोमेशन संकेतों को हटाना (`navigator.webdriver`, `Runtime.enable`, हेडलेस मार्कर)।
- **ब्राउज़र प्रोसेस के भीतर नेटिव मानवीकृत इनपुट (`humanize=True`)** — पॉइंटर ट्रैजेक्टरी (`cursory-rs`), होल्ड अवधि के साथ लक्षित क्लिक, टाइपो स्व-सुधार के साथ टाइपिंग लय, और स्क्रॉल फ़िज़िक्स सीधे Chromium के अंदर चलते हैं। SDK बिना किसी प्रॉक्सी रैपर के एक सामान्य नेटिव `Browser` ऑब्जेक्ट लौटाता है।
- **बिना कुंजी या खाते के स्वायत्त संचालन** — वर्तमान इंजन बिल्ड (`151.0.7922.108-9` और नए) तथा Ombra Desktop बिना साइन-अप, लाइसेंस कुंजी, हार्डवेयर ID या लाइसेंसिंग सर्वर के लोकल रूप से चलते हैं।
- **स्वचालित इंस्टॉलेशन और क्रिप्टोग्राफ़िक बाइनरी सत्यापन** — `pip install ombrabrowser` या `npm install @ombralabs/sdk` चलाएँ; पहली बार लॉन्च होने पर, SDK आपके प्लेटफ़ॉर्म के लिए बिल्ड डाउनलोड करता है और उसके Ed25519 हस्ताक्षर तथा SHA-256 चेकसम को सत्यापित करता है।
- **स्थायी प्रोफ़ाइल और सुरक्षित प्रॉक्सी रिले** — नामित प्रोफ़ाइल क्रॉस-प्रोसेस लॉकिंग के साथ रन के बीच कुकीज़, `localStorage`, IndexedDB और `seed` को सुरक्षित रखती हैं; प्रमाणीकरण वाले प्रॉक्सी (HTTP, HTTPS, SOCKS5) एक लोकल लूपबैक रिले के माध्यम से चलते हैं ताकि क्रेडेंशियल्स कभी भी प्रोसेस आर्ग्यूमेंट्स में न दिखें।
- **ऑफ़लाइन Ombra Desktop प्रोफ़ाइल मैनेजर** — इसी रिपॉज़िटरी में स्थित एक नेटिव डेस्कटॉप एप्लिकेशन ([`desktop/`](../../desktop/README.md)), macOS, Linux और Windows के लिए प्रीबिल्ट इंस्टॉलर के साथ।

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

`import { launch } from "@ombralabs/sdk/puppeteer"` या `launchPuppeteer()` के माध्यम से Puppeteer भी समर्थित है ([विवरण](#puppeteer))।

**एंटी-बॉट सुरक्षा वाली साइटों के लिए**, रेज़िडेंशियल प्रॉक्सी, स्थायी प्रोफ़ाइल और सुसंगत एनवायरनमेंट सेटिंग्स को मिलाकर उपयोग करें:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # डेटासेंटर के बजाय रेज़िडेंशियल IP बेहतर होता है
    fingerprint={"timezone": "auto", "locale": "auto"},  # टाइमज़ोन और लोकेल को प्रॉक्सी एग्ज़िट से मिलाएँ
    headless=False,                                      # कुछ साइटें हेडलेस अंतर का पता लगा लेती हैं
    humanize=True,                                       # नेटिव माउस, कीबोर्ड और स्क्रॉल सिमुलेशन
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

Linux, कंटेनर और सुरक्षित टारगेट पर आने वाली सामान्य समस्याओं के लिए [समस्या निवारण](#समस्या-निवारण) देखें।

## इंस्टॉलेशन

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# वैकल्पिक: प्रॉक्सी एग्ज़िट से टाइमज़ोन और लोकेल का स्वतः पता लगाना (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Playwright के साथ (1.60.0+, स्टॉक Chromium डाउनलोड करने की आवश्यकता नहीं)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# या Puppeteer के साथ
npm install @ombralabs/sdk puppeteer-core

# वैकल्पिक: timezone: "auto" और locale: "auto" के लिए ऑफ़लाइन GeoIP डेटाबेस रीडर
npm install mmdb-lib
```

---

लॉन्च होने पर, SDK इंजन को एक सख्त क्रम में खोजता है: `binary_path` (Node.js में `binaryPath`), `OMBRA_BINARY_PATH`, Ombra Desktop इंजन डायरेक्टरी, और SDK कैश (`~/.ombra/engines`)। यदि कोई संगत इंजन नहीं मिलता है, तो SDK हस्ताक्षरित रिलीज़ चैनल से एक बिल्ड डाउनलोड करता है, उसके Ed25519 हस्ताक्षर और SHA-256 चेकसम को सत्यापित करता है, और उसे लोकल रूप से कैश कर लेता है। `playwright install chromium` चलाने की आवश्यकता नहीं है।

स्वचालित डाउनलोड को अक्षम करने के लिए `download=False` (Node.js में `download: false`) पास करें। इंजन को पहले से डाउनलोड और सत्यापित करने के लिए (उदाहरण के लिए कंटेनर बिल्ड के दौरान), `ensure_binary()` (`ensureBinary()`) कॉल करें या CLI का `install` कमांड उपयोग करें।

> **स्वायत्त लॉन्च:** वर्तमान इंजन बिल्ड (`151.0.7922.108-9` और नए) मुफ़्त हैं और इनके लिए किसी खाते या लाइसेंस कुंजी की आवश्यकता नहीं होती। `OMBRA_LICENSE_KEY` और `login` कमांड केवल पुराने लाइसेंस वाले बिल्ड के साथ संगतता के लिए उपलब्ध हैं।

**Playwright से माइग्रेशन** में केवल दो पंक्तियाँ लगती हैं — पेज के सभी ऑपरेशन, लोकेटर और वेट्स अपरिवर्तित रहते हैं:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # आपका शेष कोड बिना किसी बदलाव के काम करता है
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ यदि आपको यह रिपॉज़िटरी उपयोगी लगती है, तो इसे **Star** करें, और नए इंजन, SDK व Ombra Desktop बिल्ड की सूचना पाने के लिए **[Watch releases](https://github.com/ombralabs/ombra/subscription)** चुनें।

---

## वर्तमान स्थिति और रिलीज़

इकोसिस्टम का प्रत्येक घटक साझा लॉन्च अनुबंध (लॉन्च कॉन्ट्रैक्ट) का पालन करता है और उसका संस्करण स्वतंत्र रूप से प्रबंधित होता है।

| घटक | स्थिति / संस्करण | स्थान |
|---|---|---|
| **SDK अनुबंध** | ड्राफ़्ट `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | अल्फ़ा `0.1.3` | [PyPI पर `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | अल्फ़ा `0.1.0` | [npm पर `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium इंजन** | Chromium `151.0.7922.108` | SDK द्वारा स्वतः डाउनलोड किया जाता है (macOS ARM64 / Linux x64 / Windows x64 के लिए `-9`, Intel macOS के लिए `-7`) |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **स्टैंडअलोन ब्राउज़र** | `v158.0.8127.37-1` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-1) |
| **स्कीमा और कन्फ़ॉर्मेंस** | JSON Schema + साझा टेस्ट केस | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **स्टेल्थ चेकअप पद्धति** | 6 परतें (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

वर्तमान रिलीज़ में शामिल सुविधाएँ:

- **सोर्स-लेवल पैच** — सीड-सुसंगत फ़िंगरप्रिंट व्युत्पत्ति, WebGL / WebGPU और एक्सटेंशन संरेखण, प्रत्येक OS के लिए यथार्थवादी फ़ॉन्ट तालिकाएँ, नेटिव TLS ClientHello प्रोफ़ाइल (`chrome-<major>`), `Runtime.enable` व `UtilityScript` स्टैक लीक का दमन, और WebRTC होस्ट IP लीक सुरक्षा।
- **ब्राउज़र-स्तरीय `Ombra` CDP डोमेन** — ब्राउज़र को रीस्टार्ट किए बिना Python और Node.js में मानवीकृत इनपुट (`getHumanizeState`, `setHumanize`) पर लाइव नियंत्रण।
- **ब्राउज़र प्रोसेस में नेटिव इनपुट सिमुलेशन** — `cursory-rs` पॉइंटर प्लानर, व्हील और ट्रैकपैड स्क्रॉल प्रोफ़ाइल, टाइपो स्व-सुधार के साथ टाइपिंग लय, और आइसोलेटेड क्लिपबोर्ड के माध्यम से लंबे टेक्स्ट का सुरक्षित पेस्ट।
- **कुंजी-रहित स्वायत्त बिल्ड** — वर्तमान इंजन बिल्ड (`151.0.7922.108-9`) और Ombra Desktop `1.2.2` बिना खातों, कुंजियों या टेलीमेट्री के पूरी तरह लोकल रूप से चलते हैं।
- **इंजन संस्करण पिनिंग (`version`)** — `launch(version="151.0.7922.108-9")`, `OMBRA_VERSION`, या CLI `install --version` के माध्यम से किसी सटीक बिल्ड को पिन करें।
- **एकीकृत प्रॉक्सी रिले** — Chromium की कमांड लाइन, लॉग्स या प्रोफ़ाइल मेटाडेटा में क्रेडेंशियल्स उजागर किए बिना HTTP, HTTPS और SOCKS5 प्रमाणीकृत प्रॉक्सी।
- **स्थायी नामित प्रोफ़ाइल** — क्रॉस-प्रोसेस लॉकिंग (`ProfileBusyError`) के साथ `~/.ombra/profiles/<slug>` के अंतर्गत `seed`, कुकीज़, `localStorage` और IndexedDB संग्रहीत करें।
- **क्रिप्टोग्राफ़िक सप्लाई-चेन जाँच** — निष्कर्षण (एक्सट्रैक्शन) से पहले रिलीज़ एनवलप का Ed25519 हस्ताक्षर सत्यापन और आर्काइव की SHA-256 जाँच।

पूर्ण रिलीज़ इतिहास के लिए [CHANGELOG.md](../../CHANGELOG.md) देखें।

## Ombra क्यों चुनें

- **कॉन्फ़िग-लेवल और JS पैच आसानी से टूट जाते हैं।** `playwright-stealth`, `puppeteer-extra` और `undetected-chromedriver` जैसे टूल पेजों में JavaScript इंजेक्ट करते हैं या लॉन्च फ़्लैग्स में बदलाव करते हैं। Chrome के अपडेट उन्हें नियमित रूप से तोड़ देते हैं, और आधुनिक डिटेक्टर स्वयं उन पैच को ही पकड़ लेते हैं (`Function.prototype.toString`, प्रोटोटाइप विसंगतियाँ, `addScriptToEvaluateOnNewDocument`)।
- **बदलाव Chromium के सोर्स कोड में कंपाइल किए गए हैं।** फ़िंगरप्रिंट C++ स्तर पर तैयार होते हैं और मेन फ़्रेम, वर्कर्स तथा iframes में एक समान रूप से लागू होते हैं। SDK पेजों में कोई स्क्रिप्ट इंजेक्ट नहीं करता और कोई `Emulation.*` ओवरराइड नहीं करता।
- **इनपुट सिमुलेशन ब्राउज़र प्रोसेस में चलता है, Playwright के ऊपर नहीं।** चूँकि माउस ट्रैजेक्टरी, कीस्ट्रोक्स और स्क्रॉलिंग स्वयं Chromium के भीतर संभाले जाते हैं, इसलिए SDK Playwright या Puppeteer ऑब्जेक्ट्स को रैप नहीं करता — हर लोकेटर, फ़्रेम और थर्ड-पार्टी लाइब्रेरी सामान्य रूप से काम करती रहती है।
- **अतिरिक्त सेवाओं के बिना लोकल आर्किटेक्चर।** न कोई बैकग्राउंड कंट्रोल-प्लेन डीमन और न आपकी स्क्रिप्ट व ब्राउज़र के बीच कोई नेटवर्क हॉप: केवल एक इंजन प्रोसेस, `127.0.0.1` पर लोकल लूपबैक CDP, और प्रोफ़ाइल संख्या या समवर्तीता (कंकरेंसी) पर कोई सीमा नहीं।

## Ombra Desktop

**GUI के साथ एक लोकल ऑफ़लाइन प्रोफ़ाइल मैनेजर।** इसका सोर्स कोड सीधे इसी रिपॉज़िटरी में ([`desktop/`](../../desktop/README.md)) उपलब्ध है और इसे Tauri (Rust + Vue) से बनाया गया है।

- **पूरी तरह ऑफ़लाइन और लोकल** — प्रोफ़ाइल कैटलॉग आपकी मशीन पर लोकल एन्क्रिप्शन कुंजी के साथ लोकल SQLite डेटाबेस में रहता है; किसी खाते, क्लाउड सेवा या नेटवर्क एक्सेस की आवश्यकता नहीं।
- **संरचित प्रोफ़ाइल प्रबंधन** — प्रोफ़ाइल बनाएँ, नाम, नोट या संख्या के आधार पर खोजें, विवरण संपादित करें, और Rust कैटलॉग में समूहों, टैग्स, लेबल्स तथा बुकमार्क्स के साथ प्रविष्टियों को व्यवस्थित करें।
- **सुरक्षित ट्रैश (Safe Trash)** — किसी प्रोफ़ाइल को ट्रैश में ले जाने पर उसकी फ़ाइलें डिस्क पर सुरक्षित रहती हैं ताकि आप उसे बाद में पुनर्स्थापित कर सकें।
- **प्रति-प्रोफ़ाइल कोई सीमा नहीं** — कोई प्रति-प्रोफ़ाइल प्लान या क्लाउड कोटा नहीं: आपका सारा डेटा पूरी तरह आपका रहता है।
- **प्रीबिल्ट इंस्टॉलर** — macOS Apple Silicon (`.dmg`, Apple Developer ID से हस्ताक्षरित और नोटराइज़्ड), Linux (`.deb` और `.rpm`), तथा Windows x64 (`setup.exe`)।
- **पृथक कैटलॉग** — किसी अलग टेस्ट कैटलॉग या बैकअप कॉपी के साथ काम करने के लिए `OMBRA_DESKTOP_DATA_DIR` सेट करें।

[`desktop-v1.2.2` डाउनलोड करें →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [प्रोफ़ाइल और लोकल कुंजी मार्गदर्शिका](../../docs/desktop/README.md)

## फ़िंगरप्रिंट सत्यापन और स्टेल्थ चेकअप

"100% अज्ञात (अंडिटेक्टेबल)" जैसे सामान्य दावे करने के बजाय, Ombra रिकॉर्ड की गई परिस्थितियों में एक दोहराई जा सकने वाली सत्यापन प्रक्रिया पर निर्भर करता है। किसी भी साइट पर वास्तविक परिणाम हमेशा एग्ज़िट IP की प्रतिष्ठा, क्षेत्र, प्रोफ़ाइल के इतिहास, डिटेक्टर के संस्करण और लॉन्च कॉन्फ़िगरेशन पर निर्भर करते हैं।

### इंजन और SDK द्वारा नियंत्रित सतहें

| सतह / संकेत | स्टॉक Playwright | Ombra | कार्यान्वयन |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ इंजन पैच |
| `window.chrome` | हेडलेस में अनुपस्थित | पूर्ण ऑब्जेक्ट | सामान्य Chrome से मेल खाता है |
| `navigator.plugins` | हेडलेस में `0` | सुसंगत प्लगइन सेट | इंजन-स्तरीय |
| User-Agent और Client Hints | `HeadlessChrome`, ब्रांड विसंगति | `Google Chrome` + संरेखित `Sec-CH-UA*` | पैच `010-user-agent-and-webdriver` |
| CDP आर्टिफ़ैक्ट्स (`Runtime.enable`, `UtilityScript`) | डिटेक्टर्स द्वारा चिह्नित | इंजन द्वारा दबाया गया; SDK कभी `Runtime.enable` कॉल नहीं करता | पैच `110-runtime-enable` + इनवेरिएंट `SI-02` |
| WebRTC IP लीक | लोकल/होस्ट IP उजागर करता है | वास्तविक STUN भेजे बिना एग्ज़िट IP रिपोर्ट करता है | पैच `100-webrtc-leak` (`--webrtc-ip`) |
| TLS और HTTP/2 | सेटअप पर निर्भर | Chromium नेटवर्क स्टैक + `chrome-<major>` ClientHello प्रोफ़ाइल | पैच `210-tls-network-persona` |
| WebGL और WebGPU | सॉफ़्टवेयर रेंडरर / GPU विसंगति | एकीकृत WebGL/WebGPU सीमाएँ और एक्सटेंशन तालिकाएँ | पैच `070`, `071`, `075`, `955` |
| फ़ॉन्ट, लोकेल और टाइमज़ोन | होस्ट मान, `Intl` विचलन | सुसंगत फ़ॉन्ट तालिकाएँ, ICU लोकेल और टाइमज़ोन | पैच `040`, `090`, `092`, `230` |
| इनपुट सिमुलेशन | कर्सर टेलीपोर्ट, तात्कालिक `fill()` | `cursory-rs` कर्व्स, टाइपिंग लय, स्क्रॉल फ़िज़िक्स | ब्राउज़र प्रोसेस में पैच `135-ombra-humanize` |
| फ़िंगरप्रिंट स्थिरता | बदल जाता है या होस्ट लीक करता है | रीस्टार्ट और फ़्रेम्स के पार प्रत्येक `seed` के लिए नियतात्मक | पैच `001`, `002` + स्थायी प्रोफ़ाइल |

### चेकअप की छह परतें

किसी कॉन्फ़िगरेशन को रिलीज़ या डिप्लॉय करने से पहले, उसी सटीक इंजन बिल्ड, ऑटोमेशन क्लाइंट और प्रॉक्सी के विरुद्ध चेकअप की सभी छह परतें चलाएँ जिनका आप उपयोग करने जा रहे हैं:

| परत | उदाहरण लक्ष्य | उत्तीर्ण होने के मानदंड |
|---|---|---|
| **L0 ट्रांसपोर्ट** | TrackMe, IP/WebRTC लीक पेज, हेडर इको | केवल प्रॉक्सी एग्ज़िट IP दिखाई दे; JA4 और HTTP/2 Chromium बिल्ड से मेल खाएँ; argv में कोई प्रॉक्सी क्रेडेंशियल न हो |
| **L1 पहचान (आइडेंटिटी)** | लोकल प्रोब, Sannysoft, Intoli, UA-CH जाँच | UA, Client Hints, प्लेटफ़ॉर्म, GPU, फ़ॉन्ट, स्क्रीन और लोकेल के बीच कोई विरोधाभास न हो |
| **L2 फ़िंगरप्रिंट** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | कोई हेडलेस या `lie` मार्कर न हो; रीलोड करने पर फ़िंगरप्रिंट स्थिर रहे |
| **L3 ऑटोमेशन** | rebrowser, brotector, botd, CDP कमांड ऑडिट | `Runtime.enable`, इनिट-स्क्रिप्ट, बाइंडिंग या `navigator.webdriver` का कोई लीक न हो |
| **L4 व्यवहार** | इनपुट फ़िडेलिटी प्रोब, humanize ट्रेस, लाइव चैलेंज स्मोक | `isTrusted: true` इवेंट्स, स्वाभाविक क्रम और समय, यथार्थवादी पॉइंटर कर्व्स और स्क्रॉलिंग |
| **L5 स्थिरता** | बार-बार लॉन्च, वर्कर्स, समान/क्रॉस-ओरिजिन iframes, क्रॉस-SDK समानता | एक ही `seed` सभी संदर्भों में बिल्कुल समान फ़िंगरप्रिंट उत्पन्न करे |

पूर्ण प्रक्रिया, स्थितियाँ (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), सिग्नल चेकलिस्ट और रिपोर्ट टेम्पलेट: [अंग्रेज़ी (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) और [रूसी (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md)।

## तुलना

| विशेषता | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| ऑटोमेशन API | Playwright | Playwright | Selenium | **Playwright और Puppeteer** |
| पैच स्तर | कोई नहीं | इन-पेज JS इंजेक्शन | कॉन्फ़िग फ़्लैग्स | **C++ सोर्स (Chromium)** |
| सुसंगत फ़िंगरप्रिंट `seed` | नहीं | नहीं | आंशिक | **हाँ, प्रति प्रोफ़ाइल और eTLD+1** |
| इनपुट सिमुलेशन (`humanize`) | नहीं | नहीं | नहीं | **ब्राउज़र प्रोसेस में अंतर्निहित** |
| `Runtime.enable` / CDP लीक दमन | नहीं | नहीं | आंशिक | **इंजन पैच + SDK इनवेरिएंट्स** |
| CLI लीक के बिना प्रमाणीकृत प्रॉक्सी | नहीं | नहीं | सीमित | **लोकल लूपबैक रिले** |
| प्रोफ़ाइल आइसोलेशन | ब्राउज़र कॉन्टेक्स्ट | ब्राउज़र कॉन्टेक्स्ट | नहीं | **प्रोफ़ाइल डायरेक्टरी + फ़ाइल लॉक** |
| ऑफ़लाइन प्रोफ़ाइल मैनेजर (GUI) | नहीं | नहीं | नहीं | **Ombra Desktop (macOS, Linux, Windows)** |
| Playwright से माइग्रेशन | — | इम्पोर्ट बदलें | कोड दोबारा लिखें | **इम्पोर्ट और `launch()` बदलें** |

## यह कैसे काम करता है

```mermaid
flowchart LR
    Script["आपकी स्क्रिप्ट<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP ब्रिज"]
    Relay["लोकल प्रॉक्सी रिले<br/>जब प्रमाणीकरण आवश्यक हो"]
    Engine["Ombra Chromium<br/>C++-पैच किया गया इंजन"]
    Client["नेटिव क्लाइंट<br/>Playwright · Puppeteer"]
    Profile[("प्रोफ़ाइल<br/>seed · cookies · स्टोरेज")]

    Script -->|"launch()"| SDK
    SDK -->|"सत्यापन + लॉन्च"| Engine
    SDK -.->|"प्रॉक्सी प्रमाणीकरण"| Relay
    Relay -.-> Engine
    SDK -->|"CDP पर कनेक्ट"| Client
    Script -->|"page API"| Client
    Client -->|"लूपबैक CDP"| Engine
    Engine --> Profile
```

1. **`launch()` इंजन को ढूँढता या डाउनलोड करता है** और उसके Ed25519 हस्ताक्षर व SHA-256 चेकसम को सत्यापित करता है।
2. **प्रोफ़ाइल और `seed` तैयार किए जाते हैं।** नामित प्रोफ़ाइल एक क्रॉस-प्रोसेस लॉक प्राप्त करती है; यदि प्रॉक्सी को क्रेडेंशियल्स चाहिए, तो SDK मेमोरी में एक लोकल लूपबैक रिले शुरू करता है।
3. **Ombra Chromium शुरू होता है** चुनी गई प्रोफ़ाइल, फ़िंगरप्रिंट विकल्पों और एक लोकल डीबगिंग पोर्ट (`--remote-debugging-port=0`) के साथ।
4. **आधिकारिक क्लाइंट कनेक्ट होता है।** जैसे ही `DevToolsActivePort` दिखाई देता है, SDK `127.0.0.1` पर Playwright (`no_defaults=True` के साथ) या Puppeteer को अटैच करता है और नेटिव `Browser` ऑब्जेक्ट लौटाता है।
5. **स्वच्छ शटडाउन।** `browser.close()` `Browser.close` भेजता है, इंजन प्रोसेस ट्री को समाप्त करता है, रिले को रोकता है और प्रोफ़ाइल लॉक मुक्त करता है।

लॉन्च के बाद, SDK डेटा पाथ से हट जाता है: सभी पेज कमांड सीधे Playwright या Puppeteer से Chromium तक जाते हैं।

### SDK की सीमाएँ और स्टेल्थ इनवेरिएंट्स

[v0.1 SDK अनुबंध (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) प्रत्येक आधिकारिक SDK पर सख्त इनवेरिएंट्स लागू करता है:

- **पेजों पर कोई स्टेल्थ स्क्रिप्ट नहीं।** SDK कभी भी `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` कॉल नहीं करता और कभी DOM गुणों को पैच नहीं करता।
- **कोई `Runtime.enable` नहीं।** तत्परता जाँच (रेडीनेस चेक) केवल लोकल CDP HTTP एंडपॉइंट या `Browser.getVersion` का उपयोग करती है; SDK कभी भी `Runtime`, `Debugger` या `Log` सक्षम नहीं करता।
- **कोई `Emulation.*` ओवरराइड नहीं।** SDK कभी भी `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` या `setDeviceMetricsOverride` कॉल नहीं करता — ब्राउज़र की पहचान सीधे इंजन से आती है।
- **डिफ़ॉल्ट रूप से कोई निषिद्ध फ़्लैग नहीं।** SDK अपनी ओर से कभी `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` या `--user-agent` इंजेक्ट नहीं करता।
- **केवल लूपबैक CDP।** डीबग पोर्ट हमेशा `127.0.0.1` से बाइंड होता है; नॉन-लूपबैक `--remote-debugging-address` पास करने पर उसे अस्वीकार कर दिया जाता है।
- **कोई टेलीमेट्री और कोई गुप्त डेटा लीक नहीं।** प्रॉक्सी क्रेडेंशियल्स, कुंजियाँ और कुकीज़ को लॉग्स तथा त्रुटि संदेशों से हटा दिया जाता है।

## Python API

### `launch()`

```python
from ombrabrowser import launch

# बुनियादी लॉन्च (डिफ़ॉल्ट रूप से हेडलेस)
browser = launch()

# विंडो मोड (हेडेड) ब्राउज़र
browser = launch(headless=False)

# HTTP या SOCKS5 प्रॉक्सी (क्रेडेंशियल्स लोकल लूपबैक रिले के माध्यम से संभाले जाते हैं)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# बायपास सूची के साथ प्रॉक्सी ऑब्जेक्ट
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

# फ़िंगरप्रिंट नियंत्रण (seed, OS, प्रॉक्सी से ऑटो टाइमज़ोन/लोकेल, स्क्रीन, GPU)
# timezone="auto" / locale="auto" के लिए इंस्टॉल करें: pip install "ombrabrowser[geoip]"
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

# नेटिव माउस, कीबोर्ड और स्क्रॉल सिमुलेशन
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# सटीक इंजन बिल्ड पिन करें और अतिरिक्त Chromium फ़्लैग्स पास करें
browser = launch(
    version="151.0.7922.108-9",
    args=["--webrtc-ip=203.0.113.10"],
)
```

यह एक मानक `playwright.sync_api.Browser` लौटाता है। Playwright की सभी विधियाँ सामान्य रूप से काम करती हैं (`new_page()`, `new_context()`, `close()`, आदि)। नए पेज डिफ़ॉल्ट रूप से `no_viewport=True` रखते हैं ताकि प्रोफ़ाइल के विंडो आयाम ओवरराइट न हों।

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

### `launch_context()` और `launch_context_async()`

सुविधाजनक हेल्पर जो ब्राउज़र लॉन्च करता है और सीधे `BrowserContext` लौटाता है (कॉन्टेक्स्ट बंद करने पर इंजन प्रोसेस भी समाप्त हो जाता है)। अतिरिक्त कीवर्ड आर्ग्यूमेंट्स `browser.new_context()` को आगे भेज दिए जाते हैं — जैसे `storage_state`, `permissions`, या `extra_http_headers`:

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

असिंक्रोनस समकक्ष: `await launch_context_async(...)`।

### `launch_persistent_context()` और `launch_persistent_context_async()`

स्थायी प्रोफ़ाइल के साथ ब्राउज़र लॉन्च करता है और उसका डिफ़ॉल्ट `BrowserContext` लौटाता है। सत्रों के बीच कुकीज़, `localStorage`, IndexedDB, कैश और फ़िंगरप्रिंट `seed` बने रहते हैं।

- `profile="pricing-eu"` पास करने से `~/.ombra/profiles/pricing-eu` के अंतर्गत `.ombra/profile.json` मेटाडेटा और लॉक फ़ाइल के साथ प्रोफ़ाइल बनती है।
- `user_data_dir="./my-profile"` (या एक पोज़िशनल पाथ आर्ग्यूमेंट) पास करने से उस स्पष्ट डायरेक्टरी का उपयोग होता है।
- किसी अन्य प्रोसेस से उसी प्रोफ़ाइल को एक साथ लॉन्च करने पर डेटा खराब होने के बजाय `ProfileBusyError` उत्पन्न होता है।

```python
from ombrabrowser import launch_persistent_context

# नामित प्रोफ़ाइल द्वारा (~/.ombra/profiles/ में संग्रहीत)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # कुकीज़, स्टोरेज और seed सुरक्षित हो जाते हैं

# स्पष्ट पाथ द्वारा (उदाहरण के लिए, Chrome एक्सटेंशन लोड करने हेतु)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

असिंक्रोनस समकक्ष: `await launch_persistent_context_async(...)`।

### यूटिलिटी फ़ंक्शन और डायग्नोस्टिक्स (Python)

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

# खोजे गए इंजन बाइनरी की जाँच करें
print(binary_info())
# {'version': '151.0.7922.108-9', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# ब्राउज़र लॉन्च किए बिना इंजन डाउनलोड और सत्यापित करें
ensure_binary(version="151.0.7922.108-9")

# SDK द्वारा प्रबंधित इंजन बाइनरी हटाएँ (~/.ombra/profiles के अंतर्गत प्रोफ़ाइल सुरक्षित रहती हैं)
clear_cache()

# Chromium शुरू किए बिना तैयार लॉन्च कमांड देखें
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# रनटाइम मेटाडेटा (CDP पोर्ट, ws_url, seed, pid) पढ़ें और प्रोसेस स्वास्थ्य की जाँच करें
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # इंजन डाउनलोड और सत्यापित करें (Ed25519 + SHA-256)
ombrabrowser install --version 151.0.7922.108-9  # किसी विशिष्ट इंजन बिल्ड को इंस्टॉल करें
ombrabrowser info                                # एनवायरनमेंट, बाइनरी और निर्भरता डायग्नोस्टिक्स (उपनाम: doctor)
ombrabrowser info --quick --json                 # बाइनरी चलाए बिना त्वरित मशीन-पठनीय रिपोर्ट
ombrabrowser info --proxy socks5://user:pass@host:1080  # प्रॉक्सी के माध्यम से एग्ज़िट IP, टाइमज़ोन और लोकेल रिज़ॉल्यूशन का परीक्षण करें
ombrabrowser update                              # रिलीज़ चैनल जाँचें और कैश्ड इंजन अपडेट करें
ombrabrowser clear-cache                         # कैश्ड इंजन बाइनरी साफ़ करें (प्रोफ़ाइल सुरक्षित रहती हैं)
ombrabrowser login                               # ~/.ombra/license.key में लाइसेंस कुंजी सहेजें (केवल पुराने बिल्ड)
ombrabrowser logout                              # सहेजी गई लाइसेंस कुंजी हटाएँ
```

यही कमांड `python -m ombrabrowser <command>` के माध्यम से भी उपलब्ध हैं।

## Node.js और TypeScript API

`@ombralabs/sdk` पूर्ण TypeScript परिभाषाओं (`.d.ts`) के साथ दोहरे ESM + CommonJS बिल्ड प्रदान करता है। Playwright और Puppeteer दोनों ही नीचे एक ही इंजन पर चलते हैं।

### Playwright (डिफ़ॉल्ट)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// प्रॉक्सी, फ़िंगरप्रिंट और इनपुट सिमुलेशन के साथ बुनियादी लॉन्च
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

// सुविधाजनक लॉन्च: एक ही कॉल में ब्राउज़र + कॉन्टेक्स्ट
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// स्थायी प्रोफ़ाइल — रन के बीच कुकीज़, localStorage और seed बने रहते हैं
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> ऊपर दिया गया प्रत्येक स्निपेट स्वतंत्र है। किसी मौजूदा Playwright लॉन्चर को माइग्रेट करने के लिए, आप इम्पोर्ट को `import * as chromium from "@ombralabs/sdk"` से भी बदल सकते हैं और `await chromium.launch(...)` को वैसा ही रख सकते हैं।

### Puppeteer

`@ombralabs/sdk` से `launchPuppeteer()` का उपयोग करें या `@ombralabs/sdk/puppeteer` से इम्पोर्ट करें:

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

> **Puppeteer पर टिप्पणी:** Puppeteer, `connectOverCDP({ noDefaults: true })` उपयोग करने वाले Playwright की तुलना में अधिक डिफ़ॉल्ट CDP ट्रैफ़िक भेजता है। सख्त CDP जाँच वाली साइटों के लिए Playwright की अनुशंसा की जाती है।

### यूटिलिटीज़ और CLI (Node.js)

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

## मानवीकृत इनपुट

Ombra में, इनपुट सिमुलेशन (`humanize`) ऑटोमेशन क्लाइंट के चारों ओर JS रैपर के रूप में लागू करने के बजाय **नेटिव रूप से Chromium ब्राउज़र प्रोसेस में कंपाइल** किया गया है (`cursory-rs` और इंजन के इनपुट शेड्यूलर द्वारा संचालित)। इसका अर्थ है:

- हर मानक Playwright और Puppeteer क्रिया (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) ब्राउज़र के भीतर एक ही प्रति-टैब इनपुट क्यू से होकर गुज़रती है।
- व्यवहार संबंधी पैरामीटर प्रोफ़ाइल `seed` (`--fingerprint-humanize-seed`) से नियतात्मक रूप से प्राप्त होते हैं।
- SDK कभी भी `Page` या `Browser` को प्रॉक्सी क्लासों में रैप नहीं करता — नेटिव टाइप और क्लाइंट व्यवहार पूरी तरह सुरक्षित रहते हैं।

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**`humanize=True` से क्या बदलता है:**

| क्रिया | `humanize` के बिना | `humanize=True` के साथ |
|---|---|---|
| माउस की गति | तात्कालिक टेलीपोर्ट | त्वरण, विराम और हल्के ओवरशूट के साथ `cursory-rs` कर्व्स |
| क्लिक और ड्रैग | तात्कालिक प्रेस | लक्ष्य के भीतर सटीक बिंदु, क्लिक से पहले विराम और होल्ड अवधि |
| टेक्स्ट इनपुट | तुरंत मान सेट होना | कॉन्फ़िगर की गई लय और कीबोर्ड लेआउट के साथ अक्षर-दर-अक्षर टाइपिंग, कभी-कभार टाइपो और स्व-सुधार; बहुत लंबा टेक्स्ट सिस्टम क्लिपबोर्ड को छुए बिना आइसोलेटेड क्लिपबोर्ड के माध्यम से पेस्ट होता है |
| स्क्रॉलिंग | एक ही छलांग | मापे गए मंदन (डीसेलरेशन) प्रोफ़ाइल का पालन करने वाली व्हील/ट्रैकपैड इवेंट शृंखला |
| निष्क्रिय अंतराल | स्थिर कर्सर | `careful` प्रीसेट में, क्रियाओं के बीच हल्का निष्क्रिय कर्सर ड्रिफ़्ट |

**प्रीसेट** — `default` (सामान्य गति), `careful` (धीमा, सचेत, निष्क्रिय सूक्ष्म हलचलों के साथ), और `fast` (तेज़ गति)। इनपुट सिमुलेशन को स्पष्ट रूप से अक्षम करने के लिए `humanize=False` (`humanize: false`) पास करें।

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

आप `Ombra` CDP डोमेन के माध्यम से ब्राउज़र को रीस्टार्ट किए बिना रनटाइम पर मोड को टॉगल या प्रीसेट बदल सकते हैं:

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

## फ़िंगरप्रिंट और प्रोफ़ाइल प्रबंधन

इंजन एक ही `seed` से सुसंगत ब्राउज़र कॉन्फ़िगरेशन तैयार करता है। जब `seed` नहीं दिया जाता है:

| परिदृश्य | व्यवहार |
|---|---|
| **प्रोफ़ाइल के बिना `launch()`** | SDK सत्र के लिए एक यादृच्छिक `seed` बनाता है और एक अस्थायी डायरेक्टरी बनाता है जो `close()` के बाद हटा दी जाती है। |
| **`profile="name"` या `user_data_dir="./dir"`** | `seed` को `.ombra/profile.json` में सहेजा जाता है और हर लॉन्च पर पुनः उपयोग किया जाता है — साइटों को वही डिवाइस और कुकीज़ वाला लौटता हुआ विज़िटर दिखता है। |
| **`fingerprint={"seed": N, ...}`** | स्पष्ट `seed` से नियतात्मक फ़िंगरप्रिंट; अतिरिक्त फ़ील्ड शेष सेटिंग्स को सुसंगत रखते हुए व्यक्तिगत मानों को ओवरराइड करते हैं। |

Canvas/ऑडियो नॉइज़ प्रति `eTLD+1` कुंजीबद्ध होता है (एक ही साइट पर स्थिर, अलग-अलग साइटों पर आपस में न जुड़ने योग्य)। "Canvas Tampering / Masking" डिटेक्टर्स को ट्रिगर होने से बचाने के लिए 2D canvas और WebGL `readPixels` का पिक्सेल नॉइज़ डिफ़ॉल्ट रूप से अक्षम रहता है, और इसे `--fingerprint-pixel-noise` के माध्यम से स्पष्ट रूप से सक्षम किया जा सकता है।

> **सुझाव:** एक ही साइट पर बार-बार जाने के लिए, अस्थायी `launch()` में निश्चित `seed` पास करने के बजाय स्थायी प्रोफ़ाइल (`profile="name"` या `launch_persistent_context()`) का उपयोग करें — इस तरह फ़िंगरप्रिंट के साथ-साथ कुकीज़, कैश और `localStorage` भी सुसंगत बने रहते हैं।

### `fingerprint` ऑब्जेक्ट के फ़ील्ड

नीचे दिए गए फ़ील्ड नाम Python (`snake_case`) के अनुरूप हैं; Node.js दोनों `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) और `snake_case` स्वीकार करता है:

| फ़ील्ड | प्रकार | विवरण |
|---|---|---|
| `seed` | `int` (`>= 0`) | समग्र फ़िंगरप्रिंट कॉन्फ़िगरेशन तय करने वाला जनरेटर सीड |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | लक्ष्य OS (`navigator.platform`, UA, GPU और फ़ॉन्ट पूल) |
| `os_version` | `string` | Client Hints के लिए OS संस्करण संकेत |
| `timezone` | IANA ज़ोन या `"auto"` | टाइमज़ोन (उदा. `"Europe/Berlin"`)। `"auto"` GeoIP के माध्यम से प्रॉक्सी एग्ज़िट से ज़ोन निर्धारित करता है |
| `locale` | BCP-47 या `"auto"` | लोकेल (`Accept-Language`, `navigator.languages`, ICU `Intl`)। `"auto"` प्रॉक्सी एग्ज़िट से लोकेल निर्धारित करता है |
| `screen` | `{"width", "height"}` या `"auto"` | लक्ष्य OS के टास्कबार / मेन्यू बार को ध्यान में रखते हुए स्क्रीन और कार्य-क्षेत्र के आयाम |
| `gpu` | `{"vendor", "renderer"}` या `"auto"` | स्पष्ट WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` स्ट्रिंग्स |
| `hardware_concurrency` | `int` या `"auto"` | रिपोर्ट किया गया `navigator.hardwareConcurrency` |
| `device_memory` | `int` या `"auto"` | रिपोर्ट की गई `navigator.deviceMemory` (GB में) |
| `noise` | `bool` | फ़िंगरप्रिंट नॉइज़ सक्षम/अक्षम करें (`False` होने पर `--disable-fingerprint-noise` पास होता है) |

> फ़िंगरप्रिंट पैरामीटर के प्राथमिक स्रोत के रूप में `seed` को बनाए रखें: तालमेल रखे बिना व्यक्तिगत मानों को ओवरराइड करना (जैसे किसी OS के साथ असंगत GPU जोड़ना) डिटेक्टर्स के लिए विरोधाभास पैदा कर सकता है।

### अतिरिक्त इंजन फ़्लैग (`args`)

इंजन द्वारा समर्थित वे फ़्लैग जिन्हें SDK स्वतः सेट नहीं करता (`args=[...]` के माध्यम से पास करें):

| फ़्लैग | उद्देश्य |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | `Sec-CH-UA` में ब्राउज़र ब्रांड (SDK डिफ़ॉल्ट रूप से `chrome` उपयोग करता है) |
| `--fingerprint-tls-profile=chrome-<major>` | निर्दिष्ट Chrome प्रमुख संस्करण से मेल खाने वाला TLS ClientHello प्रोफ़ाइल (इंजन संस्करण से SDK द्वारा स्वतः सेट) |
| `--webrtc-ip=<ip>` | वास्तविक STUN ट्रैफ़िक भेजे बिना WebRTC ICE कैंडिडेट्स में प्रतिस्थापित IP पता |
| `--fingerprint-location=<lat,lon>` | `navigator.geolocation` द्वारा रिपोर्ट किए जाने वाले निर्देशांक |
| `--fingerprint-storage-quota=<MB>` | `navigator.storage.estimate()` द्वारा रिपोर्ट किया जाने वाला स्टोरेज कोटा |
| `--fingerprint-max-touch-points=<N>` | टच पॉइंट्स की संख्या (`navigator.maxTouchPoints` और पॉइंटर मीडिया क्वेरी) |
| `--fingerprint-device-pixel-ratio=<ratio>` | डिस्प्ले पिक्सेल घनत्व (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | स्क्रीन कलर डेप्थ |
| `--disable-gpu-fingerprint` | होस्ट का वास्तविक GPU पास-थ्रू करें (WebGL/WebGPU स्ट्रिंग्स, सीमाएँ और एक्सटेंशन) |
| `--disable-gpu-string-spoof` | अन्य प्रोफ़ाइल सेटिंग्स को बनाए रखते हुए वास्तविक GPU स्ट्रिंग्स पास-थ्रू करें |
| `--disable-fingerprint-noise` | पहचान पैरामीटर सक्रिय रखते हुए canvas/WebGL/ऑडियो नॉइज़ अक्षम करें |
| `--fingerprint-pixel-noise` | 2D canvas और `readPixels` के लिए वैकल्पिक आइडमपोटेंट पिक्सेल नॉइज़ सक्षम करें |
| `--profile-label=<text>` | ब्राउज़र एड्रेस बार में दिखने वाला प्रोफ़ाइल लेबल (केवल UI; वेब पेजों को अदृश्य) |

### Linux पर फ़ॉन्ट सेटअप

न्यूनतम Linux सर्वर और कंटेनर में अक्सर इमोजी तथा CJK फ़ॉन्ट नहीं होते, जिसके कारण छिपे हुए canvas टेक्स्ट और इमोजी रेंडरिंग से असामान्य हैश बनते हैं।

**1. आधारभूत परत (इमोजी और CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows प्रोफ़ाइल (`os="windows"`) के लिए Windows फ़ॉन्ट:**
Linux पर Windows कॉन्फ़िगरेशन चलाते समय `C:\Windows\Fonts\` से वास्तविक फ़ॉन्ट (`Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic` सहित) इंस्टॉल करने से फ़ॉन्ट-गणना की सुसंगति काफ़ी बेहतर हो जाती है:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS प्रोफ़ाइल (`os="macos"`) के लिए macOS फ़ॉन्ट:**
इसी तरह, Linux पर `os="macos"` उपयोग करते समय `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/`, और `/Library/Fonts/` से फ़ॉन्ट `~/.local/share/fonts/mac/` में कॉपी करें और `fc-cache -f` चलाएँ।

`Dockerfile` में, फ़ॉन्ट्स को सिस्टम डायरेक्टरी `/usr/local/share/fonts/` में रखें:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## लॉन्च विकल्प, कॉन्फ़िगरेशन और त्रुटियाँ

### `launch()` विकल्प

विकल्पों के नाम Python API और [SDK अनुबंध](../../docs/sdk-contract.md) के अनुरूप हैं; Node.js `camelCase` समकक्ष (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) का उपयोग करता है और `snake_case` उपनाम भी स्वीकार करता है। अज्ञात विकल्प `InvalidOptionError` के साथ अस्वीकार कर दिए जाते हैं।

| विकल्प | डिफ़ॉल्ट | विवरण |
|---|---|---|
| `headless` | `true` | बिना विंडो के चलाएँ (`--headless=new`) |
| `proxy` | कोई नहीं | प्रॉक्सी URL (`http`, `https`, `socks5`) या ऑब्जेक्ट; प्रमाणीकृत प्रॉक्सी लूपबैक रिले का उपयोग करते हैं |
| `fingerprint` | कोई नहीं | `seed`, OS, टाइमज़ोन, लोकेल, स्क्रीन, GPU, मेमोरी और नॉइज़ की सेटिंग्स |
| `profile` | कोई नहीं | `~/.ombra/profiles/<slug>` के अंतर्गत नामित स्थायी प्रोफ़ाइल (`user_data_dir` के साथ परस्पर अपवर्जी) |
| `user_data_dir` | अस्थायी | स्पष्ट प्रोफ़ाइल डायरेक्टरी पाथ (`profile` के साथ परस्पर अपवर्जी) |
| `args` | `[]` | अतिरिक्त Chromium आर्ग्यूमेंट्स (बिना बदलाव के आगे भेजे जाते हैं) |
| `binary_path` | स्वतः निर्धारित | इंजन निष्पादन योग्य फ़ाइल (एक्ज़ीक्यूटेबल) का स्पष्ट पाथ |
| `version` | env / ऑटो | इंजन संस्करण पिन (उदाहरण के लिए `151.0.7922.108-9`), `OMBRA_VERSION` को ओवरराइड करता है |
| `timeout_ms` | `30000` | इंजन स्टार्टअप और CDP कनेक्शन के लिए समय-सीमा (1000–600000 ms) |
| `humanize` | इंजन डिफ़ॉल्ट | `False`, `True`, या `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / फ़ाइल | पुराने लाइसेंस वाले बिल्ड के लिए कुंजी (`151.0.7922.108-9+` पर आवश्यक नहीं; कभी लॉग नहीं की जाती) |
| `env` | `{}` | इंजन प्रोसेस के लिए अतिरिक्त एनवायरनमेंट वेरिएबल्स |
| `download` | `True` | अनुपस्थित इंजन बाइनरी के स्वचालित डाउनलोड की अनुमति दें |

### एनवायरनमेंट वेरिएबल्स

प्राथमिकता क्रम: **स्पष्ट लॉन्च विकल्प → एनवायरनमेंट वेरिएबल → प्रोफ़ाइल मेटाडेटा → डिफ़ॉल्ट**।

| वेरिएबल | डिफ़ॉल्ट | विवरण |
|---|---|---|
| `OMBRA_BINARY_PATH` | अनसेट | इंजन बाइनरी का स्पष्ट पाथ |
| `OMBRA_CACHE_DIR` | `~/.ombra` | कैश्ड इंजन और नामित प्रोफ़ाइल की डायरेक्टरी |
| `OMBRA_DOWNLOAD_URL` | `https://dl.ombrabrowser.dev` | इंजन डाउनलोड के लिए बेस URL / मिरर (`none`/`off` डाउनलोड अक्षम करता है) |
| `OMBRA_VERSION` | नवीनतम संगत | पिन किया गया इंजन संस्करण (उदाहरण के लिए `151.0.7922.108-9`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | इंजन रिलीज़ चैनल: `stable` या `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | लॉन्च पर नए इंजन बिल्ड की जाँच करें |
| `OMBRA_SKIP_CHECKSUM` | `false` | केवल लोकल डेवलपमेंट के लिए: SHA-256 सत्यापन अक्षम करता है (चेतावनी लॉग करता है) |
| `OMBRA_LICENSE_KEY` | अनसेट | पुराने लाइसेंस वाले बिल्ड के लिए कुंजी (कभी लॉग नहीं की जाती) |
| `OMBRA_TIMEOUT_MS` | `30000` | डिफ़ॉल्ट लॉन्च टाइमआउट (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | लॉग विवरण स्तर: `error`, `warn`, `info`, `debug` |

### टाइप्ड त्रुटियाँ

किसी भी विफलता पर, SDK शुरू किए गए इंजन प्रोसेस को समाप्त करता है, प्रोफ़ाइल लॉक मुक्त करता है, और एक स्थिर `kind` तथा गुप्त-डेटा-रहित `details` के साथ `OmbraError` का उपवर्ग (सबक्लास) उत्पन्न करता है:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

पूर्ण त्रुटि वर्गीकरण और पुनः प्रयास (रीट्राई) नियम [SDK अनुबंध (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) में प्रलेखित हैं।

## प्लेटफ़ॉर्म, इंटीग्रेशन और कंटेनर

### समर्थित प्लेटफ़ॉर्म और रनटाइम

| घटक | समर्थन | टिप्पणियाँ |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | स्वायत्त बिल्ड `151.0.7922.108-9`; Ombra Desktop Developer ID से हस्ताक्षरित और नोटराइज़्ड है |
| **macOS x64 (Intel)** | ✅ | बिल्ड `151.0.7922.108-7` SDK के stable चैनल पर उपलब्ध है |
| **Linux x64** | ✅ | स्वायत्त बिल्ड `151.0.7922.108-9`; `.tar.xz` निकालने के लिए `xz-utils` (`xz`) आवश्यक है |
| **Windows x64** | ✅ | स्वायत्त बिल्ड `151.0.7922.108-9` और Ombra Desktop इंस्टॉलर |
| **Python** | `3.10+` | `ombrabrowser` के साथ Playwright `>=1.60,<2.0` स्वतः इंस्टॉल होता है |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` या Puppeteer `>=22` (Puppeteer 25+ के लिए Node.js `>=22.12` आवश्यक है) |

### फ़्रेमवर्क और AI एजेंट इंटीग्रेशन

Ombra किसी भी ऐसे ऑटोमेशन टूल या AI एजेंट फ़्रेमवर्क के साथ काम करता है जो कस्टम Chromium बाइनरी स्वीकार करता है या CDP पर कनेक्ट होता है (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain`, और अन्य):

```python
# विकल्प 1: अपने स्वयं के रनर के लिए सत्यापित बाइनरी पाथ और इंजन आर्ग्यूमेंट्स प्राप्त करें
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# विकल्प 2: Ombra SDK से लॉन्च करें और लोकल CDP एंडपॉइंट अपने फ़्रेमवर्क को सौंपें
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# अपने फ़्रेमवर्क को ws_url या cdp_http से कनेक्ट करें — फ़िंगरप्रिंट सेटिंग्स और humanize
# इंजन के अंदर चलते हैं और किसी भी CDP क्लाइंट के लिए सक्रिय रहते हैं
```

### Docker और Linux सर्वर पर चलाना

इमेज बिल्ड समय पर इंजन को पहले से डाउनलोड और सत्यापित करने वाला उदाहरण `Dockerfile`:

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

> **कंटेनर और वेब सर्वर:**
> - यदि आपका कंटेनर Chromium सैंडबॉक्स को आरंभ नहीं कर सकता, तो `args=["--no-sandbox"]` के माध्यम से स्पष्ट रूप से `--no-sandbox` पास करें (SDK अपनी ओर से यह फ़्लैग कभी नहीं जोड़ता)।
> - बिना डिस्प्ले वाले सर्वर पर `headless=False` के साथ चलाने के लिए `Xvfb` का उपयोग करें ([नीचे देखें](#समस्या-निवारण))।
> - `uvloop` के साथ `uvicorn` के अंतर्गत चलाते समय सबप्रोसेस पाइप हैंग से बचने के लिए `--loop asyncio` पास करें।

## समस्या निवारण

### साइट हेडलेस मोड को ब्लॉक करती है

कुछ एंटी-बॉट सिस्टम C++ पैच के बावजूद हेडलेस मोड में व्यवहारिक और रेंडरिंग अंतर की जाँच करते हैं। `Xvfb` का उपयोग करते हुए वर्चुअल डिस्प्ले पर `headless=False` के साथ चलाएँ:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

फिर रेज़िडेंशियल SOCKS5/HTTP प्रॉक्सी, स्थायी प्रोफ़ाइल, सुमेलित टाइमज़ोन/लोकेल, `headless=False` और `humanize=True` के साथ लॉन्च करें:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

यदि Linux पर ब्लॉक जारी रहते हैं, तो [Linux पर फ़ॉन्ट सेटअप](#linux-पर-फ़ॉन्ट-सेटअप) जाँचें।

### साइट हर विज़िट पर चुनौती (चैलेंज) दिखाती है

`profile` के बिना `launch()` कॉल करने पर हर बार एक खाली अस्थायी डायरेक्टरी और नए `seed` से शुरुआत होती है, इसलिए साइट हर रन को बिना कुकीज़ वाला बिल्कुल नया विज़िटर मानती है। `profile="..."` या `launch_persistent_context(...)` पर स्विच करें ताकि रन के बीच कुकीज़, `localStorage` और `seed` बने रहें।

### `ProfileBusyError`

एक नामित प्रोफ़ाइल या `user_data_dir` एक समय में केवल एक ही प्रोसेस में खुली रह सकती है। प्रत्येक समानांतर वर्कर को एक अलग प्रोफ़ाइल नाम दें (`profile=f"worker-{i}"`)। क्रैश हुए प्रोसेस द्वारा छोड़े गए पुराने लॉक स्वतः पहचाने और साफ़ कर दिए जाते हैं।

### क्या मुझे `playwright install chromium` चलाना होगा?

नहीं। Ombra अपनी स्वयं की इंजन बाइनरी चलाता है और Playwright के स्टॉक Chromium का उपयोग नहीं करता। Linux पर आपको केवल सिस्टम लाइब्रेरीज़ और `xz-utils` की आवश्यकता है:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### इंजन अपडेट करना, चैनल बदलना और रोल बैक करना

SDK को नवीनतम रिलीज़ पर अपडेट करें:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

`beta` चैनल का परीक्षण करें या किसी सटीक इंजन बिल्ड को पिन/रोल बैक करें:

```python
# किसी विशिष्ट लॉन्च के लिए सटीक बिल्ड पिन करें
browser = launch(version="151.0.7922.108-9")
```

```bash
# या एनवायरनमेंट वेरिएबल्स / CLI के माध्यम से कॉन्फ़िगर करें
export OMBRA_VERSION=151.0.7922.108-9
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 151.0.7922.108-9

# या लोकल रूप से बिल्ड की गई बाइनरी की ओर संकेत करें
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper लोकल बिल्ड को ब्लॉक करता है

Apple Silicon macOS के लिए आधिकारिक Ombra रिलीज़ Apple Developer ID प्रमाणपत्र से हस्ताक्षरित और नोटराइज़्ड होती हैं। यदि आप कोई लोकल अहस्ताक्षरित डेवलपर बिल्ड चलाते हैं और macOS उसे क्वारंटीन कर देता है, तो एक बार क्वारंटीन एट्रिब्यूट हटा दें:

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### सिंक्रोनस Python में पेज पर प्रतीक्षा करना

सिंक्रोनस Playwright में, `page.goto()` के बाद एक लंबा `time.sleep(15)` Playwright के इवेंट लूप को रोक देता है, जिससे सत्यापन पेज अटक सकते हैं। इसके बजाय हल्के कॉन्टेक्स्ट कॉल के साथ छोटे अंतराल में प्रतीक्षा करें:

```python
import time

for _ in range(15):
    page.context.cookies()  # पेज के DOM को छुए बिना Playwright प्रोसेसिंग जारी रखता है
    time.sleep(1)
```

असिंक्रोनस Python में `await asyncio.sleep(...)` का उपयोग करें; Node.js में `await new Promise(r => setTimeout(r, ms))` का उपयोग करें। जाँच से पहले बार-बार `page.wait_for_timeout()` और अनावश्यक `page.evaluate()` कॉल से भी बचें ताकि अतिरिक्त CDP ट्रैफ़िक न बने।

## सुरक्षा

- **इंजन की प्रामाणिकता और अखंडता।** निष्कर्षण से पहले, SDK पिन की गई सार्वजनिक कुंजी के विरुद्ध रिलीज़ एनवलप के Ed25519 हस्ताक्षर को सत्यापित करता है और आर्काइव तथा निष्पादन योग्य फ़ाइल दोनों का SHA-256 डाइजेस्ट जाँचता है।
- **केवल लोकल CDP।** डीबग पोर्ट सख्ती से `127.0.0.1` से बाइंड होता है। अतिरिक्त प्रमाणीकरण के बिना CDP पोर्ट को कभी सार्वजनिक नेटवर्क पर उजागर न करें — CDP ब्राउज़र पर पूर्ण नियंत्रण देता है।
- **गुप्त डेटा का अलगाव।** प्रॉक्सी क्रेडेंशियल्स केवल लोकल लूपबैक रिले की मेमोरी में रहते हैं और कभी भी प्रोसेस कमांड लाइन, प्रोफ़ाइल मेटाडेटा, लॉग्स या त्रुटि विवरण में दिखाई नहीं देते।
- **कोई टेलीमेट्री नहीं।** SDK कोई एनालिटिक्स, क्रैश रिपोर्ट या छिपे हुए नेटवर्क पिंग नहीं भेजता।

सुरक्षा संबंधी समस्याओं की गोपनीय रिपोर्ट [SECURITY.md](../../SECURITY.md) के अनुसार करें।

## रिपॉज़िटरी मानचित्र

```text
.
├── README.md                    # अंग्रेज़ी मूल README (English)
├── translations/
│   ├── hi/README.md             # यह फ़ाइल (हिंदी)
│   └── <locale>/README.md       # 20 अतिरिक्त स्थानीयकरण
├── desktop/                     # Ombra Desktop (Tauri: Rust कैटलॉग + Vue UI)
├── docs/
│   ├── architecture.md          # आर्किटेक्चर, ट्रस्ट बाउंड्रीज़, जीवनचक्र
│   ├── sdk-contract.md          # v0.1 लॉन्च अनुबंध, विकल्प, त्रुटियाँ, इनवेरिएंट्स
│   ├── stealth-checkup.md       # चेकअप पद्धति (अंग्रेज़ी)
│   ├── stealth-checkup.ru.md    # चेकअप पद्धति (रूसी)
│   ├── versioning.md            # SDK, इंजन और क्लाइंट संस्करण नियम
│   └── desktop/                 # Desktop लोकल प्रोफ़ाइल और कुंजी मार्गदर्शिकाएँ
├── spec/
│   └── schemas/                 # लॉन्च विकल्पों और बाइनरी मेटाडेटा के लिए JSON Schemas
├── sdks/
│   ├── manifest.json            # मशीन-पठनीय SDK रजिस्ट्री
│   ├── README.md                # SDK संरचना और योगदान नियम
│   ├── python/                  # Python SDK (ombrabrowser के रूप में प्रकाशित)
│   ├── node/                    # Node.js / TypeScript SDK (@ombralabs/sdk के रूप में प्रकाशित)
│   └── ...                      # अन्य भाषाओं (Go, Rust, C#, Java, PHP, Ruby) के लिए अनुबंध ढाँचे
├── conformance/                 # क्रॉस-लैंग्वेज लॉन्च और स्टेल्थ-इनवेरिएंट टेस्ट केस
├── tools/check_repo.py          # संरचना, स्कीमा और लिंक सत्यापनकर्ता (CI)
└── .github/workflows/ci.yml
```

इस रिपॉज़िटरी में SDK अनुबंध, स्कीमा, कन्फ़ॉर्मेंस टेस्ट केस, डॉक्यूमेंटेशन और Ombra Desktop का सोर्स कोड रखा गया है। Chromium इंजन के पैच एक अलग रिपॉज़िटरी में बनाए रखे जाते हैं, और कंपाइल किए गए बिल्ड डाउनलोड चैनल तथा [GitHub Releases](https://github.com/ombralabs/ombra/releases) के माध्यम से प्रकाशित किए जाते हैं।

## अक्सर पूछे जाने वाले प्रश्न (FAQ)

### क्या यह Playwright का फ़ॉर्क है?

नहीं। SDK लोकल CDP के माध्यम से आधिकारिक Playwright (या Puppeteer) क्लाइंट को Ombra Chromium से जोड़ता है। सभी टाइप, लोकेटर, वेट्स और पेज ऑब्जेक्ट्स मानक ही रहते हैं।

### क्या Ombra मुफ़्त है, और क्या मुझे लाइसेंस कुंजी की आवश्यकता है?

इस रिपॉज़िटरी में SDK का सोर्स कोड Apache License 2.0 के अंतर्गत ओपन सोर्स है। वर्तमान इंजन बिल्ड (`151.0.7922.108-9` और नए) तथा लोकल Ombra Desktop प्रोफ़ाइल मैनेजर (`desktop-v1.2.2`) मुफ़्त और स्वायत्त रूप से चलते हैं — बिना किसी खाते, लाइसेंस कुंजी, हार्डवेयर ID या प्रोफ़ाइल संख्या सीमा के। `license_key` और `OMBRA_LICENSE_KEY` की आवश्यकता केवल पुराने लाइसेंस वाले बिल्ड के लिए होती है।

### क्या SDK का उपयोग करने के लिए Ombra Desktop इंस्टॉल करना ज़रूरी है?

नहीं। SDK इंजन को सीधे चाइल्ड प्रोसेस के रूप में लॉन्च करता है, जिससे यह स्क्रिप्ट्स, कंटेनर्स और CI के लिए उपयुक्त है। यदि आप GUI के माध्यम से लोकल प्रोफ़ाइल कैटलॉग प्रबंधित करना चाहते हैं, तो Ombra Desktop वैकल्पिक है।

### Ombra `playwright-stealth` से कैसे भिन्न है?

`playwright-stealth` एक सामान्य ब्राउज़र के ऊपर पेजों में JavaScript इंजेक्ट करता है, और आधुनिक डिटेक्टर अक्सर स्वयं इन पैच की पहचान कर लेते हैं। Ombra अपने बदलावों को Chromium के सोर्स कोड में कंपाइल करता है, और SDK पेजों में कोई स्क्रिप्ट इंजेक्ट नहीं करता।

### क्या मैं अपना स्वयं का प्रॉक्सी उपयोग कर सकता हूँ?

हाँ। `proxy` में `http://`, `https://`, या `socks5://` प्रॉक्सी पास करें। जब क्रेडेंशियल्स मौजूद होते हैं, तो SDK एक लोकल लूपबैक रिले चलाता है ताकि वे कभी प्रोसेस आर्ग्यूमेंट्स में न आएँ। ध्यान दें कि Playwright का स्वयं का `context.request` / `page.request` क्लाइंट ब्राउज़र-स्तरीय प्रॉक्सी सेटिंग्स को बायपास कर सकता है — ट्रैफ़िक का प्रॉक्सी से होकर जाना सुनिश्चित करने के लिए पेज कॉन्टेक्स्ट से `fetch()` कॉल करें।

### Playwright और Puppeteer के कौन-से संस्करण समर्थित हैं?

Python SDK को Playwright `>=1.60,<2.0` की आवश्यकता होती है (जो `ombrabrowser` के साथ स्वतः इंस्टॉल होता है)। Node.js SDK `playwright-core@^1.60.0` या `puppeteer-core >=22.0.0` का समर्थन करता है। संगतता नियमों के लिए [संस्करण मार्गदर्शिका](../../docs/versioning.md) देखें।

### क्या Ombra हर बॉट जाँच को पार करने की गारंटी देता है?

नहीं। डिटेक्शन एक बदलता हुआ लक्ष्य है जो साइट, क्षेत्र, IP प्रतिष्ठा, प्रोफ़ाइल के इतिहास और डिटेक्टर संस्करण पर निर्भर करता है। किसी विशिष्ट कॉन्फ़िगरेशन को वस्तुनिष्ठ रूप से मापने और ट्रैक करने के लिए [स्टेल्थ चेकअप पद्धति](../../docs/stealth-checkup.md) का उपयोग करें।

### Ombra किन उपयोग मामलों (यूज़ केस) के लिए बनाया गया है?

Ombra अधिकृत ऑटोमेशन, QA परीक्षण, मॉनिटरिंग, अनुसंधान और पृथक कार्य प्रोफ़ाइलों के प्रबंधन के लिए बनाया गया है। अनधिकृत एक्सेस, क्रेडेंशियल स्टफ़िंग और दुरुपयोग समर्थित नहीं हैं।

## योगदान

योगदान के दिशा-निर्देश [CONTRIBUTING.md](../../CONTRIBUTING.md) में, समुदाय के मानक [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) में, और SDK निर्देश [sdks/README.md](../../sdks/README.md) में दिए गए हैं।

- कोई नया लॉन्च विकल्प जोड़ने से पहले [SDK अनुबंध](../../docs/sdk-contract.md) और [स्कीमा](../../spec/schemas) अपडेट करें।
- SDK व्यवहार में बदलाव करते समय, कार्यान्वयन, टेस्ट्स और [conformance](../../conformance/README.md) में साझा टेस्ट केस अपडेट करें।
- पुल रिक्वेस्ट खोलने से पहले रिपॉज़िटरी संरचना और लिंक सत्यापित करने के लिए `python3 tools/check_repo.py` चलाएँ।

## लाइसेंस

इस रिपॉज़िटरी में SDK का सोर्स कोड [Apache License 2.0](../../LICENSE) के अंतर्गत लाइसेंस प्राप्त है। यह लाइसेंस Ombra ट्रेडमार्क, Ombra Chromium इंजन या Ombra Desktop पर कोई अधिकार नहीं देता — ट्रेडमार्क और थर्ड-पार्टी शर्तों के लिए [NOTICE](../../NOTICE) देखें।

## लिंक

- 🌐 **वेबसाइट** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **रिलीज़ (इंजन और Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **बदलावों का इतिहास (Changelog)** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **बग और फ़ीचर अनुरोध** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **संगठन** — [Ombra Labs](https://github.com/ombralabs)
