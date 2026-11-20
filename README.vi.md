# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Trong Python và Node.js, `launch()` khởi chạy Ombra Chromium và trả về đối tượng `Browser` của Playwright. Để dùng Puppeteer trong Node.js, hãy gọi `launchPuppeteer()`.

**[Cài đặt](#cài-đặt)** · <a href="README.md">English</a>

<details>
<summary>Ngôn ngữ</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## Kiểm soát dấu vân tay trong Chromium

Ombra kiểm soát dấu vân tay ngay trong Chromium, từ canvas, WebGL, âm thanh và phông chữ đến số bộ xử lý logic, đường bao của phần tử, chuỗi nhận dạng GPU, múi giờ và tín hiệu tự động hóa. Nhân trình duyệt dùng ngăn xếp mạng TLS và HTTP/2 của Chromium. Tiến trình trình duyệt xử lý đầu vào mô phỏng thao tác của người dùng.

SDK khởi chạy nhân trình duyệt trên máy và kết nối ứng dụng khách tự động hóa qua Chrome DevTools Protocol (CDP). Bạn có thể chạy SDK trong tập lệnh, container hoặc tác vụ CI mà không cần cài ứng dụng Ombra Desktop.

## Trạng thái

Các ví dụ dùng hai gói alpha đã phát hành cho Python và Node.js. Kho mã này cũng duy trì hợp đồng khởi chạy dùng chung và mã khung cho tám SDK.

| Thành phần | Trạng thái |
|---|---|
| [Hợp đồng SDK](docs/sdk-contract.md) | Bản nháp `0.1.0` |
| SDK Python | `0.1.3` alpha · [`ombrabrowser` trên PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK Node.js | `0.1.0` alpha · [`@ombralabs/sdk` trên npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Lược đồ dùng chung](spec/schemas) | Tùy chọn khởi chạy và siêu dữ liệu của tệp nhị phân |
| [Kiểm tra tính nhất quán giữa các ngôn ngữ](conformance) | Các ca kiểm thử dùng chung cho hai SDK |
| [Kiểm tra tàng hình](docs/stealth-checkup.md) | Tiêu chí kiểm thử và mẫu báo cáo |

## Cài đặt

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Nếu dùng Puppeteer, hãy cài `puppeteer-core` thay cho `playwright-core`. Bạn có thể tra các phiên bản ứng dụng khách và môi trường chạy được hỗ trợ trên [trang gói npm](https://www.npmjs.com/package/@ombralabs/sdk).

SDK kiểm tra đường dẫn bạn truyền qua `binary_path` trong Python hoặc `binaryPath` trong Node.js trước. Sau đó, SDK lần lượt kiểm tra `OMBRA_BINARY_PATH`, thư mục nhân trình duyệt của ứng dụng máy tính và bộ nhớ đệm của SDK. Nếu không tìm thấy nhân trình duyệt, SDK sẽ tải xuống và xác minh tệp nhị phân.

Để tắt tải xuống, truyền `download=False` trong Python hoặc `download: false` trong Node.js. Để chuẩn bị nhân trình duyệt mà không mở trình duyệt, hãy gọi `ensure_binary()` trong Python hoặc `ensureBinary()` trong Node.js.

## Bắt đầu nhanh

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Khi dùng hồ sơ có tên, hãy mở trang trong ngữ cảnh trình duyệt có sẵn của hồ sơ để dùng lại cookie và dữ liệu lưu trữ của trang web. Ví dụ này cũng đặt proxy.

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

Gọi `launchPuppeteer()` để nhận đối tượng `Browser` của Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Chuyển đổi không cần viết lại

Để chuyển một tập lệnh Python đang dùng Playwright sang Ombra, hãy cài `ombrabrowser`, sửa câu lệnh import và lời gọi khởi chạy. Các phương thức của trang, kiểu dữ liệu và bộ chọn vẫn do Playwright cung cấp.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Trong Node.js, chỉ cần sửa hai dòng tương ứng.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Cách hoạt động

```mermaid
flowchart LR
    Script["Tập lệnh của bạn<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + cầu nối CDP"]
    Engine["Ombra Chromium<br/>nhân trình duyệt đã vá"]
    Client["Ứng dụng khách tự động hóa gốc"]
    Profile[("Hồ sơ<br/>seed · cookie · tiện ích mở rộng")]

    Script -->|launch()| SDK
    SDK -->|khởi chạy| Engine
    SDK -->|kết nối qua CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` tìm nhân trình duyệt, tải xuống nếu cần rồi xác minh tệp nhị phân.
2. SDK chọn thư mục hồ sơ và giá trị khởi tạo (seed). Nếu proxy yêu cầu xác thực, SDK khởi động bộ chuyển tiếp cục bộ.
3. SDK khởi chạy Chromium với hồ sơ, các tùy chọn đã chọn và cổng gỡ lỗi trên địa chỉ loopback.
4. Khi `DevToolsActivePort` sẵn sàng, SDK kết nối Playwright hoặc Puppeteer qua CDP rồi trả về đối tượng `Browser` của ứng dụng khách đó.
5. `browser.close()` dừng nhân trình duyệt và giải phóng khóa hồ sơ.

Sau khi khởi chạy, ứng dụng khách gửi lệnh điều khiển trang trực tiếp đến Chromium.

## Ma trận SDK

| Môi trường chạy | Gói đã phát hành | Đối tượng trình duyệt |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Kho mã còn có thư mục cho sáu SDK khác. [Danh mục SDK](sdks/manifest.json) liệt kê các gói và ứng dụng khách dự kiến. [Hướng dẫn SDK](sdks/README.md) mô tả cách tổ chức thư mục.

| Môi trường chạy dự kiến | Gói dự kiến | Ứng dụng khách hoặc kiểu trả về |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Tùy chọn khởi chạy

Tên tùy chọn trong bảng theo API Python và hợp đồng SDK. Node.js dùng cách viết camelCase, chẳng hạn `timeoutMs`, `userDataDir` và `binaryPath`.

| Tùy chọn | Mặc định | Ý nghĩa |
|---|---|---|
| `headless` | `true` | Chạy nhân trình duyệt không có cửa sổ |
| `proxy` | không có | URL hoặc đối tượng cấu hình proxy. Proxy yêu cầu xác thực sẽ dùng bộ chuyển tiếp cục bộ |
| `fingerprint` | không có | Giá trị seed và các thiết lập về hệ điều hành, múi giờ, ngôn ngữ và khu vực, màn hình, GPU |
| `profile` | không có | Hồ sơ có tên, lưu lại cookie, dữ liệu trang web và giá trị seed |
| `user_data_dir` | tạm thời | Thư mục hồ sơ chỉ định rõ, không dùng đồng thời với `profile` |
| `args` | `[]` | Các cờ bổ sung cho nhân trình duyệt, được truyền nguyên vẹn |
| `timeout_ms` | `30000` | Thời gian tối đa để khởi chạy và kết nối CDP, tính bằng mili giây |
| `humanize` | mặc định của nhân trình duyệt | `false`, `true` hoặc một cấu hình sẵn |
| `captcha` | `false` | Bật mô-đun của nhân trình duyệt với các giới hạn tùy chọn |
| `binary_path` | được xác định | Dùng một tệp nhị phân cụ thể của nhân trình duyệt |
| `download` | `true` | Tải tệp nhị phân còn thiếu của nhân trình duyệt |

[Hợp đồng SDK](docs/sdk-contract.md) liệt kê tất cả tùy chọn khởi chạy và giải thích các loại lỗi cũng như cách hoạt động của hồ sơ.

## Quản lý tệp nhị phân

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK kiểm tra mã SHA-256 của tệp nhị phân trước khi khởi chạy. Hãy bật kiểm tra này trong môi trường vận hành. `OMBRA_SKIP_CHECKSUM=1` chỉ dành cho bản dựng phát triển trên máy cục bộ.

## Cấu hình

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `OMBRA_BINARY_PATH` | chưa đặt | Tệp nhị phân của nhân trình duyệt được chỉ định rõ |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Tệp nhị phân và hồ sơ có tên do SDK quản lý |
| `OMBRA_DOWNLOAD_URL` | điểm cuối bản phát hành | URL gốc để tải tệp nhị phân |
| `OMBRA_VERSION` | phiên bản tương thích mới nhất | Phiên bản nhân trình duyệt cần xác định |
| `OMBRA_AUTO_UPDATE` | `true` | Kiểm tra nhân trình duyệt mới hơn khi khởi chạy |
| `OMBRA_SKIP_CHECKSUM` | `false` | Chỉ dùng khi phát triển |
| `OMBRA_LICENSE_KEY` | chưa đặt | Được truyền cho nhân trình duyệt |
| `OMBRA_TIMEOUT_MS` | `30000` | Thời gian chờ khởi chạy mặc định, tính bằng mili giây |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

SDK lần lượt kiểm tra tùy chọn khởi chạy, biến môi trường, siêu dữ liệu của hồ sơ và giá trị mặc định, rồi dùng giá trị đầu tiên tìm thấy.

## So sánh

| Tính năng | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright hoặc Puppeteer |
| Mức độ vá | không có | JavaScript trong trang | cờ cấu hình | mã nguồn của nhân trình duyệt |
| Seed tạo dấu vân tay | không | không | một phần | theo hồ sơ |
| Đầu vào giống người thật | không | không | không | nhân trình duyệt |
| Cô lập hồ sơ | ngữ cảnh trình duyệt | ngữ cảnh trình duyệt | không | thư mục dữ liệu người dùng |
| Chuyển đổi không cần viết lại | – | đổi câu import | viết lại | đổi câu import |

Kết quả phát hiện phụ thuộc vào trang web, IP đầu ra và hồ sơ. Cách đo được mô tả trong [hướng dẫn kiểm tra tàng hình](docs/stealth-checkup.md).

## Tính tàng hình là thuộc tính của nhân trình duyệt

Nhân trình duyệt áp dụng các thiết lập dấu vân tay. SDK chuyển giá trị seed của hồ sơ và các tùy chọn khởi chạy đã chỉ định cho nhân trình duyệt.

| Lớp | Nơi Ombra xử lý |
|---|---|
| TLS và HTTP/2 | Ngăn xếp mạng riêng của Chromium, được khớp phiên bản với bản dựng nhân trình duyệt |
| Danh tính trình duyệt | Các bản vá trong mã nguồn của nhân trình duyệt dùng giá trị seed của hồ sơ |
| Dấu hiệu tự động hóa | Nhân trình duyệt xử lý các tín hiệu WebDriver. SDK không gọi `Runtime.enable` |
| Đầu vào | Con trỏ, bàn phím và thao tác cuộn được mô phỏng như người thật ngay trong tiến trình trình duyệt |
| Tính nhất quán của mạng | Phân giải múi giờ và ngôn ngữ có tính đến proxy |
| Trạng thái | Một thư mục dữ liệu người dùng riêng cho mỗi hồ sơ |

### Ranh giới của SDK

- Cổng gỡ lỗi CDP chỉ chấp nhận kết nối từ máy cục bộ qua địa chỉ loopback.
- SDK không ghi thông tin xác thực proxy, khóa giấy phép hoặc cookie vào nhật ký. SDK cũng không gửi dữ liệu đo từ xa.
- Hồ sơ hiện có giữ nguyên giá trị seed, trừ khi bạn chỉ định giá trị mới.
- SDK không chèn tập lệnh tàng hình bằng `addScriptToEvaluateOnNewDocument` hay `evaluateOnNewDocument`, cũng không sửa thuộc tính của trang.
- Để kiểm tra trạng thái sẵn sàng, SDK dùng điểm cuối HTTP của CDP hoặc `Browser.getVersion`. SDK không gọi `Runtime.enable` cho bước này.
- Nhân trình duyệt cung cấp thông tin nhận dạng. SDK không ghi đè user agent hay danh tính qua Playwright hoặc Puppeteer và không gọi `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` hay `setDeviceMetricsOverride`.
- SDK không tự thêm `--enable-automation`, `--disable-blink-features=AutomationControlled` hay `--no-sandbox`.

## Kiểm tra tàng hình

Hãy chạy các bài kiểm tra này trên bản dựng nhân trình duyệt, ứng dụng khách tự động hóa và hồ sơ mà bạn định dùng.

| Lớp | Mục tiêu ví dụ | Tiêu chí đạt |
|---|---|---|
| L0 Vận chuyển | TrackMe, bài kiểm tra rò rỉ IP/WebRTC | Chỉ nhìn thấy IP đầu ra. JA4 và HTTP/2 khớp với bản dựng Chromium của nhân trình duyệt |
| L1 Danh tính | Đầu dò cục bộ, Sannysoft, Intoli | Không mâu thuẫn giữa UA, UA-CH, nền tảng, GPU, phông chữ, màn hình |
| L2 Dấu vân tay | CreepJS, FingerprintJS, BrowserScan | Không có dấu hiệu chạy headless hoặc giả mạo. Dấu vân tay ổn định qua các lần tải lại trang |
| L3 Tự động hóa | rebrowser, brotector, botd | Không rò rỉ CDP, script khởi tạo hay WebDriver |
| L4 Hành vi | Độ chân thực của đầu vào, dấu vết mô phỏng người thật, kiểm tra nhanh Cloudflare | Sự kiện tin cậy, thứ tự chân thực, thử thách được giải |
| L5 Ổn định | Seed, worker, iframe, truy cập khác nguồn | Cùng một giá trị seed tạo ra cùng một danh tính trình duyệt qua các lần khởi chạy |

Quy trình kiểm thử giải thích các trạng thái kết quả, cách xử lý sự cố và cách lập báo cáo. Bạn có thể đọc [bản tiếng Anh](docs/stealth-checkup.md) hoặc [bản tiếng Nga](docs/stealth-checkup.ru.md).

Hãy ghi lại bản dựng nhân trình duyệt, phiên bản ứng dụng khách, thiết lập hồ sơ, IP đầu ra của proxy và phiên bản trình phát hiện cùng mỗi kết quả để có thể tái tạo và so sánh các lần chạy.

## Bản đồ kho mã nguồn

```text
.
├── README.md                  # bản gốc tiếng Anh
├── README.ru.md               # bản dịch tiếng Nga
├── desktop/                   # trình quản lý hồ sơ ngoại tuyến
├── docs/
│   ├── desktop/               # tài liệu về trình quản lý hồ sơ
│   ├── architecture.md        # thành phần, luồng khởi chạy, ranh giới
│   ├── sdk-contract.md        # hợp đồng khởi chạy v0 và hành vi của SDK
│   ├── stealth-checkup.md     # phương pháp kiểm tra tàng hình và cẩm nang vận hành
│   ├── stealth-checkup.ru.md  # bản dịch tiếng Nga
│   └── versioning.md          # tương thích giữa SDK, nhân trình duyệt và ứng dụng khách
├── spec/
│   └── schemas/               # JSON Schema cho tùy chọn khởi chạy và thông tin tệp nhị phân
├── sdks/
│   ├── manifest.json          # sổ đăng ký SDK dạng máy đọc được
│   ├── README.md              # bố cục và quy tắc đóng góp
│   ├── _template/             # mã khung cho SDK của ngôn ngữ mới
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # các ca khởi chạy và tàng hình độc lập với ngôn ngữ
├── tools/check_repo.py        # kiểm tra cấu trúc và liên kết (CI)
└── .github/workflows/ci.yml
```

Kho mã này chứa mã khung của các SDK, hợp đồng khởi chạy, các ca kiểm thử tính nhất quán và trình quản lý hồ sơ ngoại tuyến. Nhân Chromium và bản phát hành Desktop 1.2.1 đầy đủ có kho mã riêng. [Mã nguồn và hướng dẫn tạo bản dựng Desktop](desktop/README.md) · [Tài liệu về trình quản lý hồ sơ](docs/desktop/README.md)

## Hợp đồng

- `launch(options)` khởi chạy nhân trình duyệt và trả về đối tượng `Browser` của ứng dụng khách. Sau đó, ứng dụng khách giao tiếp trực tiếp với Chromium qua CDP.
- Trước khi khởi chạy, SDK kiểm tra nền tảng và mã SHA-256 của tệp nhị phân. Nếu thiếu tệp và tùy chọn tải xuống đang bật, SDK sẽ tải tệp về.
- Hồ sơ có tên giữ lại cookie, dữ liệu lưu trữ của trang web và giá trị seed giữa các lần khởi chạy.
- Nếu khởi chạy thất bại, SDK dọn dẹp tiến trình mà nó đã tạo và phát sinh lỗi có kiểu cụ thể. Bên gọi quyết định có thử lại hay không.
- SDK, nhân trình duyệt và ứng dụng khách tự động hóa có các dải phiên bản riêng. Để xem phiên bản của bản dựng Chromium, hãy gọi `binary_info()` trong Python hoặc `binaryInfo()` trong Node.js.

## Tương thích

| Thành phần | Phạm vi hỗ trợ |
|---|---|
| Nhân trình duyệt | Bản dựng do SDK chọn. Tra cứu bằng `binary_info()` hoặc `binaryInfo()` |
| macOS | Apple Silicon và Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10 trở lên với một phiên bản Playwright được hỗ trợ |
| Node.js | 20 trở lên với một phiên bản Playwright hoặc Puppeteer được hỗ trợ |

SDK và nhân trình duyệt có phiên bản độc lập. Nếu chúng không tương thích, SDK phát sinh lỗi có kiểu cụ thể kèm cả hai số phiên bản.

## Đóng góp

Quy trình xét duyệt thay đổi được mô tả trong [hướng dẫn đóng góp](CONTRIBUTING.md). Các bước tạo bản dựng có trong [hướng dẫn SDK](sdks/README.md).

- Khi thay đổi hành vi của SDK, hãy cập nhật phần triển khai liên quan và thêm một bài kiểm thử hoặc ca kiểm thử tính nhất quán dùng chung.
- Để thêm SDK cho ngôn ngữ mới, hãy sao chép [mẫu SDK](sdks/_template), đăng ký trong [danh mục](sdks/manifest.json) rồi mở một pull request nháp.
- Khi thêm tùy chọn khởi chạy, hãy cập nhật [hợp đồng SDK](docs/sdk-contract.md) và [các lược đồ](spec/schemas) trước.
- Hãy thực hiện thay đổi liên quan đến tính tàng hình của nhân trình duyệt trong kho mã của nhân. SDK vẫn phải đạt các tiêu chí kiểm tra.
- Vui lòng báo cáo riêng các vấn đề bảo mật theo [chính sách bảo mật](SECURITY.md).

## Câu hỏi thường gặp

### Ombra có phải là một bản fork của Playwright không?

Không. SDK kết nối ứng dụng khách Playwright chính thức với Ombra Chromium. Bạn vẫn có thể dùng các kiểu dữ liệu, hàm trợ giúp và đối tượng trang của Playwright.

### Tôi có cần cài ứng dụng Ombra Desktop không?

SDK khởi chạy nhân trình duyệt trực tiếp. Bạn có thể cài ứng dụng máy tính nếu muốn quản lý hồ sơ thủ công.

### Ombra khác playwright-stealth như thế nào?

Các thay đổi về dấu vân tay của Ombra được biên dịch vào Chromium. SDK không sửa các tập lệnh của trang.

### Ombra có giải được CAPTCHA không?

Nhân trình duyệt có mô-đun CAPTCHA tùy chọn. Phạm vi hỗ trợ phụ thuộc vào loại tác vụ, bản dựng của nhân và các mô hình có sẵn. SDK chuyển các tùy chọn của từng lần khởi chạy và cung cấp các lệnh điều khiển mô-đun qua CDP.

### Tôi có thể dùng proxy riêng không?

Có. Hãy truyền proxy vào `launch()`. Với proxy yêu cầu xác thực, bộ chuyển tiếp cục bộ giúp thông tin xác thực không xuất hiện trên dòng lệnh của nhân trình duyệt.

### SDK hỗ trợ những phiên bản Playwright và Puppeteer nào?

Mỗi SDK khai báo các phiên bản ứng dụng khách được hỗ trợ trong tệp kê khai gói. Các ứng dụng khách là những gói phụ thuộc riêng. Xem phạm vi hỗ trợ trong [hướng dẫn về phiên bản](docs/versioning.md).

### Ombra có vượt qua được mọi hệ thống phát hiện bot không?

Kết quả phụ thuộc vào trang web, khu vực, uy tín của IP đầu ra, phiên bản công cụ phát hiện và thiết lập hồ sơ. [Hướng dẫn kiểm tra tàng hình](docs/stealth-checkup.md) mô tả cách đo kết quả với một cấu hình cụ thể.

## Giấy phép

Mã nguồn SDK trong kho mã nguồn này được cấp phép theo [Apache License 2.0](LICENSE). Giấy phép không trao quyền đối với nhân trình duyệt Ombra, tên Ombra hoặc logo. Xem [NOTICE](NOTICE) để biết thông tin về nhãn hiệu và ghi công bên thứ ba.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
