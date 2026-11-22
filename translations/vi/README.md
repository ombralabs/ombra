<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra?style=flat" alt="Giấy phép"></a>
<a href="https://github.com/ombralabs/ombra/commits/main"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Commit gần nhất"></a>
<br>
<a href="https://github.com/ombralabs/ombra/stargazers"><img src="https://img.shields.io/github/stars/ombralabs/ombra?style=flat" alt="Số sao"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Lượt tải PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Lượt tải npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Bản phát hành"></a>
</p>

<p align="center">
<a href="#cài-đặt"><strong>Cài đặt</strong></a> ·
<a href="#api-python">API Python</a> ·
<a href="#api-nodejs-và-typescript">API Node.js</a> ·
<a href="#mô-phỏng-thao-tác-người-dùng">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Ngôn ngữ</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium với cơ chế kiểm soát fingerprint ở cấp mã nguồn C++ và mô phỏng thao tác người dùng gốc.</h3>

<table><tr><td>
Không phải tập hợp cờ khởi chạy và cũng không phải chèn JavaScript lên trên trang web. Đây là tệp nhị phân Chromium thực thụ với các bản vá fingerprint được biên dịch trực tiếp vào mã nguồn C++ cùng bộ mô phỏng thao tác chạy bên trong tiến trình trình duyệt. Kết nối trực tiếp Playwright hoặc Puppeteer chính thức qua CDP cục bộ — không có đối tượng bọc (wrapper) và không cần viết lại mã thao tác trang.
</td></tr></table>

<br>

<p align="center">
Giải pháp thay thế trực tiếp cho lệnh khởi chạy của Playwright và Puppeteer trong Python và Node.js.<br>
Cùng API, cùng selector và kiểu dữ liệu — chỉ cần đổi câu lệnh import và lời gọi <code>launch()</code>.
</p>

