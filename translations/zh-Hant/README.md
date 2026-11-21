<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="授權條款"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="最新提交"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="星標數"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI 下載次數"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm 下載次數"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="發行版本"></a>
</p>

<p align="center">
<a href="#安裝"><strong>安裝</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-與-typescript-api">Node.js API</a> ·
<a href="#擬人化輸入">擬人化輸入</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>語言</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">具備 C++ 原始碼層級指紋控制與原生擬人化輸入的 Chromium 瀏覽器。</h3>

<table><tr><td>
這不是一堆啟動旗標的拼湊，也不是疊加在網頁上的 JavaScript 注入，而是將指紋修補編譯至 C++ 原始碼、並在瀏覽器處理程序內執行輸入模擬的真實 Chromium 執行檔。透過本機 CDP 連線官方 Playwright 或 Puppeteer——不需封裝物件，也不必重寫頁面程式碼。
</td></tr></table>

<br>

<p align="center">
Python 與 Node.js 中 Playwright 和 Puppeteer 的無痛啟動替代方案。<br>
相同的 API、相同的選擇器與型別——只需替換匯入與 <code>launch()</code> 呼叫即可。
</p>

- **原始碼層級 Chromium 修補** — 涵蓋 Canvas、WebGL、WebGPU、音訊、字型、GPU、螢幕、CSS 媒體查詢、硬體回報、無 STUN 外洩的 WebRTC、TLS ClientHello、時區、語系，以及自動化特徵移除（`navigator.webdriver`、`Runtime.enable`、無頭模式標記）。
- **瀏覽器處理程序內的原生擬人化輸入（`humanize=True`）** — 指標移動軌跡（`cursory-rs`）、帶按住時間的瞄準點擊、含錯字自動修正的打字節奏，以及捲動物理效果皆直接於 Chromium 內部運作。SDK 回傳純粹的原生 `Browser` 物件，不含任何代理封裝層。
- **無需金鑰或帳號即可自主運行** — 目前的引擎建置版本（`158.0.8127.37-2` 及更新版本）與 Ombra Desktop 皆可於本機獨立運行，無需註冊、授權金鑰、硬體識別碼或授權伺服器。
- **自動安裝與加密執行檔驗證** — 只需執行 `pip install ombrabrowser` 或 `npm install @ombralabs/sdk`；首次啟動時，SDK 會自動下載對應平台的建置版本，並驗證其 Ed25519 簽章與 SHA-256 校驗碼。
- **持久化設定檔與安全代理中繼** — 具名設定檔可在多次執行間保留 Cookie、`localStorage`、IndexedDB 與 `seed`，並提供跨處理程序鎖定；需要驗證的代理伺服器（HTTP、HTTPS、SOCKS5）透過本機迴路中繼運作，憑證絕不會出現在處理程序參數中。
- **離線版 Ombra Desktop 設定檔管理器** — 本儲存庫內建的原生桌面應用程式（[`desktop/`](../../desktop/README.md)），提供適用於 macOS、Linux 與 Windows 的預先建置安裝程式。

**Python（Playwright）：**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

**Node.js / TypeScript（Playwright）：**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

