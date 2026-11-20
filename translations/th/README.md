<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="สัญญาอนุญาต"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="คอมมิตล่าสุด"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="ดาว"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="ยอดดาวน์โหลด PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="ยอดดาวน์โหลด npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="รุ่นที่เผยแพร่"></a>
</p>

<p align="center">
<a href="#การติดตั้ง"><strong>การติดตั้ง</strong></a> ·
<a href="#api-สำหรับ-python">Python API</a> ·
<a href="#api-สำหรับ-nodejs-และ-typescript">Node.js API</a> ·
<a href="#การจำลองอินพุตแบบมนุษย์">การจำลองอินพุต</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>ภาษา</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium ที่ควบคุมฟิงเกอร์พรินต์ในระดับซอร์สโค้ด C++ พร้อมระบบจำลองอินพุตแบบมนุษย์ในตัวเบราว์เซอร์</h3>

<table><tr><td>
ไม่ใช่ชุดแฟล็กเปิดเบราว์เซอร์ และไม่ใช่การฉีด JavaScript ทับลงบนหน้าเว็บ แต่คือไบนารี Chromium จริงที่คอมไพล์แพตช์ฟิงเกอร์พรินต์ลงในซอร์สโค้ด C++ พร้อมระบบจำลองอินพุตที่ทำงานภายในโพรเซสของเบราว์เซอร์ เชื่อมต่อ Playwright หรือ Puppeteer อย่างเป็นทางการผ่าน CDP ในเครื่องได้ทันที — ไม่มีอ็อบเจกต์ห่อหุ้ม (wrapper) และไม่ต้องเขียนโค้ดจัดการหน้าเว็บใหม่
</td></tr></table>

<br>

<p align="center">
ใช้แทนการเปิดเบราว์เซอร์ของ Playwright และ Puppeteer ได้ทันทีทั้งใน Python และ Node.js<br>
API เดิม ซีเลกเตอร์และชนิดข้อมูลเดิม — เพียงเปลี่ยนบรรทัด import และการเรียก <code>launch()</code>
</p>

- **แพตช์ Chromium ระดับซอร์สโค้ด** — canvas, WebGL, WebGPU, audio, ฟอนต์, GPU, หน้าจอ, CSS media queries, การรายงานฮาร์ดแวร์, WebRTC โดยไม่มีการรั่วไหลจาก STUN, TLS ClientHello, โซนเวลา, โลแคล และการลบสัญญาณระบบอัตโนมัติ (`navigator.webdriver`, `Runtime.enable`, ตัวบ่งชี้โหมด headless)
- **ระบบจำลองอินพุตแบบมนุษย์ในโพรเซสเบราว์เซอร์ (`humanize=True`)** — เส้นทางการเคลื่อนที่ของเคอร์เซอร์ (`cursory-rs`), การเล็งคลิกพร้อมระยะเวลากดค้าง, จังหวะการพิมพ์พร้อมการพิมพ์ผิดแล้วแก้เองอัตโนมัติ และฟิสิกส์การเลื่อนหน้าจอที่ทำงานอยู่ภายใน Chromium ตัว SDK จะคืนค่า `Browser` เนทีฟธรรมดาโดยไม่มีพร็อกซีแรปเปอร์
- **ทำงานได้ด้วยตนเองโดยไม่ต้องใช้คีย์หรือบัญชี** — บิลด์เอนจินรุ่นปัจจุบัน (`158.0.8127.37-2` ขึ้นไป) และ Ombra Desktop ทำงานในเครื่องได้โดยไม่ต้องสมัครสมาชิก ไม่ต้องใช้ไลเซนส์คีย์ ไม่ต้องใช้ hardware ID และไม่ต้องพึ่งเซิร์ฟเวอร์ตรวจสอบสิทธิ์
- **ติดตั้งอัตโนมัติพร้อมตรวจสอบไบนารีด้วยการเข้ารหัส** — `pip install ombrabrowser` หรือ `npm install @ombralabs/sdk` เมื่อเปิดใช้งานครั้งแรก SDK จะดาวน์โหลดบิลด์ที่ตรงกับแพลตฟอร์มของคุณ พร้อมตรวจสอบลายเซ็น Ed25519 และเช็กซัม SHA-256
- **โปรไฟล์ถาวรและรีเลย์พร็อกซีที่ปลอดภัย** — โปรไฟล์แบบตั้งชื่อจะเก็บรักษาคุกกี้ `localStorage`, IndexedDB และ `seed` ข้ามการรันพร้อมระบบล็อกข้ามโพรเซส ส่วนพร็อกซีที่ต้องยืนยันตัวตน (HTTP, HTTPS, SOCKS5) จะวิ่งผ่านรีเลย์ loopback ในเครื่อง ทำให้ข้อมูลรับรองไม่ปรากฏในอาร์กิวเมนต์ของโพรเซสเลย
- **ตัวจัดการโปรไฟล์ออฟไลน์ Ombra Desktop** — แอปพลิเคชันเดสก์ท็อปเนทีฟในรีพอซิทอรีนี้ ([`desktop/`](../../desktop/README.md)) พร้อมตัวติดตั้งสำเร็จรูปสำหรับ macOS, Linux และ Windows

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

