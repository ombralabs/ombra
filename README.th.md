# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

ใน Python และ Node.js ฟังก์ชัน `launch()` จะเปิด Ombra Chromium และคืนออบเจกต์ `Browser` ของ Playwright หากใช้ Puppeteer บน Node.js ให้เรียก `launchPuppeteer()`

**[การติดตั้ง](#การติดตั้ง)** · <a href="README.md">English</a>

<details>
<summary>ภาษา</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## การควบคุมฟิงเกอร์พรินต์ใน Chromium

Ombra ควบคุมฟิงเกอร์พรินต์ของเบราว์เซอร์ในตัว Chromium เอง ทั้ง canvas, WebGL, เสียง, ฟอนต์, จำนวนหน่วยประมวลผลเชิงตรรกะ, ตำแหน่งและขนาดขององค์ประกอบบนหน้าเว็บ, ข้อมูลระบุ GPU, เขตเวลา และสัญญาณการทำงานอัตโนมัติ เอนจินใช้ TLS และ HTTP/2 ของ Chromium และประมวลผลอินพุตที่เลียนแบบการใช้งานของคนภายในโปรเซสของเบราว์เซอร์

SDK เปิดเอนจินในเครื่องและเชื่อมต่อไคลเอนต์ผ่าน Chrome DevTools Protocol (CDP) จึงเรียกใช้จากสคริปต์ คอนเทนเนอร์ หรืองาน CI ได้โดยไม่ต้องติดตั้งแอปเดสก์ท็อป Ombra

## สถานะ

ตัวอย่างใช้แพ็กเกจ Python และ Node.js รุ่นแอลฟาที่เผยแพร่แล้ว ที่เก็บโค้ดนี้ยังมีข้อกำหนดการเปิดเบราว์เซอร์ที่ใช้ร่วมกันและโครงตั้งต้นสำหรับ SDK ทั้งแปดชุด

| องค์ประกอบ | สถานะ |
|---|---|
| [สัญญา API ของ SDK](docs/sdk-contract.md) | ฉบับร่าง `0.1.0` |
| SDK สำหรับ Python | `0.1.3` แอลฟา · [`ombrabrowser` (PyPI)](https://pypi.org/project/ombrabrowser/) |
| SDK สำหรับ Node.js | `0.1.0` แอลฟา · [`@ombralabs/sdk` (npm)](https://www.npmjs.com/package/@ombralabs/sdk) |
| [สคีมาที่ใช้ร่วมกัน](spec/schemas) | ตัวเลือกการเปิดเบราว์เซอร์และข้อมูลไฟล์เอนจิน |
| [ความสอดคล้องข้ามภาษา](conformance) | กรณีทดสอบที่ใช้ร่วมกันทั้งสอง SDK |
| [การตรวจสอบสเทลธ์](docs/stealth-checkup.md) | เกณฑ์การทดสอบและแบบรายงาน |

## การติดตั้ง

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

สำหรับ Puppeteer ให้ติดตั้ง `puppeteer-core` แทน `playwright-core` ดูเวอร์ชันของไคลเอนต์และรันไทม์ที่รองรับได้ที่[หน้าแพ็กเกจบน npm](https://www.npmjs.com/package/@ombralabs/sdk)

SDK ตรวจสอบพาธที่ระบุใน `binary_path` ของ Python หรือ `binaryPath` ของ Node.js ก่อน จากนั้นจึงตรวจสอบ `OMBRA_BINARY_PATH` ไดเรกทอรีเอนจินของแอปเดสก์ท็อป และแคชของ SDK ตามลำดับ หากไม่พบเอนจิน SDK จะดาวน์โหลดและตรวจสอบไฟล์ให้

หากต้องการปิดการดาวน์โหลด ให้ใช้ `download=False` ใน Python หรือ `download: false` ใน Node.js หากต้องการเตรียมเอนจินโดยยังไม่เปิดเบราว์เซอร์ ให้เรียก `ensure_binary()` ใน Python หรือ `ensureBinary()` ใน Node.js

## เริ่มต้นอย่างรวดเร็ว

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

หากต้องการใช้คุกกี้และข้อมูลเว็บไซต์จากโปรไฟล์ที่ตั้งชื่อไว้ ให้เปิดหน้าใหม่ในบริบทเดิมของโปรไฟล์ ตัวอย่างนี้ตั้งค่าพร็อกซีด้วย

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

เรียก `launchPuppeteer()` เพื่อรับออบเจกต์ `Browser` ของ Puppeteer

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## การย้ายโดยไม่ต้องเขียนใหม่

หากสคริปต์ Python ใช้ Playwright อยู่ ให้ติดตั้ง `ombrabrowser` แล้วเปลี่ยนคำสั่งนำเข้าและคำสั่งเปิดเบราว์เซอร์ ส่วนเมธอดของหน้า ชนิดข้อมูล และตัวเลือกองค์ประกอบยังใช้ของ Playwright ได้ตามเดิม

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

ใน Node.js ให้เปลี่ยนสองบรรทัดนี้

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## วิธีการทำงาน

```mermaid
flowchart LR
    Script["สคริปต์ของคุณ<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + บริดจ์ CDP"]
    Engine["Ombra Chromium<br/>เอนจินที่แพตช์แล้ว"]
    Client["ไคลเอนต์ออโตเมชันแบบเนทีฟ"]
    Profile[("โปรไฟล์<br/>ซีด · คุกกี้ · ส่วนขยาย")]

    Script -->|launch()| SDK
    SDK -->|เริ่มโปรเซส| Engine
    SDK -->|เชื่อมต่อผ่าน CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` ค้นหาหรือดาวน์โหลดเอนจินแล้วตรวจสอบไฟล์
2. SDK เลือกไดเรกทอรีและค่า seed ของโปรไฟล์ หากพร็อกซีต้องยืนยันตัวตน SDK จะเปิดตัวส่งต่อในเครื่อง
3. SDK เปิด Chromium ด้วยโปรไฟล์และตัวเลือกที่กำหนด โดยให้พอร์ตดีบักฟังบนลูปแบ็ก
4. เมื่อ `DevToolsActivePort` พร้อม SDK จะเชื่อมต่อ Playwright หรือ Puppeteer ผ่าน CDP และคืนออบเจกต์ `Browser` ของไคลเอนต์นั้น
5. `browser.close()` หยุดเอนจินและปลดล็อกโปรไฟล์

หลังจากเปิดเบราว์เซอร์แล้ว ไคลเอนต์จะส่งคำสั่งเกี่ยวกับหน้าเว็บไปยัง Chromium โดยตรง

## เมทริกซ์ SDK

| รันไทม์ | แพ็กเกจที่เผยแพร่แล้ว | ออบเจกต์เบราว์เซอร์ |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

SDK อีกหกชุดมีไดเรกทอรีเตรียมไว้แล้ว ดูชื่อแพ็กเกจและไคลเอนต์ที่วางแผนไว้ใน[แมนิเฟสต์ SDK](sdks/manifest.json) และดูโครงสร้างไดเรกทอรีใน[คู่มือ SDK](sdks/README.md)

| รันไทม์เป้าหมาย | แพ็กเกจที่วางแผนไว้ | ไคลเอนต์หรือชนิดค่าที่คืน |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## ตัวเลือกการเริ่มทำงาน

ตารางใช้ชื่อพารามิเตอร์ตาม Python API และข้อกำหนดของ SDK ส่วน Node.js เขียนชื่อแบบ camelCase เช่น `timeoutMs`, `userDataDir` และ `binaryPath`

| ตัวเลือก | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `headless` | `true` | เรียกใช้เอนจินโดยไม่มีหน้าต่าง |
| `proxy` | ไม่มี | URL หรือออบเจกต์ของพร็อกซี พร็อกซีที่ต้องยืนยันตัวตนจะใช้รีเลย์แบบลูปแบ็ก |
| `fingerprint` | ไม่มี | ค่า seed และการตั้งค่าระบบปฏิบัติการ เขตเวลา ภาษาและภูมิภาค หน้าจอ และ GPU |
| `profile` | ไม่มี | โปรไฟล์ที่ตั้งชื่อไว้พร้อมคุกกี้ สตอเรจ และซีดที่คงอยู่ |
| `user_data_dir` | ชั่วคราว | ไดเรกทอรีโปรไฟล์ที่ระบุอย่างชัดเจน ใช้ร่วมกับ `profile` ไม่ได้ |
| `args` | `[]` | แฟล็กเพิ่มเติมของเอนจิน ส่งผ่านโดยไม่เปลี่ยนแปลง |
| `timeout_ms` | `30000` | เวลาที่ให้สำหรับเปิดเอนจินและเชื่อมต่อ CDP หน่วยเป็นมิลลิวินาที |
| `humanize` | ค่าเริ่มต้นของเอนจิน | `false`, `true` หรือพรีเซ็ต |
| `captcha` | `false` | เปิดใช้โมดูลของเอนจินพร้อมขีดจำกัดแบบไม่บังคับ |
| `binary_path` | ระบบเลือกให้ | ใช้ไบนารีเอนจินที่ระบุเจาะจง |
| `download` | `true` | ดาวน์โหลดไบนารีเอนจินที่ไม่มีอยู่ |

ดูตัวเลือกการเปิดเบราว์เซอร์ทั้งหมด ชนิดของข้อผิดพลาด และกฎการใช้โปรไฟล์ได้ใน[ข้อกำหนดของ SDK](docs/sdk-contract.md)

## การจัดการไบนารี

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # ดาวน์โหลดและตรวจสอบเอนจินโดยยังไม่เปิดเบราว์เซอร์
clear_cache()     # ลบเอนจินที่ดาวน์โหลดและเก็บโปรไฟล์ไว้
```

SDK ตรวจสอบค่า SHA-256 ของเอนจินก่อนเปิดใช้งาน ควรเปิดการตรวจสอบนี้ไว้ในระบบใช้งานจริง `OMBRA_SKIP_CHECKSUM=1` ใช้เฉพาะกับบิลด์สำหรับพัฒนาในเครื่อง

## การกำหนดค่า

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `OMBRA_BINARY_PATH` | ไม่ได้ตั้งค่า | ไบนารีเอนจินที่ระบุอย่างชัดเจน |
| `OMBRA_CACHE_DIR` | `~/.ombra` | ไบนารีที่จัดการโดย SDK และโปรไฟล์ที่ตั้งชื่อไว้ |
| `OMBRA_DOWNLOAD_URL` | เอนด์พอยต์ของรีลีส | URL ฐานสำหรับดาวน์โหลดไบนารี |
| `OMBRA_VERSION` | เวอร์ชันล่าสุดที่เข้ากันได้ | เวอร์ชันของเอนจินที่ต้องการระบุ |
| `OMBRA_AUTO_UPDATE` | `true` | ตรวจสอบเอนจินเวอร์ชันใหม่เมื่อเริ่มทำงาน |
| `OMBRA_SKIP_CHECKSUM` | `false` | สำหรับการพัฒนาเท่านั้น |
| `OMBRA_LICENSE_KEY` | ไม่ได้ตั้งค่า | ส่งต่อไปยังเอนจิน |
| `OMBRA_TIMEOUT_MS` | `30000` | ระยะเวลารอเปิดเอนจินตามค่าเริ่มต้น หน่วยเป็นมิลลิวินาที |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

ลำดับความสำคัญ: ตัวเลือกที่ระบุอย่างชัดเจน จากนั้นคือตัวแปรสภาพแวดล้อม ตามด้วยเมทาดาทาของโปรไฟล์ และค่าเริ่มต้น

## การเปรียบเทียบ

| คุณสมบัติ | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright หรือ Puppeteer |
| ระดับการแพตช์ | ไม่มี | JavaScript ในหน้าเว็บ | แฟล็กการกำหนดค่า | ซอร์สโค้ดเอนจิน |
| ซีดฟิงเกอร์พรินต์ | ไม่มี | ไม่มี | บางส่วน | ต่อโปรไฟล์ |
| การป้อนข้อมูลแบบมนุษย์ | ไม่มี | ไม่มี | ไม่มี | เอนจิน |
| การแยกโปรไฟล์ | บริบทเบราว์เซอร์ | บริบทเบราว์เซอร์ | ไม่มี | ไดเรกทอรีข้อมูลผู้ใช้ |
| การย้ายโดยไม่ต้องเขียนใหม่ | — | เปลี่ยน import | เขียนใหม่ | เปลี่ยน import |

ผลการตรวจขึ้นอยู่กับเว็บไซต์ IP ขาออก และโปรไฟล์ ดูวิธีวัดผลได้ใน[ขั้นตอนการตรวจสอบ](docs/stealth-checkup.md)

## สเทลธ์เป็นคุณสมบัติของเอนจิน

เอนจินเป็นผู้นำการตั้งค่าฟิงเกอร์พรินต์ไปใช้ ส่วน SDK จะส่งซีดของโปรไฟล์และตัวเลือกการเริ่มทำงานที่ระบุไว้ให้แก่เอนจิน

| ชั้น | จุดที่ Ombra จัดการ |
|---|---|
| TLS และ HTTP/2 | สแตกเครือข่ายของ Chromium เอง ซึ่งจับคู่เวอร์ชันกับบิลด์ของเอนจิน |
| ตัวตนของเบราว์เซอร์ | แพตช์เอนจินระดับซอร์สโค้ดที่ขับเคลื่อนด้วยซีดของโปรไฟล์ |
| พื้นผิวออโตเมชัน | แพตช์เอนจินสำหรับสัญญาณ WebDriver; SDK จะไม่เรียก `Runtime.enable` |
| อินพุต | ตัวชี้ แป้นพิมพ์ และการเลื่อนแบบมนุษย์ซึ่งทำงานภายในโปรเซสของเบราว์เซอร์ |
| ความสอดคล้องของเครือข่าย | การระบุเขตเวลาและโลแคลโดยคำนึงถึงพร็อกซี |
| สถานะ | ไดเรกทอรีข้อมูลผู้ใช้แยกต่างหากสำหรับแต่ละโปรไฟล์ |

### ขอบเขตของ SDK

- พอร์ตดีบัก CDP รับเฉพาะการเชื่อมต่อจากเครื่องเดียวกันผ่านลูปแบ็ก
- SDK ไม่เขียนข้อมูลรับรองพร็อกซี คีย์ใบอนุญาต หรือคุกกี้ลงในบันทึก และไม่ส่งข้อมูลเทเลเมทรี
- โปรไฟล์เดิมจะใช้ค่า seed เดิมจนกว่าคุณจะระบุค่าใหม่
- SDK ไม่แทรกสคริปต์สเทลธ์ด้วยเมธอด `addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument` และไม่แก้ค่าพร็อพเพอร์ตีของหน้าเว็บ
- SDK ตรวจสอบความพร้อมผ่าน HTTP endpoint ของ CDP หรือ `Browser.getVersion` โดยไม่เรียก `Runtime.enable`
- เอนจินเป็นผู้กำหนดข้อมูลระบุตัวเบราว์เซอร์ SDK ไม่เขียนทับข้อมูลนี้ผ่าน Playwright หรือ Puppeteer และไม่เรียกเมธอด `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`
- SDK ไม่เพิ่มแฟล็กเหล่านี้เอง (`--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`)

## การตรวจสอบสเทลธ์

ดำเนินการตรวจสอบเหล่านี้กับบิลด์ของเอนจิน ไคลเอนต์ออโตเมชัน และโปรไฟล์ที่คุณตั้งใจจะใช้งาน

| ชั้น | ตัวอย่างเป้าหมาย | เกณฑ์ผ่าน |
|---|---|---|
| L0 การรับส่งข้อมูล | TrackMe, การตรวจหารอยรั่วของ IP/WebRTC | พิจารณาเฉพาะ IP ขาออก; JA4 และ HTTP/2 ต้องตรงกับ Chromium ของเอนจิน |
| L1 ตัวตน | โพรบภายในเครื่อง, Sannysoft, Intoli | ไม่มีความขัดแย้งระหว่าง UA, UA-CH, แพลตฟอร์ม, GPU, ฟอนต์ และหน้าจอ |
| L2 ฟิงเกอร์พรินต์ | CreepJS, FingerprintJS, BrowserScan | ไม่มีร่องรอยของโหมดไม่มีหน้าจอหรือร่องรอยการโกหก; คงที่เมื่อโหลดหน้าใหม่ |
| L3 ออโตเมชัน | rebrowser, brotector, botd | ไม่มีรอยรั่วของ CDP, สคริปต์ init หรือ WebDriver |
| L4 พฤติกรรม | ความแม่นยำของอินพุต, ร่องรอยของ humanize, การทดสอบ smoke กับ Cloudflare | อีเวนต์ที่เชื่อถือได้ ลำดับที่สมจริง และชาเลนจ์ได้รับการแก้ไข |
| L5 ความเสถียร | ซีด, เวิร์กเกอร์, iframe, ข้ามโอริจิน | ซีดเดียวกันให้เพอร์โซนาเดียวกันในทุกการเริ่มทำงาน |

คู่มืออธิบายสถานะของผลทดสอบ การตรวจหาสาเหตุ และรูปแบบรายงาน อ่านได้ทั้ง[ภาษาอังกฤษ](docs/stealth-checkup.md)และ[ภาษารัสเซีย](docs/stealth-checkup.ru.md)

บันทึกบิลด์ของเอนจิน เวอร์ชันของไคลเอนต์ การตั้งค่าโปรไฟล์ จุดออกของพร็อกซี และเวอร์ชันของตัวตรวจจับไว้พร้อมกับทุกผลลัพธ์ เพื่อให้สามารถทำซ้ำและเปรียบเทียบการทดสอบได้

## แผนผังรีพอซิทอรี

```text
.
├── README.md                  # ต้นฉบับภาษาอังกฤษ
├── README.ru.md               # ฉบับแปลภาษารัสเซีย
├── desktop/                   # ตัวจัดการโปรไฟล์แบบออฟไลน์
├── docs/
│   ├── desktop/               # เอกสารตัวจัดการโปรไฟล์
│   ├── architecture.md        # องค์ประกอบ ลำดับการเริ่มทำงาน ขอบเขต
│   ├── sdk-contract.md        # สัญญาการเริ่มทำงาน v0 และพฤติกรรมของ SDK
│   ├── stealth-checkup.md     # วิธีการตรวจสอบสเทลธ์และรันบุค
│   ├── stealth-checkup.ru.md  # ฉบับแปลภาษารัสเซีย
│   └── versioning.md          # ความเข้ากันได้ของ SDK เอนจิน และไคลเอนต์
├── spec/
│   └── schemas/               # JSON Schema สำหรับตัวเลือกการเริ่มทำงานและข้อมูลไบนารี
├── sdks/
│   ├── manifest.json          # ทะเบียน SDK ที่เครื่องอ่านได้
│   ├── README.md              # โครงสร้างและกฎการมีส่วนร่วม
│   ├── _template/             # โครงตั้งต้นสำหรับภาษาใหม่
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # เคสการเริ่มทำงานและสเทลธ์ที่ไม่ขึ้นกับภาษา
├── tools/check_repo.py        # ตรวจสอบโครงสร้างและลิงก์ (CI)
└── .github/workflows/ci.yml
```

ที่เก็บโค้ดนี้มีโครงตั้งต้นของ SDK ข้อกำหนดการเปิดเบราว์เซอร์ กรณีทดสอบร่วม และตัวจัดการโปรไฟล์แบบออฟไลน์ ส่วนเอนจิน Chromium และ Desktop 1.2.1 ฉบับเต็มมีที่เก็บโค้ดแยกกัน [ซอร์สโค้ดและคู่มือบิลด์ Desktop](desktop/README.md) · [เอกสารตัวจัดการโปรไฟล์](docs/desktop/README.md)

## สัญญา

- `launch(options)` เปิดเอนจินและคืน `Browser` ของไคลเอนต์ จากนั้นไคลเอนต์จะสื่อสารกับ Chromium ผ่าน CDP โดยตรง
- ก่อนเปิดเอนจิน SDK จะตรวจสอบแพลตฟอร์มและค่า SHA-256 หากไม่มีไฟล์เอนจินและอนุญาตให้ดาวน์โหลด SDK จะดาวน์โหลดไฟล์ให้
- โปรไฟล์ที่มีชื่อจะเก็บคุกกี้ ข้อมูลเว็บไซต์ และค่า seed ไว้สำหรับการเปิดครั้งถัดไป
- หากเปิดเอนจินไม่สำเร็จ SDK จะหยุดโปรเซสที่สร้างไว้และรายงานข้อผิดพลาดพร้อมชนิด ผู้เรียกเป็นผู้ตัดสินใจว่าจะลองใหม่หรือไม่
- SDK เอนจิน และไคลเอนต์มีช่วงเวอร์ชันแยกกัน หากต้องการดูบิลด์ของเอนจิน ให้ใช้ `binary_info()` ใน Python หรือ `binaryInfo()` ใน Node.js

## ความเข้ากันได้

| รายการ | เป้าหมาย |
|---|---|
| เอนจิน | บิลด์ที่ SDK เลือก ตรวจสอบได้จาก `binary_info()` หรือ `binaryInfo()` |
| macOS | Apple Silicon และ Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; ช่วงที่ Playwright รองรับ |
| Node.js | 20+; ช่วงที่ Playwright และ Puppeteer รองรับ |

SDK และเอนจินมีเลขเวอร์ชันแยกกัน หากไม่เข้ากัน SDK จะระบุทั้งสองเวอร์ชันไว้ในข้อความแสดงข้อผิดพลาดพร้อมชนิดของข้อผิดพลาด

## การมีส่วนร่วม

ดูขั้นตอนการตรวจทานใน[คู่มือการมีส่วนร่วม](CONTRIBUTING.md) และอ่านวิธีบิลด์ใน[คู่มือ SDK](sdks/README.md)

- หากเปลี่ยนพฤติกรรมของ SDK ให้แก้ส่วนที่เกี่ยวข้องและเพิ่มกรณีทดสอบเฉพาะหรือกรณีทดสอบที่ใช้ร่วมกัน
- หากเพิ่ม SDK สำหรับภาษาใหม่ ให้คัดลอก[เทมเพลต SDK](sdks/_template) ลงทะเบียนใน[แมนิเฟสต์](sdks/manifest.json) แล้วเปิด pull request แบบร่าง
- หากเพิ่มตัวเลือกการเปิดเบราว์เซอร์ ให้อัปเดต[ข้อกำหนด](docs/sdk-contract.md)และ[สคีมา](spec/schemas)ก่อน
- การแก้ไขสเทลธ์ระดับเอนจินให้ทำในที่เก็บโค้ดของเอนจิน โดย SDK ยังต้องผ่านการตรวจสอบ
- โปรดแจ้งปัญหาด้านความปลอดภัยผ่านช่องทางส่วนตัวตาม[นโยบายความปลอดภัย](SECURITY.md)

## คำถามที่พบบ่อย

### นี่เป็นฟอร์กของ Playwright หรือไม่

ไม่ใช่ SDK เชื่อมต่อไคลเอนต์ทางการของ Playwright เข้ากับ Ombra Chromium จึงใช้ชนิดข้อมูล ฟังก์ชันช่วย และ page object ของ Playwright ได้ตามเดิม

### ต้องใช้แอปเดสก์ท็อป Ombra หรือไม่

SDK เปิดเอนจินได้โดยตรง แอปเดสก์ท็อปเป็นทางเลือกสำหรับผู้ที่ต้องการจัดการโปรไฟล์ด้วยตนเอง

### แตกต่างจาก playwright-stealth อย่างไร

การเปลี่ยนแปลงฟิงเกอร์พรินต์ของ Ombra ถูกคอมไพล์เข้าไปใน Chromium SDK จะไม่เพิ่มสคริปต์สเทลธ์ระดับเพจ

### สามารถแก้ CAPTCHA ได้หรือไม่

เอนจินมีโมดูล CAPTCHA ที่เลือกเปิดได้ ความสามารถขึ้นอยู่กับประเภทงาน บิลด์ของเอนจิน และโมเดลที่มี SDK ส่งค่าที่กำหนดเมื่อเปิดเอนจินและให้เข้าถึงตัวควบคุมของโมดูลผ่าน CDP

### ใช้พร็อกซีของตัวเองได้หรือไม่

ได้ ให้ส่งพร็อกซีของคุณเข้าไปใน `launch()` พร็อกซีที่ต้องยืนยันตัวตนจะผ่านรีเลย์แบบลูปแบ็ก ข้อมูลรับรองจึงไม่ปรากฏในคอมมานด์ไลน์ของโปรเซส

### รองรับ Playwright และ Puppeteer เวอร์ชันใดบ้าง

แมนิเฟสต์ของแต่ละแพ็กเกจระบุเวอร์ชันของไคลเอนต์ที่รองรับ โดยไคลเอนต์เป็นดีเพนเดนซีแยกต่างหาก ดูช่วงเวอร์ชันใน[คู่มือความเข้ากันได้](docs/versioning.md)

### จะผ่านการตรวจสอบบอตทุกแบบหรือไม่

ผลลัพธ์ขึ้นอยู่กับเว็บไซต์ ภูมิภาค ชื่อเสียงของ IP ขาออก เวอร์ชันของตัวตรวจจับ และการตั้งค่าโปรไฟล์ ให้ใช้ [การตรวจสอบสเทลธ์](docs/stealth-checkup.md) เพื่อวัดการกำหนดค่าเฉพาะ

## สัญญาอนุญาต

ซอร์สโค้ดของ SDK ในรีพอซิทอรีนี้อยู่ภายใต้ [Apache License 2.0](LICENSE) สัญญาอนุญาตนี้ไม่ได้ให้สิทธิ์ในเอนจิน Ombra ชื่อ Ombra หรือโลโก้ ดู [NOTICE](NOTICE) สำหรับข้อมูลเครื่องหมายการค้าและการระบุแหล่งที่มาของบุคคลที่สาม

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
