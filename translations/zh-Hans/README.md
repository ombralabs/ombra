# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

在 Python 和 Node.js 中，`launch()` 会启动 Ombra Chromium，并返回 Playwright 的 `Browser` 对象。在 Node.js 中使用 Puppeteer 时，请调用 `launchPuppeteer()`。

**[安装](#安装)** · <a href="../../README.md">English</a>

<details>
<summary>语言</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Chromium 中的指纹控制

Ombra 在 Chromium 中实现指纹控制，涵盖 Canvas、WebGL、音频、字体、硬件并发数、元素边界、GPU 字符串、时区和自动化信号。引擎使用 Chromium 自带的 TLS 和 HTTP/2 网络栈，并在浏览器进程内处理模拟人类操作的输入。

SDK 在本地启动引擎，通过 Chrome DevTools Protocol（CDP）连接自动化客户端。你可以在脚本、容器或 CI 作业中运行 SDK，无需安装 Ombra 桌面应用。

## 状态

示例使用已发布的 Python 和 Node.js Alpha 包。本仓库还维护共用的启动契约以及 8 个 SDK 的项目骨架。

| 组件 | 状态 |
|---|---|
| [SDK 契约](../../docs/sdk-contract.md) | 草案 `0.1.0` |
| Python SDK | `0.1.3` Alpha 版 · [PyPI 上的 `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` Alpha 版 · [npm 上的 `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| [共享模式定义](../../spec/schemas) | 启动选项和引擎二进制文件的元数据 |
| [跨语言一致性测试](../../conformance) | 两个 SDK 共用的测试用例 |
| [隐蔽性检查](../../docs/stealth-checkup.md) | 测试标准和报告模板 |

## 安装

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

如需使用 Puppeteer，请安装 `puppeteer-core` 来替代 `playwright-core`。支持的客户端和运行时版本见 [npm 包页面](https://www.npmjs.com/package/@ombralabs/sdk)。

SDK 先检查通过 Python 的 `binary_path` 或 Node.js 的 `binaryPath` 指定的路径，再依次检查 `OMBRA_BINARY_PATH`、桌面应用的引擎目录和 SDK 缓存。如果都找不到引擎，SDK 会下载并校验引擎文件。

在 Python 中传入 `download=False`，或在 Node.js 中传入 `download: false`，即可禁用下载。若要在不打开浏览器的情况下准备引擎，请调用 Python 的 `ensure_binary()` 或 Node.js 的 `ensureBinary()`。

## 快速开始

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

使用命名配置文件时，在其已有的浏览器上下文中打开页面，即可复用 Cookie 和站点存储。这个示例还设置了代理。

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

调用 `launchPuppeteer()` 可获得 Puppeteer 的 `Browser` 对象。

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## 无缝迁移

要迁移使用 Playwright 的 Python 脚本，请安装 `ombrabrowser`，并修改导入语句和启动调用。页面方法、类型和选择器仍由 Playwright 提供。

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

在 Node.js 中同样只需修改两行。

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## 工作原理

```mermaid
flowchart LR
    Script["你的脚本<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP 桥接"]
    Engine["Ombra Chromium<br/>补丁版引擎"]
    Client["原生自动化客户端"]
    Profile[("配置文件<br/>种子 · Cookie · 扩展程序")]

    Script -->|launch()| SDK
    SDK -->|派生进程| Engine
    SDK -->|通过 CDP 连接| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` 查找引擎，必要时下载引擎，然后校验二进制文件。
2. SDK 选择配置文件目录和种子。如果代理需要身份验证，SDK 会启动本地中继。
3. SDK 使用选定的配置文件、启动选项和回环调试端口启动 Chromium。
4. `DevToolsActivePort` 就绪后，SDK 通过 CDP 连接 Playwright 或 Puppeteer，并返回相应客户端的 `Browser` 对象。
5. `browser.close()` 停止引擎并释放配置文件锁。

启动后，客户端将页面命令直接发送给 Chromium。

## SDK 矩阵

| 运行时 | 已发布的包 | 浏览器对象 |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

本仓库还包含另外 6 个 SDK 的目录。计划发布的包及其对应的客户端列在 [SDK 清单](../../sdks/manifest.json)中，目录布局见 [SDK 指南](../../sdks/README.md)。

| 目标运行时 | 计划发布的包 | 客户端或返回类型 |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## 启动选项

下表使用 Python API 和 SDK 契约中的选项名。Node.js 使用小驼峰命名，例如 `timeoutMs`、`userDataDir` 和 `binaryPath`。

| 选项 | 默认值 | 含义 |
|---|---|---|
| `headless` | `true` | 无窗口运行引擎 |
| `proxy` | 无 | 代理 URL 或配置对象。需要身份验证的代理使用本地中继 |
| `fingerprint` | 无 | 种子，以及操作系统、时区、区域设置、屏幕和 GPU 的设置 |
| `profile` | 无 | 命名配置文件，持久保存 Cookie、存储数据与种子 |
| `user_data_dir` | 临时目录 | 显式指定配置文件目录，与 `profile` 互斥 |
| `args` | `[]` | 额外的引擎参数，原样传递 |
| `timeout_ms` | `30000` | 启动和建立 CDP 连接的超时时间，单位为毫秒 |
| `humanize` | 引擎默认值 | `false`、`true` 或某个预设 |
| `binary_path` | 已解析 | 使用指定的引擎二进制文件 |
| `download` | `true` | 下载缺失的引擎二进制文件 |

[SDK 契约](../../docs/sdk-contract.md)列出了所有启动选项，并说明了错误类型和配置文件的行为。

## 二进制文件管理

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK 在启动前校验引擎文件的 SHA-256 校验和。请在生产环境中启用此项校验。`OMBRA_SKIP_CHECKSUM=1` 仅用于本地开发构建。

## 配置

| 变量 | 默认值 | 含义 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 未设置 | 显式指定引擎二进制文件 |
| `OMBRA_CACHE_DIR` | `~/.ombra` | SDK 管理的二进制文件与命名配置文件 |
| `OMBRA_DOWNLOAD_URL` | 发布端点 | 二进制文件下载的基础 URL |
| `OMBRA_VERSION` | 最新兼容版本 | 要解析的引擎版本 |
| `OMBRA_AUTO_UPDATE` | `true` | 启动时检查是否有更新的引擎 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 仅限开发使用 |
| `OMBRA_LICENSE_KEY` | 未设置 | 传递给引擎 |
| `OMBRA_TIMEOUT_MS` | `30000` | 默认启动超时时间，单位为毫秒 |
| `OMBRA_LOG_LEVEL` | `warn` | `error`、`warn`、`info`、`debug` |

SDK 依次检查启动选项、环境变量、配置文件元数据和默认值，使用最先找到的值。

## 对比

| 功能 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright 或 Puppeteer |
| 补丁层级 | 无 | 页面内 JavaScript | 配置开关 | 引擎源码 |
| 指纹种子 | 无 | 无 | 部分 | 按配置文件 |
| 拟人化输入 | 无 | 无 | 无 | 引擎 |
| 配置文件隔离 | 浏览器上下文 | 浏览器上下文 | 无 | 用户数据目录 |
| 无缝迁移 | — | 修改导入语句 | 重写代码 | 修改导入语句 |

检测结果取决于网站、出口 IP 和配置文件。测量方法见[隐蔽性检查](../../docs/stealth-checkup.md)。

## 隐蔽性是引擎的固有属性

引擎负责应用指纹设置。SDK 会把配置文件种子和显式启动选项传递给它。

| 层面 | Ombra 的处理位置 |
|---|---|
| TLS 与 HTTP/2 | Chromium 自带的网络栈，版本与引擎构建匹配 |
| 浏览器身份 | 由配置文件种子驱动的源码级引擎补丁 |
| 自动化暴露面 | 针对 WebDriver 信号的引擎补丁；SDK 不调用 `Runtime.enable` |
| 输入 | 浏览器进程内完成的拟人化指针、键盘和滚动 |
| 网络一致性 | 按代理确定时区与区域设置 |
| 状态 | 每个配置文件独立的用户数据目录 |

### SDK 边界

- CDP 调试端口只接受通过回环地址发起的本地连接。
- SDK 不会在日志中记录代理凭据、许可证密钥或 Cookie，也不会发送遥测数据。
- 除非显式提供新种子，否则已有配置文件会保留原来的种子。
- SDK 不会通过 `addScriptToEvaluateOnNewDocument` 或 `evaluateOnNewDocument` 注入隐蔽脚本，也不会修改页面属性。
- SDK 通过 CDP 的 HTTP 端点或 `Browser.getVersion` 检查就绪状态，检查时不会调用 `Runtime.enable`。
- 浏览器身份由引擎提供。SDK 不会通过 Playwright 或 Puppeteer 覆盖用户代理或其他身份信息，也不会调用 `Emulation.setUserAgentOverride`、`setTimezoneOverride`、`setLocaleOverride` 或 `setDeviceMetricsOverride`。
- SDK 不会自行添加 `--enable-automation`、`--disable-blink-features=AutomationControlled` 或 `--no-sandbox`。

## 隐蔽性检查

请针对计划使用的引擎构建、自动化客户端和配置文件运行以下检查。

| 层面 | 示例目标 | 通过标准 |
|---|---|---|
| L0 传输 | TrackMe、IP/WebRTC 泄漏检测 | 只有出口 IP 可见，JA4 和 HTTP/2 与引擎所用的 Chromium 构建一致 |
| L1 身份 | 本地探针、Sannysoft、Intoli | UA、UA-CH、平台、GPU、字体、屏幕之间无矛盾 |
| L2 指纹 | CreepJS、FingerprintJS、BrowserScan | 未发现无头模式或伪造标记，多次重新加载后指纹保持稳定 |
| L3 自动化 | rebrowser、brotector、botd | 无 CDP、初始化脚本或 WebDriver 泄漏 |
| L4 行为 | 输入保真度、拟人化痕迹、Cloudflare 冒烟测试 | 事件可信、顺序真实、挑战可通过 |
| L5 稳定性 | 种子、Worker、iframe、跨源 | 同一种子在多次启动中产出相同的人设 |

测试指南介绍了结果状态、故障排查和报告方式，可查阅[英文版](../../docs/stealth-checkup.md)或[俄文版](../../docs/stealth-checkup.ru.md)。

为每份结果记录引擎构建版本、客户端版本、配置文件设置、代理出口和检测器版本，以便复现并比较各次运行。

## 仓库结构

```text
.
├── README.md                  # 英文原文
├── translations/
│   └── <locale>/README.md
├── desktop/                   # 离线配置文件管理器
├── docs/
│   ├── desktop/               # 配置文件管理器文档
│   ├── architecture.md        # 组件、启动流程、边界
│   ├── sdk-contract.md        # v0 启动契约与 SDK 行为
│   ├── stealth-checkup.md     # 隐蔽性验证方法与操作手册
│   ├── stealth-checkup.ru.md  # 俄语译文
│   └── versioning.md          # SDK、引擎与客户端兼容性
├── spec/
│   └── schemas/               # 启动选项与二进制文件信息的 JSON Schema
├── sdks/
│   ├── manifest.json          # 机器可读的 SDK 注册表
│   ├── README.md              # 目录布局与贡献规则
│   ├── _template/             # 新语言 SDK 的项目骨架
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # 与语言无关的启动与隐蔽性用例
├── tools/check_repo.py        # 结构与链接校验（CI）
└── .github/workflows/ci.yml
```

本仓库包含 SDK 项目骨架、启动契约、一致性测试用例和离线配置文件管理器。Chromium 引擎和 Desktop 1.2.1 完整发行版分别在独立的仓库中维护。[Desktop 源码与构建指南](../../desktop/README.md) · [配置文件管理器文档](../../docs/desktop/README.md)

## 契约

- `launch(options)` 启动引擎并返回客户端的 `Browser` 对象。之后，客户端通过 CDP 与 Chromium 直接通信。
- 启动前，SDK 检查引擎的目标平台和 SHA-256 校验和。如果缺少二进制文件并且已启用下载，SDK 会下载该文件。
- 命名配置文件会保留 Cookie、站点存储和种子，以供下次启动时使用。
- 如果启动失败，SDK 会清理自己启动的进程，并抛出具有明确类型的错误。是否重试由调用方决定。
- SDK、引擎和自动化客户端各有独立的版本范围。在 Python 中调用 `binary_info()` 或在 Node.js 中调用 `binaryInfo()`，即可查看引擎构建版本。

## 兼容性

| 组件 | 支持范围 |
|---|---|
| 引擎 | SDK 选定的构建版本，可通过 `binary_info()` 或 `binaryInfo()` 查看 |
| macOS | Apple Silicon 和 Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10 及以上，配合受支持的 Playwright 版本 |
| Node.js | 20 及以上，配合受支持的 Playwright 或 Puppeteer 版本 |

SDK 与引擎独立管理版本。如果版本不兼容，SDK 会抛出具有明确类型的错误，并报告两个版本号。

## 参与贡献

[贡献指南](../../CONTRIBUTING.md)说明了代码审查流程，构建步骤见 [SDK 指南](../../sdks/README.md)。

- 修改 SDK 行为时，请更新受影响的实现，并添加测试或共享的一致性测试用例。
- 添加新语言的 SDK 时，请复制 [SDK 模板](../../sdks/_template)，在[清单](../../sdks/manifest.json)中注册，并提交草稿 PR。
- 添加启动选项时，请先更新 [SDK 契约](../../docs/sdk-contract.md)和[模式定义](../../spec/schemas)。
- 引擎级隐蔽性功能应在引擎仓库中修改。修改后，SDK 仍须通过检查。
- 请按照[安全政策](../../SECURITY.md)私下报告安全问题。

## 常见问题

### Ombra 是 Playwright 的分支吗？

不是。SDK 将官方 Playwright 客户端连接到 Ombra Chromium，原有的 Playwright 类型、辅助函数和页面对象都可以继续使用。

### 需要安装 Ombra 桌面应用吗？

SDK 会直接启动引擎。桌面应用是可选的，可用于手动管理配置文件。

### Ombra 与 playwright-stealth 有何不同？

Ombra 的指纹控制逻辑直接编译进了 Chromium。SDK 不会修改页面脚本。

### 可以使用自己的代理吗？

可以。将代理传给 `launch()` 即可。需要身份验证的代理通过本地中继连接，因此凭据不会出现在引擎进程的命令行中。

### 支持哪些版本的 Playwright 和 Puppeteer？

各 SDK 在包清单中声明支持的客户端版本。这些客户端是独立的依赖项。具体支持范围见[版本管理指南](../../docs/versioning.md)。

### Ombra 能通过所有机器人检测吗？

结果取决于网站、地区、出口 IP 的信誉、检测器版本和配置文件的设置。[隐蔽性检查](../../docs/stealth-checkup.md)说明了如何测量特定配置的结果。

## 许可证

本仓库中的 SDK 源码基于 [Apache License 2.0](../../LICENSE) 授权。该许可证不授予对 Ombra 引擎、Ombra 名称或标志的任何权利。商标和第三方署名信息见 [NOTICE](../../NOTICE)。

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