รองรับ Puppeteer เช่นกันผ่าน `import { launch } from "@ombralabs/sdk/puppeteer"` หรือ `launchPuppeteer()` ([รายละเอียด](#puppeteer))

**สำหรับเว็บไซต์ที่มีระบบป้องกันบอท** แนะนำให้ใช้พร็อกซีแบบ residential โปรไฟล์ถาวร และการตั้งค่าสภาพแวดล้อมที่สอดคล้องกันร่วมกัน:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # ควรใช้ IP แบบ residential มากกว่าดาต้าเซ็นเตอร์
    fingerprint={"timezone": "auto", "locale": "auto"},  # ปรับโซนเวลาและภาษาให้ตรงกับทางออกของพร็อกซี
    headless=False,                                      # บางเว็บไซต์ตรวจจับความแตกต่างของโหมด headless
    humanize=True,                                       # จำลองเมาส์ คีย์บอร์ด และการเลื่อนหน้าจอแบบเนทีฟ
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

ดู [การแก้ไขปัญหา](#การแก้ไขปัญหา) สำหรับปัญหาที่พบบ่อยบน Linux ในคอนเทนเนอร์ และบนเว็บไซต์ปลายทางที่มีระบบป้องกัน

## การติดตั้ง

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# ตัวเลือกเสริม: ตรวจจับโซนเวลาและภาษาอัตโนมัติจากทางออกของพร็อกซี (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# ใช้ร่วมกับ Playwright (1.60.0+ โดยไม่ต้องดาวน์โหลด Chromium ปกติ)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# หรือใช้ร่วมกับ Puppeteer
npm install @ombralabs/sdk puppeteer-core

# ตัวเลือกเสริม: ตัวอ่านฐานข้อมูล GeoIP แบบออฟไลน์สำหรับ timezone: "auto" และ locale: "auto"
npm install mmdb-lib
```

---

เมื่อเปิดใช้งาน SDK จะค้นหาเอนจินตามลำดับที่แน่นอนดังนี้: `binary_path` (`binaryPath` ใน Node.js), `OMBRA_BINARY_PATH`, ไดเรกทอรีเอนจินของ Ombra Desktop และแคชของ SDK (`~/.ombra/engines`) หากไม่พบเอนจินที่เข้ากันได้ SDK จะดาวน์โหลดบิลด์จากแชนเนลเผยแพร่ที่มีการลงลายเซ็น ตรวจสอบลายเซ็น Ed25519 และเช็กซัม SHA-256 แล้วเก็บแคชไว้ในเครื่อง โดยไม่จำเป็นต้องรัน `playwright install chromium`

หากต้องการปิดการดาวน์โหลดอัตโนมัติ ให้ส่ง `download=False` (`download: false` ใน Node.js) หากต้องการดาวน์โหลดและตรวจสอบเอนจินไว้ล่วงหน้า (เช่น ระหว่างการสร้างอิมเมจคอนเทนเนอร์) ให้เรียก `ensure_binary()` (`ensureBinary()`) หรือใช้คำสั่ง CLI `install`

> **การเปิดใช้งานแบบอิสระ:** บิลด์เอนจินรุ่นปัจจุบัน (`158.0.8127.37-2` ขึ้นไป) ใช้งานฟรีและไม่จำเป็นต้องมีบัญชีหรือไลเซนส์คีย์ ส่วน `OMBRA_LICENSE_KEY` และคำสั่ง `login` ยังคงมีไว้เพื่อความเข้ากันได้กับบิลด์รุ่นเก่าที่ต้องใช้ไลเซนส์เท่านั้น

**การย้ายจาก Playwright** ใช้เวลาแก้เพียงสองบรรทัด — การทำงานกับหน้าเว็บ โลเคเตอร์ และการรอเงื่อนไขทั้งหมดยังคงเหมือนเดิม:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # โค้ดส่วนที่เหลือของคุณทำงานได้เหมือนเดิมโดยไม่ต้องแก้
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **ติดดาว (Star)** ให้รีพอซิทอรีนี้หากคุณเห็นว่ามีประโยชน์ และกด **[Watch releases](https://github.com/ombralabs/ombra/subscription)** เพื่อรับการแจ้งเตือนเมื่อมีบิลด์ใหม่ของเอนจิน SDK และ Ombra Desktop

---

## สถานะปัจจุบันและรุ่นที่เผยแพร่

แต่ละคอมโพเนนต์ในระบบนิเวศปฏิบัติตามสัญญาการเปิดใช้งานร่วมกันและมีการกำหนดเวอร์ชันแยกจากกันอย่างอิสระ

| คอมโพเนนต์ | สถานะ / เวอร์ชัน | ตำแหน่ง |
|---|---|---|
| **สัญญา SDK** | ฉบับร่าง `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.1.3` | [`ombrabrowser` บน PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.1.0` | [`@ombralabs/sdk` บน npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **เอนจิน Ombra Chromium** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **เบราว์เซอร์แบบสแตนด์อโลน** | `v158.0.8127.37-1` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-1) |
| **สคีมาและการทดสอบความสอดคล้อง** | JSON Schema + กรณีทดสอบร่วม | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **วิธีการตรวจเช็กความแนบเนียน** | 6 ระดับ (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

สิ่งที่รวมอยู่ในรุ่นปัจจุบัน:

- **แพตช์ระดับซอร์สโค้ด** — การสร้างฟิงเกอร์พรินต์ที่สอดคล้องกันตาม `seed`, การจัดวาง WebGL / WebGPU และส่วนขยายให้สอดคล้องกัน, ตารางฟอนต์สมจริงตามแต่ละระบบปฏิบัติการ, โปรไฟล์ TLS ClientHello แบบเนทีฟ (`chrome-<major>`), การระงับการรั่วไหลของสแต็กจาก `Runtime.enable` และ `UtilityScript` และการป้องกันการรั่วไหลของ host IP ผ่าน WebRTC
- **โดเมน CDP `Ombra` ระดับเบราว์เซอร์** — ควบคุมการจำลองอินพุตแบบมนุษย์ได้แบบสด ๆ (`getHumanizeState`, `setHumanize`) ทั้งใน Python และ Node.js โดยไม่ต้องรีสตาร์ตเบราว์เซอร์
- **การจำลองอินพุตแบบเนทีฟในโพรเซสเบราว์เซอร์** — ตัววางแผนเคอร์เซอร์ `cursory-rs`, โปรไฟล์การเลื่อนด้วยลูกกลิ้งเมาส์และแทร็กแพด, จังหวะการพิมพ์พร้อมการพิมพ์ผิดแล้วแก้เองอัตโนมัติ และการวางข้อความยาวอย่างปลอดภัยผ่านคลิปบอร์ดแบบแยกส่วน
- **บิลด์อิสระแบบไม่ต้องใช้คีย์** — บิลด์เอนจินรุ่นปัจจุบัน (`158.0.8127.37-2`) และ Ombra Desktop `1.2.2` ทำงานในเครื่องทั้งหมดโดยไม่ต้องใช้บัญชี คีย์ หรือเทเลเมทรี
- **การล็อกเวอร์ชันเอนจิน (`version`)** — ล็อกบิลด์แบบเจาะจงผ่าน `launch(version="158.0.8127.37-2")`, `OMBRA_VERSION` หรือคำสั่ง CLI `install --version`
- **รีเลย์พร็อกซีแบบครบวงจร** — รองรับพร็อกซี HTTP, HTTPS และ SOCKS5 ที่มีการยืนยันตัวตนโดยไม่เปิดเผยข้อมูลรับรองในบรรทัดคำสั่งของ Chromium ล็อก หรือเมตาดาตาของโปรไฟล์
- **โปรไฟล์ถาวรแบบตั้งชื่อ** — เก็บ `seed`, คุกกี้, `localStorage` และ IndexedDB ไว้ใต้ `~/.ombra/profiles/<slug>` พร้อมระบบล็อกข้ามโพรเซส (`ProfileBusyError`)
- **การตรวจสอบซัพพลายเชนด้วยการเข้ารหัส** — ตรวจสอบลายเซ็น Ed25519 ของซองข้อมูลรุ่นเผยแพร่และตรวจสอบ SHA-256 ของไฟล์บีบอัดก่อนแตกไฟล์

ดูประวัติการเผยแพร่ฉบับเต็มได้ที่ [CHANGELOG.md](../../CHANGELOG.md)

## ทำไมต้อง Ombra

- **แพตช์ระดับคอนฟิกและ JS พังได้ง่าย** เครื่องมืออย่าง `playwright-stealth`, `puppeteer-extra` และ `undetected-chromedriver` ใช้วิธีฉีด JavaScript ลงในหน้าเว็บหรือปรับแฟล็กตอนเปิดเบราว์เซอร์ การอัปเดต Chrome มักทำให้เครื่องมือเหล่านี้พัง และตัวตรวจจับสมัยใหม่ก็สามารถตรวจพบตัวแพตช์เองได้ (`Function.prototype.toString`, ความผิดปกติของ prototype, `addScriptToEvaluateOnNewDocument`)
- **การเปลี่ยนแปลงถูกคอมไพล์ลงในซอร์สโค้ด Chromium โดยตรง** ฟิงเกอร์พรินต์ถูกสร้างขึ้นในระดับ C++ และถูกนำไปใช้อย่างสอดคล้องกันทั้งในเมนเฟรม worker และ iframe ตัว SDK ไม่ฉีดสคริปต์ใด ๆ ลงในหน้าเว็บและไม่ทำการเขียนทับผ่าน `Emulation.*`
- **การจำลองอินพุตอยู่ในโพรเซสของเบราว์เซอร์ ไม่ใช่ชั้นบนของ Playwright** เนื่องจากเส้นทางเมาส์ การกดแป้นพิมพ์ และการเลื่อนหน้าจอถูกจัดการภายใน Chromium เอง SDK จึงไม่ครอบอ็อบเจกต์ของ Playwright หรือ Puppeteer ทำให้โลเคเตอร์ เฟรม และไลบรารีภายนอกทุกตัวทำงานได้ตามปกติ
- **สถาปัตยกรรมแบบทำงานในเครื่องโดยไม่มีบริการเสริม** ไม่มี daemon ควบคุมเบื้องหลังและไม่มีการส่งต่อผ่านเครือข่ายระหว่างสคริปต์ของคุณกับเบราว์เซอร์ มีเพียงโพรเซสเอนจินเดียว เชื่อมต่อ CDP ผ่าน loopback บน `127.0.0.1` และไม่จำกัดจำนวนโปรไฟล์หรือการทำงานพร้อมกัน

## Ombra Desktop

**ตัวจัดการโปรไฟล์แบบออฟไลน์ในเครื่องพร้อมหน้าจอ GUI** ซอร์สโค้ดอยู่ในรีพอซิทอรีนี้โดยตรง ([`desktop/`](../../desktop/README.md)) และสร้างด้วย Tauri (Rust + Vue)

- **ออฟไลน์และทำงานในเครื่อง 100%** — แคตตาล็อกโปรไฟล์เก็บอยู่ในฐานข้อมูล SQLite ในเครื่องของคุณพร้อมคีย์เข้ารหัสในเครื่อง ไม่ต้องใช้บัญชี บริการคลาวด์ หรือการเชื่อมต่อเครือข่าย
- **จัดการโปรไฟล์อย่างเป็นระบบ** — สร้างโปรไฟล์ ค้นหาด้วยชื่อ บันทึกช่วยจำ หรือหมายเลข แก้ไขคำอธิบาย และจัดระเบียบด้วยกลุ่ม แท็ก ป้ายกำกับ และบุ๊กมาร์กในแคตตาล็อก Rust
- **ถังขยะที่ปลอดภัย (Safe Trash)** — การย้ายโปรไฟล์ไปที่ถังขยะยังคงเก็บไฟล์ไว้บนดิสก์เพื่อให้คุณกู้คืนภายหลังได้
- **ไม่จำกัดจำนวนโปรไฟล์** — ไม่มีแพ็กเกจจำกัดจำนวนโปรไฟล์หรือโควตาคลาวด์ ข้อมูลทั้งหมดเป็นของคุณ
- **ตัวติดตั้งสำเร็จรูป** — macOS Apple Silicon (`.dmg` ลงนามด้วย Apple Developer ID และผ่านการรับรอง notarized), Linux (`.deb` และ `.rpm`) และ Windows x64 (`setup.exe`)
- **แคตตาล็อกแยกอิสระ** — กำหนดตัวแปร `OMBRA_DESKTOP_DATA_DIR` เพื่อทำงานกับแคตตาล็อกทดสอบแยกต่างหากหรือสำเนาสำรองข้อมูล

[ดาวน์โหลด `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [คู่มือโปรไฟล์และคีย์ในเครื่อง](../../docs/desktop/README.md)

## การตรวจสอบฟิงเกอร์พรินต์และการตรวจเช็กความแนบเนียน

แทนที่จะให้คำสัญญาแบบเหมารวมว่า "ตรวจจับไม่ได้ 100%" Ombra อาศัยขั้นตอนการตรวจสอบที่ทำซ้ำได้ภายใต้เงื่อนไขที่มีการบันทึกไว้ ผลลัพธ์จริงบนแต่ละเว็บไซต์ขึ้นอยู่กับชื่อเสียงของ IP ขาออก ภูมิภาค ประวัติของโปรไฟล์ เวอร์ชันของตัวตรวจจับ และการตั้งค่าการเปิดใช้งานเสมอ

### พื้นผิวและสัญญาณที่เอนจินและ SDK จัดการ

| พื้นผิว / สัญญาณ | Playwright ปกติ | Ombra | การนำไปใช้งาน |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | แพตช์เอนจินระดับ C++ |
| `window.chrome` | ไม่มีในโหมด headless | อ็อบเจกต์สมบูรณ์ | ตรงกับ Chrome ปกติ |
| `navigator.plugins` | `0` ในโหมด headless | ชุดปลั๊กอินที่สอดคล้องกัน | ระดับเอนจิน |
| User-Agent และ Client Hints | `HeadlessChrome`, แบรนด์ไม่ตรงกัน | `Google Chrome` + `Sec-CH-UA*` ที่สอดคล้องกัน | แพตช์ `010-user-agent-and-webdriver` |
| ร่องรอย CDP (`Runtime.enable`, `UtilityScript`) | ถูกตัวตรวจจับจับได้ | ระงับโดยเอนจิน และ SDK ไม่เคยเรียก `Runtime.enable` | แพตช์ `110-runtime-enable` + ข้อกำหนด `SI-02` |
| การรั่วไหลของ IP ผ่าน WebRTC | เปิดเผย local/host IP | รายงาน IP ขาออกโดยไม่ส่ง STUN จริง | แพตช์ `100-webrtc-leak` (`--webrtc-ip`) |
| TLS และ HTTP/2 | ขึ้นอยู่กับการตั้งค่า | สแต็กเครือข่าย Chromium + โปรไฟล์ ClientHello `chrome-<major>` | แพตช์ `210-tls-network-persona` |
| WebGL และ WebGPU | ตัวเรนเดอร์ซอฟต์แวร์ / GPU ไม่ตรงกัน | ขีดจำกัดและตารางส่วนขยาย WebGL/WebGPU ที่เป็นหนึ่งเดียวกัน | แพตช์ `070`, `071`, `075`, `955` |
| ฟอนต์ โลแคล และโซนเวลา | ค่าของเครื่องโฮสต์, `Intl` คลาดเคลื่อน | ตารางฟอนต์ โลแคล ICU และโซนเวลาที่สอดคล้องกัน | แพตช์ `040`, `090`, `092`, `230` |
| การจำลองอินพุต | เคอร์เซอร์วาร์ป, `fill()` ทันที | เส้นโค้ง `cursory-rs`, จังหวะการพิมพ์, ฟิสิกส์การเลื่อนหน้าจอ | แพตช์ `135-ombra-humanize` ในโพรเซสเบราว์เซอร์ |
| ความเสถียรของฟิงเกอร์พรินต์ | เปลี่ยนไปหรือรั่วไหลค่าของโฮสต์ | คงที่ตาม `seed` ข้ามการรีสตาร์ตและข้ามเฟรม | แพตช์ `001`, `002` + โปรไฟล์ถาวร |

### การตรวจเช็กหกระดับ

ก่อนเผยแพร่หรือนำการตั้งค่าไปใช้งานจริง ให้รันการตรวจเช็กทั้งหกระดับกับบิลด์เอนจิน ไคลเอนต์อัตโนมัติ และพร็อกซีตัวจริงที่คุณตั้งใจจะใช้:

| ระดับ | ตัวอย่างเป้าหมายทดสอบ | เกณฑ์ผ่าน |
|---|---|---|
| **L0 การรับส่งข้อมูล (Transport)** | TrackMe, หน้าทดสอบการรั่วไหล IP/WebRTC, หน้าสะท้อนเฮดเดอร์ | มองเห็นเฉพาะ IP ขาออกของพร็อกซี; JA4 และ HTTP/2 ตรงกับบิลด์ Chromium; ไม่มีข้อมูลรับรองพร็อกซีใน argv |
| **L1 อัตลักษณ์ (Identity)** | โพรบในเครื่อง, Sannysoft, Intoli, การตรวจ UA-CH | ไม่มีความขัดแย้งระหว่าง UA, Client Hints, แพลตฟอร์ม, GPU, ฟอนต์, หน้าจอ และโลแคล |
| **L2 ฟิงเกอร์พรินต์ (Fingerprint)** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | ไม่มีตัวบ่งชี้โหมด headless หรือ `lie`; ฟิงเกอร์พรินต์คงที่เมื่อรีโหลดหน้า |
| **L3 ระบบอัตโนมัติ (Automation)** | rebrowser, brotector, botd, การตรวจสอบคำสั่ง CDP | ไม่มีการรั่วไหลของ `Runtime.enable`, init-script, binding หรือ `navigator.webdriver` |
| **L4 พฤติกรรม (Behavior)** | โพรบความสมจริงของอินพุต, เทรซ humanize, การทดสอบด่านตรวจสอบจริง | อีเวนต์มี `isTrusted: true`, ลำดับและจังหวะเวลาเป็นธรรมชาติ, เส้นโค้งเคอร์เซอร์และการเลื่อนหน้าจอสมจริง |
| **L5 ความเสถียร (Stability)** | การเปิดซ้ำหลายครั้ง, worker, iframe โดเมนเดียวกัน/ข้ามโดเมน, ความเท่าเทียมข้าม SDK | `seed` เดิมสร้างฟิงเกอร์พรินต์ที่เหมือนกันทุกประการในทุกคอนเทกซ์ |

ขั้นตอนฉบับเต็ม สถานะ (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`) รายการตรวจสอบสัญญาณ และเทมเพลตรายงาน: [ภาษาอังกฤษ (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) และ [ภาษารัสเซีย (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md)

## การเปรียบเทียบ

| คุณสมบัติ | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API ระบบอัตโนมัติ | Playwright | Playwright | Selenium | **Playwright และ Puppeteer** |
| ระดับของการแพตช์ | ไม่มี | ฉีด JS ในหน้าเว็บ | แฟล็กคอนฟิก | **ซอร์สโค้ด C++ (Chromium)** |
| ฟิงเกอร์พรินต์ที่สอดคล้องตาม `seed` | ไม่ | ไม่ | บางส่วน | **ใช่ แยกตามโปรไฟล์และ eTLD+1** |
| การจำลองอินพุต (`humanize`) | ไม่ | ไม่ | ไม่ | **ฝังในโพรเซสของเบราว์เซอร์** |
| การระงับการรั่วไหล `Runtime.enable` / CDP | ไม่ | ไม่ | บางส่วน | **แพตช์เอนจิน + ข้อกำหนด SDK** |
| พร็อกซีแบบยืนยันตัวตนโดยไม่รั่วใน CLI | ไม่ | ไม่ | จำกัด | **รีเลย์ loopback ในเครื่อง** |
| การแยกโปรไฟล์ | Browser context | Browser context | ไม่ | **ไดเรกทอรีโปรไฟล์ + ล็อกไฟล์** |
| ตัวจัดการโปรไฟล์ออฟไลน์ (GUI) | ไม่ | ไม่ | ไม่ | **Ombra Desktop (macOS, Linux, Windows)** |
| การย้ายจาก Playwright | — | เปลี่ยน import | เขียนโค้ดใหม่ | **เปลี่ยน import และ `launch()`** |

## หลักการทำงาน

```mermaid
flowchart LR
    Script["สคริปต์ของคุณ<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + สะพานเชื่อม CDP"]
    Relay["รีเลย์พร็อกซีในเครื่อง<br/>เมื่อต้องยืนยันตัวตน"]
    Engine["Ombra Chromium<br/>เอนจินที่แพตช์ระดับ C++"]
    Client["ไคลเอนต์เนทีฟ<br/>Playwright · Puppeteer"]
    Profile[("โปรไฟล์<br/>seed · คุกกี้ · สตอเรจ")]

    Script -->|"launch()"| SDK
    SDK -->|"ตรวจสอบ + เปิดเอนจิน"| Engine
    SDK -.->|"ยืนยันตัวตนพร็อกซี"| Relay
    Relay -.-> Engine
    SDK -->|"เชื่อมต่อผ่าน CDP"| Client
    Script -->|"page API"| Client
    Client -->|"CDP ผ่าน loopback"| Engine
    Engine --> Profile
```

1. **`launch()` ค้นหาหรือดาวน์โหลดเอนจิน** พร้อมตรวจสอบลายเซ็น Ed25519 และเช็กซัม SHA-256
2. **เตรียมโปรไฟล์และ `seed`** โปรไฟล์แบบตั้งชื่อจะทำการล็อกข้ามโพรเซส หากพร็อกซีต้องใช้ข้อมูลรับรอง SDK จะเปิดรีเลย์ loopback ในหน่วยความจำ
3. **Ombra Chromium เริ่มทำงาน** ด้วยโปรไฟล์ ตัวเลือกฟิงเกอร์พรินต์ และพอร์ตดีบักในเครื่อง (`--remote-debugging-port=0`)
4. **ไคลเอนต์อย่างเป็นทางการเชื่อมต่อเข้ามา** เมื่อไฟล์ `DevToolsActivePort` ปรากฏขึ้น SDK จะเชื่อม Playwright (พร้อม `no_defaults=True`) หรือ Puppeteer ผ่าน `127.0.0.1` แล้วคืนค่าอ็อบเจกต์ `Browser` เนทีฟ
5. **ปิดการทำงานอย่างสะอาดหมดจด** `browser.close()` จะส่งคำสั่ง `Browser.close` ยุติต้นไม้โพรเซสของเอนจิน หยุดรีเลย์ และปลดล็อกโปรไฟล์

หลังจากเปิดใช้งานแล้ว SDK จะออกจากเส้นทางข้อมูลทันที คำสั่งควบคุมหน้าเว็บทั้งหมดจะวิ่งตรงจาก Playwright หรือ Puppeteer ไปยัง Chromium

### ขอบเขตของ SDK และข้อกำหนดด้านความแนบเนียน

[สัญญา SDK v0.1 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) บังคับใช้ข้อกำหนดที่เข้มงวดกับ SDK อย่างเป็นทางการทุกตัว:

- **ไม่ฉีดสคริปต์พรางตัวลงบนหน้าเว็บ** SDK ไม่เคยเรียก `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` และไม่เคยแพตช์พร็อพเพอร์ตี DOM
- **ไม่เรียก `Runtime.enable`** การตรวจสอบความพร้อมใช้เฉพาะเอนด์พอยต์ HTTP ของ CDP ในเครื่องหรือ `Browser.getVersion` เท่านั้น SDK ไม่เคยเปิดใช้งาน `Runtime`, `Debugger` หรือ `Log`
- **ไม่เขียนทับด้วย `Emulation.*`** SDK ไม่เคยเรียก `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` หรือ `setDeviceMetricsOverride` — อัตลักษณ์ของเบราว์เซอร์ทั้งหมดมาจากตัวเอนจิน
- **ไม่ใส่แฟล็กต้องห้ามเป็นค่าเริ่มต้น** SDK ไม่เคยแทรก `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` หรือ `--user-agent` เองโดยอัตโนมัติ
- **ใช้ CDP เฉพาะผ่าน loopback เท่านั้น** พอร์ตดีบักจะผูกกับ `127.0.0.1` เสมอ การส่ง `--remote-debugging-address` ที่ไม่ใช่ loopback จะถูกปฏิเสธ
- **ไม่มีเทเลเมทรีและไม่รั่วไหลความลับ** ข้อมูลรับรองพร็อกซี คีย์ และคุกกี้จะถูกปกปิดออกจากล็อกและข้อความแสดงข้อผิดพลาด

## API สำหรับ Python

### `launch()`

```python
from ombrabrowser import launch

# การเปิดใช้งานพื้นฐาน (ค่าเริ่มต้นคือโหมด headless)
browser = launch()

# เปิดหน้าต่างเบราว์เซอร์แบบมองเห็นได้ (headed)
browser = launch(headless=False)

# พร็อกซี HTTP หรือ SOCKS5 (จัดการข้อมูลรับรองผ่านรีเลย์ loopback ในเครื่อง)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# อ็อบเจกต์พร็อกซีพร้อมรายการยกเว้น (bypass)
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

# การควบคุมฟิงเกอร์พรินต์ (seed, OS, โซนเวลา/ภาษาอัตโนมัติจากพร็อกซี, หน้าจอ, GPU)
# สำหรับ timezone="auto" / locale="auto" ให้ติดตั้ง: pip install "ombrabrowser[geoip]"
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

# การจำลองเมาส์ คีย์บอร์ด และการเลื่อนหน้าจอแบบเนทีฟ
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# ล็อกบิลด์ของเอนจินแบบเจาะจงและส่งแฟล็กเพิ่มเติมให้ Chromium
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

คืนค่าเป็น `playwright.sync_api.Browser` มาตรฐาน เมธอดของ Playwright ทั้งหมดใช้งานได้ตามปกติ (`new_page()`, `new_context()`, `close()` ฯลฯ) หน้าเว็บที่เปิดใหม่จะมีค่าเริ่มต้นเป็น `no_viewport=True` เพื่อไม่ให้ขนาดหน้าต่างของโปรไฟล์ถูกเขียนทับ

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

### `launch_context()` และ `launch_context_async()`

ฟังก์ชันช่วยอำนวยความสะดวกที่เปิดเบราว์เซอร์และคืนค่า `BrowserContext` โดยตรง (การปิดคอนเทกซ์จะปิดโพรเซสเอนจินด้วย) อาร์กิวเมนต์แบบคีย์เวิร์ดเพิ่มเติมจะถูกส่งต่อไปยัง `browser.new_context()` — เช่น `storage_state`, `permissions` หรือ `extra_http_headers`:

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

เวอร์ชันแบบ async: `await launch_context_async(...)`

### `launch_persistent_context()` และ `launch_persistent_context_async()`

เปิดเบราว์เซอร์พร้อมโปรไฟล์ถาวรและคืนค่า `BrowserContext` เริ่มต้นของโปรไฟล์นั้น คุกกี้ `localStorage`, IndexedDB, แคช และฟิงเกอร์พรินต์ `seed` จะถูกเก็บรักษาไว้ข้ามเซสชัน

- การส่ง `profile="pricing-eu"` จะสร้างโปรไฟล์ไว้ที่ `~/.ombra/profiles/pricing-eu` พร้อมเมตาดาตาใน `.ombra/profile.json` และไฟล์ล็อก
- การส่ง `user_data_dir="./my-profile"` (หรือส่งพาธเป็นอาร์กิวเมนต์ตามตำแหน่ง) จะใช้ไดเรกทอรีที่ระบุนั้นโดยตรง
- การเปิดโปรไฟล์เดียวกันพร้อมกันจากอีกโพรเซสหนึ่งจะโยนข้อผิดพลาด `ProfileBusyError` แทนที่จะทำให้ข้อมูลโปรไฟล์เสียหาย

```python
from ombrabrowser import launch_persistent_context

# ใช้ชื่อโปรไฟล์ (จัดเก็บใน ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # คุกกี้ สตอเรจ และ seed จะถูกบันทึกไว้

# ใช้พาธที่ระบุโดยตรง (เช่น เพื่อโหลดส่วนขยาย Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

เวอร์ชันแบบ async: `await launch_persistent_context_async(...)`

### ฟังก์ชันยูทิลิตี้และการวินิจฉัย (Python)

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

# ตรวจสอบไบนารีของเอนจินที่เลือกใช้งาน
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# ดาวน์โหลดและตรวจสอบเอนจินโดยยังไม่เปิดเบราว์เซอร์
ensure_binary(version="158.0.8127.37-2")

# ลบไบนารีของเอนจินที่ SDK จัดการไว้ (โปรไฟล์ใน ~/.ombra/profiles จะไม่ถูกแตะต้อง)
clear_cache()

# ตรวจสอบคำสั่งเปิดใช้งานที่ประมวลผลแล้วโดยไม่เปิด Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# อ่านเมตาดาตาขณะรัน (พอร์ต CDP, ws_url, seed, pid) และตรวจสอบสถานะโพรเซส
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # ดาวน์โหลดและตรวจสอบเอนจิน (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-2  # ติดตั้งบิลด์ของเอนจินแบบเจาะจงเวอร์ชัน
ombrabrowser info                                # วินิจฉัยสภาพแวดล้อม ไบนารี และไลบรารีที่ต้องใช้ (ชื่อย่อ: doctor)
ombrabrowser info --quick --json                 # รายงานแบบเครื่องอ่านได้อย่างรวดเร็วโดยไม่เปิดไบนารี
ombrabrowser info --proxy socks5://user:pass@host:1080  # ทดสอบ IP ขาออก โซนเวลา และการระบุภาษาผ่านพร็อกซี
ombrabrowser update                              # ตรวจสอบแชนเนลการเผยแพร่และอัปเดตเอนจินในแคช
ombrabrowser clear-cache                         # ล้างแคชไบนารีของเอนจิน (เก็บโปรไฟล์ไว้เหมือนเดิม)
ombrabrowser login                               # บันทึกไลเซนส์คีย์ลงใน ~/.ombra/license.key (เฉพาะบิลด์รุ่นเก่าเท่านั้น)
ombrabrowser logout                              # ลบไลเซนส์คีย์ที่บันทึกไว้
```

สามารถเรียกใช้คำสั่งชุดเดียวกันผ่าน `python -m ombrabrowser <command>` ได้เช่นกัน

## API สำหรับ Node.js และ TypeScript

`@ombralabs/sdk` มาพร้อมบิลด์คู่ทั้ง ESM + CommonJS และไฟล์ประกาศไทป์ TypeScript (`.d.ts`) ครบถ้วน ทั้ง Playwright และ Puppeteer ทำงานบนเอนจินตัวเดียวกันเบื้องหลัง

### Playwright (ค่าเริ่มต้น)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// การเปิดใช้งานพื้นฐานพร้อมพร็อกซี ฟิงเกอร์พรินต์ และการจำลองอินพุต
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

// เปิดใช้งานแบบสะดวก: สร้างเบราว์เซอร์ + คอนเทกซ์ในการเรียกครั้งเดียว
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// โปรไฟล์ถาวร — คุกกี้ localStorage และ seed จะคงอยู่ข้ามการรัน
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> ตัวอย่างโค้ดแต่ละชุดด้านบนทำงานแยกจากกันได้ทันที หากต้องการย้ายโค้ดเปิด Playwright ที่มีอยู่เดิม คุณสามารถเปลี่ยนบรรทัด import เป็น `import * as chromium from "@ombralabs/sdk"` แล้วคง `await chromium.launch(...)` ไว้ได้เช่นกัน

### Puppeteer

เรียกใช้ `launchPuppeteer()` จาก `@ombralabs/sdk` หรือ import จาก `@ombralabs/sdk/puppeteer`:

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

> **หมายเหตุเกี่ยวกับ Puppeteer:** Puppeteer ส่งทราฟฟิก CDP เริ่มต้นมากกว่า Playwright ที่ใช้ `connectOverCDP({ noDefaults: true })` สำหรับเว็บไซต์ที่ตรวจสอบ CDP อย่างเข้มงวด แนะนำให้ใช้ Playwright

### ยูทิลิตี้และ CLI (Node.js)

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

## การจำลองอินพุตแบบมนุษย์

ใน Ombra ระบบจำลองอินพุต (`humanize`) ถูกคอมไพล์**แบบเนทีฟลงในโพรเซสของเบราว์เซอร์ Chromium** (ขับเคลื่อนด้วย `cursory-rs` และตัวจัดตารางอินพุตของเอนจิน) แทนที่จะสร้างเป็น JS แรปเปอร์ครอบไคลเอนต์อัตโนมัติ ซึ่งหมายความว่า:

- ทุกการกระทำมาตรฐานของ Playwright และ Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) จะไหลผ่านคิวอินพุตเดียวต่อแท็บภายในเบราว์เซอร์
- พารามิเตอร์เชิงพฤติกรรมถูกคำนวณอย่างคงที่จาก `seed` ของโปรไฟล์ (`--fingerprint-humanize-seed`)
- SDK ไม่เคยห่อหุ้ม `Page` หรือ `Browser` ด้วยคลาสพร็อกซี — ชนิดข้อมูลเนทีฟและพฤติกรรมของไคลเอนต์ยังคงเดิมครบถ้วน

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**สิ่งที่เปลี่ยนไปเมื่อเปิด `humanize=True`:**

| การกระทำ | เมื่อไม่เปิด `humanize` | เมื่อเปิด `humanize=True` |
|---|---|---|
| การเลื่อนเมาส์ | วาร์ปไปยังจุดหมายทันที | เส้นโค้ง `cursory-rs` พร้อมอัตราเร่ง การหยุดชะงัก และการเลื่อนเลยเป้าหมายเล็กน้อย |
| การคลิกและลาก | กดทันที | เล็งจุดภายในเป้าหมาย หยุดก่อนคลิก และมีระยะเวลากดค้าง |
| การพิมพ์ข้อความ | ใส่ค่าทันที | พิมพ์ทีละตัวอักษรตามจังหวะและผังแป้นพิมพ์ที่กำหนด มีการพิมพ์ผิดและแก้เองเป็นบางครั้ง ข้อความที่ยาวมากจะวางผ่านคลิปบอร์ดแบบแยกส่วนโดยไม่แตะต้องคลิปบอร์ดของระบบ |
| การเลื่อนหน้าจอ | กระโดดทีเดียว | ชุดอีเวนต์ลูกกลิ้งเมาส์/แทร็กแพดตามโปรไฟล์ความหน่วงที่วัดค่าไว้ |
| ช่วงว่างระหว่างการกระทำ | เคอร์เซอร์นิ่งสนิท | ในพรีเซ็ต `careful` จะมีการขยับเคอร์เซอร์เล็กน้อยขณะไม่ได้ใช้งานระหว่างการกระทำ |

**พรีเซ็ต (Presets)** — `default` (ความเร็วปกติ), `careful` (ช้ากว่า รอบคอบ พร้อมการขยับเคอร์เซอร์เล็กน้อยขณะว่าง) และ `fast` (ความเร็วสูงกว่า) ส่ง `humanize=False` (`humanize: false`) หากต้องการปิดการจำลองอินพุตอย่างชัดเจน

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

คุณสามารถเปิด/ปิดโหมดหรือสลับพรีเซ็ตระหว่างรันได้โดยไม่ต้องรีสตาร์ตเบราว์เซอร์ผ่านโดเมน CDP `Ombra`:

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

## การจัดการฟิงเกอร์พรินต์และโปรไฟล์

เอนจินจะสร้างการตั้งค่าเบราว์เซอร์ที่สอดคล้องกันทั้งระบบจาก `seed` เพียงค่าเดียว เมื่อไม่ได้ระบุ `seed`:

| สถานการณ์ | พฤติกรรม |
|---|---|
| **`launch()` โดยไม่มีโปรไฟล์** | SDK จะสุ่ม `seed` สำหรับเซสชันนั้นและสร้างไดเรกทอรีชั่วคราวซึ่งจะถูกลบทิ้งหลัง `close()` |
| **`profile="name"` หรือ `user_data_dir="./dir"`** | ระบบจะบันทึก `seed` ไว้ใน `.ombra/profile.json` และนำกลับมาใช้ซ้ำทุกครั้งที่เปิด — เว็บไซต์จะเห็นเป็นผู้เยี่ยมชมเดิมพร้อมอุปกรณ์และคุกกี้เดิม |
| **`fingerprint={"seed": N, ...}`** | ได้ฟิงเกอร์พรินต์ที่คงที่แน่นอนจาก `seed` ที่ระบุ ฟิลด์เพิ่มเติมจะเขียนทับเฉพาะค่าที่เลือกโดยคงความสอดคล้องของส่วนที่เหลือไว้ |

นอยส์ของ Canvas/audio จะใช้คีย์แยกตาม `eTLD+1` (คงที่บนเว็บไซต์เดียวกัน แต่เชื่อมโยงข้ามเว็บไซต์ไม่ได้) นอยส์ระดับพิกเซลสำหรับ 2D canvas และ WebGL `readPixels` ถูกปิดไว้เป็นค่าเริ่มต้นเพื่อหลีกเลี่ยงการกระตุ้นตัวตรวจจับ "Canvas Tampering / Masking" และสามารถเลือกเปิดใช้งานเองได้ผ่าน `--fingerprint-pixel-noise`

> **เคล็ดลับ:** เมื่อต้องกลับเข้าเว็บไซต์เดิมซ้ำ แนะนำให้ใช้โปรไฟล์ถาวร (`profile="name"` หรือ `launch_persistent_context()`) แทนการส่ง `seed` คงที่ให้กับ `launch()` แบบชั่วคราว เพื่อที่คุกกี้ แคช และ `localStorage` จะยังคงสอดคล้องไปพร้อมกับฟิงเกอร์พรินต์

### ฟิลด์ของอ็อบเจกต์ `fingerprint`

ชื่อฟิลด์ด้านล่างอ้างอิงตาม Python (`snake_case`) ส่วน Node.js รองรับทั้ง `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) และ `snake_case`:

| ฟิลด์ | ชนิดข้อมูล | คำอธิบาย |
|---|---|---|
| `seed` | `int` (`>= 0`) | ค่าตั้งต้นของตัวสร้างที่กำหนดภาพรวมการตั้งค่าฟิงเกอร์พรินต์ทั้งหมด |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | ระบบปฏิบัติการเป้าหมาย (`navigator.platform`, UA, ชุด GPU และฟอนต์) |
| `os_version` | `string` | ข้อมูลเวอร์ชันระบบปฏิบัติการสำหรับ Client Hints |
| `timezone` | โซน IANA หรือ `"auto"` | โซนเวลา (เช่น `"Europe/Berlin"`) ค่า `"auto"` จะหาโซนเวลาจากทางออกพร็อกซีผ่าน GeoIP |
| `locale` | BCP-47 หรือ `"auto"` | โลแคล (`Accept-Language`, `navigator.languages`, ICU `Intl`) ค่า `"auto"` จะหาโลแคลจากทางออกพร็อกซี |
| `screen` | `{"width", "height"}` หรือ `"auto"` | ขนาดหน้าจอและพื้นที่ทำงานโดยคำนึงถึงแถบงาน / แถบเมนูของระบบปฏิบัติการเป้าหมาย |
| `gpu` | `{"vendor", "renderer"}` หรือ `"auto"` | สตริง WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` แบบระบุเอง |
| `hardware_concurrency` | `int` หรือ `"auto"` | ค่า `navigator.hardwareConcurrency` ที่รายงาน |
| `device_memory` | `int` หรือ `"auto"` | ค่า `navigator.deviceMemory` ที่รายงาน (หน่วยเป็น GB) |
| `noise` | `bool` | เปิด/ปิดนอยส์ของฟิงเกอร์พรินต์ (`False` จะส่งแฟล็ก `--disable-fingerprint-noise`) |

> ควรใช้ `seed` เป็นแหล่งหลักของพารามิเตอร์ฟิงเกอร์พรินต์: การเขียนทับค่าแต่ละรายการโดยไม่รักษาความสอดคล้องกัน (เช่น จับคู่ระบบปฏิบัติการกับ GPU ที่ไม่เข้ากัน) อาจสร้างความขัดแย้งให้ตัวตรวจจับสังเกตเห็นได้

### แฟล็กเพิ่มเติมของเอนจิน (`args`)

แฟล็กที่เอนจินรองรับแต่ SDK ไม่ได้ตั้งค่าให้โดยอัตโนมัติ (ส่งผ่าน `args=[...]`):

| แฟล็ก | วัตถุประสงค์ |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | แบรนด์เบราว์เซอร์ใน `Sec-CH-UA` (ค่าเริ่มต้นของ SDK คือ `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | โปรไฟล์ TLS ClientHello ที่ตรงกับเวอร์ชันหลักของ Chrome ที่ระบุ (SDK ตั้งให้อัตโนมัติตามเวอร์ชันเอนจิน) |
| `--webrtc-ip=<ip>` | แทนที่ที่อยู่ IP ใน WebRTC ICE candidates โดยไม่ส่งทราฟฟิก STUN จริง |
| `--fingerprint-location=<lat,lon>` | พิกัดที่รายงานโดย `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | โควตาสตอเรจที่รายงานโดย `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | จำนวนจุดสัมผัส (`navigator.maxTouchPoints` และ pointer media queries) |
| `--fingerprint-device-pixel-ratio=<ratio>` | ความหนาแน่นพิกเซลของหน้าจอ (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | ความลึกสีของหน้าจอ |
| `--disable-gpu-fingerprint` | ส่งผ่าน GPU จริงของเครื่องโฮสต์ (สตริง ขีดจำกัด และส่วนขยาย WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | ส่งผ่านสตริง GPU จริงโดยยังคงการตั้งค่าโปรไฟล์ส่วนอื่นไว้ |
| `--disable-fingerprint-noise` | ปิดนอยส์ของ canvas/WebGL/audio โดยยังคงพารามิเตอร์อัตลักษณ์ไว้ |
| `--fingerprint-pixel-noise` | เปิดนอยส์ระดับพิกเซลแบบ idempotent (opt-in) สำหรับ 2D canvas และ `readPixels` |
| `--profile-label=<text>` | ป้ายชื่อโปรไฟล์ที่แสดงในแถบที่อยู่ของเบราว์เซอร์ (แสดงเฉพาะใน UI หน้าเว็บมองไม่เห็น) |

### การตั้งค่าฟอนต์บน Linux

เซิร์ฟเวอร์และคอนเทนเนอร์ Linux แบบมินิมอลมักขาดฟอนต์อีโมจิและฟอนต์ CJK ทำให้การเรนเดอร์ข้อความและอีโมจิบน canvas ที่ซ่อนอยู่สร้างค่าแฮชที่ผิดปกติ

**1. ชั้นพื้นฐาน (อีโมจิและ CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. ฟอนต์ Windows สำหรับโปรไฟล์ Windows (`os="windows"`):**
เมื่อรันการตั้งค่าแบบ Windows บน Linux การติดตั้งฟอนต์จริงจาก `C:\Windows\Fonts\` (รวมถึง `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) จะช่วยเพิ่มความสมจริงในการไล่รายชื่อฟอนต์ได้อย่างมาก:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. ฟอนต์ macOS สำหรับโปรไฟล์ macOS (`os="macos"`):**
ในทำนองเดียวกัน เมื่อใช้ `os="macos"` บน Linux ให้คัดลอกฟอนต์จาก `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` และ `/Library/Fonts/` ไปยัง `~/.local/share/fonts/mac/` แล้วรัน `fc-cache -f`

ใน `Dockerfile` ให้วางฟอนต์ไว้ในไดเรกทอรีระบบ `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## ตัวเลือกการเปิดใช้งาน การตั้งค่า และข้อผิดพลาด

### ตัวเลือกของ `launch()`

ชื่อตัวเลือกอ้างอิงตาม Python API และ [สัญญา SDK](../../docs/sdk-contract.md) ส่วน Node.js ใช้ชื่อแบบ `camelCase` ที่ตรงกัน (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) และรองรับชื่อพ้องแบบ `snake_case` ด้วย ตัวเลือกที่ไม่รู้จักจะถูกปฏิเสธพร้อมข้อผิดพลาด `InvalidOptionError`

| ตัวเลือก | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `headless` | `true` | รันโดยไม่แสดงหน้าต่าง (`--headless=new`) |
| `proxy` | ไม่มี | URL พร็อกซี (`http`, `https`, `socks5`) หรืออ็อบเจกต์; พร็อกซีที่มีการยืนยันตัวตนจะใช้รีเลย์ loopback |
| `fingerprint` | ไม่มี | การตั้งค่า `seed`, OS, โซนเวลา, โลแคล, หน้าจอ, GPU, หน่วยความจำ และนอยส์ |
| `profile` | ไม่มี | โปรไฟล์ถาวรแบบตั้งชื่อภายใต้ `~/.ombra/profiles/<slug>` (ห้ามใช้ร่วมกับ `user_data_dir`) |
| `user_data_dir` | ชั่วคราว | พาธไดเรกทอรีโปรไฟล์แบบระบุเอง (ห้ามใช้ร่วมกับ `profile`) |
| `args` | `[]` | อาร์กิวเมนต์เพิ่มเติมของ Chromium (ส่งผ่านโดยไม่เปลี่ยนแปลง) |
| `binary_path` | ค้นหาอัตโนมัติ | พาธแบบระบุเองไปยังไฟล์ไบนารีของเอนจิน |
| `version` | env / อัตโนมัติ | การล็อกเวอร์ชันเอนจิน (เช่น `158.0.8127.37-2`) มีลำดับความสำคัญเหนือ `OMBRA_VERSION` |
| `timeout_ms` | `30000` | เวลาจำกัดสำหรับการเริ่มเอนจินและเชื่อมต่อ CDP (1000–600000 มิลลิวินาที) |
| `humanize` | ค่าเริ่มต้นเอนจิน | `False`, `True` หรือ `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / ไฟล์ | คีย์สำหรับบิลด์รุ่นเก่าที่ต้องใช้ไลเซนส์ (ไม่จำเป็นสำหรับ `158.0.8127.37-2+`; ไม่เคยถูกบันทึกลงล็อก) |
| `env` | `{}` | ตัวแปรสภาพแวดล้อมเพิ่มเติมสำหรับโพรเซสเอนจิน |
| `download` | `True` | อนุญาตให้ดาวน์โหลดไบนารีเอนจินที่ยังไม่มีโดยอัตโนมัติ |

### ตัวแปรสภาพแวดล้อม

ลำดับความสำคัญ: **ตัวเลือกที่ส่งให้ตอนเปิดใช้งานโดยตรง → ตัวแปรสภาพแวดล้อม → เมตาดาตาของโปรไฟล์ → ค่าเริ่มต้น**

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `OMBRA_BINARY_PATH` | ไม่กำหนด | พาธแบบระบุเองไปยังไบนารีเอนจิน |
| `OMBRA_CACHE_DIR` | `~/.ombra` | ไดเรกทอรีเก็บแคชเอนจินและโปรไฟล์แบบตั้งชื่อ |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | URL พื้นฐาน / มิร์เรอร์สำหรับดาวน์โหลดเอนจิน (`none`/`off` เพื่อปิดการดาวน์โหลด) |
| `OMBRA_VERSION` | รุ่นล่าสุดที่เข้ากันได้ | เวอร์ชันเอนจินที่ล็อกไว้ (เช่น `158.0.8127.37-2`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | แชนเนลการเผยแพร่เอนจิน: `stable` หรือ `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | ตรวจสอบบิลด์เอนจินรุ่นใหม่กว่าเมื่อเปิดใช้งาน |
| `OMBRA_SKIP_CHECKSUM` | `false` | เฉพาะการพัฒนาในเครื่องเท่านั้น: ปิดการตรวจสอบ SHA-256 (แสดงคำเตือนในล็อก) |
| `OMBRA_LICENSE_KEY` | ไม่กำหนด | คีย์สำหรับบิลด์รุ่นเก่าที่ต้องใช้ไลเซนส์ (ไม่เคยถูกบันทึกลงล็อก) |
| `OMBRA_TIMEOUT_MS` | `30000` | ค่าเริ่มต้นของเวลาจำกัดการเปิดใช้งาน (มิลลิวินาที) |
| `OMBRA_LOG_LEVEL` | `warn` | ระดับความละเอียดของล็อก: `error`, `warn`, `info`, `debug` |

### ข้อผิดพลาดแบบระบุชนิด

เมื่อเกิดความล้มเหลวใด ๆ SDK จะยุติโพรเซสเอนจินที่เปิดไว้ ปลดล็อกโปรไฟล์ และโยนคลาสย่อยของ `OmbraError` ที่มีค่า `kind` คงที่และ `details` ที่ปกปิดข้อมูลความลับแล้ว:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

รายละเอียดการจัดหมวดหมู่ข้อผิดพลาดและกฎการลองใหม่ฉบับเต็มระบุไว้ใน [สัญญา SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md)

## แพลตฟอร์ม การเชื่อมต่อ และคอนเทนเนอร์

### แพลตฟอร์มและรันไทม์ที่รองรับ

| คอมโพเนนต์ | การรองรับ | หมายเหตุ |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | บิลด์อิสระ `158.0.8127.37-2`; Ombra Desktop ลงนามด้วย Developer ID และผ่านการรับรอง notarized |
| **macOS x64 (Intel)** | — | ยังไม่มีรุ่น Chromium 158 ปัจจุบัน |
| **Linux x64** | ✅ | บิลด์อิสระ `158.0.8127.37-2`; ต้องใช้ `xz-utils` (`xz`) เพื่อแตกไฟล์ `.tar.xz` |
| **Windows x64** | ✅ | บิลด์อิสระ `158.0.8127.37-2` และตัวติดตั้ง Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` จะถูกติดตั้งให้อัตโนมัติพร้อมกับ `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` หรือ Puppeteer `>=22` (Puppeteer 25+ ต้องใช้ Node.js `>=22.12`) |

### การเชื่อมต่อกับเฟรมเวิร์กและ AI Agent

Ombra ทำงานร่วมกับเครื่องมืออัตโนมัติหรือเฟรมเวิร์ก AI Agent ใดก็ได้ที่รับไบนารี Chromium แบบกำหนดเองหรือเชื่อมต่อผ่าน CDP ได้ (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` และอื่น ๆ):

```python
# วิธีที่ 1: ดึงพาธของไบนารีที่ตรวจสอบแล้วและอาร์กิวเมนต์เอนจินสำหรับรันเนอร์ของคุณเอง
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# วิธีที่ 2: เปิดใช้งานผ่าน Ombra SDK แล้วส่งเอนด์พอยต์ CDP ในเครื่องให้เฟรมเวิร์กของคุณ
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# เชื่อมต่อเฟรมเวิร์กของคุณเข้ากับ ws_url หรือ cdp_http — การตั้งค่าฟิงเกอร์พรินต์และ humanize
# ทำงานอยู่ภายในเอนจินและยังคงมีผลกับไคลเอนต์ CDP ทุกตัว
```

### การรันใน Docker และบนเซิร์ฟเวอร์ Linux

ตัวอย่าง `Dockerfile` ที่ดาวน์โหลดและตรวจสอบเอนจินล่วงหน้าในขั้นตอนการสร้างอิมเมจ:

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

> **คอนเทนเนอร์และเว็บเซิร์ฟเวอร์:**
> - หากคอนเทนเนอร์ของคุณไม่สามารถเริ่มต้นแซนด์บ็อกซ์ของ Chromium ได้ ให้ส่ง `--no-sandbox` เองอย่างชัดเจนผ่าน `args=["--no-sandbox"]` (SDK จะไม่เพิ่มแฟล็กนี้ให้โดยอัตโนมัติ)
> - หากต้องการรันด้วย `headless=False` บนเซิร์ฟเวอร์ที่ไม่มีจอภาพ ให้ใช้ `Xvfb` (ดู[ด้านล่าง](#การแก้ไขปัญหา))
> - เมื่อรันภายใต้ `uvicorn` ร่วมกับ `uvloop` ให้ส่ง `--loop asyncio` เพื่อหลีกเลี่ยงปัญหา pipe ของ subprocess ค้าง

## การแก้ไขปัญหา

### เว็บไซต์บล็อกโหมด headless

ระบบป้องกันบอทบางตัวตรวจสอบความแตกต่างเชิงพฤติกรรมและการเรนเดอร์ในโหมด headless แม้จะมีแพตช์ระดับ C++ แล้วก็ตาม ให้รันด้วย `headless=False` บนจอแสดงผลเสมือนโดยใช้ `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

จากนั้นเปิดใช้งานด้วยพร็อกซี SOCKS5/HTTP แบบ residential โปรไฟล์ถาวร โซนเวลา/โลแคลที่ตรงกัน `headless=False` และ `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

หากยังถูกบล็อกบน Linux อยู่ ให้ตรวจสอบ [การตั้งค่าฟอนต์บน Linux](#การตั้งค่าฟอนต์บน-linux)

### เว็บไซต์แสดงหน้าตรวจสอบทุกครั้งที่เข้าชม

การเรียก `launch()` โดยไม่ระบุ `profile` จะเริ่มต้นจากไดเรกทอรีชั่วคราวที่ว่างเปล่าและ `seed` ใหม่ทุกครั้ง ทำให้เว็บไซต์มองว่าการรันแต่ละครั้งเป็นผู้เยี่ยมชมรายใหม่ที่ไม่มีคุกกี้ ให้เปลี่ยนไปใช้ `profile="..."` หรือ `launch_persistent_context(...)` เพื่อให้คุกกี้ `localStorage` และ `seed` ถูกส่งต่อข้ามการรัน

### `ProfileBusyError`

โปรไฟล์แบบตั้งชื่อหรือ `user_data_dir` หนึ่ง ๆ สามารถเปิดใช้งานได้ครั้งละหนึ่งโพรเซสเท่านั้น ให้กำหนดชื่อโปรไฟล์แยกกันสำหรับแต่ละเวิร์กเกอร์ที่ทำงานขนานกัน (`profile=f"worker-{i}"`) ส่วนไฟล์ล็อกค้างที่หลงเหลือจากโพรเซสที่แครชจะถูกตรวจจับและล้างให้โดยอัตโนมัติ

### จำเป็นต้องรัน `playwright install chromium` หรือไม่?

ไม่จำเป็น Ombra ใช้ไบนารีเอนจินของตนเองและไม่ได้ใช้ Chromium ปกติของ Playwright บน Linux คุณต้องติดตั้งเพียงไลบรารีระบบและ `xz-utils` เท่านั้น:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### การอัปเดต การสลับแชนเนล และการย้อนเวอร์ชันเอนจิน

อัปเดต SDK เป็นรุ่นล่าสุด:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

ทดสอบแชนเนล `beta` หรือล็อก/ย้อนกลับไปยังบิลด์เอนจินแบบเจาะจง:

```python
# ล็อกบิลด์แบบเจาะจงสำหรับการเปิดใช้งานครั้งนั้น
browser = launch(version="158.0.8127.37-2")
```

```bash
# หรือกำหนดค่าผ่านตัวแปรสภาพแวดล้อม / CLI
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# หรือชี้ไปยังไบนารีที่คอมไพล์เองในเครื่อง
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper บล็อกบิลด์ที่สร้างในเครื่อง

รุ่นเผยแพร่อย่างเป็นทางการของ Ombra สำหรับ Apple Silicon macOS ลงนามด้วยใบรับรอง Apple Developer ID และผ่านการรับรอง (notarized) แล้ว หากคุณรันบิลด์สำหรับนักพัฒนาที่ไม่ได้ลงนามในเครื่องและ macOS กักกัน (quarantine) ไว้ ให้ล้างแอตทริบิวต์กักกันออกครั้งเดียว:

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### การรอหน้าเว็บใน Python แบบ synchronous

ใน Playwright แบบ synchronous การเรียก `time.sleep(15)` ยาว ๆ ครั้งเดียวหลัง `page.goto()` จะหยุดอีเวนต์ลูปของ Playwright ชั่วคราว ซึ่งอาจทำให้หน้าตรวจสอบค้างได้ ให้ใช้วิธีรอเป็นช่วงสั้น ๆ ควบคู่กับการเรียกคำสั่งคอนเทกซ์เบา ๆ แทน:

```python
import time

for _ in range(15):
    page.context.cookies()  # ให้ Playwright ทำงานต่อได้โดยไม่แตะต้อง DOM ของหน้าเว็บ
    time.sleep(1)
```

ใน Python แบบ async ให้ใช้ `await asyncio.sleep(...)` ส่วนใน Node.js ให้ใช้ `await new Promise(r => setTimeout(r, ms))` และหลีกเลี่ยงการเรียก `page.wait_for_timeout()` บ่อยเกินไปหรือเรียก `page.evaluate()` โดยไม่จำเป็นก่อนการตรวจสอบ เพื่อไม่ให้เกิดทราฟฟิก CDP เกินความจำเป็น

## ความปลอดภัย

- **ความถูกต้องและความสมบูรณ์ของเอนจิน** ก่อนแตกไฟล์ SDK จะตรวจสอบลายเซ็น Ed25519 ของซองข้อมูลรุ่นเผยแพร่กับพับลิกคีย์ที่ฝังไว้ และตรวจสอบค่าแฮช SHA-256 ของทั้งไฟล์บีบอัดและไฟล์โปรแกรม
- **CDP เฉพาะในเครื่องเท่านั้น** พอร์ตดีบักจะผูกกับ `127.0.0.1` อย่างเคร่งครัด ห้ามเปิดเผยพอร์ต CDP ออกสู่เครือข่ายสาธารณะโดยไม่มีการยืนยันตัวตนเพิ่มเติม เนื่องจาก CDP ให้สิทธิ์ควบคุมเบราว์เซอร์ทั้งหมด
- **การแยกข้อมูลความลับ** ข้อมูลรับรองพร็อกซีจะอยู่ในหน่วยความจำของรีเลย์ loopback ในเครื่องเท่านั้น และไม่เคยปรากฏในบรรทัดคำสั่งของโพรเซส เมตาดาตาโปรไฟล์ ล็อก หรือรายละเอียดข้อผิดพลาด
- **ไม่มีเทเลเมทรี** SDK ไม่ส่งข้อมูลวิเคราะห์ รายงานการแครช หรือการส่งสัญญาณเครือข่ายแอบแฝงใด ๆ

รายงานปัญหาด้านความปลอดภัยเป็นการส่วนตัวตามแนวทางใน [SECURITY.md](../../SECURITY.md)

## โครงสร้างรีพอซิทอรี

```text
.
├── README.md                    # README หลัก (ภาษาอังกฤษ)
├── translations/
│   ├── th/README.md             # ไฟล์นี้ (ไทย)
│   ├── ru/README.md             # ฉบับแปลภาษารัสเซีย
│   └── <locale>/README.md       # ฉบับแปลภาษาอื่นอีก 19 ภาษา
├── desktop/                     # Ombra Desktop (Tauri: แคตตาล็อก Rust + UI ด้วย Vue)
├── docs/
│   ├── architecture.md          # สถาปัตยกรรม ขอบเขตความเชื่อถือ และวงจรการทำงาน
│   ├── sdk-contract.md          # สัญญาการเปิดใช้งาน v0.1 ตัวเลือก ข้อผิดพลาด และข้อกำหนด
│   ├── stealth-checkup.md       # วิธีการตรวจเช็กความแนบเนียน (ภาษาอังกฤษ)
│   ├── stealth-checkup.ru.md    # วิธีการตรวจเช็กความแนบเนียน (ภาษารัสเซีย)
│   ├── versioning.md            # การกำหนดเวอร์ชันของ SDK เอนจิน และไคลเอนต์
│   └── desktop/                 # คู่มือโปรไฟล์และคีย์ในเครื่องของ Desktop
├── spec/
│   └── schemas/                 # JSON Schema สำหรับตัวเลือกการเปิดใช้งานและเมตาดาตาของไบนารี
├── sdks/
│   ├── manifest.json            # ทะเบียน SDK ที่เครื่องอ่านได้
│   ├── README.md                # โครงสร้าง SDK และกฎการมีส่วนร่วม
│   ├── python/                  # Python SDK (เผยแพร่ในชื่อ ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (เผยแพร่ในชื่อ @ombralabs/sdk)
│   └── ...                      # โครงร่างสัญญาสำหรับภาษาอื่น (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # กรณีทดสอบข้ามภาษาสำหรับการเปิดใช้งานและข้อกำหนดด้านความแนบเนียน
├── tools/check_repo.py          # ตัวตรวจสอบโครงสร้าง สคีมา และลิงก์ (CI)
└── .github/workflows/ci.yml
```

รีพอซิทอรีนี้เก็บสัญญา SDK, สคีมา, กรณีทดสอบความสอดคล้อง, เอกสาร และซอร์สโค้ดของ Ombra Desktop ส่วนแพตช์เอนจิน Chromium ดูแลอยู่ในรีพอซิทอรีแยกต่างหาก โดยเผยแพร่บิลด์ที่คอมไพล์แล้วผ่านแชนเนลดาวน์โหลดและ [GitHub Releases](https://github.com/ombralabs/ombra/releases)

## คำถามที่พบบ่อย (FAQ)

### นี่คือ fork ของ Playwright หรือไม่?

ไม่ใช่ ตัว SDK เชื่อมต่อไคลเอนต์ Playwright (หรือ Puppeteer) อย่างเป็นทางการเข้ากับ Ombra Chromium ผ่าน CDP ในเครื่อง ชนิดข้อมูล โลเคเตอร์ การรอ และอ็อบเจกต์หน้าเว็บทั้งหมดยังคงเป็นมาตรฐานเดิม

### Ombra ใช้งานฟรีหรือไม่ และต้องใช้ไลเซนส์คีย์หรือเปล่า?

ซอร์สโค้ด SDK ในรีพอซิทอรีนี้เป็นโอเพนซอร์สภายใต้สัญญาอนุญาต Apache License 2.0 บิลด์เอนจินรุ่นปัจจุบัน (`158.0.8127.37-2` ขึ้นไป) และตัวจัดการโปรไฟล์ในเครื่อง Ombra Desktop (`desktop-v1.2.2`) ใช้งานได้ฟรีและทำงานได้ด้วยตนเอง — ไม่มีบัญชี ไลเซนส์คีย์ hardware ID หรือการจำกัดจำนวนโปรไฟล์ ส่วน `license_key` และ `OMBRA_LICENSE_KEY` ใช้เฉพาะกับบิลด์รุ่นเก่าที่ต้องใช้ไลเซนส์เท่านั้น

### จำเป็นต้องติดตั้ง Ombra Desktop เพื่อใช้งาน SDK หรือไม่?

ไม่จำเป็น SDK จะเปิดเอนจินโดยตรงเป็นโพรเซสลูก ทำให้เหมาะสำหรับสคริปต์ คอนเทนเนอร์ และ CI ส่วน Ombra Desktop เป็นทางเลือกเสริมหากคุณต้องการจัดการแคตตาล็อกโปรไฟล์ในเครื่องผ่านหน้าจอ GUI

### Ombra แตกต่างจาก `playwright-stealth` อย่างไร?

`playwright-stealth` ฉีด JavaScript ลงในหน้าเว็บบนเบราว์เซอร์ปกติ ซึ่งตัวตรวจจับสมัยใหม่มักระบุตัวแพตช์เองได้บ่อยครั้ง ส่วน Ombra คอมไพล์การปรับแต่งลงในซอร์สโค้ดของ Chromium โดยตรง และ SDK ไม่ฉีดสคริปต์ใด ๆ ลงในหน้าเว็บ

### สามารถใช้พร็อกซีของตัวเองได้หรือไม่?

ได้ ส่งพร็อกซีแบบ `http://`, `https://` หรือ `socks5://` ในตัวเลือก `proxy` เมื่อมีข้อมูลรับรอง SDK จะเปิดรีเลย์ loopback ในเครื่องเพื่อให้ข้อมูลเหล่านั้นไม่ปรากฏในอาร์กิวเมนต์ของโพรเซส โปรดทราบว่าไคลเอนต์ `context.request` / `page.request` ของ Playwright เองอาจข้ามการตั้งค่าพร็อกซีระดับเบราว์เซอร์ — หากต้องการรับประกันว่าทราฟฟิกวิ่งผ่านพร็อกซี ให้เรียก `fetch()` จากคอนเทกซ์ของหน้าเว็บ

### รองรับ Playwright และ Puppeteer เวอร์ชันใดบ้าง?

Python SDK ต้องการ Playwright `>=1.60,<2.0` (ติดตั้งให้อัตโนมัติพร้อม `ombrabrowser`) ส่วน Node.js SDK รองรับ `playwright-core@^1.60.0` หรือ `puppeteer-core >=22.0.0` ดูรายละเอียดกฎความเข้ากันได้ใน [คู่มือการกำหนดเวอร์ชัน](../../docs/versioning.md)

### Ombra รับประกันว่าจะผ่านการตรวจจับบอททุกตัวหรือไม่?

ไม่ การตรวจจับเป็นเป้าหมายที่เปลี่ยนแปลงตลอดเวลา ซึ่งขึ้นอยู่กับเว็บไซต์ ภูมิภาค ชื่อเสียงของ IP ประวัติโปรไฟล์ และเวอร์ชันของตัวตรวจจับ ให้ใช้ [วิธีการตรวจเช็กความแนบเนียน](../../docs/stealth-checkup.md) เพื่อวัดผลและติดตามการตั้งค่าแต่ละชุดอย่างเป็นรูปธรรม

### Ombra ถูกสร้างมาเพื่อกรณีการใช้งานใดบ้าง?

Ombra ถูกสร้างมาเพื่อระบบอัตโนมัติที่ได้รับอนุญาต การทดสอบ QA การมอนิเตอร์ การวิจัย และการจัดการโปรไฟล์งานที่แยกส่วนกัน เราไม่สนับสนุนการเข้าถึงโดยไม่ได้รับอนุญาต การสุ่มลองข้อมูลรับรองที่รั่วไหล (credential stuffing) หรือการใช้งานในทางที่ผิด

## การมีส่วนร่วม

ดูแนวทางการมีส่วนร่วมได้ที่ [CONTRIBUTING.md](../../CONTRIBUTING.md) มาตรฐานชุมชนที่ [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) และคำแนะนำเกี่ยวกับ SDK ที่ [sdks/README.md](../../sdks/README.md)

- อัปเดต [สัญญา SDK](../../docs/sdk-contract.md) และ [สคีมา](../../spec/schemas) ก่อนเพิ่มตัวเลือกการเปิดใช้งานใหม่
- เมื่อเปลี่ยนพฤติกรรมของ SDK ให้อัปเดตโค้ด การทดสอบ และกรณีทดสอบร่วมใน [conformance](../../conformance/README.md)
- รัน `python3 tools/check_repo.py` ก่อนเปิด pull request เพื่อตรวจสอบโครงสร้างรีพอซิทอรีและลิงก์ต่าง ๆ

## สัญญาอนุญาต

ซอร์สโค้ด SDK ในรีพอซิทอรีนี้อยู่ภายใต้สัญญาอนุญาต [Apache License 2.0](../../LICENSE) สัญญาอนุญาตนี้ไม่ได้มอบสิทธิ์ในเครื่องหมายการค้าของ Ombra เอนจิน Ombra Chromium หรือ Ombra Desktop — ดูเงื่อนไขเครื่องหมายการค้าและบุคคลที่สามได้ที่ [NOTICE](../../NOTICE)

## ลิงก์ที่เกี่ยวข้อง

- 🌐 **เว็บไซต์** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **รุ่นที่เผยแพร่ (เอนจินและ Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **บันทึกการเปลี่ยนแปลง** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **แจ้งบั๊กและขอฟีเจอร์** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **องค์กร** — [Ombra Labs](https://github.com/ombralabs)