亦支援透過 `import { launch } from "@ombralabs/sdk/puppeteer"` 或 `launchPuppeteer()` 使用 Puppeteer（[詳細說明](#puppeteer)）。

**針對具備反機器人防護的網站**，建議結合住宅代理、持久化設定檔與一致的環境設定：

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # 建議優先使用住宅 IP，而非資料中心 IP
    fingerprint={"timezone": "auto", "locale": "auto"},  # 依據代理出口自動對應時區與語系
    headless=False,                                      # 部分網站會偵測無頭模式差異
    humanize=True,                                       # 原生滑鼠、鍵盤與捲動模擬
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

在 Linux、容器環境或受防護目標網站遇到常見問題時，請參閱[疑難排解](#疑難排解)。

## 安裝

**Python（3.10+）：**

```bash
python -m pip install ombrabrowser

# 選用：依據代理出口自動偵測時區與語系（timezone="auto", locale="auto"）
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript（20+）：**

```bash
# 搭配 Playwright（1.60.0+，不需下載標準版 Chromium）
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# 或搭配 Puppeteer
npm install @ombralabs/sdk puppeteer-core

# 選用：用於 timezone: "auto" 與 locale: "auto" 的離線 GeoIP 資料庫讀取器
npm install mmdb-lib
```

---

啟動時，SDK 會依照嚴格順序解析引擎位置：`binary_path`（Node.js 中為 `binaryPath`）、`OMBRA_BINARY_PATH`、Ombra Desktop 引擎目錄，以及 SDK 快取目錄（`~/.ombra/engines`）。若找不到相容引擎，SDK 會從已簽章的發布通道下載建置版本，驗證其 Ed25519 簽章與 SHA-256 校驗碼，並快取於本機。無須執行 `playwright install chromium`。

若要停用自動下載，請傳入 `download=False`（Node.js 中為 `download: false`）。若想事先下載並驗證引擎（例如在建置容器映像檔時），可呼叫 `ensure_binary()`（`ensureBinary()`）或使用 CLI 的 `install` 指令。

> **自主啟動：** 目前的引擎建置版本（`158.0.8127.37-2` 及更新版本）皆為免費使用，無需帳號或授權金鑰。`OMBRA_LICENSE_KEY` 與 `login` 指令僅保留以相容舊版授權建置。

**從 Playwright 遷移**只需修改兩行程式碼——所有頁面操作、定位器與等待邏輯皆維持不變：

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # 其餘程式碼皆可原封不動繼續運作
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ 如果覺得這個專案有幫助，歡迎為儲存庫點一顆 **Star**，並 **[關注版本發布](https://github.com/ombralabs/ombra/subscription)**，以便接收最新引擎、SDK 與 Ombra Desktop 建置通知。

---

## 目前狀態與發行版本

生態系中的每個元件皆遵循共通的啟動契約，並採獨立版本控管。

| 元件 | 狀態／版本 | 位置 |
|---|---|---|
| **SDK 契約** | 草案 `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.1.3` | [PyPI 上的 `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.1.0` | [npm 上的 `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium 引擎** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **獨立版瀏覽器** | `v158.0.8127.37-2` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-2) |
| **結構描述與一致性測試** | JSON Schema + 共用測試案例 | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **隱匿性檢查方法** | 6 個層級（`L0`–`L5`） | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

目前發行版本包含以下特性：

- **原始碼層級修補** — 基於種子的連貫指紋衍生、WebGL／WebGPU 與擴充功能對齊、符合各作業系統的擬真字型表、原生 TLS ClientHello 設定檔（`chrome-<major>`）、抑制 `Runtime.enable` 與 `UtilityScript` 堆疊外洩，以及 WebRTC 本機 IP 外洩防護。
- **瀏覽器層級 `Ombra` CDP 網域** — 可在 Python 與 Node.js 執行期間即時控制擬人化輸入（`getHumanizeState`、`setHumanize`），無需重新啟動瀏覽器。
- **瀏覽器處理程序內的原生輸入模擬** — `cursory-rs` 指標路徑規劃器、滾輪與觸控板捲動曲線、具備錯字自我修正的打字節奏，以及透過隔離剪貼簿進行的安全長文字貼上。
- **免金鑰自主建置** — 目前的引擎建置（`158.0.8127.37-2`）與 Ombra Desktop `1.2.2` 完全於本機離線運作，無帳號、無金鑰、無遙測回傳。
- **引擎版本鎖定（`version`）** — 透過 `launch(version="158.0.8127.37-2")`、`OMBRA_VERSION` 或 CLI 的 `install --version` 鎖定特定建置版本。
- **統一代理中繼** — 支援 HTTP、HTTPS 與 SOCKS5 驗證代理，且不在 Chromium 命令列、日誌或設定檔中繼資料中暴露憑證。
- **持久化具名設定檔** — 將 `seed`、Cookie、`localStorage` 與 IndexedDB 儲存於 `~/.ombra/profiles/<slug>`，並具備跨處理程序鎖定機制（`ProfileBusyError`）。
- **加密供應鏈檢查** — 解壓縮前驗證發布封包的 Ed25519 簽章與壓縮檔的 SHA-256 校驗碼。

完整發行歷史請參閱 [CHANGELOG.md](../../CHANGELOG.md)。

## 為什麼選擇 Ombra

- **設定層級與 JS 修補容易失效。** 諸如 `playwright-stealth`、`puppeteer-extra` 與 `undetected-chromedriver` 等工具仰賴向網頁注入 JavaScript 或微調啟動旗標。Chrome 每次更新都經常導致其失效，且現代偵測系統可直接識破修補痕跡本身（`Function.prototype.toString`、原型異常、`addScriptToEvaluateOnNewDocument`）。
- **變更直接編譯進 Chromium 原始碼。** 指紋於 C++ 層級產生，並在主框架、Worker 與 iframe 之間一致套用。SDK 不會向網頁注入任何腳本，也不執行任何 `Emulation.*` 覆寫。
- **輸入模擬位於瀏覽器處理程序內，而非疊加在 Playwright 之上。** 由於滑鼠軌跡、按鍵輸入與捲動皆由 Chromium 內部處理，SDK 不需封裝 Playwright 或 Puppeteer 物件——所有定位器、框架與第三方函式庫皆可正常運作。
- **無額外服務的本機架構。** 不需要背景控制平面常駐服務，腳本與瀏覽器之間也沒有額外的網路跳點：單一引擎處理程序、位於 `127.0.0.1` 的本機迴路 CDP，且對設定檔數量或並行數皆無上限。

## Ombra Desktop

**具備圖形介面的本機離線設定檔管理器。** 其原始碼直接託管於本儲存庫（[`desktop/`](../../desktop/README.md)），並採用 Tauri（Rust + Vue）建置。

- **完全離線且本機化** — 設定檔目錄儲存於本機 SQLite 資料庫並搭配本機加密金鑰；無需帳號、雲端服務或網路連線。
- **結構化設定檔管理** — 可建立設定檔、依名稱／備註／編號搜尋、編輯說明，並在 Rust 目錄中透過群組、標籤、標記與書籤進行整理。
- **安全垃圾桶** — 將設定檔移至垃圾桶時仍會保留磁碟上的檔案，方便日後還原。
- **無設定檔數量限制** — 沒有依設定檔數計費的分級方案或雲端配額：所有資料完全歸您掌控。
- **預先建置安裝程式** — 提供 macOS Apple Silicon（`.dmg`，具備 Apple Developer ID 簽章與公證）、Linux（`.deb` 與 `.rpm`）以及 Windows x64（`setup.exe`）版本。
- **隔離目錄** — 設定 `OMBRA_DESKTOP_DATA_DIR` 即可操作獨立的測試目錄或備份複本。

[下載 `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [設定檔與本機金鑰指南](../../docs/desktop/README.md)

## 指紋驗證與隱匿性檢查

Ombra 不做籠統的「100% 無法偵測」承諾，而是仰賴在明確記錄條件下的可重複驗證程序。在任何網站上的實際表現始終取決於出口 IP 信譽、地區、設定檔歷史記錄、偵測器版本與啟動設定。

### 引擎與 SDK 處理的檢測面

| 檢測面／訊號 | 標準版 Playwright | Ombra | 實作方式 |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ 引擎修補 |
| `window.chrome` | 無頭模式下缺失 | 完整物件 | 與一般 Chrome 一致 |
| `navigator.plugins` | 無頭模式下為 `0` | 一致的外掛程式集合 | 引擎層級 |
| User-Agent 與 Client Hints | `HeadlessChrome`、品牌不一致 | `Google Chrome` + 對齊的 `Sec-CH-UA*` | 修補程式 `010-user-agent-and-webdriver` |
| CDP 痕跡（`Runtime.enable`、`UtilityScript`） | 易被偵測器標記 | 由引擎抑制；SDK 永不呼叫 `Runtime.enable` | 修補程式 `110-runtime-enable` + 不變量 `SI-02` |
| WebRTC IP 外洩 | 暴露本機／主機 IP | 回報出口 IP 而不發送真實 STUN 請求 | 修補程式 `100-webrtc-leak`（`--webrtc-ip`） |
| TLS 與 HTTP/2 | 視環境設定而定 | Chromium 網路堆疊 + `chrome-<major>` ClientHello 設定檔 | 修補程式 `210-tls-network-persona` |
| WebGL 與 WebGPU | 軟體轉譯器／GPU 不一致 | 統一的 WebGL/WebGPU 限制與擴充功能表 | 修補程式 `070`、`071`、`075`、`955` |
| 字型、語系與時區 | 主機預設值、`Intl` 偏差 | 一致的字型表、ICU 語系與時區 | 修補程式 `040`、`090`、`092`、`230` |
| 輸入模擬 | 游標瞬移、瞬間 `fill()` | `cursory-rs` 曲線、打字節奏、捲動物理 | 瀏覽器處理程序內的修補程式 `135-ombra-humanize` |
| 指紋穩定性 | 每次變動或外洩主機特徵 | 依 `seed` 跨重啟與跨框架具決定性重現 | 修補程式 `001`、`002` + 持久化設定檔 |

### 檢查的六個層級

在發布或部署任何設定前，請針對您實際要使用的引擎版本、自動化用戶端與代理伺服器執行完整六個層級的檢查：

| 層級 | 範例測試目標 | 通過標準 |
|---|---|---|
| **L0 傳輸層** | TrackMe、IP/WebRTC 外洩測試頁、標頭回顯服務 | 僅顯示代理出口 IP；JA4 與 HTTP/2 與 Chromium 建置版本相符；命令列參數無代理憑證 |
| **L1 身分層** | 本機探測頁、Sannysoft、Intoli、UA-CH 檢測 | UA、Client Hints、平台、GPU、字型、螢幕與語系之間無任何矛盾 |
| **L2 指紋層** | CreepJS、FingerprintJS、BrowserScan、Pixelscan | 無無頭模式或 `lie` 標記；重新載入頁面後指紋維持穩定 |
| **L3 自動化層** | rebrowser、brotector、botd、CDP 指令稽核 | 無 `Runtime.enable`、初始化腳本、繫結或 `navigator.webdriver` 外洩 |
| **L4 行為層** | 輸入擬真度探測、擬人化輸入軌跡、即時驗證冒煙測試 | `isTrusted: true` 事件、自然的事件順序與時序、擬真的指標曲線與捲動 |
| **L5 穩定層** | 重複啟動、Worker、同源／跨源 iframe、跨 SDK 一致性 | 相同的 `seed` 在所有上下文中皆能重現完全一致的指紋 |

完整流程、狀態定義（`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`）、訊號檢查清單與報告範本：[英文版（`docs/stealth-checkup.md`）](../../docs/stealth-checkup.md) 與[俄文版（`docs/stealth-checkup.ru.md`）](../../docs/stealth-checkup.ru.md)。

## 比較

| 功能特性 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| 自動化 API | Playwright | Playwright | Selenium | **Playwright 與 Puppeteer** |
| 修補層級 | 無 | 頁面內 JS 注入 | 設定旗標 | **C++ 原始碼（Chromium）** |
| 一致性指紋 `seed` | 否 | 否 | 部分支援 | **支援，依設定檔與 eTLD+1** |
| 輸入模擬（`humanize`） | 否 | 否 | 否 | **內建於瀏覽器處理程序** |
| `Runtime.enable`／CDP 外洩抑制 | 否 | 否 | 部分支援 | **引擎修補 + SDK 不變量** |
| 無命令列外洩的驗證代理 | 否 | 否 | 有限支援 | **本機迴路中繼** |
| 設定檔隔離 | 瀏覽器上下文 | 瀏覽器上下文 | 否 | **設定檔目錄 + 檔案鎖定** |
| 離線設定檔管理器（GUI） | 否 | 否 | 否 | **Ombra Desktop（macOS、Linux、Windows）** |
| 從 Playwright 遷移 | — | 變更匯入 | 重寫程式碼 | **僅替換匯入與 `launch()`** |

## 運作原理

```mermaid
flowchart LR
    Script["您的腳本<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP 橋接"]
    Relay["本機代理中繼<br/>需要驗證時啟用"]
    Engine["Ombra Chromium<br/>C++ 原始碼修補引擎"]
    Client["原生用戶端<br/>Playwright · Puppeteer"]
    Profile[("設定檔<br/>seed · cookies · 儲存空間")]

    Script -->|"launch()"| SDK
    SDK -->|"驗證並啟動"| Engine
    SDK -.->|"代理驗證"| Relay
    Relay -.-> Engine
    SDK -->|"透過 CDP 連線"| Client
    Script -->|"頁面 API"| Client
    Client -->|"本機迴路 CDP"| Engine
    Engine --> Profile
```

1. **`launch()` 尋找或下載引擎**，並驗證其 Ed25519 簽章與 SHA-256 校驗碼。
2. **準備設定檔與 `seed`。** 具名設定檔會取得跨處理程序鎖定；若代理伺服器需要驗證憑證，SDK 會啟動一個記憶體內的本機迴路中繼。
3. **啟動 Ombra Chromium**，帶入所選設定檔、指紋選項與本機偵錯連接埠（`--remote-debugging-port=0`）。
4. **連線官方用戶端。** 當 `DevToolsActivePort` 出現後，SDK 透過 `127.0.0.1` 掛接 Playwright（搭配 `no_defaults=True`）或 Puppeteer，並回傳原生 `Browser` 物件。
5. **乾淨關閉。** 呼叫 `browser.close()` 會發送 `Browser.close`、終止引擎處理程序樹、停止中繼並釋放設定檔鎖定。

啟動完成後，SDK 即退出資料路徑：所有頁面指令都直接由 Playwright 或 Puppeteer 傳送至 Chromium。

### SDK 邊界與隱匿性不變量

[v0.1 SDK 契約（`docs/sdk-contract.md`）](../../docs/sdk-contract.md) 對每個官方 SDK 強制實施嚴格的不變量：

- **絕不向頁面注入隱匿腳本。** SDK 永不呼叫 `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument`，也不會修補 DOM 屬性。
- **絕不啟用 `Runtime.enable`。** 就緒狀態檢查僅使用本機 CDP HTTP 端點或 `Browser.getVersion`；SDK 永不啟用 `Runtime`、`Debugger` 或 `Log`。
- **絕不使用 `Emulation.*` 覆寫。** SDK 永不呼叫 `Emulation.setUserAgentOverride`、`setTimezoneOverride`、`setLocaleOverride` 或 `setDeviceMetricsOverride`——瀏覽器身分完全由引擎提供。
- **預設不加入禁用旗標。** SDK 絕不會自行注入 `--enable-automation`、`--disable-blink-features=AutomationControlled`、`--no-sandbox` 或 `--user-agent`。
- **僅限本機迴路 CDP。** 偵錯連接埠一律繫結至 `127.0.0.1`；若傳入非本機迴路的 `--remote-debugging-address` 將會被拒絕。
- **無遙測且不外洩機密資訊。** 代理憑證、金鑰與 Cookie 皆會在日誌與錯誤訊息中進行遮罩處理。

## Python API

### `launch()`

```python
from ombrabrowser import launch

# 基本啟動（預設為無頭模式）
browser = launch()

# 顯示瀏覽器視窗的有頭模式
browser = launch(headless=False)

# HTTP 或 SOCKS5 代理（憑證透過本機迴路中繼處理）
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# 含略過清單的代理設定物件
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

# 指紋控制（seed、作業系統、依代理自動設定時區／語系、螢幕、GPU）
# 使用 timezone="auto" / locale="auto" 需先安裝：pip install "ombrabrowser[geoip]"
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

# 原生滑鼠、鍵盤與捲動模擬
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# 鎖定特定引擎建置版本並傳入額外 Chromium 旗標
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

回傳標準的 `playwright.sync_api.Browser` 物件。所有 Playwright 方法均可正常使用（`new_page()`、`new_context()`、`close()` 等）。新頁面預設套用 `no_viewport=True`，以避免覆寫設定檔的視窗尺寸。

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

### `launch_context()` 與 `launch_context_async()`

便利輔助函式，會啟動瀏覽器並直接回傳一個 `BrowserContext`（關閉此上下文時也會一併終止引擎處理程序）。額外的關鍵字參數會轉傳至 `browser.new_context()`——例如 `storage_state`、`permissions` 或 `extra_http_headers`：

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

非同步對應函式：`await launch_context_async(...)`。

### `launch_persistent_context()` 與 `launch_persistent_context_async()`

以持久化設定檔啟動瀏覽器並回傳其預設的 `BrowserContext`。Cookie、`localStorage`、IndexedDB、快取與指紋 `seed` 都會在多次工作階段間保留。

- 傳入 `profile="pricing-eu"` 會在 `~/.ombra/profiles/pricing-eu` 建立設定檔，並將中繼資料存於 `.ombra/profile.json` 及建立鎖定檔。
- 傳入 `user_data_dir="./my-profile"`（或位置路徑參數）則會使用該指定目錄。
- 若從另一個處理程序同時啟動相同設定檔，將會引發 `ProfileBusyError`，防止設定檔資料損毀。

```python
from ombrabrowser import launch_persistent_context

# 使用具名設定檔（儲存於 ~/.ombra/profiles/）
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # Cookie、儲存空間與 seed 皆會持久化保存

# 使用明確路徑（例如用來載入 Chrome 擴充功能）
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

非同步對應函式：`await launch_persistent_context_async(...)`。

### 公用函式與診斷工具（Python）

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

# 檢視已解析的引擎執行檔資訊
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# 在不啟動瀏覽器的情況下事先下載並驗證引擎
ensure_binary(version="158.0.8127.37-2")

# 移除由 SDK 管理的引擎執行檔（~/.ombra/profiles 下的設定檔不受影響）
clear_cache()

# 在不啟動 Chromium 的情況下檢視解析後的啟動指令
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# 讀取執行期中繼資料（CDP 連接埠、ws_url、seed、pid）並檢查處理程序健康狀態
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI（Python）

```bash
ombrabrowser install                             # 下載並驗證引擎（Ed25519 + SHA-256）
ombrabrowser install --version 158.0.8127.37-2  # 安裝特定引擎建置版本
ombrabrowser info                                # 環境、執行檔與相依性診斷（別名：doctor）
ombrabrowser info --quick --json                 # 不啟動執行檔的快速機器可讀報告
ombrabrowser info --proxy socks5://user:pass@host:1080  # 測試透過代理的出口 IP、時區與語系解析
ombrabrowser update                              # 檢查發布通道並更新已快取的引擎
ombrabrowser clear-cache                         # 清除快取的引擎執行檔（保留設定檔）
ombrabrowser login                               # 將授權金鑰儲存至 ~/.ombra/license.key（僅限舊版建置）
ombrabrowser logout                              # 移除已儲存的授權金鑰
```

相同的指令亦可透過 `python -m ombrabrowser <command>` 執行。

## Node.js 與 TypeScript API

`@ombralabs/sdk` 同時提供 ESM 與 CommonJS 雙格式建置，並附帶完整的 TypeScript 型別定義（`.d.ts`）。底層的 Playwright 與 Puppeteer 皆運作於同一款引擎之上。

### Playwright（預設）

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// 含代理、指紋與輸入模擬的基本啟動
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

// 便利啟動：一次呼叫同時建立瀏覽器與上下文
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// 持久化設定檔 — Cookie、localStorage 與 seed 會在多次執行間保留
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> 以上各段範例皆可獨立執行。若要遷移現有的 Playwright 啟動程式，也可以將匯入改為 `import * as chromium from "@ombralabs/sdk"`，並保留原本的 `await chromium.launch(...)`。

### Puppeteer

使用 `@ombralabs/sdk` 的 `launchPuppeteer()`，或從 `@ombralabs/sdk/puppeteer` 匯入：

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

> **關於 Puppeteer 的注意事項：** 相較於搭配 `connectOverCDP({ noDefaults: true })` 的 Playwright，Puppeteer 預設會發送更多 CDP 流量。對於實施嚴格 CDP 偵測的網站，建議優先使用 Playwright。

### 公用函式與 CLI（Node.js）

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

## 擬人化輸入

在 Ombra 中，輸入模擬（`humanize`）是**直接編譯進 Chromium 瀏覽器處理程序的原生實作**（由 `cursory-rs` 與引擎的輸入排程器驅動），而非包覆在自動化用戶端外層的 JS 封裝器。這代表：

- 所有標準的 Playwright 與 Puppeteer 操作（`page.click()`、`page.fill()`、`page.type()`、`page.mouse.*`、`page.keyboard.*`、`locator.*`、`ElementHandle.*`）皆會通過瀏覽器內部單一的個別分頁輸入佇列。
- 行為參數依據設定檔的 `seed`（`--fingerprint-humanize-seed`）具決定性地衍生。
- SDK 絕不以代理類別封裝 `Page` 或 `Browser`——原生型別與用戶端行為皆維持完整無損。

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**啟用 `humanize=True` 後的差異：**

| 操作 | 未啟用 `humanize` | 啟用 `humanize=True` |
|---|---|---|
| 滑鼠移動 | 瞬間移動 | 具備加速度、停頓與微幅過衝的 `cursory-rs` 曲線 |
| 點擊與拖曳 | 瞬間按下 | 目標內的瞄準點、點擊前短暫停頓與按住持續時間 |
| 文字輸入 | 瞬間設定數值 | 依設定節奏與鍵盤配置逐字輸入，偶爾產生錯字並自動修正；超長文字會透過隔離剪貼簿貼上，完全不影響系統剪貼簿 |
| 捲動 | 單次跳躍 | 遵循實測減速曲線的滾輪／觸控板事件序列 |
| 閒置間隔 | 游標完全靜止 | 在 `careful` 預設模式下，動作間會有細微的閒置游標漂移 |

**預設模式（Presets）** — `default`（一般節奏）、`careful`（較緩慢審慎，附帶閒置微動作）與 `fast`（較快節奏）。傳入 `humanize=False`（`humanize: false`）可明確停用輸入模擬。

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

您可在執行期間透過 `Ombra` CDP 網域即時開關模式或切換預設，無需重新啟動瀏覽器：

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

## 指紋與設定檔管理

引擎會從單一 `seed` 衍生出一套連貫一致的瀏覽器組態。當省略 `seed` 時：

| 情境 | 行為 |
|---|---|
| **未使用設定檔的 `launch()`** | SDK 為本次工作階段產生隨機 `seed`，並建立暫存目錄，於 `close()` 後自動移除。 |
| **`profile="name"` 或 `user_data_dir="./dir"`** | `seed` 會儲存於 `.ombra/profile.json` 並在每次啟動時重複使用——網站會將其視為攜帶相同裝置與 Cookie 的回訪者。 |
| **`fingerprint={"seed": N, ...}`** | 依據明確指定的 `seed` 產生決定性指紋；其他欄位可覆寫個別設定，同時保持其餘參數彼此協調。 |

Canvas／音訊雜訊係依據各 `eTLD+1` 分別加鹽（在同一網站上保持穩定，跨不同網站則無法關聯）。2D Canvas 與 WebGL `readPixels` 的像素雜訊預設為停用，以避免觸發「Canvas 竄改／遮罩（Canvas Tampering / Masking）」偵測器，但可透過 `--fingerprint-pixel-noise` 明確啟用。

> **提示：** 重複造訪同一個網站時，請使用持久化設定檔（`profile="name"` 或 `launch_persistent_context()`），而非在短暫的 `launch()` 中傳入固定 `seed`——如此才能讓 Cookie、快取與 `localStorage` 與指紋保持一致。

### `fingerprint` 物件欄位

下列欄位名稱以 Python（`snake_case`）為準；Node.js 同時支援 `camelCase`（`osVersion`、`hardwareConcurrency`、`deviceMemory`）與 `snake_case`：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `seed` | `int`（`>= 0`） | 決定整體指紋組態的產生器種子 |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | 目標作業系統（`navigator.platform`、UA、GPU 與字型池） |
| `os_version` | `string` | 提供給 Client Hints 的作業系統版本提示 |
| `timezone` | IANA 時區或 `"auto"` | 時區（例如 `"Europe/Berlin"`）。`"auto"` 會透過 GeoIP 依據代理出口自動解析時區 |
| `locale` | BCP-47 或 `"auto"` | 語系（`Accept-Language`、`navigator.languages`、ICU `Intl`）。`"auto"` 會依據代理出口自動解析語系 |
| `screen` | `{"width", "height"}` 或 `"auto"` | 考量目標作業系統工作列／功能表列後的螢幕與可用工作區尺寸 |
| `gpu` | `{"vendor", "renderer"}` 或 `"auto"` | 明確指定的 WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` 字串 |
| `hardware_concurrency` | `int` 或 `"auto"` | 回報的 `navigator.hardwareConcurrency` 值 |
| `device_memory` | `int` 或 `"auto"` | 回報的 `navigator.deviceMemory` 值（單位：GB） |
| `noise` | `bool` | 啟用／停用指紋雜訊（設為 `False` 會傳遞 `--disable-fingerprint-noise`） |

> 請以 `seed` 作為指紋參數的主要來源：若在未保持彼此對齊的情況下單獨覆寫個別數值（例如將特定作業系統搭配不相容的 GPU），可能會產生矛盾而被偵測器察覺。

### 其他引擎旗標（`args`）

以下為引擎支援、但 SDK 不會自動設定的旗標（可透過 `args=[...]` 傳入）：

| 旗標 | 用途 |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | 設定 `Sec-CH-UA` 中的瀏覽器品牌（SDK 預設為 `chrome`） |
| `--fingerprint-tls-profile=chrome-<major>` | 對應指定 Chrome 主版本的 TLS ClientHello 設定檔（SDK 會依引擎版本自動設定） |
| `--webrtc-ip=<ip>` | 在 WebRTC ICE 候選項目中替換 IP 位址，且不發送真實 STUN 流量 |
| `--fingerprint-location=<lat,lon>` | 設定 `navigator.geolocation` 回報的經緯度座標 |
| `--fingerprint-storage-quota=<MB>` | 設定 `navigator.storage.estimate()` 回報的儲存空間配額 |
| `--fingerprint-max-touch-points=<N>` | 觸控點數量（`navigator.maxTouchPoints` 與指標媒體查詢） |
| `--fingerprint-device-pixel-ratio=<ratio>` | 顯示器像素密度（`window.devicePixelRatio`） |
| `--fingerprint-color-depth=<bits>` | 螢幕色彩深度 |
| `--disable-gpu-fingerprint` | 直接透傳主機的真實 GPU（WebGL/WebGPU 字串、限制與擴充功能） |
| `--disable-gpu-string-spoof` | 透傳真實 GPU 字串，同時保留其餘設定檔參數 |
| `--disable-fingerprint-noise` | 停用 Canvas/WebGL/音訊雜訊，同時維持身分參數啟用 |
| `--fingerprint-pixel-noise` | 針對 2D Canvas 與 `readPixels` 啟用選用的等冪像素雜訊 |
| `--profile-label=<text>` | 顯示於瀏覽器網址列的設定檔標籤（僅限 UI 顯示；網頁無法讀取） |

### Linux 字型設定

精簡版 Linux 伺服器與容器通常缺少表情符號與中日韓（CJK）字型，容易導致隱藏的 Canvas 文字與表情符號算繪結果產生異常雜湊值。

**1. 基礎字型層（表情符號與 CJK）：**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. 供 Windows 設定檔（`os="windows"`）使用的 Windows 字型：**
在 Linux 上執行 Windows 組態時，安裝來自 `C:\Windows\Fonts\` 的真實字型（包含 `Segoe UI`、`Calibri`、`Consolas`、`Courier New`、`Arial`、`Times New Roman`、`MS UI Gothic`）能大幅提升字型列舉的一致性：

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. 供 macOS 設定檔（`os="macos"`）使用的 macOS 字型：**
同樣地，在 Linux 上使用 `os="macos"` 時，請從 `/System/Library/Fonts/`、`/System/Library/Fonts/Supplemental/` 與 `/Library/Fonts/` 複製字型至 `~/.local/share/fonts/mac/`，並執行 `fc-cache -f`。

在 `Dockerfile` 中，請將字型放置於系統目錄 `/usr/local/share/fonts/`：

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## 啟動選項、設定與錯誤

### `launch()` 選項

選項名稱遵循 Python API 與 [SDK 契約](../../docs/sdk-contract.md)；Node.js 使用對應的 `camelCase` 名稱（`timeoutMs`、`userDataDir`、`binaryPath`、`licenseKey`），同時亦接受 `snake_case` 別名。未知選項將被拒絕並拋出 `InvalidOptionError`。

| 選項 | 預設值 | 說明 |
|---|---|---|
| `headless` | `true` | 以無視窗模式執行（`--headless=new`） |
| `proxy` | 無 | 代理 URL（`http`、`https`、`socks5`）或設定物件；需驗證的代理將使用本機迴路中繼 |
| `fingerprint` | 無 | 設定 `seed`、作業系統、時區、語系、螢幕、GPU、記憶體與雜訊 |
| `profile` | 無 | 位於 `~/.ombra/profiles/<slug>` 的具名持久化設定檔（與 `user_data_dir` 互斥） |
| `user_data_dir` | 暫存目錄 | 明確指定的設定檔目錄路徑（與 `profile` 互斥） |
| `args` | `[]` | 額外的 Chromium 啟動參數（原封不動傳遞） |
| `binary_path` | 自動解析 | 明確指定的引擎執行檔路徑 |
| `version` | 環境變數／自動 | 鎖定引擎版本（例如 `158.0.8127.37-2`），優先於 `OMBRA_VERSION` |
| `timeout_ms` | `30000` | 引擎啟動與 CDP 連線的逾時上限（1000–600000 毫秒） |
| `humanize` | 引擎預設 | `False`、`True` 或 `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | 環境變數／檔案 | 舊版授權建置專用金鑰（`158.0.8127.37-2+` 不需要；絕不記錄於日誌） |
| `env` | `{}` | 傳遞給引擎處理程序的額外環境變數 |
| `download` | `True` | 找不到引擎執行檔時是否允許自動下載 |

### 環境變數

優先順序：**明確傳入的啟動選項 → 環境變數 → 設定檔中繼資料 → 預設值**。

| 變數 | 預設值 | 說明 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 未設定 | 明確指定引擎執行檔路徑 |
| `OMBRA_CACHE_DIR` | `~/.ombra` | 引擎快取與具名設定檔的存放目錄 |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | 引擎下載的基底網址／鏡像站（設為 `none`/`off` 可停用下載） |
| `OMBRA_VERSION` | 最新相容版本 | 鎖定的引擎版本（例如 `158.0.8127.37-2`） |
| `OMBRA_RELEASE_CHANNEL` | `stable` | 引擎發布通道：`stable` 或 `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | 啟動時檢查是否有較新的引擎建置版本 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 僅限本機開發使用：停用 SHA-256 驗證（會記錄警告） |
| `OMBRA_LICENSE_KEY` | 未設定 | 舊版授權建置專用金鑰（絕不記錄於日誌） |
| `OMBRA_TIMEOUT_MS` | `30000` | 預設啟動逾時時間（毫秒） |
| `OMBRA_LOG_LEVEL` | `warn` | 日誌詳細程度：`error`、`warn`、`info`、`debug` |

### 型別化錯誤

發生任何失敗時，SDK 會終止已啟動的引擎處理程序、釋放設定檔鎖定，並拋出帶有穩定 `kind` 識別碼且已遮罩機密資訊之 `details` 的 `OmbraError` 子類別：

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

完整的錯誤分類與重試規則請見 [SDK 契約（`docs/sdk-contract.md`）](../../docs/sdk-contract.md)。

## 平台、整合與容器

### 支援的平台與執行階段

| 元件 | 支援狀態 | 備註 |
|---|---|---|
| **macOS ARM64（Apple Silicon）** | ✅ | 自主建置 `158.0.8127.37-2`；Ombra Desktop 經 Developer ID 簽章並公證 |
| **macOS x64（Intel）** | — | 暫無 Chromium 158 目前版本 |
| **Linux x64** | ✅ | 自主建置 `158.0.8127.37-2`；解壓縮 `.tar.xz` 需安裝 `xz-utils`（`xz`） |
| **Windows x64** | ✅ | 自主建置 `158.0.8127.37-2` 與 Ombra Desktop 安裝程式 |
| **Python** | `3.10+` | 安裝 `ombrabrowser` 時會自動安裝 Playwright `>=1.60,<2.0` |
| **Node.js** | `20+` | 支援 Playwright `>=1.60,<2.0` 或 Puppeteer `>=22`（Puppeteer 25+ 需要 Node.js `>=22.12`） |

### 框架與 AI 代理整合

Ombra 可搭配任何支援自訂 Chromium 執行檔或 CDP 連線的自動化工具或 AI 代理框架使用（`browser-use`、`Crawl4AI`、`Crawlee`、`Scrapling`、`Stagehand`、`LangChain` 等）：

```python
# 方式 1：解析已驗證的執行檔路徑與引擎參數，交由您自己的執行器啟動
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# 方式 2：透過 Ombra SDK 啟動，並將本機 CDP 端點交給您的框架
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# 將您的框架連線至 ws_url 或 cdp_http —— 指紋設定與 humanize
# 皆運行於引擎內部，對任何 CDP 用戶端同樣生效
```

### 在 Docker 與 Linux 伺服器上執行

以下為在建置映像檔時預先下載並驗證引擎的範例 `Dockerfile`：

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

> **容器與網頁伺服器注意事項：**
> - 若您的容器環境無法初始化 Chromium 沙箱，請透過 `args=["--no-sandbox"]` 明確傳入 `--no-sandbox`（SDK 絕不會自行加入此旗標）。
> - 若要在無顯示器的伺服器上以 `headless=False` 執行，請搭配 `Xvfb` 使用（見[下方說明](#疑難排解)）。
> - 在 `uvicorn` 搭配 `uvloop` 執行時，請傳入 `--loop asyncio` 以避免子處理程序管線卡住。

## 疑難排解

### 網站封鎖無頭模式

即便套用了 C++ 修補，部分反機器人系統仍會檢查無頭模式下的行為與算繪差異。建議改用 `Xvfb` 虛擬顯示器並設定 `headless=False` 執行：

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

接著搭配住宅 SOCKS5/HTTP 代理、持久化設定檔、對應的時區／語系、`headless=False` 與 `humanize=True` 啟動：

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

若在 Linux 上依然遭到封鎖，請檢查 [Linux 字型設定](#linux-字型設定)。

### 網站每次造訪都要求驗證

未指定 `profile` 而呼叫 `launch()` 時，每次都會從空的暫存目錄與全新 `seed` 啟動，導致網站將每次執行視為沒有任何 Cookie 的全新訪客。請改用 `profile="..."` 或 `launch_persistent_context(...)`，讓 Cookie、`localStorage` 與 `seed` 能在多次執行間延續。

### `ProfileBusyError`

同一個具名設定檔或 `user_data_dir` 在同一時間僅能由單一處理程序開啟。請為每個並行工作程序指派不同的設定檔名稱（`profile=f"worker-{i}"`）。因處理程序當機而殘留的過期鎖定檔會自動偵測並清除。

### 我需要執行 `playwright install chromium` 嗎？

不需要。Ombra 使用專屬引擎執行檔，並不會使用 Playwright 的標準版 Chromium。在 Linux 上，您只需要安裝系統函式庫與 `xz-utils`：

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### 更新、切換通道與回溯引擎版本

將 SDK 更新至最新版本：

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

測試 `beta` 通道，或鎖定／回溯至特定引擎建置版本：

```python
# 為特定啟動呼叫鎖定確切建置版本
browser = launch(version="158.0.8127.37-2")
```

```bash
# 或透過環境變數／CLI 進行設定
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# 或指向本機自行建置的執行檔
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS：Gatekeeper 封鎖本機建置版本

官方發布的 Apple Silicon macOS 版 Ombra 均具備 Apple Developer ID 憑證簽章並通過公證。若您執行的是本機未簽章的開發建置版並遭 macOS 隔離，只需清除一次隔離屬性即可：

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### 在同步 Python 中等待頁面

在同步模式 Playwright 中，於 `page.goto()` 後單獨呼叫長時間的 `time.sleep(15)` 會暫停 Playwright 的事件迴圈，可能導致驗證頁面停滯。建議改以短間隔搭配輕量的上下文呼叫進行等待：

```python
import time

for _ in range(15):
    page.context.cookies()  # 維持 Playwright 持續處理事件，且不觸碰頁面 DOM
    time.sleep(1)
```

在非同步 Python 中請使用 `await asyncio.sleep(...)`；在 Node.js 中請使用 `await new Promise(r => setTimeout(r, ms))`。同時，請避免在檢測前頻繁呼叫 `page.wait_for_timeout()` 與不必要的 `page.evaluate()`，以免產生額外的 CDP 流量。

## 安全性

- **引擎真實性與完整性。** 解壓縮之前，SDK 會使用內嵌的固定公鑰驗證發布封包的 Ed25519 簽章，並比對壓縮檔與執行檔的 SHA-256 摘要。
- **僅限本機的 CDP。** 偵錯連接埠嚴格繫結至 `127.0.0.1`。切勿在未加設額外驗證的情況下將 CDP 連接埠暴露於公開網路——CDP 擁有瀏覽器的完整控制權。
- **機密資訊隔離。** 代理憑證僅存於本機迴路中繼的記憶體中，絕不會出現在處理程序命令列、設定檔中繼資料、日誌或錯誤詳情中。
- **零遙測。** SDK 不會傳送任何分析資料、當機報告或隱藏的網路偵測封包。

若發現安全漏洞，請依照 [SECURITY.md](../../SECURITY.md) 私下回報。

## 儲存庫架構圖

```text
.
├── README.md                    # 英文版根目錄 README
├── translations/
│   ├── zh-Hant/README.md        # 本檔案（繁體中文）
│   ├── ru/README.md             # 俄文翻譯
│   └── <locale>/README.md       # 另外 19 種在地化版本
├── desktop/                     # Ombra Desktop（Tauri：Rust 目錄 + Vue 介面）
├── docs/
│   ├── architecture.md          # 架構、信任邊界、生命週期
│   ├── sdk-contract.md          # v0.1 啟動契約、選項、錯誤、不變量
│   ├── stealth-checkup.md       # 隱匿性檢查方法（英文）
│   ├── stealth-checkup.ru.md    # 隱匿性檢查方法（俄文）
│   ├── versioning.md            # SDK、引擎與用戶端版本控管
│   └── desktop/                 # Desktop 本機設定檔與金鑰指南
├── spec/
│   └── schemas/                 # 啟動選項與執行檔中繼資料的 JSON Schema
├── sdks/
│   ├── manifest.json            # 機器可讀的 SDK 登錄檔
│   ├── README.md                # SDK 目錄結構與貢獻規範
│   ├── python/                  # Python SDK（發布於 ombrabrowser）
│   ├── node/                    # Node.js / TypeScript SDK（發布於 @ombralabs/sdk）
│   └── ...                      # 其他語言的契約骨架（Go、Rust、C#、Java、PHP、Ruby）
├── conformance/                 # 跨語言啟動與隱匿性不變量測試案例
├── tools/check_repo.py          # 結構、Schema 與連結驗證工具（CI）
└── .github/workflows/ci.yml
```

本儲存庫託管 SDK 契約、Schema、一致性測試案例、文件與 Ombra Desktop 原始碼。Chromium 引擎修補程式維護於獨立儲存庫中，編譯完成的建置版本則透過下載通道與 [GitHub Releases](https://github.com/ombralabs/ombra/releases) 發布。

## 常見問題

### 這是 Playwright 的分支（fork）嗎？

不是。SDK 透過本機 CDP 將官方的 Playwright（或 Puppeteer）用戶端連線至 Ombra Chromium。所有型別、定位器、等待機制與頁面物件皆維持標準實作。

### Ombra 免費嗎？我需要授權金鑰嗎？

本儲存庫中的 SDK 原始碼以 Apache License 2.0 授權開源。目前的引擎建置版本（`158.0.8127.37-2` 及更新版本）與本機 Ombra Desktop 設定檔管理器（`desktop-v1.2.2`）皆可免費且自主運作——無需帳號、授權金鑰、硬體識別碼，也沒有設定檔數量上限。`license_key` 與 `OMBRA_LICENSE_KEY` 僅於舊版授權建置中才需要使用。

### 使用 SDK 需要先安裝 Ombra Desktop 嗎？

不需要。SDK 會直接將引擎作為子處理程序啟動，非常適合腳本、容器與 CI 環境。僅當您希望透過圖形介面管理本機設定檔目錄時，才需選用 Ombra Desktop。

### Ombra 與 `playwright-stealth` 有何不同？

`playwright-stealth` 是在一般瀏覽器之上向網頁注入 JavaScript，現代偵測系統經常能夠辨識出這些修補痕跡本身。Ombra 則將修改直接編譯進 Chromium 原始碼，且 SDK 不會向網頁注入任何腳本。

### 我可以使用自己的代理伺服器嗎？

可以。在 `proxy` 中傳入 `http://`、`https://` 或 `socks5://` 代理即可。若包含帳密憑證，SDK 會啟動本機迴路中繼，確保憑證絕不出現在處理程序參數中。請注意，Playwright 自身的 `context.request` / `page.request` 用戶端可能會繞過瀏覽器層級的代理設定——為確保流量確實經過代理，請於頁面上下文內呼叫 `fetch()`。

### 支援哪些 Playwright 與 Puppeteer 版本？

Python SDK 需要 Playwright `>=1.60,<2.0`（會隨 `ombrabrowser` 自動安裝）。Node.js SDK 支援 `playwright-core@^1.60.0` 或 `puppeteer-core >=22.0.0`。相容性規則請參閱[版本控管指南](../../docs/versioning.md)。

### Ombra 能否保證通過所有機器人偵測？

無法保證。偵測機制不斷演變，結果會受目標網站、地區、IP 信譽、設定檔歷史記錄與偵測器版本等因素影響。請使用[隱匿性檢查方法](../../docs/stealth-checkup.md)客觀衡量並追蹤特定組態的表現。

### Ombra 適用於哪些使用情境？

Ombra 專為經授權的自動化作業、QA 測試、監控、研究以及管理隔離工作設定檔而打造。不支援任何未經授權的存取、撞庫攻擊與濫用行為。

## 參與貢獻

貢獻指南請見 [CONTRIBUTING.md](../../CONTRIBUTING.md)，社群準則請見 [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md)，SDK 開發說明請見 [sdks/README.md](../../sdks/README.md)。

- 新增啟動選項前，請先更新 [SDK 契約](../../docs/sdk-contract.md)與 [Schema](../../spec/schemas)。
- 變更 SDK 行為時，請同步更新實作、測試以及 [conformance](../../conformance/README.md) 中的共用測試案例。
- 開啟 Pull Request 前，請執行 `python3 tools/check_repo.py` 驗證儲存庫結構與連結。

## 授權條款

本儲存庫中的 SDK 原始碼依據 [Apache License 2.0](../../LICENSE) 授權。本授權條款並未授予 Ombra 商標、Ombra Chromium 引擎或 Ombra Desktop 的相關權利——商標與第三方條款請參閱 [NOTICE](../../NOTICE)。

## 相關連結

- 🌐 **官方網站** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **發行版本（引擎與 Desktop）** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **變更日誌** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **錯誤回報與功能建議** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **組織** — [Ombra Labs](https://github.com/ombralabs)
