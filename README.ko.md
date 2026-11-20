# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Python과 Node.js에서 `launch()`를 호출하면 Ombra Chromium이 시작되고 Playwright의 `Browser`가 반환됩니다. Node.js에서 Puppeteer를 쓰려면 `launchPuppeteer()`를 호출하세요.

**[설치](#설치)** · <a href="README.md">English</a>

<details>
<summary>언어</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## Chromium의 지문 제어

Ombra는 Chromium에 지문 제어 기능을 구현합니다. 제어 대상은 캔버스, WebGL, 오디오, 글꼴, 논리 프로세서 수, 요소의 경계, GPU 문자열, 시간대, 자동화 신호입니다. 엔진은 Chromium의 TLS 및 HTTP/2 네트워크 스택을 사용하며, 사람의 조작을 모사하는 입력은 브라우저 프로세스 안에서 처리합니다.

SDK는 로컬에서 엔진을 시작하고 Chrome DevTools Protocol(CDP)로 자동화 클라이언트를 연결합니다. Ombra 데스크톱 앱을 설치할 필요 없이 스크립트, 컨테이너, CI 작업에서 실행할 수 있습니다.

## 상태

예제에서는 배포된 Python 및 Node.js 알파 패키지를 사용합니다. 이 저장소에서는 공통 실행 계약과 SDK 8개의 기본 프로젝트 구조도 관리합니다.

| 구성 요소 | 상태 |
|---|---|
| [SDK 계약](docs/sdk-contract.md) | 초안 `0.1.0` |
| Python SDK | `0.1.3` 알파 · [PyPI의 `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| Node.js SDK | `0.1.0` 알파 · [npm의 `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| [공용 스키마](spec/schemas) | 실행 옵션과 엔진 바이너리 메타데이터 |
| [언어 간 적합성 검사](conformance) | 두 SDK가 공유하는 테스트 사례 |
| [스텔스 점검](docs/stealth-checkup.md) | 검사 기준과 보고서 양식 |

## 설치

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Puppeteer를 쓰려면 `playwright-core` 대신 `puppeteer-core`를 설치하세요. 지원하는 클라이언트 및 런타임 버전은 [npm 패키지 페이지](https://www.npmjs.com/package/@ombralabs/sdk)에서 확인할 수 있습니다.

SDK는 먼저 Python의 `binary_path` 또는 Node.js의 `binaryPath`로 지정한 경로를 확인합니다. 이어서 `OMBRA_BINARY_PATH`, 데스크톱 앱의 엔진 디렉터리, SDK 캐시 순으로 찾습니다. 엔진을 찾지 못하면 다운로드한 뒤 검증합니다.

다운로드를 끄려면 Python에서는 `download=False`, Node.js에서는 `download: false`를 지정하세요. 브라우저를 열지 않고 엔진을 준비하려면 Python의 `ensure_binary()` 또는 Node.js의 `ensureBinary()`를 호출하세요.

## 빠른 시작

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

이름이 있는 프로필의 쿠키와 사이트 저장소를 다시 쓰려면 기존 컨텍스트에서 페이지를 여세요. 이 예제에서는 프록시도 설정합니다.

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

Puppeteer의 `Browser`를 받으려면 `launchPuppeteer()`를 호출하세요.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## 드롭인 마이그레이션

Python에서 Playwright 스크립트를 옮기려면 `ombrabrowser`를 설치하고 import 구문과 브라우저 실행 코드를 바꾸세요. 페이지 메서드, 타입, 선택자는 계속 Playwright에서 제공합니다.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

Node.js에서도 두 줄을 바꾸면 됩니다.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## 동작 방식

```mermaid
flowchart LR
    Script["사용자 스크립트<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP 브리지"]
    Engine["Ombra Chromium<br/>패치된 엔진"]
    Client["네이티브 자동화 클라이언트"]
    Profile[("프로필<br/>시드 · 쿠키 · 확장 프로그램")]

    Script -->|launch()| SDK
    SDK -->|프로세스 생성| Engine
    SDK -->|CDP로 연결| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()`는 엔진을 찾고, 필요하면 다운로드한 뒤 바이너리를 검증합니다.
2. SDK는 프로필 디렉터리와 시드를 선택합니다. 프록시 인증이 필요하면 로컬 릴레이를 시작합니다.
3. 선택한 프로필, 실행 옵션, 루프백 디버깅 포트로 Chromium을 시작합니다.
4. `DevToolsActivePort`가 준비되면 CDP로 Playwright 또는 Puppeteer를 연결하고 해당 클라이언트의 `Browser`를 반환합니다.
5. `browser.close()`는 엔진을 중지하고 프로필 잠금을 해제합니다.

실행 후에는 클라이언트가 페이지 명령을 Chromium에 직접 보냅니다.

## SDK 매트릭스

| 런타임 | 배포된 패키지 | 브라우저 객체 |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

이 저장소에는 다른 SDK 6개를 위한 디렉터리도 있습니다. 개발 예정인 패키지와 클라이언트는 [SDK 매니페스트](sdks/manifest.json)에서, 디렉터리 구조는 [SDK 가이드](sdks/README.md)에서 확인할 수 있습니다.

| 대상 런타임 | 배포 예정 패키지 | 클라이언트 또는 반환 타입 |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## 실행 옵션

표의 옵션 이름은 Python API와 SDK 계약을 따릅니다. Node.js에서는 `timeoutMs`, `userDataDir`, `binaryPath`처럼 camelCase를 사용합니다.

| 옵션 | 기본값 | 의미 |
|---|---|---|
| `headless` | `true` | 창 없이 엔진 실행 |
| `proxy` | 없음 | 프록시 URL 또는 설정 객체. 인증이 필요한 프록시는 로컬 릴레이 사용 |
| `fingerprint` | 없음 | 시드와 운영체제, 시간대, 로캘, 화면, GPU 설정 |
| `profile` | 없음 | 쿠키, 스토리지, 시드를 유지하는 명명된 프로필 |
| `user_data_dir` | 임시 | 명시적 프로필 디렉터리, `profile`과 함께 사용할 수 없음 |
| `args` | `[]` | 추가 엔진 플래그, 변경 없이 그대로 전달됨 |
| `timeout_ms` | `30000` | 실행과 CDP 연결에 허용되는 시간(밀리초) |
| `humanize` | 엔진 기본값 | `false`, `true` 또는 프리셋 |
| `captcha` | `false` | 선택적 제한을 두고 엔진 모듈 활성화 |
| `binary_path` | 자동 결정 | 특정 엔진 바이너리 사용 |
| `download` | `true` | 없는 엔진 바이너리 내려받기 |

전체 실행 옵션과 오류 타입, 프로필 동작은 [SDK 계약](docs/sdk-contract.md)에서 확인할 수 있습니다.

## 바이너리 관리

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK는 실행 전에 엔진의 SHA-256 체크섬을 검증합니다. 운영 환경에서는 검증을 켜 두세요. `OMBRA_SKIP_CHECKSUM=1`은 로컬 개발 빌드용입니다.

## 구성

| 변수 | 기본값 | 의미 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 설정 안 됨 | 명시적 엔진 바이너리 |
| `OMBRA_CACHE_DIR` | `~/.ombra` | 관리되는 바이너리와 명명된 프로필 |
| `OMBRA_DOWNLOAD_URL` | 릴리스 엔드포인트 | 바이너리 다운로드용 기준 URL |
| `OMBRA_VERSION` | 최신 호환 버전 | 결정할 엔진 버전 |
| `OMBRA_AUTO_UPDATE` | `true` | 실행 시 더 새로운 엔진 확인 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 개발 전용 |
| `OMBRA_LICENSE_KEY` | 설정 안 됨 | 엔진에 전달됨 |
| `OMBRA_TIMEOUT_MS` | `30000` | 기본 실행 제한 시간(밀리초) |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

SDK는 실행 옵션, 환경 변수, 프로필 메타데이터, 기본값 순으로 확인해 처음 찾은 값을 사용합니다.

## 비교

| 기능 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright 또는 Puppeteer |
| 패치 수준 | 없음 | 페이지 내 JavaScript | 구성 플래그 | 엔진 소스 코드 |
| 지문 시드 | 없음 | 없음 | 부분 지원 | 프로필별 |
| 인간화된 입력 | 없음 | 없음 | 없음 | 엔진 |
| 프로필 격리 | 브라우저 컨텍스트 | 브라우저 컨텍스트 | 없음 | 사용자 데이터 디렉터리 |
| 드롭인 마이그레이션 | — | import 변경 | 재작성 | import 변경 |

탐지 결과는 사이트, 출구 IP, 프로필에 따라 달라집니다. 측정 방법은 [스텔스 점검](docs/stealth-checkup.md)에 설명되어 있습니다.

## 스텔스는 엔진의 속성입니다

지문 설정은 엔진이 적용합니다. SDK는 프로필 시드와 명시적 실행 옵션을 엔진에 전달합니다.

| 계층 | Ombra가 처리하는 지점 |
|---|---|
| TLS 및 HTTP/2 | 엔진 빌드에 버전을 맞춘 Chromium 자체 네트워크 스택 |
| 브라우저 아이덴티티 | 프로필 시드에 따라 적용되는 소스 수준 엔진 패치 |
| 자동화 노출 지점 | WebDriver 신호에 대한 엔진 패치, SDK는 `Runtime.enable`을 호출하지 않음 |
| 입력 | 브라우저 프로세스 내부에서 처리되는 인간화된 포인터, 키보드, 스크롤 |
| 네트워크 일관성 | 프록시를 고려한 시간대 및 로캘 확인 |
| 상태 | 프로필마다 별도의 사용자 데이터 디렉터리 |

### SDK 경계

- CDP 디버깅 포트는 루프백을 통한 로컬 연결만 허용합니다.
- SDK는 프록시 인증 정보, 라이선스 키, 쿠키를 로그에 기록하지 않습니다. 원격 측정 데이터도 전송하지 않습니다.
- 새 시드를 명시적으로 지정하지 않는 한 기존 프로필은 같은 시드를 유지합니다.
- SDK는 `addScriptToEvaluateOnNewDocument`나 `evaluateOnNewDocument`로 스텔스 스크립트를 삽입하거나 페이지 속성을 변경하지 않습니다.
- 준비 상태는 CDP HTTP 엔드포인트나 `Browser.getVersion`으로 확인합니다. 이때 `Runtime.enable`을 호출하지 않습니다.
- 브라우저 식별 정보는 엔진이 제공합니다. SDK는 Playwright나 Puppeteer에서 사용자 에이전트나 식별 정보를 덮어쓰지 않으며 `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`를 호출하지 않습니다.
- SDK는 `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`를 임의로 추가하지 않습니다.

## 스텔스 점검

다음 점검은 실제로 사용할 엔진 빌드, 자동화 클라이언트, 프로필을 대상으로 수행합니다.

| 계층 | 예시 대상 | 통과 기준 |
|---|---|---|
| L0 전송 | TrackMe, IP/WebRTC 유출 검사 | 출구 IP만 보여야 하며 JA4와 HTTP/2가 엔진의 Chromium 빌드와 일치해야 함 |
| L1 아이덴티티 | 로컬 프로브, Sannysoft, Intoli | UA, UA-CH, 플랫폼, GPU, 글꼴, 화면 사이에 모순이 없어야 함 |
| L2 지문 | CreepJS, FingerprintJS, BrowserScan | 헤드리스 모드나 위조를 나타내는 표시가 없고 페이지를 새로고침해도 지문이 일정해야 함 |
| L3 자동화 | rebrowser, brotector, botd | CDP, init 스크립트, WebDriver 유출이 없어야 함 |
| L4 동작 | 입력 충실도, 인간화 흔적, Cloudflare 스모크 테스트 | 신뢰할 수 있는 이벤트, 사실적인 순서, 챌린지 해결 |
| L5 안정성 | 시드, 워커, iframe, 교차 출처 | 동일한 시드는 실행할 때마다 동일한 페르소나를 생성 |

검사 절차에는 결과별 상태, 문제 해결, 보고 방법이 나와 있습니다. [영어판](docs/stealth-checkup.md)과 [러시아어판](docs/stealth-checkup.ru.md)을 제공합니다.

각 결과에 엔진 빌드, 클라이언트 버전, 프로필 설정, 프록시 출구 IP, 탐지기 버전을 함께 기록해야 실행을 재현하고 비교할 수 있습니다.

## 저장소 구조

```text
.
├── README.md                  # 영어 원본
├── README.ru.md               # 러시아어 번역
├── desktop/                   # 오프라인 프로필 관리자
├── docs/
│   ├── desktop/               # 프로필 관리자 문서
│   ├── architecture.md        # 구성 요소, 실행 흐름, 경계
│   ├── sdk-contract.md        # v0 실행 계약과 SDK 동작
│   ├── stealth-checkup.md     # 스텔스 검증 방법과 런북
│   ├── stealth-checkup.ru.md  # 러시아어 번역
│   └── versioning.md          # SDK, 엔진, 클라이언트 호환성
├── spec/
│   └── schemas/               # 실행 옵션과 바이너리 정보용 JSON Schema
├── sdks/
│   ├── manifest.json          # 기계가 읽을 수 있는 SDK 레지스트리
│   ├── README.md              # 구성과 기여 규칙
│   ├── _template/             # 새 언어의 SDK를 위한 기본 구조
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # 언어 중립적 실행 및 스텔스 사례
├── tools/check_repo.py        # 구조 및 링크 검증 (CI)
└── .github/workflows/ci.yml
```

이 저장소에는 각 SDK의 기본 프로젝트 구조와 실행 계약, 적합성 테스트 사례, 오프라인 프로필 관리자가 있습니다. Chromium 엔진과 Desktop 1.2.1 전체 배포본은 각각 별도 저장소에서 관리합니다. [Desktop 소스 및 빌드 가이드](desktop/README.md) · [프로필 관리자 문서](docs/desktop/README.md)

## 계약 사항

- `launch(options)`는 엔진을 시작하고 클라이언트의 `Browser`를 반환합니다. 이후 클라이언트는 CDP로 Chromium과 직접 통신합니다.
- SDK는 실행 전에 엔진의 대상 플랫폼과 SHA-256 체크섬을 확인합니다. 바이너리가 없고 다운로드가 켜져 있으면 내려받습니다.
- 이름이 있는 프로필은 브라우저를 다시 실행해도 쿠키, 사이트 저장소, 프로필 시드를 유지합니다.
- 실행에 실패하면 SDK는 자신이 시작한 프로세스를 정리하고 타입이 지정된 오류를 발생시킵니다. 재시도 여부는 호출자가 결정합니다.
- SDK, 엔진, 자동화 클라이언트의 버전 범위는 각각 별개입니다. 엔진 빌드는 Python의 `binary_info()` 또는 Node.js의 `binaryInfo()`로 확인하세요.

## 호환성

| 구성 요소 | 지원 대상 |
|---|---|
| 엔진 | SDK가 선택한 빌드. `binary_info()` 또는 `binaryInfo()`로 확인 |
| macOS | Apple Silicon 및 Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10 이상과 지원되는 Playwright 버전 |
| Node.js | 20 이상과 지원되는 Playwright 또는 Puppeteer 버전 |

SDK와 엔진의 버전은 독립적으로 관리합니다. 두 버전이 호환되지 않으면 SDK는 양쪽 버전이 명시된 오류를 발생시키며, 호출자는 오류 타입으로 이를 구분할 수 있습니다.

## 기여

검토 절차는 [기여 가이드](CONTRIBUTING.md)에, 빌드 방법은 [SDK 가이드](sdks/README.md)에 나와 있습니다.

- SDK 동작을 바꾸려면 해당 구현을 수정하고 테스트 또는 공통 적합성 테스트 사례를 추가하세요.
- 새 언어용 SDK를 추가하려면 [SDK 템플릿](sdks/_template)을 복사한 후 [매니페스트](sdks/manifest.json)에 등록하고 초안 PR을 여세요.
- 새 실행 옵션을 추가하려면 먼저 [SDK 계약](docs/sdk-contract.md)과 [스키마](spec/schemas)를 수정하세요.
- 엔진 수준의 스텔스 기능은 엔진 저장소에서 수정하세요. 수정 후에도 SDK는 점검을 통과해야 합니다.
- 보안 문제는 [보안 정책](SECURITY.md)에 따라 비공개로 신고하세요.

## FAQ

### Ombra는 Playwright의 포크인가요?

아닙니다. SDK는 공식 Playwright 클라이언트를 Ombra Chromium에 연결합니다. Playwright의 타입, 헬퍼, 페이지 객체를 계속 쓸 수 있습니다.

### Ombra 데스크톱 앱이 필요한가요?

SDK가 엔진을 직접 시작합니다. 데스크톱 앱은 선택 사항이며 프로필을 직접 관리할 때 쓸 수 있습니다.

### Ombra와 playwright-stealth는 어떻게 다른가요?

Ombra의 지문 제어 기능은 Chromium 빌드에 포함됩니다. SDK는 페이지 스크립트를 변경하지 않습니다.

### Ombra가 CAPTCHA를 해결할 수 있나요?

엔진에는 선택적으로 켤 수 있는 CAPTCHA 모듈이 있습니다. 지원 범위는 작업 유형, 엔진 빌드, 사용 가능한 모델에 따라 달라집니다. SDK는 실행별 설정을 전달하고 CDP를 통해 모듈 제어 기능을 제공합니다.

### 제 프록시를 사용할 수 있나요?

네. `launch()`에 프록시를 전달하세요. 인증이 필요한 프록시는 로컬 릴레이를 사용하므로 엔진의 명령줄에 인증 정보가 표시되지 않습니다.

### 어떤 버전의 Playwright와 Puppeteer를 지원하나요?

각 SDK는 패키지 매니페스트에서 지원하는 클라이언트 버전을 지정합니다. 클라이언트는 별도의 의존성입니다. 지원 범위는 [버전 관리 가이드](docs/versioning.md)에서 확인할 수 있습니다.

### Ombra는 모든 봇 탐지 검사를 통과하나요?

결과는 사이트, 지역, 출구 IP의 평판, 탐지기 버전, 프로필 설정에 따라 달라집니다. 특정 구성으로 측정하는 방법은 [스텔스 점검](docs/stealth-checkup.md)에 나와 있습니다.

## 라이선스

이 저장소의 SDK 소스는 [Apache License 2.0](LICENSE)에 따라 라이선스가 부여됩니다. 이 라이선스는 Ombra 엔진, Ombra 이름, 로고에 대한 권리를 부여하지 않습니다. 상표 및 제3자 저작자 표시에 대해서는 [NOTICE](NOTICE)를 참고하시기 바랍니다.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
