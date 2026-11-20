<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="许可证"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="最近提交"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="GitHub 星标"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI 下载量"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm 下载量"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="最新发行版"></a>
</p>

<p align="center">
<a href="#安装"><strong>安装</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-与-typescript-api">Node.js API</a> ·
<a href="#拟人化输入">拟人化输入</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>语言</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">具备 C++ 源码级指纹控制与原生拟人化输入能力的 Chromium。</h3>

<table><tr><td>
既不是启动参数的简单堆砌，也不是在页面之上注入 JavaScript。这是一个真正的 Chromium 二进制程序：指纹补丁直接编译进 C++ 源码，输入模拟运行在浏览器进程内部。通过本地 CDP 直接连接官方 Playwright 或 Puppeteer——无需封装对象，也无需重写页面代码。
</td></tr></table>

<br>

<p align="center">
面向 Python 与 Node.js 的 Playwright 和 Puppeteer 无缝启动替换方案。<br>
相同的 API、相同的选择器与类型——只需替换导入语句和 <code>launch()</code> 调用即可。
</p>

- **源码级 Chromium 补丁** —— 涵盖 Canvas、WebGL、WebGPU、音频、字体、GPU、屏幕、CSS 媒体查询、硬件信息上报、无 STUN 泄漏的 WebRTC、TLS ClientHello、时区、语言区域，以及自动化特征移除（`navigator.webdriver`、`Runtime.enable`、无头模式标记）。
- **浏览器进程内的原生拟人化输入（`humanize=True`）** —— 指针轨迹（`cursory-rs`）、带按住时长的瞄准点击、带误输入自动纠正的打字节奏以及滚动物理特性均在 Chromium 内部运行。SDK 返回标准的原生 `Browser` 对象，不加任何代理包装器。
- **无需密钥或账号的自主运行** —— 当前引擎构建版本（`158.0.8127.37-2` 及更新版本）与 Ombra Desktop 均可在本地独立运行，无需注册账号、许可证密钥、硬件 ID 或授权服务器。
- **自动安装与加密二进制校验** —— 执行 `pip install ombrabrowser` 或 `npm install @ombralabs/sdk`；首次启动时，SDK 会自动下载适配当前平台的构建版本，并校验其 Ed25519 签名与 SHA-256 校验和。
- **持久化配置文件与安全代理中继** —— 命名配置文件可在多次运行间保留 Cookie、`localStorage`、IndexedDB 及 `seed`，并提供跨进程锁保护；带认证的代理（HTTP、HTTPS、SOCKS5）通过本地环回中继转发，确保凭据绝不出现在进程启动参数中。
- **离线桌面管理器 Ombra Desktop** —— 位于本仓库中的原生桌面应用程序（[`desktop/`](../../desktop/README.md)），提供 macOS、Linux 与 Windows 的预构建安装包。

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

