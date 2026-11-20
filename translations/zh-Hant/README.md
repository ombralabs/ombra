# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

在 Python 和 Node.js 中，`launch()` 會啟動 Ombra Chromium，並傳回 Playwright 的 `Browser` 物件。若要在 Node.js 中使用 Puppeteer，請呼叫 `launchPuppeteer()`。

**[安裝](#安裝)** · <a href="../../README.md">English</a>

<details>
<summary>語言</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Chromium 中的指紋控制

Ombra 在 Chromium 中實作指紋控制，涵蓋 Canvas、WebGL、音訊、字型、硬體並行數、元素邊界、GPU 字串、時區與自動化訊號。引擎使用 Chromium 本身的 TLS 與 HTTP/2 網路堆疊，並在瀏覽器行程內處理模擬真人操作的輸入。

SDK 在本機啟動引擎，透過 Chrome DevTools Protocol（CDP）連接自動化用戶端。你可以在指令碼、容器或 CI 工作中執行 SDK，無須安裝 Ombra 桌面應用程式。

## 狀態

範例使用已發布的 Python 與 Node.js Alpha 套件。本儲存庫也維護共用的啟動契約，以及 8 套 SDK 的專案骨架。

| 元件 | 狀態 |
|---|---|
| [SDK 契約](../../docs/sdk-contract.md) | 草案 `0.1.0` |
| Python SDK | `0.1.3` Alpha 版 · [PyPI 上的 `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` Alpha 版 · [npm 上的 `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| [共用結構描述](../../spec/schemas) | 啟動選項與引擎執行檔的中繼資料 |
| [跨語言一致性測試](../../conformance) | 兩套 SDK 共用的測試案例 |
| [隱匿性檢查](../../docs/stealth-checkup.md) | 測試標準與報告範本 |

## 安裝

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

若使用 Puppeteer，請安裝 `puppeteer-core` 來取代 `playwright-core`。支援的用戶端與執行環境版本列於 [npm 套件頁面](https://www.npmjs.com/package/@ombralabs/sdk)。

SDK 會先檢查透過 Python 的 `binary_path` 或 Node.js 的 `binaryPath` 指定的路徑，再依序檢查 `OMBRA_BINARY_PATH`、桌面應用程式的引擎目錄與 SDK 快取。如果都找不到引擎，SDK 會下載並驗證引擎執行檔。

若要停用下載，可在 Python 傳入 `download=False`，或在 Node.js 傳入 `download: false`。若只需準備引擎而無須開啟瀏覽器，可呼叫 Python 的 `ensure_binary()` 或 Node.js 的 `ensureBinary()`。

## 快速開始

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

使用具名設定檔時，在既有的瀏覽器環境（context）中開啟頁面，即可沿用 Cookie 與網站儲存空間。本例也設定了代理伺服器。

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

呼叫 `launchPuppeteer()` 即可取得 Puppeteer 的 `Browser` 物件。

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## 直接替換遷移

若要遷移使用 Playwright 的 Python 指令碼，請安裝 `ombrabrowser`，並修改匯入陳述式與啟動呼叫。頁面方法、型別和選擇器仍由 Playwright 提供。

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

在 Node.js 中，同樣只需修改兩行。

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## 運作方式

```mermaid
flowchart LR
    Script["你的指令碼<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP 橋接"]
    Engine["Ombra Chromium<br/>修補過的引擎"]
    Client["原生自動化用戶端"]
    Profile[("設定檔<br/>種子 · cookie · 擴充功能")]

    Script -->|launch()| SDK
    SDK -->|啟動| Engine
    SDK -->|透過 CDP 連線| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` 會尋找引擎，必要時下載引擎，然後驗證執行檔。
2. SDK 會選定設定檔目錄與種子。如果代理伺服器需要驗證身分，SDK 會啟動本機中繼。
3. SDK 會使用選定的設定檔、啟動選項與回送偵錯連接埠啟動 Chromium。
4. `DevToolsActivePort` 就緒後，SDK 會透過 CDP 連接 Playwright 或 Puppeteer，並傳回該用戶端的 `Browser` 物件。
5. `browser.close()` 會停止引擎並解除設定檔鎖定。

啟動後，用戶端會直接將頁面指令傳送給 Chromium。

## SDK 矩陣

| 執行環境 | 已發布的套件 | 瀏覽器物件 |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

本儲存庫也包含另外 6 套 SDK 的目錄。[SDK 資訊清單](../../sdks/manifest.json)列出規劃中的套件與對應的用戶端，[SDK 指南](../../sdks/README.md)則說明目錄結構。

| 目標執行環境 | 規劃中的套件 | 用戶端或傳回型別 |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## 啟動選項

下表使用 Python API 與 SDK 契約中的選項名稱。Node.js 使用小駝峰命名法，例如 `timeoutMs`、`userDataDir` 和 `binaryPath`。

| 選項 | 預設值 | 說明 |
|---|---|---|
| `headless` | `true` | 在沒有視窗的情況下執行引擎 |
| `proxy` | 無 | 代理伺服器 URL 或設定物件。需要驗證身分的代理伺服器會使用本機中繼 |
| `fingerprint` | 無 | 種子，以及作業系統、時區、地區設定、螢幕與 GPU 的設定 |
| `profile` | 無 | 具名設定檔，持續保存 cookie、儲存空間與種子 |
| `user_data_dir` | 暫存 | 明確指定設定檔目錄，與 `profile` 互斥 |
| `args` | `[]` | 額外的引擎旗標，會原樣傳遞 |
| `timeout_ms` | `30000` | 啟動及建立 CDP 連線的逾時時間，以毫秒為單位 |
| `humanize` | 引擎預設值 | `false`、`true` 或預設集 |
| `binary_path` | 已解析 | 使用指定的引擎二進位檔 |
| `download` | `true` | 下載缺少的引擎二進位檔 |

[SDK 契約](../../docs/sdk-contract.md)列出所有啟動選項，並說明錯誤型別與設定檔的行為。

## 二進位檔管理

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK 會在啟動前驗證引擎執行檔的 SHA-256 總和檢查碼。請在正式環境中啟用這項檢查。`OMBRA_SKIP_CHECKSUM=1` 僅供本機開發組建使用。

## 設定

| 變數 | 預設值 | 說明 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 未設定 | 明確指定引擎二進位檔 |
| `OMBRA_CACHE_DIR` | `~/.ombra` | 受管理的二進位檔與具名設定檔 |
| `OMBRA_DOWNLOAD_URL` | 版本發佈端點 | 二進位檔下載的基底 URL |
| `OMBRA_VERSION` | 最新相容版本 | 要解析的引擎版本 |
| `OMBRA_AUTO_UPDATE` | `true` | 啟動時檢查是否有更新的引擎 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 僅限開發使用 |
| `OMBRA_LICENSE_KEY` | 未設定 | 傳遞給引擎 |
| `OMBRA_TIMEOUT_MS` | `30000` | 預設的啟動逾時時間，以毫秒為單位 |
| `OMBRA_LOG_LEVEL` | `warn` | `error`、`warn`、`info`、`debug` |

SDK 會依序檢查啟動選項、環境變數、設定檔中繼資料與預設值，並採用第一個找到的值。

## 比較

| 功能 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright 或 Puppeteer |
| 修補層級 | 無 | 頁面內 JavaScript | 設定旗標 | 引擎原始碼 |
| 指紋種子 | 無 | 無 | 部分 | 依設定檔 |
| 人性化輸入 | 無 | 無 | 無 | 引擎 |
| 設定檔隔離 | 瀏覽器脈絡 | 瀏覽器脈絡 | 無 | 使用者資料目錄 |
| 直接替換遷移 | — | 變更匯入陳述式 | 改寫 | 變更匯入陳述式 |

偵測結果取決於網站、出口 IP 與設定檔。測量方式請參閱[隱匿性檢查](../../docs/stealth-checkup.md)。

## 隱匿性是引擎本身的特性

指紋設定由引擎套用。SDK 會將設定檔種子與明確的啟動選項傳遞給引擎。

| 層級 | Ombra 處理的位置 |
|---|---|
| TLS 與 HTTP/2 | Chromium 本身的網路堆疊，版本與引擎組建相符 |
| 瀏覽器身分 | 由設定檔種子驅動的原始碼層級引擎修補 |
| 自動化暴露面 | 針對 WebDriver 訊號的引擎修補；SDK 不會呼叫 `Runtime.enable` |
| 輸入 | 在瀏覽器行程內完成的人性化滑鼠指標、鍵盤與捲動 |
| 網路連貫性 | 配合代理伺服器解析時區與語言地區 |
| 狀態 | 每個設定檔各自獨立的使用者資料目錄 |

### SDK 界限

- CDP 偵錯連接埠只接受透過回送位址建立的本機連線。
- SDK 不會將代理伺服器的登入憑證、授權金鑰或 Cookie 寫入記錄檔，也不會傳送遙測資料。
- 除非明確指定新種子，否則既有設定檔會保留原來的種子。
- SDK 不會透過 `addScriptToEvaluateOnNewDocument` 或 `evaluateOnNewDocument` 注入隱匿指令碼，也不會修改頁面屬性。
- SDK 透過 CDP 的 HTTP 端點或 `Browser.getVersion` 檢查就緒狀態，檢查時不會呼叫 `Runtime.enable`。
- 瀏覽器的識別資訊由引擎提供。SDK 不會透過 Playwright 或 Puppeteer 覆寫使用者代理字串或識別資訊，也不會呼叫 `Emulation.setUserAgentOverride`、`setTimezoneOverride`、`setLocaleOverride` 或 `setDeviceMetricsOverride`。
- SDK 不會自行加入 `--enable-automation`、`--disable-blink-features=AutomationControlled` 或 `--no-sandbox`。

## 隱匿性檢查

請針對你打算使用的引擎組建、自動化用戶端與設定檔執行下列檢查。

| 層級 | 範例目標 | 通過標準 |
|---|---|---|
| L0 傳輸 | TrackMe、IP/WebRTC 外洩檢查 | 只有出口 IP 可見，JA4 與 HTTP/2 均符合引擎所用的 Chromium 組建 |
| L1 身分 | 本機探測、Sannysoft、Intoli | UA、UA-CH、平台、GPU、字型與螢幕之間不得互相矛盾 |
| L2 指紋 | CreepJS、FingerprintJS、BrowserScan | 沒有無頭模式或造假的標記，多次重新載入後指紋仍然穩定 |
| L3 自動化 | rebrowser、brotector、botd | 不得外洩 CDP、初始化指令碼或 WebDriver 資訊 |
| L4 行為 | 輸入保真度、人性化軌跡、Cloudflare 快速驗證 | 事件受信任、順序合理、挑戰可通過 |
| L5 穩定性 | 種子、worker、iframe、跨來源 | 使用同一種子多次啟動時，產生的瀏覽器身分一致 |

測試指南說明結果狀態、疑難排解與報告方式，可參閱[英文版](../../docs/stealth-checkup.md)或[俄文版](../../docs/stealth-checkup.ru.md)。

請為每項結果記錄引擎組建、用戶端版本、設定檔設定、代理伺服器出口與偵測器版本，以便重現並比較各次執行。

## 儲存庫結構

```text
.
├── README.md                  # 英文原文
├── translations/
│   └── <locale>/README.md
├── desktop/                   # 離線設定檔管理員
├── docs/
│   ├── desktop/               # 設定檔管理員文件
│   ├── architecture.md        # 元件、啟動流程、界限
│   ├── sdk-contract.md        # v0 啟動契約與 SDK 行為
│   ├── stealth-checkup.md     # 隱匿性驗證方法與操作手冊
│   ├── stealth-checkup.ru.md  # 俄文翻譯
│   └── versioning.md          # SDK、引擎與用戶端的相容性
├── spec/
│   └── schemas/               # 啟動選項與二進位檔資訊的 JSON Schema
├── sdks/
│   ├── manifest.json          # 機器可讀的 SDK 登錄表
│   ├── README.md              # 目錄結構與貢獻規則
│   ├── _template/             # 新語言 SDK 的專案骨架
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # 與語言無關的啟動與隱匿性案例
├── tools/check_repo.py        # 結構與連結驗證（CI）
└── .github/workflows/ci.yml
```

本儲存庫包含 SDK 專案骨架、啟動契約、一致性測試案例與離線設定檔管理員。Chromium 引擎和 Desktop 1.2.1 完整發行版分別存放在獨立的儲存庫。[Desktop 原始碼與建置指南](../../desktop/README.md) · [設定檔管理員文件](../../docs/desktop/README.md)

## 契約

- `launch(options)` 會啟動引擎並傳回用戶端的 `Browser` 物件。此後，用戶端透過 CDP 直接與 Chromium 通訊。
- 啟動前，SDK 會檢查引擎的目標平台與 SHA-256 總和檢查碼。如果缺少執行檔且已啟用下載，SDK 會下載該檔案。
- 具名設定檔會保留 Cookie、網站儲存空間的資料與種子，供下次啟動使用。
- 如果啟動失敗，SDK 會清理自己啟動的行程，並拋出具有明確型別的錯誤。是否重試由呼叫端決定。
- SDK、引擎與自動化用戶端各自有獨立的版本範圍。可透過 Python 的 `binary_info()` 或 Node.js 的 `binaryInfo()` 查詢引擎組建版本。

## 相容性

| 元件 | 支援範圍 |
|---|---|
| 引擎 | SDK 選定的組建，可透過 `binary_info()` 或 `binaryInfo()` 查詢 |
| macOS | Apple Silicon 與 Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10 以上，搭配支援的 Playwright 版本 |
| Node.js | 20 以上，搭配支援的 Playwright 或 Puppeteer 版本 |

SDK 與引擎分別管理版本。如果版本不相容，SDK 會拋出具有明確型別的錯誤，並在訊息中列出兩個版本號碼。

## 參與貢獻

程式碼審查流程請參閱[貢獻指南](../../CONTRIBUTING.md)，建置步驟請參閱 [SDK 指南](../../sdks/README.md)。

- 變更 SDK 行為時，請更新受影響的實作，並新增測試或共用的一致性測試案例。
- 新增語言的 SDK 時，請複製 [SDK 範本](../../sdks/_template)，在[資訊清單](../../sdks/manifest.json)中登錄，並開啟草稿 PR。
- 新增啟動選項時，請先更新 [SDK 契約](../../docs/sdk-contract.md)與[結構描述](../../spec/schemas)。
- 引擎層級的隱匿功能應在引擎儲存庫中修改。修改後，SDK 仍須通過檢查。
- 請依照[安全性政策](../../SECURITY.md)私下通報安全問題。

## 常見問題

### Ombra 是 Playwright 的分支版本嗎？

不是。SDK 將官方 Playwright 用戶端連接到 Ombra Chromium，既有的 Playwright 型別、輔助函式和頁面物件都可以繼續使用。

### 需要安裝 Ombra 桌面應用程式嗎？

SDK 會直接啟動引擎。桌面應用程式可依需求安裝，方便手動管理設定檔。

### Ombra 與 playwright-stealth 有何不同？

Ombra 的指紋控制邏輯直接編譯進 Chromium。SDK 不會修改頁面指令碼。

### 可以使用自己的代理伺服器嗎？

可以。將代理伺服器傳給 `launch()` 即可。需要驗證身分的代理伺服器會透過本機中繼連線，因此登入憑證不會出現在引擎行程的命令列中。

### 支援哪些版本的 Playwright 與 Puppeteer？

各 SDK 在套件資訊清單中宣告支援的用戶端版本。這些用戶端都是獨立的相依套件。支援範圍請參閱[版本管理指南](../../docs/versioning.md)。

### Ombra 能通過所有機器人偵測嗎？

結果取決於網站、地區、出口 IP 的信譽、偵測器版本與設定檔的內容。[隱匿性檢查](../../docs/stealth-checkup.md)說明如何測量特定設定的結果。

## 授權條款

本儲存庫中的 SDK 原始碼採用 [Apache License 2.0](../../LICENSE) 授權。此授權並未賦予 Ombra 引擎、Ombra 名稱或標誌的任何權利。商標與第三方署名資訊請參閱 [NOTICE](../../NOTICE)。

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