- **Bản vá Chromium ở cấp mã nguồn** — kiểm soát canvas, WebGL, WebGPU, âm thanh (audio), phông chữ, GPU, màn hình, truy vấn phương tiện CSS, thông số phần cứng, WebRTC không rò rỉ STUN, TLS ClientHello, múi giờ, ngôn ngữ vùng và loại bỏ các dấu hiệu tự động hóa (`navigator.webdriver`, `Runtime.enable`, các dấu hiệu chế độ headless).
- **Mô phỏng thao tác người dùng gốc trong tiến trình trình duyệt (`humanize=True`)** — quỹ đạo con trỏ (`cursory-rs`), cú nhấp có căn điểm với thời gian giữ nút, nhịp điệu gõ phím kèm tự sửa lỗi chính tả và vật lý cuộn trang đều chạy bên trong Chromium. SDK trả về đối tượng `Browser` gốc hoàn toàn thuần túy, không qua lớp bọc proxy.
- **Vận hành độc lập không cần khóa hay tài khoản** — các bản dựng engine hiện tại và Ombra Desktop chạy cục bộ mà không cần đăng ký, khóa bản quyền, mã phần cứng (hardware ID) hay máy chủ cấp phép.
- **Cài đặt tự động và xác minh mật mã cho tệp nhị phân** — chạy `pip install ombrabrowser` hoặc `npm install @ombralabs/sdk`; ở lần khởi chạy đầu tiên, SDK sẽ tự tải một bản dựng tương thích từ [GitHub Releases](https://github.com/ombralabs/ombra/releases), xác minh chữ ký Ed25519 và mã kiểm tra SHA-256.
- **Hồ sơ bền vững và bộ chuyển tiếp proxy an toàn** — hồ sơ có tên lưu giữ cookie, `localStorage`, IndexedDB và `seed` xuyên suốt các lần chạy với cơ chế khóa liên tiến trình; các proxy yêu cầu xác thực (HTTP, HTTPS, SOCKS5) chạy qua bộ chuyển tiếp loopback cục bộ để thông tin đăng nhập không bao giờ xuất hiện trong tham số dòng lệnh tiến trình.
- **Trình quản lý hồ sơ ngoại tuyến Ombra Desktop** — ứng dụng máy tính gốc ngay trong kho lưu trữ này ([`desktop/`](../../desktop/README.md)) đi kèm bộ cài đặt dựng sẵn cho macOS, Linux và Windows.

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

Puppeteer cũng được hỗ trợ thông qua `import { launch } from "@ombralabs/sdk/puppeteer"` hoặc `launchPuppeteer()` ([chi tiết](#puppeteer)).

**Đối với các trang web có lớp bảo vệ chống bot**, hãy kết hợp proxy dân cư, hồ sơ bền vững và cấu hình môi trường nhất quán:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # IP dân cư được ưu tiên hơn IP trung tâm dữ liệu
    fingerprint={"timezone": "auto", "locale": "auto"},  # khớp múi giờ và ngôn ngữ vùng với đầu ra proxy
    headless=False,                                      # một số trang phát hiện sự khác biệt ở chế độ headless
    humanize=True,                                       # mô phỏng chuột, bàn phím và cuộn trang gốc
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

Xem mục [Xử lý sự cố](#xử-lý-sự-cố) để giải quyết các vấn đề thường gặp trên Linux, trong container và khi làm việc với các trang mục tiêu được bảo vệ.

## Cài đặt

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Tùy chọn: tự động nhận diện múi giờ và ngôn ngữ vùng từ đầu ra proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Với Playwright (1.60.0+, không cần tải Chromium mặc định)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Hoặc với Puppeteer (Puppeteer 25+ yêu cầu Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Tùy chọn: trình đọc cơ sở dữ liệu GeoIP ngoại tuyến cho timezone: "auto" và locale: "auto"
npm install mmdb-lib
```

---

Khi khởi chạy, SDK tìm kiếm engine theo thứ tự nghiêm ngặt: `binary_path` (`binaryPath` trong Node.js), `OMBRA_BINARY_PATH`, thư mục engine của Ombra Desktop và bộ nhớ đệm của SDK (`~/.ombra/engines`). Nếu không tìm thấy engine tương thích, SDK sẽ tải bản dựng từ [GitHub Releases](https://github.com/ombralabs/ombra/releases), xác minh chữ ký Ed25519 cùng mã kiểm tra SHA-256 rồi lưu vào bộ nhớ đệm cục bộ. Bạn không cần chạy `playwright install chromium`.

Để tắt tính năng tải tự động, hãy truyền `download=False` (`download: false` trong Node.js). Để tải trước và xác minh engine (ví dụ trong quá trình dựng container), hãy gọi `ensure_binary()` (`ensureBinary()`) hoặc dùng lệnh CLI `install`.

> **Khởi chạy độc lập:** các bản dựng engine hiện tại hoàn toàn miễn phí và không yêu cầu tài khoản hay khóa bản quyền. `OMBRA_LICENSE_KEY` và lệnh `login` chỉ được giữ lại nhằm tương thích với các bản dựng có cấp phép đời cũ.

**Chuyển đổi từ Playwright** chỉ tốn hai dòng — mọi thao tác trang, locator và lệnh chờ đều giữ nguyên:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # phần mã còn lại của bạn hoạt động nguyên trạng
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ Hãy **gắn sao (Star)** cho kho lưu trữ nếu bạn thấy dự án hữu ích, và **[Theo dõi bản phát hành](https://github.com/ombralabs/ombra/subscription)** để nhận thông báo khi có bản dựng engine, SDK và Ombra Desktop mới.

---

## Trạng thái hiện tại và các bản phát hành

Mỗi thành phần trong hệ sinh thái đều tuân theo hợp đồng khởi chạy chung và được đánh phiên bản độc lập.

| Thành phần | Trạng thái / phiên bản | Vị trí |
|---|---|---|
| **Hợp đồng SDK** | Bản nháp `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK Python** | Alpha `0.2.0` | [`ombrabrowser` trên PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK Node.js / TypeScript** | Alpha `0.2.0` | [`@ombralabs/sdk` trên npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Engine Ombra Chromium** | Phạm vi SDK `>=151.0.7922.108,<159` | SDK tự động tải xuống từ [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Trình quản lý hồ sơ ngoại tuyến | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Trình duyệt độc lập** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Schema và kiểm thử tuân thủ** | JSON Schema + bộ kiểm thử dùng chung | [`spec/schemas`](../../AGENTS.md#sdk-launch-options-and-binary-info-schemas) · [`conformance`](../../AGENTS.md#sdk-conformance-and-stealth-invariants) |
| **Phương pháp kiểm tra stealth** | 6 lớp (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Xem [CHANGELOG.md](../../CHANGELOG.md) để theo dõi đầy đủ lịch sử phát hành.

## Tại sao chọn Ombra

- **Các bản vá ở mức cấu hình và JavaScript rất dễ bị phát hiện hoặc gãy vỡ.** Các công cụ như `playwright-stealth`, `puppeteer-extra` hay `undetected-chromedriver` chèn JavaScript vào trang hoặc chỉnh sửa cờ khởi chạy. Các bản cập nhật Chrome thường xuyên làm hỏng chúng, đồng thời các hệ thống phát hiện hiện đại dễ dàng nhận ra chính bản thân những đoạn vá đó (`Function.prototype.toString`, bất thường prototype, `addScriptToEvaluateOnNewDocument`).
- **Mọi thay đổi được biên dịch ngay vào mã nguồn Chromium.** Fingerprint được tạo ở tầng C++ và áp dụng đồng nhất trên khung chính (main frame), các worker và iframe. SDK không chèn bất kỳ kịch bản nào vào trang và không gọi bất kỳ lệnh ghi đè `Emulation.*` nào.
- **Bộ mô phỏng thao tác nằm trong tiến trình trình duyệt, không đặt chồng lên Playwright.** Vì quỹ đạo chuột, phím gõ và thao tác cuộn được xử lý ngay bên trong Chromium, SDK không bọc các đối tượng của Playwright hay Puppeteer — mọi locator, frame và thư viện bên thứ ba đều tiếp tục hoạt động bình thường.
- **Kiến trúc cục bộ, không phát sinh dịch vụ phụ trợ.** Không có tiến trình nền điều phối trung tâm và không có bước chuyển tiếp mạng giữa kịch bản của bạn với trình duyệt: chỉ một tiến trình engine duy nhất, CDP loopback cục bộ trên `127.0.0.1`, và không giới hạn số lượng hồ sơ hay phiên chạy đồng thời.

## Ombra Desktop

**Trình quản lý hồ sơ cục bộ ngoại tuyến có giao diện đồ họa (GUI).** Mã nguồn của ứng dụng nằm trực tiếp trong kho lưu trữ này ([`desktop/`](../../desktop/README.md)) và được xây dựng bằng Tauri (Rust + Vue).

- **Hoàn toàn ngoại tuyến và cục bộ** — danh mục hồ sơ được lưu trong cơ sở dữ liệu SQLite cục bộ ngay trên máy bạn với khóa mã hóa cục bộ; không cần tài khoản, dịch vụ đám mây hay kết nối mạng.
- **Quản lý hồ sơ có cấu trúc** — tạo hồ sơ, tìm kiếm theo tên, ghi chú hoặc số thứ tự, chỉnh sửa mô tả, đồng thời sắp xếp bằng nhóm, thẻ, nhãn và dấu trang trong danh mục viết bằng Rust.
- **Thùng rác an toàn** — chuyển hồ sơ vào Thùng rác vẫn giữ tệp trên đĩa để bạn có thể khôi phục về sau.
- **Không giới hạn số lượng hồ sơ** — không có gói cước theo số hồ sơ hay hạn mức đám mây: mọi dữ liệu hoàn toàn thuộc quyền kiểm soát của bạn.
- **Bộ cài đặt dựng sẵn** — macOS Apple Silicon (`.dmg`, đã ký Apple Developer ID và công chứng), Linux (`.deb` và `.rpm`) và Windows x64 (`setup.exe`).
- **Danh mục cô lập** — đặt biến môi trường `OMBRA_DESKTOP_DATA_DIR` để làm việc với danh mục thử nghiệm riêng biệt hoặc bản sao lưu.

[Tải bản phát hành mới nhất →](https://github.com/ombralabs/ombra/releases) · [Tài liệu Desktop](../../desktop/README.md) · [Hướng dẫn về hồ sơ và khóa cục bộ](../../docs/desktop/README.md)

## Xác minh fingerprint và kiểm tra stealth

Thay vì đưa ra những lời hứa chung chung kiểu "100% không thể bị phát hiện", Ombra dựa trên một quy trình kiểm chứng có thể lặp lại dưới các điều kiện được ghi nhận rõ ràng. Kết quả thực tế trên bất kỳ trang web nào luôn phụ thuộc vào độ uy tín của IP đầu ra, khu vực địa lý, lịch sử hồ sơ, phiên bản hệ thống phát hiện và cấu hình khởi chạy.

### Các bề mặt được engine và SDK xử lý

| Bề mặt / tín hiệu | Playwright mặc định | Ombra | Cách triển khai |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Bản vá engine C++ |
| `window.chrome` | thiếu trong headless | đối tượng đầy đủ | Khớp với Chrome thông thường |
| `navigator.plugins` | `0` trong headless | tập plugin nhất quán | Cấp engine |
| User-Agent và Client Hints | `HeadlessChrome`, lệch thương hiệu | `Google Chrome` + đồng bộ `Sec-CH-UA*` | Bản vá `010-user-agent-and-webdriver` |
| Dấu vết CDP (`Runtime.enable`, `UtilityScript`) | bị bộ phát hiện gắn cờ | engine triệt tiêu; SDK không bao giờ gọi `Runtime.enable` | Bản vá `110-runtime-enable` + bất biến `SI-01` |
| Rò rỉ IP WebRTC | lộ IP cục bộ / máy chủ | báo cáo IP đầu ra mà không gửi gói STUN thật | Bản vá `100-webrtc-leak` (`--webrtc-ip`) |
| TLS và HTTP/2 | tùy vào môi trường | ngăn xếp mạng Chromium + hồ sơ ClientHello `chrome-<major>` | Bản vá `210-tls-network-persona` |
| WebGL và WebGPU | bộ kết xuất phần mềm / lệch GPU | giới hạn WebGL/WebGPU và bảng mở rộng thống nhất | Các bản vá `070`, `071`, `075`, `955` |
| Phông chữ, ngôn ngữ vùng và múi giờ | dùng giá trị máy chủ, lệch `Intl` | bảng phông chữ, ngôn ngữ vùng ICU và múi giờ nhất quán | Các bản vá `040`, `090`, `092`, `230` |
| Mô phỏng thao tác người dùng | con trỏ nhảy tức thời, `fill()` tức thì | đường cong `cursory-rs`, nhịp gõ phím, vật lý cuộn trang | Bản vá `135-ombra-humanize` trong tiến trình trình duyệt |
| Độ ổn định fingerprint | thay đổi hoặc lộ máy chủ | tất định theo `seed` qua các lần khởi động lại và khung trang | Các bản vá `001`, `002` + hồ sơ bền vững |

### Sáu lớp kiểm tra

Trước khi phát hành hoặc triển khai một cấu hình, hãy chạy đủ cả sáu lớp kiểm tra với đúng bản dựng engine, client tự động hóa và proxy mà bạn dự định sử dụng:

| Lớp | Mục tiêu ví dụ | Tiêu chí đạt |
|---|---|---|
| **L0 Truyền tải (Transport)** | TrackMe, các trang kiểm tra rò rỉ IP/WebRTC, trang phản hồi header | Chỉ hiển thị IP đầu ra của proxy; JA4 và HTTP/2 khớp với bản dựng Chromium; không lộ thông tin xác thực proxy trong argv |
| **L1 Danh tính (Identity)** | Probe cục bộ, Sannysoft, Intoli, kiểm tra UA-CH | Không có mâu thuẫn giữa UA, Client Hints, nền tảng, GPU, phông chữ, màn hình và ngôn ngữ vùng |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Không có dấu hiệu headless hay `lie`; fingerprint giữ nguyên ổn định qua các lần tải lại trang |
| **L3 Tự động hóa (Automation)** | rebrowser, brotector, botd, kiểm toán lệnh CDP | Không có rò rỉ `Runtime.enable`, init-script, binding hay `navigator.webdriver` |
| **L4 Hành vi (Behavior)** | Probe độ trung thực đầu vào, nhật ký humanize, kiểm thử thử thách thực tế | Sự kiện mang `isTrusted: true`, thứ tự và thời gian tự nhiên, đường đi con trỏ và thao tác cuộn chân thực |
| **L5 Độ ổn định (Stability)** | Khởi chạy lặp lại, worker, iframe cùng/khác nguồn gốc, đối chiếu giữa các SDK | Cùng một `seed` tái tạo fingerprint giống hệt nhau trên mọi ngữ cảnh |

Quy trình chi tiết, các trạng thái (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), bảng kiểm tín hiệu và mẫu báo cáo: [Tiếng Anh (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) và [Tiếng Nga (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## So sánh

| Tính năng | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API tự động hóa | Playwright | Playwright | Selenium | **Playwright và Puppeteer** |
| Cấp độ vá | Không có | Chèn JS trong trang | Cờ cấu hình | **Mã nguồn C++ (Chromium)** |
| `seed` fingerprint nhất quán | Không | Không | Một phần | **Có, theo hồ sơ và eTLD+1** |
| Mô phỏng thao tác (`humanize`) | Không | Không | Không | **Tích hợp trong tiến trình trình duyệt** |
| Triệt tiêu rò rỉ `Runtime.enable` / CDP | Không | Không | Một phần | **Bản vá engine + các bất biến SDK** |
| Proxy xác thực không lộ qua CLI | Không | Không | Hạn chế | **Bộ chuyển tiếp loopback cục bộ** |
| Cô lập hồ sơ | Browser context | Browser context | Không | **Thư mục hồ sơ + khóa tệp** |
| Trình quản lý hồ sơ ngoại tuyến (GUI) | Không | Không | Không | **Ombra Desktop (macOS, Linux, Windows)** |
| Chuyển đổi từ Playwright | — | Đổi câu lệnh import | Viết lại mã | **Đổi import và lời gọi `launch()`** |

## Cách hoạt động

```mermaid
flowchart LR
    Script["Kịch bản của bạn<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + cầu nối CDP"]
    Relay["Bộ chuyển tiếp proxy cục bộ<br/>khi cần xác thực"]
    Engine["Ombra Chromium<br/>engine vá ở cấp C++"]
    Client["Client gốc<br/>Playwright · Puppeteer"]
    Profile[("Hồ sơ<br/>seed · cookie · bộ nhớ")]

    Script -->|"launch()"| SDK
    SDK -->|"xác minh + khởi chạy"| Engine
    SDK -.->|"xác thực proxy"| Relay
    Relay -.-> Engine
    SDK -->|"kết nối qua CDP"| Client
    Script -->|"API trang"| Client
    Client -->|"CDP loopback"| Engine
    Engine --> Profile
```

1. **`launch()` tìm hoặc tải xuống engine** rồi xác minh chữ ký Ed25519 cùng mã kiểm tra SHA-256 của tệp.
2. **Chuẩn bị hồ sơ và `seed`.** Hồ sơ có tên sẽ lấy khóa liên tiến trình; nếu proxy yêu cầu thông tin xác thực, SDK khởi tạo một bộ chuyển tiếp loopback chạy trong bộ nhớ.
3. **Khởi động Ombra Chromium** với hồ sơ đã chọn, các tùy chọn fingerprint và một cổng gỡ lỗi cục bộ (`--remote-debugging-port=0`).
4. **Kết nối client chính thức.** Ngay khi `DevToolsActivePort` xuất hiện, SDK gắn Playwright (với `no_defaults=True`) hoặc Puppeteer qua `127.0.0.1` và trả về đối tượng `Browser` gốc.
5. **Đóng sạch tài nguyên.** `browser.close()` gửi lệnh `Browser.close`, kết thúc cây tiến trình engine, dừng bộ chuyển tiếp proxy và giải phóng khóa hồ sơ.

Sau khi khởi chạy xong, SDK hoàn toàn rút khỏi luồng dữ liệu: mọi lệnh thao tác trang đều đi thẳng từ Playwright hoặc Puppeteer tới Chromium.

### Ranh giới của SDK và các bất biến stealth

[Hợp đồng SDK v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) áp đặt các bất biến nghiêm ngặt lên mọi SDK chính thức:

- **Không chèn kịch bản stealth vào trang.** SDK không bao giờ gọi `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` và không bao giờ chỉnh sửa thuộc tính DOM.
- **Không gọi `Runtime.enable`.** Bước kiểm tra trạng thái sẵn sàng chỉ sử dụng điểm cuối HTTP CDP cục bộ hoặc `Browser.getVersion`; SDK không bao giờ kích hoạt `Runtime`, `Debugger` hay `Log`.
- **Không dùng lệnh ghi đè `Emulation.*`.** SDK không bao giờ gọi `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` hay `setDeviceMetricsOverride` — danh tính trình duyệt đến hoàn toàn từ engine.
- **Không tự thêm cờ bị cấm theo mặc định.** SDK không bao giờ tự chèn `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` hay `--user-agent`.
- **Chỉ dùng CDP loopback.** Cổng gỡ lỗi luôn lắng nghe trên `127.0.0.1`; truyền `--remote-debugging-address` không phải địa chỉ loopback sẽ bị từ chối.
- **Không thu thập dữ liệu từ xa và không làm rò rỉ bí mật.** Thông tin xác thực proxy, khóa và cookie đều được ẩn khỏi nhật ký và thông báo lỗi.

## API Python

### `launch()`

```python
from ombrabrowser import launch

# Khởi chạy cơ bản (mặc định là headless)
browser = launch()

# Cửa sổ trình duyệt có giao diện
browser = launch(headless=False)

# Proxy HTTP hoặc SOCKS5 (thông tin xác thực được xử lý qua bộ chuyển tiếp loopback cục bộ)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Đối tượng proxy kèm danh sách bỏ qua
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

# Kiểm soát fingerprint (seed, hệ điều hành, tự động múi giờ/ngôn ngữ vùng từ proxy, màn hình, GPU)
# Để dùng timezone="auto" / locale="auto", hãy cài đặt: pip install "ombrabrowser[geoip]"
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

# Mô phỏng chuột, bàn phím và cuộn trang gốc
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Ghim một bản dựng engine cụ thể và truyền thêm các cờ Chromium
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Hàm trả về đối tượng `playwright.sync_api.Browser` chuẩn. Mọi phương thức của Playwright đều hoạt động bình thường (`new_page()`, `new_context()`, `close()`, v.v.). Các trang mới mặc định dùng `no_viewport=True` để không ghi đè kích thước cửa sổ của hồ sơ.

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

### `launch_context()` và `launch_context_async()`

Hàm tiện ích giúp khởi chạy trình duyệt và trả về trực tiếp một `BrowserContext` (đóng context cũng sẽ kết thúc tiến trình engine). Các tham số từ khóa bổ sung được chuyển tiếp cho `browser.new_context()` — ví dụ như `storage_state`, `permissions` hoặc `extra_http_headers`:

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

Phiên bản bất đồng bộ tương ứng: `await launch_context_async(...)`.

### `launch_persistent_context()` và `launch_persistent_context_async()`

Khởi chạy trình duyệt với một hồ sơ bền vững và trả về `BrowserContext` mặc định của hồ sơ đó. Cookie, `localStorage`, IndexedDB, bộ nhớ đệm và `seed` fingerprint được duy trì qua các phiên làm việc.

- Truyền `profile="pricing-eu"` sẽ tạo hồ sơ tại `~/.ombra/profiles/pricing-eu` kèm siêu dữ liệu trong `.ombra/profile.json` và một tệp khóa.
- Truyền `user_data_dir="./my-profile"` (hoặc tham số vị trí là đường dẫn) sẽ dùng đúng thư mục tường minh đó.
- Khởi chạy đồng thời cùng một hồ sơ từ tiến trình khác sẽ ném lỗi `ProfileBusyError` thay vì làm hỏng dữ liệu hồ sơ.

```python
from ombrabrowser import launch_persistent_context

# Theo hồ sơ có tên (lưu tại ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookie, bộ nhớ lưu trữ và seed đều được giữ lại

# Theo đường dẫn tường minh (ví dụ: để tải tiện ích mở rộng Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Phiên bản bất đồng bộ tương ứng: `await launch_persistent_context_async(...)`.

### Hàm tiện ích và chẩn đoán (Python)

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

# Kiểm tra tệp nhị phân engine đã được phân giải
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Tải xuống và xác minh engine mà không khởi chạy trình duyệt
ensure_binary(version="158.0.8127.37-3")

# Xóa các tệp nhị phân engine do SDK quản lý (hồ sơ trong ~/.ombra/profiles không bị ảnh hưởng)
clear_cache()

# Xem trước (dry-run) lệnh khởi chạy đã được phân giải mà không khởi tạo tiến trình Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Đọc siêu dữ liệu thời gian chạy (cổng CDP, ws_url, seed, pid) và kiểm tra tình trạng tiến trình
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # tải xuống và xác minh engine (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # cài đặt một bản dựng engine cụ thể
ombrabrowser info                                # chẩn đoán môi trường, tệp nhị phân và gói phụ thuộc (bí danh: doctor)
ombrabrowser info --quick --json                 # báo cáo nhanh dạng máy đọc được mà không khởi chạy tệp nhị phân
ombrabrowser info --proxy socks5://user:pass@host:1080  # kiểm tra phân giải IP đầu ra, múi giờ và ngôn ngữ vùng qua proxy
ombrabrowser update                              # kiểm tra GitHub Releases và cập nhật engine trong bộ nhớ đệm
ombrabrowser clear-cache                         # xóa các tệp nhị phân engine trong bộ nhớ đệm (giữ nguyên hồ sơ)
ombrabrowser login                               # lưu khóa bản quyền vào ~/.ombra/license.key (chỉ dành cho bản dựng cũ)
ombrabrowser logout                              # xóa khóa bản quyền đã lưu
```

Các lệnh tương tự cũng có thể gọi qua `python -m ombrabrowser <command>`.

## API Node.js và TypeScript

`@ombralabs/sdk` cung cấp đồng thời cả hai bản dựng ESM và CommonJS kèm đầy đủ định nghĩa kiểu TypeScript (`.d.ts`). Cả Playwright lẫn Puppeteer đều chạy trên cùng một engine bên dưới.

### Playwright (mặc định)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Khởi chạy cơ bản với proxy, fingerprint và mô phỏng thao tác người dùng
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

// Khởi chạy tiện lợi: trình duyệt + context trong một lệnh gọi
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Hồ sơ bền vững — cookie, localStorage và seed được giữ lại qua các lần chạy
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Mỗi đoạn mã phía trên đều có thể chạy độc lập. Để chuyển đổi từ bộ khởi chạy Playwright sẵn có, bạn cũng có thể thay câu lệnh import thành `import * as chromium from "@ombralabs/sdk"` và giữ nguyên `await chromium.launch(...)`.

### Puppeteer

Dùng `launchPuppeteer()` từ `@ombralabs/sdk` hoặc import trực tiếp từ `@ombralabs/sdk/puppeteer`:

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

> **Lưu ý về Puppeteer:** Puppeteer gửi nhiều lưu lượng CDP mặc định hơn so với Playwright dùng `connectOverCDP({ noDefaults: true })`. Đối với các trang web kiểm tra CDP nghiêm ngặt, bạn nên ưu tiên sử dụng Playwright.

### Tiện ích và CLI (Node.js)

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

## Mô phỏng thao tác người dùng

Trong Ombra, cơ chế mô phỏng thao tác (`humanize`) được biên dịch **trực tiếp vào tiến trình trình duyệt Chromium** (dựa trên `cursory-rs` và bộ lập lịch đầu vào của engine) thay vì cài đặt như một lớp bọc JS quanh client tự động hóa. Điều này mang lại những lợi ích sau:

- Mọi thao tác chuẩn của Playwright và Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) đều đi qua một hàng đợi đầu vào duy nhất cho từng thẻ (tab) bên trong trình duyệt.
- Các tham số hành vi được suy xuất một cách tất định từ `seed` của hồ sơ (`--fingerprint-humanize-seed`).
- SDK không bao giờ bọc `Page` hay `Browser` trong các lớp proxy — kiểu dữ liệu gốc và hành vi của client vẫn nguyên vẹn.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Những điểm thay đổi khi bật `humanize=True`:**

| Thao tác | Không bật `humanize` | Khi bật `humanize=True` |
|---|---|---|
| Di chuyển chuột | Nhảy tức thời | Đường cong `cursory-rs` có gia tốc, khoảng dừng và độ vượt nhẹ mục tiêu |
| Nhấp và kéo chuột | Nhấn tức thời | Chọn điểm ngắm trong mục tiêu, dừng nhẹ trước khi nhấp và có thời gian giữ nút |
| Nhập văn bản | Gán giá trị tức thì | Gõ từng ký tự theo nhịp điệu và bố cục bàn phím đã cấu hình, thỉnh thoảng gõ nhầm rồi tự sửa; văn bản rất dài được dán qua bộ nhớ tạm cô lập mà không chạm vào bộ nhớ tạm hệ thống |
| Cuộn trang | Nhảy một bước duy nhất | Chuỗi sự kiện bánh xe chuột/trackpad tuân theo hồ sơ giảm tốc đã đo đạc |
| Khoảng nghỉ không thao tác | Con trỏ đứng im tuyệt đối | Ở cấu hình sẵn `careful`, con trỏ có độ trôi nhẹ tự nhiên giữa các hành động |

**Các cấu hình sẵn (preset)** — `default` (tốc độ bình thường), `careful` (chậm rãi, cẩn trọng, kèm vi chuyển động khi nghỉ) và `fast` (tốc độ nhanh hơn). Truyền `humanize=False` (`humanize: false`) để tắt tường minh cơ chế mô phỏng thao tác.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Bạn có thể bật/tắt chế độ hoặc chuyển đổi preset ngay trong thời gian chạy mà không cần khởi động lại trình duyệt thông qua miền CDP `Ombra`:

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

## Quản lý fingerprint và hồ sơ

Engine suy xuất một cấu hình trình duyệt nhất quán từ một giá trị `seed` duy nhất. Khi không truyền `seed`:

| Kịch bản | Hành vi |
|---|---|
| **`launch()` không chỉ định hồ sơ** | SDK tạo một `seed` ngẫu nhiên cho phiên chạy và khởi tạo thư mục tạm, thư mục này sẽ bị xóa sau khi gọi `close()`. |
| **`profile="name"` hoặc `user_data_dir="./dir"`** | Giá trị `seed` được lưu vào `.ombra/profile.json` và tái sử dụng ở mỗi lần khởi chạy — trang web sẽ thấy một người dùng quay lại với cùng thiết bị và cookie. |
| **`fingerprint={"seed": N, ...}`** | Fingerprint tất định từ `seed` tường minh; các trường bổ sung sẽ ghi đè từng thiết lập riêng lẻ trong khi vẫn giữ phần còn lại nhất quán. |

Nhiễu canvas/âm thanh được gắn khóa theo từng `eTLD+1` (ổn định trên cùng một trang web, không thể liên kết chéo giữa các trang khác nhau). Nhiễu điểm ảnh cho canvas 2D và WebGL `readPixels` bị tắt theo mặc định để tránh kích hoạt các bộ phát hiện "Canvas Tampering / Masking", và có thể bật chủ động bằng cờ `--fingerprint-pixel-noise`.

> **Mẹo:** khi truy cập lại cùng một trang web, hãy dùng hồ sơ bền vững (`profile="name"` hoặc `launch_persistent_context()`) thay vì truyền một `seed` cố định cho lệnh `launch()` tạm thời — như vậy cookie, bộ nhớ đệm và `localStorage` sẽ luôn đồng nhất với fingerprint.

### Các trường của đối tượng `fingerprint`

Tên trường dưới đây theo chuẩn Python (`snake_case`); Node.js chấp nhận cả `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) lẫn `snake_case`:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `seed` | `int` (`>= 0`) | Giá trị hạt giống bộ sinh quyết định toàn bộ cấu hình fingerprint |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Hệ điều hành mục tiêu (`navigator.platform`, UA, nhóm GPU và phông chữ) |
| `os_version` | `string` | Gợi ý phiên bản hệ điều hành cho Client Hints |
| `timezone` | Múi giờ IANA hoặc `"auto"` | Múi giờ (ví dụ `"Europe/Berlin"`). `"auto"` tự phân giải múi giờ từ đầu ra proxy qua GeoIP |
| `locale` | BCP-47 hoặc `"auto"` | Ngôn ngữ vùng (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` tự phân giải ngôn ngữ vùng từ đầu ra proxy |
| `screen` | `{"width", "height"}` hoặc `"auto"` | Kích thước màn hình và vùng làm việc có tính đến thanh tác vụ / thanh menu của hệ điều hành mục tiêu |
| `gpu` | `{"vendor", "renderer"}` hoặc `"auto"` | Chuỗi WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` tường minh |
| `hardware_concurrency` | `int` hoặc `"auto"` | Giá trị `navigator.hardwareConcurrency` được báo cáo |
| `device_memory` | `int` hoặc `"auto"` | Giá trị `navigator.deviceMemory` được báo cáo (tính bằng GB) |
| `noise` | `bool` | Bật/tắt nhiễu fingerprint (`False` sẽ truyền cờ `--disable-fingerprint-noise`) |

> Hãy giữ `seed` làm nguồn chính cho các tham số fingerprint: việc ghi đè từng giá trị riêng lẻ mà không giữ sự đồng bộ (chẳng hạn ghép một hệ điều hành với GPU không tương thích) có thể tạo ra mâu thuẫn cho hệ thống phát hiện.

### Các cờ bổ sung của engine (`args`)

Các cờ bổ sung của engine (thiết lập hoặc ghi đè qua `args=[...]`):

| Cờ | Mục đích |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Thương hiệu trình duyệt trong `Sec-CH-UA` (SDK mặc định là `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | Hồ sơ TLS ClientHello khớp với phiên bản chính Chrome chỉ định (SDK tự đặt theo phiên bản engine) |
| `--webrtc-ip=<ip>` | Thay thế địa chỉ IP trong các ứng viên ICE của WebRTC mà không gửi lưu lượng STUN thật |
| `--fingerprint-location=<lat,lon>` | Tọa độ do `navigator.geolocation` báo cáo |
| `--fingerprint-storage-quota=<MB>` | Hạn mức dung lượng lưu trữ do `navigator.storage.estimate()` báo cáo |
| `--fingerprint-max-touch-points=<N>` | Số điểm cảm ứng (`navigator.maxTouchPoints` và các truy vấn phương tiện con trỏ) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Mật độ điểm ảnh hiển thị (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Độ sâu màu màn hình |
| `--disable-gpu-fingerprint` | Chuyển thẳng thông tin GPU thật của máy chủ (chuỗi WebGL/WebGPU, giới hạn và phần mở rộng) |
| `--disable-gpu-string-spoof` | Chuyển thẳng chuỗi GPU thật trong khi vẫn giữ các thiết lập hồ sơ khác |
| `--disable-fingerprint-noise` | Tắt nhiễu canvas/WebGL/âm thanh trong khi vẫn giữ các tham số danh tính hoạt động (cũng được thiết lập bởi `fingerprint={"noise": False}`) |
| `--fingerprint-pixel-noise` | Bật tùy chọn nhiễu điểm ảnh lũy đẳng (idempotent) cho canvas 2D và `readPixels` |
| `--profile-label=<text>` | Nhãn hồ sơ hiển thị trên thanh địa chỉ trình duyệt (chỉ hiển thị ở giao diện; tự động đặt từ `profile`, chỉ truyền qua `args` khi chưa đặt `profile`) |

### Cài đặt phông chữ trên Linux

Các máy chủ Linux tối giản và container thường thiếu phông chữ emoji và CJK, khiến việc kết xuất văn bản ẩn trên canvas và emoji tạo ra các mã băm bất thường.

**1. Lớp nền tảng (emoji và CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Phông chữ Windows cho hồ sơ Windows (`os="windows"`):**
Khi chạy cấu hình Windows trên Linux, việc cài đặt phông chữ thật từ `C:\Windows\Fonts\` (bao gồm `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) cải thiện đáng kể độ nhất quán khi liệt kê phông chữ:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Phông chữ macOS cho hồ sơ macOS (`os="macos"`):**
Tương tự, khi sử dụng `os="macos"` trên Linux, hãy sao chép phông chữ từ `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` và `/Library/Fonts/` vào `~/.local/share/fonts/mac/` rồi chạy `fc-cache -f`.

Trong `Dockerfile`, hãy đặt phông chữ vào thư mục hệ thống `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Tùy chọn khởi chạy, cấu hình và lỗi

### Các tùy chọn của `launch()`

Tên tùy chọn tuân theo API Python và [Hợp đồng SDK](../../docs/sdk-contract.md); Node.js sử dụng dạng `camelCase` tương ứng (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) và cũng chấp nhận bí danh `snake_case`. Các tùy chọn không hợp lệ sẽ bị từ chối với lỗi `InvalidOptionError`.

| Tùy chọn | Mặc định | Mô tả |
|---|---|---|
| `headless` | `true` | Chạy không mở cửa sổ (`--headless=new`) |
| `proxy` | không có | URL proxy (`http`, `https`, `socks5`) hoặc đối tượng; proxy có xác thực dùng bộ chuyển tiếp loopback |
| `fingerprint` | không có | Thiết lập `seed`, hệ điều hành, múi giờ, ngôn ngữ vùng, màn hình, GPU, bộ nhớ và nhiễu |
| `profile` | không có | Hồ sơ bền vững có tên tại `~/.ombra/profiles/<slug>` (loại trừ lẫn nhau với `user_data_dir`) |
| `user_data_dir` | thư mục tạm | Đường dẫn thư mục hồ sơ tường minh (loại trừ lẫn nhau với `profile`) |
| `args` | `[]` | Các tham số Chromium bổ sung (được truyền thẳng nguyên vẹn) |
| `binary_path` | tự phân giải | Đường dẫn tường minh tới tệp thực thi của engine |
| `version` | biến môi trường / tự động | Ghim phiên bản engine (ví dụ: `158.0.8127.37-3`), ghi đè `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Thời hạn chờ khởi động engine và kết nối CDP (1000–600000 ms) |
| `humanize` | mặc định của engine | `False`, `True`, hoặc `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | biến môi trường / tệp | Khóa dành cho các bản dựng cấp phép đời cũ (không cần trên các bản dựng hiện tại; không bao giờ ghi nhật ký) |
| `env` | `{}` | Biến môi trường bổ sung cho tiến trình engine |
| `download` | `True` | Cho phép tự động tải tệp nhị phân engine khi còn thiếu |

### Biến môi trường

Thứ tự ưu tiên: **tùy chọn khởi chạy tường minh → biến môi trường → siêu dữ liệu hồ sơ → giá trị mặc định**.

| Biến | Mặc định | Mô tả |
|---|---|---|
| `OMBRA_BINARY_PATH` | chưa đặt | Đường dẫn tường minh tới tệp nhị phân engine |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Thư mục lưu bộ nhớ đệm engine và các hồ sơ có tên |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Nguồn tải engine; URL tùy chỉnh sẽ bật chế độ máy chủ gương cũ (`none`/`off` để tắt tải xuống) |
| `OMBRA_VERSION` | bản tương thích mới nhất | Phiên bản engine được ghim (ví dụ: `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Kênh phát hành engine: `stable` (GitHub releases) hoặc `beta` (GitHub prereleases) |
| `OMBRA_AUTO_UPDATE` | `true` | Kiểm tra bản dựng engine mới hơn khi khởi chạy |
| `OMBRA_SKIP_CHECKSUM` | `false` | Chỉ dùng khi phát triển cục bộ: tắt xác minh SHA-256 (sẽ ghi cảnh báo) |
| `OMBRA_LICENSE_KEY` | chưa đặt | Khóa cho các bản dựng cấp phép đời cũ (không bao giờ ghi nhật ký) |
| `OMBRA_TIMEOUT_MS` | `30000` | Thời gian chờ khởi chạy mặc định (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Mức độ chi tiết nhật ký: `error`, `warn`, `info`, `debug` |

### Các lỗi có kiểu

Khi xảy ra bất kỳ lỗi nào, SDK sẽ kết thúc tiến trình engine đã tạo, giải phóng khóa hồ sơ và ném một lớp con của `OmbraError` mang trường `kind` ổn định cùng trường `details` đã ẩn toàn bộ thông tin nhạy cảm:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Hệ thống phân loại lỗi đầy đủ và quy tắc thử lại được trình bày chi tiết trong [Hợp đồng SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Nền tảng, tích hợp và container

### Nền tảng và runtime được hỗ trợ

| Thành phần | Hỗ trợ | Ghi chú |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Các bản dựng engine độc lập qua GitHub Releases; Ombra Desktop được ký Developer ID và công chứng |
| **macOS x64 (Intel)** | — | Chưa có bản phát hành Chromium 158 hiện tại |
| **Linux x64** | ✅ | Các bản dựng engine độc lập qua GitHub Releases; SDK Node.js cần `xz-utils` (`xz`) để giải nén `.tar.xz` |
| **Windows x64** | ✅ | Các bản dựng engine độc lập qua GitHub Releases và bộ cài đặt Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` được cài đặt tự động cùng `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` hoặc Puppeteer `>=22` (Puppeteer 25+ yêu cầu Node.js `>=22.12`) |

### Tích hợp framework và tác nhân AI

Ombra hoạt động với mọi công cụ tự động hóa hoặc framework tác nhân AI chấp nhận tệp nhị phân Chromium tùy chỉnh hay kết nối qua CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` và nhiều công cụ khác):

```python
# Cách 1: lấy đường dẫn tệp nhị phân đã xác minh và các tham số engine có thể chạy cho trình chạy riêng của bạn
# Lưu ý: build_launch_options() là hàm hỗ trợ chạy thử (dry-run) — hãy truyền tường minh user_data_dir và seed
# (hồ sơ có tên và proxy có xác thực yêu cầu Cách 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Cách 2: khởi chạy qua Ombra SDK và truyền điểm cuối CDP cục bộ cho framework của bạn
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Kết nối framework của bạn tới ws_url hoặc cdp_http — thiết lập fingerprint và humanize
# chạy bên trong engine và luôn hoạt động với mọi client CDP
```

### Chạy trong Docker và trên máy chủ Linux

Ví dụ `Dockerfile` tải trước và xác minh engine ngay tại thời điểm dựng image:

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

> **Container và máy chủ web:**
> - Nếu container của bạn không thể khởi tạo sandbox của Chromium, hãy truyền `--no-sandbox` tường minh qua `args=["--no-sandbox"]` (SDK không bao giờ tự động thêm cờ này).
> - Để chạy với `headless=False` trên máy chủ không màn hình, hãy sử dụng `Xvfb` (xem [bên dưới](#xử-lý-sự-cố)).
> - Khi chạy dưới `uvicorn` với `uvloop`, hãy truyền `--loop asyncio` để tránh hiện tượng treo đường ống (pipe) của tiến trình con.

## Xử lý sự cố

### Trang web chặn chế độ headless

Một số hệ thống chống bot vẫn kiểm tra các khác biệt về hành vi và kết xuất trong chế độ headless ngay cả khi đã vá ở tầng C++. Hãy chạy với `headless=False` trên một màn hình ảo bằng `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Sau đó khởi chạy kèm proxy dân cư SOCKS5/HTTP, hồ sơ bền vững, múi giờ/ngôn ngữ vùng trùng khớp, `headless=False` và `humanize=True` (xem ví dụ `launch_persistent_context()` ở đầu tệp README này).

Nếu tình trạng bị chặn vẫn tiếp diễn trên Linux, hãy kiểm tra mục [Cài đặt phông chữ trên Linux](#cài-đặt-phông-chữ-trên-linux).

### Trang web yêu cầu xác minh ở mọi lượt truy cập

Gọi `launch()` mà không có `profile` sẽ bắt đầu từ một thư mục tạm trống cùng `seed` mới ở mỗi lần chạy, vì vậy trang web coi mọi phiên đều là khách truy cập hoàn toàn mới chưa có cookie. Hãy chuyển sang dùng `profile="..."` hoặc `launch_persistent_context(...)` để cookie, `localStorage` và `seed` được lưu truyền qua các lần chạy.

### `ProfileBusyError`

Mỗi hồ sơ có tên hoặc `user_data_dir` chỉ có thể mở bởi một tiến trình tại cùng một thời điểm. Hãy gán một tên hồ sơ riêng cho từng worker chạy song song (`profile=f"worker-{i}"`). Các khóa tồn đọng do tiến trình bị sập để lại sẽ được phát hiện và dọn dẹp tự động.

### Tôi có cần chạy `playwright install chromium` không?

Không. Ombra chạy tệp nhị phân engine riêng của mình và không sử dụng Chromium mặc định của Playwright. Trên Linux, bạn chỉ cần cài các thư viện hệ thống và `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Cập nhật, chuyển kênh phát hành và hạ phiên bản engine

Cập nhật SDK lên bản phát hành mới nhất:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Thử nghiệm kênh `beta`, hoặc ghim / hạ phiên bản về một bản dựng engine cụ thể:

```python
# Ghim một bản dựng cụ thể cho một lần khởi chạy nhất định
browser = launch(version="158.0.8127.37-3")
```

```bash
# Thử nghiệm kênh beta (bỏ đặt OMBRA_VERSION — việc ghim chính xác hậu tố -N sẽ bỏ qua kênh)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Hoặc ghim / hạ phiên bản về một bản dựng engine chính xác
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Hoặc trỏ tới tệp nhị phân được biên dịch cục bộ
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper chặn bản dựng cục bộ

Các bản phát hành Ombra chính thức cho macOS Apple Silicon đều được ký bằng chứng chỉ Apple Developer ID và đã được công chứng. Nếu bạn chạy một bản dựng nhà phát triển cục bộ chưa ký và bị macOS cách ly (quarantine), hãy xóa thuộc tính cách ly một lần:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Chờ trên trang trong Python đồng bộ

Trong Playwright đồng bộ (synchronous), việc gọi một lệnh `time.sleep(15)` kéo dài ngay sau `page.goto()` sẽ làm tạm dừng vòng lặp sự kiện của Playwright, có thể khiến các trang xác minh bị đứng. Thay vào đó, hãy chờ theo từng khoảng ngắn kèm một lời gọi nhẹ tới context:

```python
import time

for _ in range(15):
    page.context.cookies()  # giữ cho Playwright tiếp tục xử lý mà không chạm vào DOM của trang
    time.sleep(1)
```

Trong Python bất đồng bộ hãy dùng `await asyncio.sleep(...)`; trong Node.js hãy dùng `await new Promise(r => setTimeout(r, ms))`. Đồng thời tránh gọi `page.wait_for_timeout()` quá thường xuyên và tránh các lệnh `page.evaluate()` không cần thiết trước bước kiểm tra để không phát sinh thêm lưu lượng CDP.

## Bảo mật

- **Tính xác thực và toàn vẹn của engine.** Trước khi giải nén, SDK xác minh chữ ký Ed25519 của gói tin phát hành đối chiếu với khóa công khai được ghim sẵn, đồng thời kiểm tra mã băm SHA-256 của cả tệp lưu trữ lẫn tệp thực thi.
- **CDP chỉ chạy cục bộ.** Cổng gỡ lỗi ràng buộc nghiêm ngặt vào `127.0.0.1`. Tuyệt đối không mở cổng CDP ra mạng công cộng mà không có lớp xác thực bổ sung — CDP trao toàn quyền điều khiển trình duyệt.
- **Cô lập thông tin bí mật.** Thông tin xác thực proxy chỉ tồn tại trong bộ nhớ của bộ chuyển tiếp loopback cục bộ và không bao giờ xuất hiện trong dòng lệnh tiến trình, siêu dữ liệu hồ sơ, nhật ký hay chi tiết lỗi.
- **Không thu thập dữ liệu từ xa.** SDK không gửi bất kỳ dữ liệu phân tích, báo cáo lỗi sập hay tín hiệu mạng ngầm nào.

Vui lòng báo cáo riêng tư các vấn đề bảo mật theo hướng dẫn tại [SECURITY.md](../../SECURITY.md).

## Sơ đồ kho lưu trữ

```text
.
├── README.md                    # README gốc (tiếng Anh)
├── translations/
│   ├── vi/README.md             # tệp này (Tiếng Việt)
│   ├── ru/README.md             # bản dịch tiếng Nga
│   └── <locale>/README.md       # 19 bản dịch ngôn ngữ khác
├── desktop/                     # Ombra Desktop (Tauri: danh mục Rust + giao diện Vue)
├── docs/
│   ├── architecture.md          # kiến trúc, ranh giới tin cậy, vòng đời
│   ├── sdk-contract.md          # hợp đồng khởi chạy v0.2, tùy chọn, lỗi, bất biến
│   ├── stealth-checkup.md       # phương pháp kiểm tra stealth (tiếng Anh)
│   ├── stealth-checkup.ru.md    # phương pháp kiểm tra stealth (tiếng Nga)
│   ├── versioning.md            # đánh phiên bản cho SDK, engine và client
│   └── desktop/                 # hướng dẫn hồ sơ và khóa cục bộ của Desktop
├── sdks/
│   ├── manifest.json            # danh bạ SDK dạng máy đọc được
│   ├── README.md                # cấu trúc SDK và quy tắc đóng góp
│   ├── python/                  # SDK Python (phát hành dưới tên ombrabrowser)
│   ├── node/                    # SDK Node.js / TypeScript (phát hành dưới tên @ombralabs/sdk)
│   └── ...                      # khung mã mẫu theo hợp đồng cho các ngôn ngữ khác (Go, Rust, C#, Java, PHP, Ruby)
├── tools/check_repo.py          # trình kiểm tra cấu trúc, schema và liên kết (CI)
└── .github/workflows/ci.yml
```

Kho lưu trữ này chứa hợp đồng SDK, các schema, bộ kiểm thử tuân thủ, tài liệu hướng dẫn và mã nguồn Ombra Desktop. Các bản vá của engine Chromium được duy trì ở một kho lưu trữ riêng, còn các bản dựng đã biên dịch được phát hành qua [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## Câu hỏi thường gặp (FAQ)

### Đây có phải là một bản fork của Playwright không?

Không. SDK kết nối client Playwright (hoặc Puppeteer) chính thức tới Ombra Chromium qua CDP cục bộ. Mọi kiểu dữ liệu, locator, lệnh chờ và đối tượng trang đều giữ nguyên theo chuẩn.

### Ombra có miễn phí không và tôi có cần khóa bản quyền không?

Mã nguồn SDK trong kho lưu trữ này là mã nguồn mở theo Giấy phép Apache 2.0. Các bản dựng engine hiện tại và trình quản lý hồ sơ cục bộ Ombra Desktop chạy hoàn toàn miễn phí và độc lập — không cần tài khoản, khóa bản quyền, mã phần cứng hay giới hạn số lượng hồ sơ. `license_key` và `OMBRA_LICENSE_KEY` chỉ cần dùng cho các bản dựng cấp phép đời cũ.

### Tôi có cần cài đặt Ombra Desktop để sử dụng SDK không?

Không. SDK tự khởi tạo engine trực tiếp dưới dạng tiến trình con, rất phù hợp cho kịch bản tự động hóa, container và CI. Ombra Desktop là tùy chọn bổ sung nếu bạn muốn quản lý danh mục hồ sơ cục bộ thông qua giao diện đồ họa.

### Ombra khác gì với `playwright-stealth`?

`playwright-stealth` chèn JavaScript vào trang lên trên trình duyệt thông thường, và các bộ phát hiện hiện đại thường dễ dàng nhận ra chính những đoạn mã vá đó. Ombra biên dịch các chỉnh sửa của mình vào thẳng mã nguồn Chromium, và SDK không chèn bất kỳ kịch bản nào vào trang.

### Tôi có thể dùng proxy riêng của mình không?

Có. Hãy truyền proxy dạng `http://`, `https://` hoặc `socks5://` vào tham số `proxy`. Khi có thông tin xác thực, SDK sẽ chạy một bộ chuyển tiếp loopback cục bộ để chúng không bao giờ lộ ra trong tham số tiến trình. Lưu ý rằng client `context.request` / `page.request` tích hợp sẵn của Playwright có thể bỏ qua thiết lập proxy cấp trình duyệt — để đảm bảo lưu lượng đi qua proxy, hãy gọi `fetch()` từ ngữ cảnh của trang.

### Những phiên bản Playwright và Puppeteer nào được hỗ trợ?

SDK Python yêu cầu Playwright `>=1.60,<2.0` (được cài tự động cùng `ombrabrowser`). SDK Node.js hỗ trợ `playwright-core@^1.60.0` hoặc `puppeteer-core >=22.0.0`. Xem [hướng dẫn đánh phiên bản](../../docs/versioning.md) để nắm các quy tắc tương thích.

### Ombra có đảm bảo vượt qua mọi bài kiểm tra bot không?

Không. Phát hiện bot là một mục tiêu luôn biến đổi, phụ thuộc vào từng trang web, khu vực, độ uy tín IP, lịch sử hồ sơ và phiên bản bộ phát hiện. Hãy sử dụng [phương pháp kiểm tra stealth](../../docs/stealth-checkup.md) để đo lường và theo dõi khách quan một cấu hình cụ thể.

### Ombra được xây dựng cho những mục đích sử dụng nào?

Ombra được xây dựng cho tự động hóa được ủy quyền, kiểm thử QA, giám sát hệ thống, nghiên cứu và quản lý các hồ sơ làm việc cô lập. Hành vi truy cập trái phép, nhồi thông tin đăng nhập (credential stuffing) và lạm dụng đều không được hỗ trợ.

## Đóng góp

Hướng dẫn đóng góp nằm trong [CONTRIBUTING.md](../../CONTRIBUTING.md), chuẩn mực cộng đồng trong [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) và hướng dẫn riêng cho SDK tại [sdks/README.md](../../sdks/README.md).

- Cập nhật [Hợp đồng SDK](../../docs/sdk-contract.md) và [các schema](../../AGENTS.md#sdk-launch-options-and-binary-info-schemas) trước khi thêm tùy chọn khởi chạy mới.
- Khi thay đổi hành vi của SDK, hãy cập nhật đồng bộ phần triển khai, bài kiểm thử và bộ kiểm thử dùng chung trong [conformance](../../AGENTS.md#sdk-conformance-and-stealth-invariants).
- Chạy `python3 tools/check_repo.py` trước khi mở pull request để xác thực bố cục kho lưu trữ và các liên kết.

## Giấy phép

Mã nguồn SDK trong kho lưu trữ này được cấp phép theo [Giấy phép Apache 2.0](../../LICENSE). Giấy phép này không cấp quyền đối với nhãn hiệu Ombra, engine Ombra Chromium hay Ombra Desktop — xem [NOTICE](../../NOTICE) để biết thêm điều khoản về nhãn hiệu và các thành phần bên thứ ba.

## Liên kết

- 🌐 **Trang web** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Bản phát hành (engine & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Nhật ký thay đổi** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Báo lỗi & đề xuất tính năng** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Tổ chức** — [Ombra Labs](https://github.com/ombralabs)