同时支持 Puppeteer，可通过 `import { launch } from "@ombralabs/sdk/puppeteer"` 或 `launchPuppeteer()` 使用（[详见下文](#puppeteer)）。

**针对带有反机器人保护的站点**，建议将住宅代理、持久化配置文件和一致的环境配置结合使用：

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # 优先使用住宅 IP，而非数据中心 IP
    fingerprint={"timezone": "auto", "locale": "auto"},  # 使时区与语言区域自动匹配代理出口
    headless=False,                                      # 部分站点会检测无头模式差异
    humanize=True,                                       # 原生鼠标、键盘与滚动模拟
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

关于 Linux、容器环境以及受保护目标站点上的常见问题，请参阅[故障排除](#故障排除)。

## 安装

**Python（3.10+）：**

```bash
python -m pip install ombrabrowser

# 可选：根据代理出口自动识别时区和语言区域（timezone="auto"、locale="auto"）
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript（20+）：**

```bash
# 搭配 Playwright 使用（1.60.0+，无需下载官方原版 Chromium）
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# 或搭配 Puppeteer 使用
npm install @ombralabs/sdk puppeteer-core

# 可选：用于 timezone: "auto" 与 locale: "auto" 的离线 GeoIP 数据库读取库
npm install mmdb-lib
```

---

启动时，SDK 会按严格顺序解析引擎路径：`binary_path`（Node.js 中为 `binaryPath`）、`OMBRA_BINARY_PATH`、Ombra Desktop 引擎目录以及 SDK 缓存目录（`~/.ombra/engines`）。如果未找到兼容引擎，SDK 会从经过签名的发行通道自动下载构建版本，校验其 Ed25519 签名与 SHA-256 校验和，并缓存在本地。无需运行 `playwright install chromium`。

如需禁用自动下载，请传入 `download=False`（Node.js 中为 `download: false`）。如需提前下载并校验引擎（例如在构建容器镜像阶段），可调用 `ensure_binary()`（`ensureBinary()`）或使用 CLI 的 `install` 命令。

> **自主启动：** 当前引擎构建版本（`158.0.8127.37-2` 及更新版本）完全免费，无需账号或许可证密钥。`OMBRA_LICENSE_KEY` 与 `login` 命令仅保留用于兼容旧版需要授权的构建。

**从 Playwright 迁移**只需改动两行——所有页面操作、定位器（locator）和等待逻辑均保持不变：

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # 其余代码无需修改，照常运行
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ 如果本项目对你有帮助，欢迎为仓库点亮 **Star**，并 **[关注版本发布](https://github.com/ombralabs/ombra/subscription)** 以第一时间获知引擎、SDK 与 Ombra Desktop 的最新构建动态。

---

## 当前状态与发行版本

生态中的每个组件均遵循统一的启动契约，并独立进行版本管理。

| 组件 | 状态 / 版本 | 位置 |
|---|---|---|
| **SDK 契约** | 草案 `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.1.3` | [PyPI 上的 `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.1.0` | [npm 上的 `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium 引擎** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **独立浏览器版本** | `v158.0.8127.37-1` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-1) |
| **Schema 与一致性测试** | JSON Schema + 共享测试用例 | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **隐匿性检查方法** | 6 层体系（`L0`–`L5`） | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

当前发行版本包含以下核心能力：

- **源码级补丁** —— 基于 `seed` 的一致性指纹派生、WebGL / WebGPU 与扩展对齐、按操作系统划分的真实字体表、原生 TLS ClientHello 配置（`chrome-<major>`）、`Runtime.enable` 与 `UtilityScript` 调用栈泄漏抑制，以及 WebRTC 宿主机 IP 泄漏防护。
- **浏览器级 `Ombra` CDP 域** —— 支持在 Python 与 Node.js 中实时控制拟人化输入（`getHumanizeState`、`setHumanize`），无需重启浏览器。
- **浏览器进程内原生输入模拟** —— 内置 `cursory-rs` 指针轨迹规划器、滚轮与触控板滚动曲线、带误输入自动纠正的打字节奏，以及通过隔离剪贴板安全粘贴长文本的能力。
- **无密钥自主构建** —— 当前引擎构建（`158.0.8127.37-2`）与 Ombra Desktop `1.2.2` 完全在本地运行，无需账号、密钥或遥测上报。
- **引擎版本锁定（`version`）** —— 可通过 `launch(version="158.0.8127.37-2")`、`OMBRA_VERSION` 或 CLI `install --version` 锁定精确的构建版本。
- **统一代理中继** —— 支持 HTTP、HTTPS 和 SOCKS5 认证代理，且不会在 Chromium 命令行、日志或配置文件元数据中暴露凭据。
- **持久化命名配置文件** —— 将 `seed`、Cookie、`localStorage` 和 IndexedDB 存储在 `~/.ombra/profiles/<slug>` 目录下，并配合跨进程锁（`ProfileBusyError`）。
- **加密供应链校验** —— 解压前先对发行信封进行 Ed25519 签名验证，并对归档文件执行 SHA-256 校验。

完整的版本变更记录请参阅 [CHANGELOG.md](../../CHANGELOG.md)。

## 为什么选择 Ombra

- **配置层和 JS 注入补丁非常脆弱。** 诸如 `playwright-stealth`、`puppeteer-extra` 和 `undetected-chromedriver` 等工具通常在页面内注入 JavaScript 或微调启动参数。Chrome 版本更新经常导致它们失效，而现代检测器会直接识别补丁本身（如 `Function.prototype.toString`、原型链异常、`addScriptToEvaluateOnNewDocument`）。
- **所有修改均编译进 Chromium 源代码。** 指纹在 C++ 层生成，并在主框架（main frame）、Worker 和 iframe 之间保持完全一致。SDK 不会向页面注入任何脚本，也不会调用 `Emulation.*` 覆写接口。
- **输入模拟位于浏览器进程内部，而非架设在 Playwright 之上。** 由于鼠标轨迹、按键和滚动均由 Chromium 自身处理，SDK 无需包装 Playwright 或 Puppeteer 对象——所有定位器、frame 和第三方库都能保持原生兼容。
- **无额外服务的纯本地架构。** 脚本与浏览器之间没有后台控制面守护进程，也没有多余网络跳转：单一引擎进程、基于 `127.0.0.1` 的本地环回 CDP，且对配置文件数量和并发数没有任何限制。

## Ombra Desktop

**一款带图形界面的本地离线配置文件管理器。** 源码直接托管在本仓库中（[`desktop/`](../../desktop/README.md)），基于 Tauri（Rust + Vue）构建。

- **完全离线、纯本地存储** —— 配置文件目录保存在本机 SQLite 数据库中，并使用本地加密密钥保护；无需账号、云服务或网络连接。
- **结构化配置文件管理** —— 在 Rust 目录层支持创建配置文件，按名称、备注或编号搜索，编辑描述，并通过分组、标签、标记和书签进行整理。
- **安全回收站** —— 将配置文件移入回收站后，其磁盘文件仍会保留，方便随时恢复。
- **无配置文件数量限制** —— 没有按配置文件计费的套餐或云端配额，所有数据完全归你所有。
- **预构建安装包** —— 提供 macOS Apple Silicon（`.dmg`，经 Apple Developer ID 签名与公证）、Linux（`.deb` 与 `.rpm`）以及 Windows x64（`setup.exe`）安装包。
- **隔离的目录环境** —— 设置 `OMBRA_DESKTOP_DATA_DIR` 即可切换到独立的测试目录或备份副本。

[下载 `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [配置文件与本地密钥指南](../../docs/desktop/README.md)

## 指纹验证与隐匿性检查

Ombra 不做空泛的“100% 不可检测”承诺，而是坚持在有完整记录的条件下执行可复现的验证流程。任何站点上的实际表现始终取决于出口 IP 信誉、所在地区、配置文件历史、检测器版本以及具体的启动配置。

### 引擎与 SDK 覆盖的检测面

| 检测面 / 信号 | 原版 Playwright | Ombra | 实现方式 |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ 引擎补丁 |
| `window.chrome` | 无头模式下缺失 | 完整对象 | 与常规 Chrome 一致 |
| `navigator.plugins` | 无头模式下为 `0` | 一致的插件集合 | 引擎级实现 |
| User-Agent 与 Client Hints | `HeadlessChrome`、品牌不匹配 | `Google Chrome` + 对齐的 `Sec-CH-UA*` | 补丁 `010-user-agent-and-webdriver` |
| CDP 痕迹（`Runtime.enable`、`UtilityScript`） | 会被检测器标记 | 由引擎抑制；SDK 永不调用 `Runtime.enable` | 补丁 `110-runtime-enable` + 不变量 `SI-02` |
| WebRTC IP 泄漏 | 暴露本地/宿主机 IP | 上报出口 IP，且不发送真实 STUN 请求 | 补丁 `100-webrtc-leak`（`--webrtc-ip`） |
| TLS 与 HTTP/2 | 取决于运行环境 | Chromium 网络栈 + `chrome-<major>` ClientHello 配置 | 补丁 `210-tls-network-persona` |
| WebGL 与 WebGPU | 软件渲染器 / GPU 不匹配 | 统一的 WebGL/WebGPU 能力上限与扩展表 | 补丁 `070`、`071`、`075`、`955` |
| 字体、语言区域与时区 | 宿主机默认值、`Intl` 漂移 | 一致的字体表、ICU 语言区域与时区 | 补丁 `040`、`090`、`092`、`230` |
| 输入模拟 | 光标瞬移、瞬时 `fill()` | `cursory-rs` 曲线、打字节奏、滚动物理特性 | 浏览器进程内的补丁 `135-ombra-humanize` |
| 指纹稳定性 | 每次变动或泄漏宿主机信息 | 同一 `seed` 在多次重启与跨框架下保持确定性一致 | 补丁 `001`、`002` + 持久化配置文件 |

### 六层检查体系

在发布或部署一套配置前，请针对实际使用的引擎构建版本、自动化客户端和代理，完整执行以下六层检查：

| 层级 | 示例检测目标 | 通过标准 |
|---|---|---|
| **L0 传输层** | TrackMe、IP/WebRTC 泄漏检测页、请求头回显 | 仅可见代理出口 IP；JA4 与 HTTP/2 匹配对应 Chromium 构建；argv 中无代理凭据 |
| **L1 身份层** | 本地探针、Sannysoft、Intoli、UA-CH 检查 | UA、Client Hints、平台、GPU、字体、屏幕和语言区域之间无矛盾 |
| **L2 指纹层** | CreepJS、FingerprintJS、BrowserScan、Pixelscan | 无无头模式或 `lie` 伪造标记；页面刷新后指纹保持稳定 |
| **L3 自动化层** | rebrowser、brotector、botd、CDP 命令审计 | 无 `Runtime.enable`、初始化脚本、binding 或 `navigator.webdriver` 泄漏 |
| **L4 行为层** | 输入保真度探针、humanize 轨迹记录、真实挑战冒烟测试 | 事件具备 `isTrusted: true`、顺序与时序自然、指针曲线与滚动真实 |
| **L5 稳定性层** | 重复启动、Worker、同源/跨源 iframe、跨 SDK 一致性 | 相同 `seed` 在所有上下文中复现完全一致的指纹 |

完整流程、判定状态（`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`）、信号清单与报告模板请参阅：[英文版（`docs/stealth-checkup.md`）](../../docs/stealth-checkup.md) 和 [俄文版（`docs/stealth-checkup.ru.md`）](../../docs/stealth-checkup.ru.md)。

## 方案对比

| 特性 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| 自动化 API | Playwright | Playwright | Selenium | **Playwright 与 Puppeteer** |
| 补丁层级 | 无 | 页面内 JS 注入 | 启动配置参数 | **C++ 源码（Chromium）** |
| 一致性指纹 `seed` | 否 | 否 | 部分支持 | **支持，按配置文件与 eTLD+1 绑定** |
| 输入模拟（`humanize`） | 否 | 否 | 否 | **内置于浏览器进程** |
| `Runtime.enable` / CDP 泄漏抑制 | 否 | 否 | 部分支持 | **引擎补丁 + SDK 不变量** |
| 无命令行泄漏的认证代理 | 否 | 否 | 有限支持 | **本地环回中继** |
| 配置文件隔离 | 浏览器上下文 | 浏览器上下文 | 否 | **配置文件目录 + 文件锁** |
| 离线配置文件管理器（GUI） | 否 | 否 | 否 | **Ombra Desktop（macOS、Linux、Windows）** |
| 从 Playwright 迁移成本 | — | 替换导入 | 重写代码 | **替换导入与 `launch()` 调用** |

## 工作原理

```mermaid
flowchart LR
    Script["你的脚本<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP 桥接"]
    Relay["本地代理中继<br/>需要认证时启用"]
    Engine["Ombra Chromium<br/>C++ 源码补丁引擎"]
    Client["原生客户端<br/>Playwright · Puppeteer"]
    Profile[("配置文件<br/>seed · cookies · 存储")]

    Script -->|"launch()"| SDK
    SDK -->|"校验并启动"| Engine
    SDK -.->|"代理认证"| Relay
    Relay -.-> Engine
    SDK -->|"通过 CDP 连接"| Client
    Script -->|"页面 API"| Client
    Client -->|"环回 CDP"| Engine
    Engine --> Profile
```

1. **`launch()` 定位或下载引擎**，并校验其 Ed25519 签名与 SHA-256 校验和。
2. **准备配置文件与 `seed`。** 命名配置文件会先获取跨进程锁；若代理需要凭据，SDK 会启动一个纯内存的本地环回中继。
3. **启动 Ombra Chromium**，加载选定的配置文件、指纹选项以及本地调试端口（`--remote-debugging-port=0`）。
4. **连接官方客户端。** 一旦 `DevToolsActivePort` 就绪，SDK 便通过 `127.0.0.1` 附着 Playwright（开启 `no_defaults=True`）或 Puppeteer，并返回原生 `Browser` 对象。
5. **优雅关闭。** 调用 `browser.close()` 会发送 `Browser.close`、终止引擎进程树、关闭代理中继并释放配置文件锁。

启动完成后，SDK 会退出数据路径：所有页面指令都直接从 Playwright 或 Puppeteer 发送至 Chromium。

### SDK 边界与隐匿性不变量

[v0.1 SDK 契约（`docs/sdk-contract.md`）](../../docs/sdk-contract.md) 对所有官方 SDK 强制施加以下严格不变量：

- **不向页面注入隐匿脚本。** SDK 永不调用 `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument`，也不修改 DOM 属性。
- **不调用 `Runtime.enable`。** 就绪检查仅使用本地 CDP HTTP 端点或 `Browser.getVersion`；SDK 永不启用 `Runtime`、`Debugger` 或 `Log` 域。
- **不使用 `Emulation.*` 覆写。** SDK 永不调用 `Emulation.setUserAgentOverride`、`setTimezoneOverride`、`setLocaleOverride` 或 `setDeviceMetricsOverride`——浏览器身份完全由引擎提供。
- **默认不注入禁用标志。** SDK 不会自行添加 `--enable-automation`、`--disable-blink-features=AutomationControlled`、`--no-sandbox` 或 `--user-agent`。
- **仅限环回 CDP。** 调试端口始终绑定在 `127.0.0.1`；传入非环回的 `--remote-debugging-address` 将被拒绝。
- **零遥测、零密钥泄漏。** 代理凭据、密钥和 Cookie 在日志和错误信息中一律脱敏处理。

## Python API

### `launch()`

```python
from ombrabrowser import launch

# 基础启动（默认为无头模式）
browser = launch()

# 有头浏览器窗口
browser = launch(headless=False)

# HTTP 或 SOCKS5 代理（凭据通过本地环回中继处理）
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# 带绕过列表（bypass）的代理对象
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

# 指纹控制（seed、操作系统、按代理自动匹配时区/语言区域、屏幕、GPU）
# 使用 timezone="auto" / locale="auto" 需先安装：pip install "ombrabrowser[geoip]"
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

# 原生鼠标、键盘与滚动模拟
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# 锁定特定引擎构建版本并传递额外的 Chromium 启动参数
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

返回标准的 `playwright.sync_api.Browser`。所有 Playwright 方法均可正常调用（`new_page()`、`new_context()`、`close()` 等）。新建页面默认启用 `no_viewport=True`，以免覆盖配置文件的窗口尺寸。

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

### `launch_context()` 与 `launch_context_async()`

便捷辅助函数，一步启动浏览器并直接返回 `BrowserContext`（关闭该上下文时也会终止引擎进程）。额外的关键字参数会透传给 `browser.new_context()`，例如 `storage_state`、`permissions` 或 `extra_http_headers`：

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

异步对应版本：`await launch_context_async(...)`。

### `launch_persistent_context()` 与 `launch_persistent_context_async()`

使用持久化配置文件启动浏览器，并返回其默认 `BrowserContext`。Cookie、`localStorage`、IndexedDB、缓存和指纹 `seed` 均会在跨会话之间持久化保留。

- 传入 `profile="pricing-eu"` 会在 `~/.ombra/profiles/pricing-eu` 下创建配置文件，并将元数据写入 `.ombra/profile.json`，同时创建锁文件。
- 传入 `user_data_dir="./my-profile"`（或位置路径参数）将直接使用该指定目录。
- 若另一个进程尝试并发启动同一配置文件，会抛出 `ProfileBusyError`，防止损坏配置文件数据。

```python
from ombrabrowser import launch_persistent_context

# 按命名配置文件启动（存储在 ~/.ombra/profiles/ 下）
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # Cookie、存储与 seed 将被持久化保存

# 按显式目录路径启动（例如用于加载 Chrome 扩展程序）
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

异步对应版本：`await launch_persistent_context_async(...)`。

### 工具函数与诊断（Python）

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

# 查看已解析的引擎二进制信息
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# 仅下载并校验引擎，不启动浏览器
ensure_binary(version="158.0.8127.37-2")

# 清理 SDK 管理的引擎缓存（不会影响 ~/.ombra/profiles 下的配置文件）
clear_cache()

# 仅查看解析后的启动命令，不拉起 Chromium 进程
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# 读取运行时元数据（CDP 端口、ws_url、seed、pid）并检查进程健康状态
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI（Python）

```bash
ombrabrowser install                             # 下载并校验引擎（Ed25519 + SHA-256）
ombrabrowser install --version 158.0.8127.37-2  # 安装指定的引擎构建版本
ombrabrowser info                                # 环境、二进制文件与依赖诊断（别名：doctor）
ombrabrowser info --quick --json                 # 快速输出机器可读报告，不启动引擎进程
ombrabrowser info --proxy socks5://user:pass@host:1080  # 测试通过代理获取出口 IP、时区与语言区域
ombrabrowser update                              # 检查发行通道并更新已缓存的引擎
ombrabrowser clear-cache                         # 清理已缓存的引擎二进制文件（保留配置文件）
ombrabrowser login                               # 将许可证密钥保存到 ~/.ombra/license.key（仅限旧版构建）
ombrabrowser logout                              # 移除已保存的许可证密钥
```

上述命令同样可以通过 `python -m ombrabrowser <command>` 运行。

## Node.js 与 TypeScript API

`@ombralabs/sdk` 同时提供 ESM 与 CommonJS 双模块构建以及完整的 TypeScript 类型定义（`.d.ts`）。底层均由同一套引擎驱动 Playwright 和 Puppeteer。

### Playwright（默认）

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// 结合代理、指纹与输入模拟的基础启动
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

// 便捷启动：一次调用完成浏览器与上下文创建
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// 持久化配置文件 —— Cookie、localStorage 与 seed 跨会话保留
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> 上述每个代码片段均可独立运行。若需迁移现有的 Playwright 启动代码，也可以直接将导入替换为 `import * as chromium from "@ombralabs/sdk"`，同时保留原有的 `await chromium.launch(...)` 调用。

### Puppeteer

可从 `@ombralabs/sdk` 调用 `launchPuppeteer()`，或直接从 `@ombralabs/sdk/puppeteer` 导入：

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

> **关于 Puppeteer 的说明：** 相比启用 `connectOverCDP({ noDefaults: true })` 的 Playwright，Puppeteer 默认发送的 CDP 流量更多。针对 CDP 检测严格的站点，建议使用 Playwright。

### 工具函数与 CLI（Node.js）

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

## 拟人化输入

在 Ombra 中，输入模拟（`humanize`）是**原生编译进 Chromium 浏览器进程内部**的（由 `cursory-rs` 与引擎的输入调度器驱动），而不是架设在自动化客户端外层的 JS 包装器。这意味着：

- 所有标准的 Playwright 与 Puppeteer 操作（`page.click()`、`page.fill()`、`page.type()`、`page.mouse.*`、`page.keyboard.*`、`locator.*`、`ElementHandle.*`）都会经过浏览器内部按标签页划分的统一输入队列。
- 行为参数会根据配置文件的 `seed`（`--fingerprint-humanize-seed`）确定性地派生。
- SDK 从不将 `Page` 或 `Browser` 封装在代理类中——原生类型与客户端行为完全保持不变。

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**启用 `humanize=True` 后的变化：**

| 操作 | 未启用 `humanize` | 启用 `humanize=True` |
|---|---|---|
| 鼠标移动 | 瞬间跳转 | 带有加速度、停顿和轻微过冲的 `cursory-rs` 曲线 |
| 点击与拖拽 | 瞬时按下 | 目标区域内自然落点、点击前停顿及按住持续时间 |
| 文本输入 | 瞬时设值 | 按配置的节奏与键盘布局逐字符输入，偶发误触并自动纠正；超长文本通过隔离剪贴板粘贴，不触碰系统剪贴板 |
| 页面滚动 | 单次跳跃 | 遵循实测减速曲线的滚轮/触控板事件序列 |
| 空闲间隔 | 光标静止 | 在 `careful` 预设下，操作间隙伴随细微的自然光标漂移 |

**预设模式** —— `default`（正常节奏）、`careful`（更慢、更审慎，带空闲微动）和 `fast`（较快节奏）。传入 `humanize=False`（`humanize: false`）可显式关闭输入模拟。

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

你可以借助 `Ombra` CDP 域在运行时随时开关模式或切换预设，无需重启浏览器：

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

## 指纹与配置文件管理

引擎会根据单个 `seed` 派生出一整套内在一致的浏览器配置。当省略 `seed` 时，行为如下：

| 场景 | 行为 |
|---|---|
| **不指定配置文件的 `launch()`** | SDK 为本次会话生成随机 `seed` 并创建临时目录，在 `close()` 后自动删除。 |
| **`profile="name"` 或 `user_data_dir="./dir"`** | `seed` 会保存在 `.ombra/profile.json` 中并在每次启动时复用——站点将识别为携带相同设备与 Cookie 的回访用户。 |
| **`fingerprint={"seed": N, ...}`** | 根据显式传入的 `seed` 生成确定性指纹；其余字段用于覆写单项参数，同时保持其他属性一致。 |

Canvas/音频噪声按 `eTLD+1` 隔离加盐（同一站点内稳定一致，跨站点无法关联）。为避免触发“Canvas Tampering / Masking”检测器，2D Canvas 与 WebGL `readPixels` 的像素级噪声默认关闭，如需开启可通过 `--fingerprint-pixel-noise` 显式启用。

> **提示：** 重复访问同一站点时，请使用持久化配置文件（`profile="name"` 或 `launch_persistent_context()`），而不是在临时 `launch()` 中传入固定 `seed`——这样 Cookie、缓存和 `localStorage` 才能与指纹保持同步一致。

### `fingerprint` 对象字段

下表字段名遵循 Python（`snake_case`）规范；Node.js 同时接受 `camelCase`（`osVersion`、`hardwareConcurrency`、`deviceMemory`）与 `snake_case`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `seed` | `int`（`>= 0`） | 决定整体指纹配置的生成器种子 |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | 目标操作系统（决定 `navigator.platform`、UA、GPU 与字体池） |
| `os_version` | `string` | 用于 Client Hints 的操作系统版本提示 |
| `timezone` | IANA 时区或 `"auto"` | 时区（如 `"Europe/Berlin"`）。`"auto"` 通过 GeoIP 根据代理出口自动解析时区 |
| `locale` | BCP-47 或 `"auto"` | 语言区域（`Accept-Language`、`navigator.languages`、ICU `Intl`）。`"auto"` 根据代理出口自动解析 |
| `screen` | `{"width", "height"}` 或 `"auto"` | 结合目标操作系统任务栏/菜单栏计算的屏幕与工作区尺寸 |
| `gpu` | `{"vendor", "renderer"}` 或 `"auto"` | 显式指定 WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` 字符串 |
| `hardware_concurrency` | `int` 或 `"auto"` | 上报的 `navigator.hardwareConcurrency` 核数 |
| `device_memory` | `int` 或 `"auto"` | 上报的 `navigator.deviceMemory` 内存容量（单位 GB） |
| `noise` | `bool` | 开启/关闭指纹噪声（设为 `False` 时传入 `--disable-fingerprint-noise`） |

> 请以 `seed` 作为指纹参数的主要来源：若在未保持整体协调的情况下随意覆写单项参数（例如给某操作系统搭配不兼容的 GPU），可能会产生矛盾信号并被检测器捕获。

### 额外引擎参数（`args`）

以下为引擎支持、但 SDK 不会自动设置的标志（可通过 `args=[...]` 传入）：

| 参数 | 用途 |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | 设置 `Sec-CH-UA` 中的浏览器品牌（SDK 默认为 `chrome`） |
| `--fingerprint-tls-profile=chrome-<major>` | 匹配指定 Chrome 主版本的 TLS ClientHello 配置（SDK 会根据引擎版本自动设置） |
| `--webrtc-ip=<ip>` | 替换 WebRTC ICE 候选中的 IP 地址，且不发送真实 STUN 流量 |
| `--fingerprint-location=<lat,lon>` | 设置 `navigator.geolocation` 上报的地理坐标 |
| `--fingerprint-storage-quota=<MB>` | 设置 `navigator.storage.estimate()` 上报的存储配额 |
| `--fingerprint-max-touch-points=<N>` | 设置触控点数量（`navigator.maxTouchPoints` 与指针媒体查询） |
| `--fingerprint-device-pixel-ratio=<ratio>` | 设置显示像素密度（`window.devicePixelRatio`） |
| `--fingerprint-color-depth=<bits>` | 设置屏幕色深 |
| `--disable-gpu-fingerprint` | 透传宿主机真实 GPU（WebGL/WebGPU 字符串、能力上限与扩展） |
| `--disable-gpu-string-spoof` | 透传真实 GPU 字符串，同时保留其他配置项 |
| `--disable-fingerprint-noise` | 关闭 Canvas/WebGL/音频噪声，同时保持身份参数生效 |
| `--fingerprint-pixel-noise` | 显式启用面向 2D Canvas 与 `readPixels` 的幂等像素噪声 |
| `--profile-label=<text>` | 在浏览器地址栏显示的配置文件标签（仅限 UI，网页不可见） |

### Linux 字体配置

精简版 Linux 服务器和容器通常缺少 Emoji 与中日韩（CJK）字体，这会导致隐藏的 Canvas 文本和 Emoji 渲染产生异常哈希。

**1. 基础字体层（Emoji 与 CJK）：**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. 用于 Windows 配置文件的 Windows 字体（`os="windows"`）：**
在 Linux 上运行 Windows 配置时，安装来自 `C:\Windows\Fonts\` 的真实字体（包括 `Segoe UI`、`Calibri`、`Consolas`、`Courier New`、`Arial`、`Times New Roman`、`MS UI Gothic`）可显著提升字体枚举一致性：

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. 用于 macOS 配置文件的 macOS 字体（`os="macos"`）：**
同理，在 Linux 上使用 `os="macos"` 时，请将 `/System/Library/Fonts/`、`/System/Library/Fonts/Supplemental/` 和 `/Library/Fonts/` 中的字体复制到 `~/.local/share/fonts/mac/` 并运行 `fc-cache -f`。

在 `Dockerfile` 中，请将字体放入系统目录 `/usr/local/share/fonts/`：

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## 启动选项、配置与错误类型

### `launch()` 选项

以下选项名遵循 Python API 与 [SDK 契约](../../docs/sdk-contract.md)；Node.js 使用对应的 `camelCase` 命名（`timeoutMs`、`userDataDir`、`binaryPath`、`licenseKey`），同时也兼容 `snake_case` 别名。传入未知选项将触发 `InvalidOptionError`。

| 选项 | 默认值 | 说明 |
|---|---|---|
| `headless` | `true` | 无窗口运行（`--headless=new`） |
| `proxy` | 无 | 代理 URL（`http`、`https`、`socks5`）或代理对象；带认证代理通过环回中继转发 |
| `fingerprint` | 无 | 控制 `seed`、操作系统、时区、语言区域、屏幕、GPU、内存与噪声 |
| `profile` | 无 | 位于 `~/.ombra/profiles/<slug>` 的命名持久化配置文件（与 `user_data_dir` 互斥） |
| `user_data_dir` | 临时目录 | 显式指定的配置文件目录路径（与 `profile` 互斥） |
| `args` | `[]` | 额外的 Chromium 启动参数（原样透传） |
| `binary_path` | 自动解析 | 显式指定引擎可执行文件路径 |
| `version` | 环境变量 / 自动 | 锁定引擎版本（例如 `158.0.8127.37-2`），优先级高于 `OMBRA_VERSION` |
| `timeout_ms` | `30000` | 引擎启动与 CDP 连接超时时间（1000–600000 ms） |
| `humanize` | 引擎默认 | `False`、`True` 或 `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | 环境变量 / 文件 | 旧版授权构建所需的密钥（`158.0.8127.37-2+` 无需使用；永不写入日志） |
| `env` | `{}` | 传递给引擎进程的额外环境变量 |
| `download` | `True` | 允许在缺失引擎二进制文件时自动下载 |

### 环境变量

优先级顺序：**显式启动选项 → 环境变量 → 配置文件元数据 → 默认值**。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 未设置 | 显式指定引擎二进制文件路径 |
| `OMBRA_CACHE_DIR` | `~/.ombra` | 缓存引擎与命名配置文件的根目录 |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | 引擎下载的基础 URL / 镜像地址（设为 `none`/`off` 可禁用下载） |
| `OMBRA_VERSION` | 最新兼容版本 | 锁定的引擎版本（例如 `158.0.8127.37-2`） |
| `OMBRA_RELEASE_CHANNEL` | `stable` | 引擎发布通道：`stable` 或 `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | 启动时检查是否存在更新的引擎构建 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 仅限本地开发：禁用 SHA-256 校验（会输出警告日志） |
| `OMBRA_LICENSE_KEY` | 未设置 | 旧版授权构建所需的密钥（永不写入日志） |
| `OMBRA_TIMEOUT_MS` | `30000` | 默认启动超时时间（ms） |
| `OMBRA_LOG_LEVEL` | `warn` | 日志级别：`error`、`warn`、`info`、`debug` |

### 类型化错误

一旦发生任何异常，SDK 都会终止已拉起的引擎进程、释放配置文件锁，并抛出带有稳定 `kind` 标识及脱敏 `details` 的 `OmbraError` 子类：

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

完整的错误分类与重试策略详见 [SDK 契约（`docs/sdk-contract.md`）](../../docs/sdk-contract.md)。

## 平台支持、框架集成与容器部署

### 支持的平台与运行时

| 组件 | 支持状态 | 说明 |
|---|---|---|
| **macOS ARM64（Apple Silicon）** | ✅ | 自主构建 `158.0.8127.37-2`；Ombra Desktop 已获 Apple Developer ID 签名与公证 |
| **macOS x64（Intel）** | — | 暂无 Chromium 158 当前版本 |
| **Linux x64** | ✅ | 自主构建 `158.0.8127.37-2`；解压 `.tar.xz` 需安装 `xz-utils`（`xz`） |
| **Windows x64** | ✅ | 提供自主构建 `158.0.8127.37-2` 与 Ombra Desktop 安装包 |
| **Python** | `3.10+` | 安装 `ombrabrowser` 时会自动安装 Playwright `>=1.60,<2.0` |
| **Node.js** | `20+` | 支持 Playwright `>=1.60,<2.0` 或 Puppeteer `>=22`（Puppeteer 25+ 需要 Node.js `>=22.12`） |

### 框架与 AI 智能体集成

Ombra 可与任何支持自定义 Chromium 路径或 CDP 连接的自动化工具及 AI 智能体框架配合使用（如 `browser-use`、`Crawl4AI`、`Crawlee`、`Scrapling`、`Stagehand`、`LangChain` 等）：

```python
# 方式 1：解析经校验的二进制路径与引擎参数，交给自定义运行器启动
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# 方式 2：通过 Ombra SDK 启动，并将本地 CDP 端点交给外部框架连接
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# 将框架连接到 ws_url 或 cdp_http —— 指纹设置与 humanize 均在引擎内部运行，
# 对任意 CDP 客户端均保持生效
```

### 在 Docker 与 Linux 服务器上运行

以下 `Dockerfile` 示例会在镜像构建阶段预下载并校验引擎：

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

> **容器与 Web 服务器注意事项：**
> - 如果容器无法初始化 Chromium 沙箱，请通过 `args=["--no-sandbox"]` 显式传入 `--no-sandbox`（SDK 绝不会自行添加该参数）。
> - 如需在无显示器的服务器上运行 `headless=False`，请搭配 `Xvfb` 使用（见[下文](#故障排除)）。
> - 在 `uvicorn` 搭配 `uvloop` 运行时，请传入 `--loop asyncio` 以避免子进程管道挂起。

## 故障排除

### 站点拦截无头模式

部分反机器人系统即使面对 C++ 补丁，仍会检查无头模式下的行为和渲染差异。此时可借助 `Xvfb` 虚拟显示器以 `headless=False` 运行：

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

随后结合住宅 SOCKS5/HTTP 代理、持久化配置文件、自动匹配的时区/语言区域、`headless=False` 与 `humanize=True` 启动：

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

若 Linux 上依然被拦截，请检查 [Linux 字体配置](#linux-字体配置)。

### 每次访问都会触发站点验证

不带 `profile` 调用 `launch()` 时，每次启动都会使用全新的空临时目录和新的 `seed`，站点会将其视为没有任何 Cookie 的新访客。请改用 `profile="..."` 或 `launch_persistent_context(...)`，让 Cookie、`localStorage` 和 `seed` 在多次运行之间得以延续。

### `ProfileBusyError`

同一个命名配置文件或 `user_data_dir` 在同一时刻只能被一个进程打开。请为每个并发工作进程分配不同的配置文件名（例如 `profile=f"worker-{i}"`）。异常崩溃进程遗留的过期锁会被自动检测并清理。

### 需要运行 `playwright install chromium` 吗？

不需要。Ombra 运行自身专属引擎二进制文件，不使用 Playwright 自带的原版 Chromium。在 Linux 上，只需安装系统依赖库和 `xz-utils` 即可：

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### 更新、切换发布通道与回滚引擎版本

将 SDK 更新到最新版本：

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

测试 `beta` 通道，或锁定/回滚到精确的引擎构建版本：

```python
# 为某次启动锁定精确的引擎构建版本
browser = launch(version="158.0.8127.37-2")
```

```bash
# 或通过环境变量 / CLI 进行配置
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# 或直接指向本地编译的二进制文件
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS：Gatekeeper 阻止本地构建

官方发布的 Apple Silicon macOS 版 Ombra 均经过 Apple Developer ID 证书签名并完成公证。如果你运行的是本地未签名的开发构建且被 macOS 隔离，执行一次以下命令清除隔离属性即可：

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### 在同步 Python 中等待页面加载

在同步 Playwright 中，如果在 `page.goto()` 后直接执行单次长时间的 `time.sleep(15)`，会阻塞 Playwright 的事件循环，进而可能导致验证页面停滞。请改为短间隔循环，并穿插轻量级上下文调用：

```python
import time

for _ in range(15):
    page.context.cookies()  # 保持 Playwright 事件循环运转，且不触碰页面 DOM
    time.sleep(1)
```

在异步 Python 中请使用 `await asyncio.sleep(...)`；在 Node.js 中请使用 `await new Promise(r => setTimeout(r, ms))`。此外，在检测阶段前应尽量避免频繁调用 `page.wait_for_timeout()` 及不必要的 `page.evaluate()`，以免产生多余的 CDP 流量。

## 安全性

- **引擎真实性与完整性。** 解压前，SDK 会使用内置公钥验证发行信封的 Ed25519 签名，并核对归档文件与可执行文件的 SHA-256 摘要。
- **仅限本地 CDP。** 调试端口严格绑定在 `127.0.0.1`。切勿在无额外认证保护的情况下将 CDP 端口暴露到公网——CDP 拥有浏览器的完全控制权。
- **密钥隔离。** 代理凭据仅驻留在本地环回中继的内存中，绝不会出现在进程命令行、配置文件元数据、日志或错误详情里。
- **零遥测。** SDK 不发送任何分析数据、崩溃报告或隐藏的网络探测请求。

如发现安全问题，请按照 [SECURITY.md](../../SECURITY.md) 中的指引私下报告。

## 仓库结构

```text
.
├── README.md                    # 英文根 README
├── translations/
│   ├── zh-Hans/README.md        # 本文件（简体中文）
│   ├── ru/README.md             # 俄语翻译
│   └── <locale>/README.md       # 其余 19 种语言本地化版本
├── desktop/                     # Ombra Desktop（Tauri：Rust 目录层 + Vue 界面）
├── docs/
│   ├── architecture.md          # 架构设计、信任边界与生命周期
│   ├── sdk-contract.md          # v0.1 启动契约、选项、错误与不变量
│   ├── stealth-checkup.md       # 隐匿性检查方法（英文）
│   ├── stealth-checkup.ru.md    # 隐匿性检查方法（俄文）
│   ├── versioning.md            # SDK、引擎与客户端版本控制策略
│   └── desktop/                 # Desktop 本地配置文件与密钥指南
├── spec/
│   └── schemas/                 # 启动选项与二进制元数据的 JSON Schema
├── sdks/
│   ├── manifest.json            # 机器可读的 SDK 清单
│   ├── README.md                # SDK 目录布局与贡献规范
│   ├── python/                  # Python SDK（发布包名 ombrabrowser）
│   ├── node/                    # Node.js / TypeScript SDK（发布包名 @ombralabs/sdk）
│   └── ...                      # 其他语言契约脚手架（Go、Rust、C#、Java、PHP、Ruby）
├── conformance/                 # 跨语言启动与隐匿性不变量测试用例
├── tools/check_repo.py          # 结构、Schema 与链接校验脚本（CI）
└── .github/workflows/ci.yml
```

本仓库托管 SDK 契约、Schema 定义、一致性测试用例、文档以及 Ombra Desktop 源代码。Chromium 引擎补丁在独立仓库中维护，编译好的构建版本通过下载通道与 [GitHub Releases](https://github.com/ombralabs/ombra/releases) 发布。

## 常见问题（FAQ）

### 这是 Playwright 的分支（fork）吗？

不是。SDK 通过本地 CDP 将官方 Playwright（或 Puppeteer）客户端连接到 Ombra Chromium。所有类型、定位器、等待逻辑和页面对象均保持标准原样。

### Ombra 是免费的吗？需要许可证密钥吗？

本仓库中的 SDK 源代码采用 Apache License 2.0 协议开源。当前引擎构建版本（`158.0.8127.37-2` 及更新版本）与本地 Ombra Desktop 配置文件管理器（`desktop-v1.2.2`）均可免费且自主运行——无需账号、许可证密钥、硬件 ID，也没有配置文件数量限制。`license_key` 和 `OMBRA_LICENSE_KEY` 仅用于兼容旧版授权构建。

### 使用 SDK 必须安装 Ombra Desktop 吗？

不需要。SDK 会直接将引擎作为子进程启动，非常适合脚本、容器和 CI 场景。只有当你希望通过图形界面管理本地配置文件目录时，Ombra Desktop 才是可选项。

### Ombra 与 `playwright-stealth` 有什么区别？

`playwright-stealth` 是在普通浏览器之上向页面注入 JavaScript，现代检测器常常能够直接识别出这些补丁本身。而 Ombra 将修改编译进 Chromium 源代码内部，且 SDK 不会向页面注入任何脚本。

### 可以使用自己的代理吗？

可以。在 `proxy` 参数中传入 `http://`、`https://` 或 `socks5://` 代理即可。当代理包含凭据时，SDK 会启动本地环回中继，使凭据不会出现在进程参数中。请注意，Playwright 自带的 `context.request` / `page.request` 客户端可能会绕过浏览器级代理设置——若要确保请求经由代理发出，请在页面上下文中调用 `fetch()`。

### 支持哪些版本的 Playwright 和 Puppeteer？

Python SDK 要求 Playwright `>=1.60,<2.0`（安装 `ombrabrowser` 时会自动安装）。Node.js SDK 支持 `playwright-core@^1.60.0` 或 `puppeteer-core >=22.0.0`。兼容性规则请参阅[版本控制指南](../../docs/versioning.md)。

### Ombra 保证能通过所有机器人检测吗？

不保证。检测机制始终在动态演进，实际结果受站点策略、地区、IP 信誉、配置文件历史和检测器版本影响。请使用[隐匿性检查方法](../../docs/stealth-checkup.md)对具体配置进行客观测量与持续跟踪。

### Ombra 适用于哪些使用场景？

Ombra 面向经过授权的自动化任务、QA 测试、监控、研究以及隔离工作配置文件管理。不支持未经授权的访问、撞库（credential stuffing）及任何滥用行为。

## 参与贡献

贡献指南请参阅 [CONTRIBUTING.md](../../CONTRIBUTING.md)，社区行为准则请参阅 [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md)，SDK 开发说明请参阅 [sdks/README.md](../../sdks/README.md)。

- 新增启动选项前，请先更新 [SDK 契约](../../docs/sdk-contract.md) 与 [Schema 定义](../../spec/schemas)。
- 修改 SDK 行为时，请同步更新代码实现、测试以及[一致性测试](../../conformance/README.md)中的共享用例。
- 提交 Pull Request 前，请运行 `python3 tools/check_repo.py` 校验仓库结构与链接。

## 许可证

本仓库中的 SDK 源代码依据 [Apache License 2.0](../../LICENSE) 许可发布。该许可证不授予对 Ombra 商标、Ombra Chromium 引擎或 Ombra Desktop 的权利——有关商标与第三方条款，请参阅 [NOTICE](../../NOTICE)。

## 相关链接

- 🌐 **官方网站** —— [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** —— [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** —— [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **发行版（引擎与 Desktop）** —— [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **更新日志** —— [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **问题反馈与功能建议** —— [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **开源组织** —— [Ombra Labs](https://github.com/ombralabs)
