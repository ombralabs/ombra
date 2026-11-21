<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="라이선스"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="최근 커밋"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="GitHub 스타"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI 다운로드"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm 다운로드"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="릴리스"></a>
</p>

<p align="center">
<a href="#설치"><strong>설치</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-및-typescript-api">Node.js API</a> ·
<a href="#자연스러운-입력">자연스러운 입력</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>언어</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">C++ 소스 수준의 핑거프린트 제어와 네이티브 입력 시뮬레이션을 갖춘 Chromium</h3>

<table><tr><td>
실행 플래그 묶음이나 페이지 위에 덮어씌우는 JavaScript 인젝션이 아닙니다. C++ 소스에 핑거프린트 패치가 직접 컴파일되어 있으며, 브라우저 프로세스 내부에서 입력 시뮬레이션이 동작하는 실제 Chromium 바이너리입니다. 로컬 CDP를 통해 공식 Playwright 또는 Puppeteer를 그대로 연결할 수 있어 래퍼 객체나 페이지 코드 수정이 필요 없습니다.
</td></tr></table>

<br>

<p align="center">
Python과 Node.js에서 Playwright 및 Puppeteer의 실행부를 바로 대체할 수 있습니다.<br>
동일한 API, 셀렉터, 타입을 그대로 사용하면서 임포트와 <code>launch()</code> 호출만 바꾸면 됩니다.
</p>

- **소스 수준 Chromium 패치** — 캔버스(canvas), WebGL, WebGPU, 오디오, 폰트, GPU, 화면, CSS 미디어 쿼리, 하드웨어 정보, STUN 유출 없는 WebRTC, TLS ClientHello, 시간대, 로케일 제어 및 자동화 흔적 제거(`navigator.webdriver`, `Runtime.enable`, 헤드리스 마커).
- **브라우저 프로세스 내 네이티브 입력 시뮬레이션 (`humanize=True`)** — 포인터 궤적(`cursory-rs`), 홀드 지속 시간이 반영된 조준 클릭, 오타 및 자체 수정이 포함된 타이핑 리듬, 스크롤 물리가 Chromium 내부에서 실행됩니다. SDK는 프록시 래퍼 없이 순수한 네이티브 `Browser` 객체를 반환합니다.
- **키나 계정 없이 독립 실행** — 최신 엔진 빌드(`158.0.8127.37-2` 이상)와 Ombra Desktop은 회원 가입, 라이선스 키, 하드웨어 ID, 라이선스 서버 없이 로컬에서 바로 동작합니다.
- **자동 설치 및 암호학적 바이너리 검증** — `pip install ombrabrowser` 또는 `npm install @ombralabs/sdk`만 실행하면 첫 실행 시 SDK가 플랫폼에 맞는 빌드를 다운로드하고 Ed25519 서명과 SHA-256 체크섬을 검증합니다.
- **영구 프로필 및 안전한 프록시 릴레이** — 이름 지정 프로필은 실행 간 쿠키, `localStorage`, IndexedDB, `seed`를 유지하며 프로세스 간 잠금을 지원합니다. 인증이 필요한 프록시(HTTP, HTTPS, SOCKS5)는 로컬 루프백 릴레이를 통해 처리되므로 자격 증명이 프로세스 인자에 노출되지 않습니다.
- **오프라인 Ombra Desktop 프로필 관리자** — 이 저장소에 포함된 네이티브 데스크톱 애플리케이션([`desktop/`](../../desktop/README.md))으로 macOS, Linux, Windows용 사전 빌드 설치 프로그램을 제공합니다.

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

Puppeteer 역시 `import { launch } from "@ombralabs/sdk/puppeteer"` 또는 `launchPuppeteer()`를 통해 지원됩니다([자세히 보기](#puppeteer)).

**안티봇 보호가 적용된 사이트의 경우**, 주거용(residential) 프록시, 영구 프로필, 일관된 환경 설정을 함께 사용하세요:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # 데이터센터 IP보다 주거용(residential) IP 사용을 권장
    fingerprint={"timezone": "auto", "locale": "auto"},  # 프록시 출구 위치에 맞춰 시간대와 로케일 자동 설정
    headless=False,                                      # 일부 사이트는 헤드리스 환경의 차이를 탐지
    humanize=True,                                       # 네이티브 마우스, 키보드 및 스크롤 시뮬레이션
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

Linux 환경, 컨테이너, 보호 대상 사이트에서 자주 발생하는 문제는 [문제 해결](#문제-해결)을 참고하세요.

## 설치

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# 선택 사항: 프록시 출구 기준 시간대 및 로케일 자동 감지 (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Playwright와 함께 사용 (1.60.0+, 기본 Chromium 다운로드 불필요)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# 또는 Puppeteer와 함께 사용
npm install @ombralabs/sdk puppeteer-core

# 선택 사항: timezone: "auto" 및 locale: "auto"를 위한 오프라인 GeoIP 데이터베이스 리더
npm install mmdb-lib
```

---

실행 시 SDK는 엄격한 우선순위에 따라 엔진을 탐색합니다: `binary_path`(Node.js에서는 `binaryPath`), `OMBRA_BINARY_PATH`, Ombra Desktop 엔진 디렉터리, SDK 캐시(`~/.ombra/engines`). 호환되는 엔진이 없으면 SDK가 서명된 릴리스 채널에서 빌드를 다운로드하고 Ed25519 서명과 SHA-256 체크섬을 검증한 뒤 로컬에 캐시합니다. `playwright install chromium`을 실행할 필요가 없습니다.

자동 다운로드를 비활성화하려면 `download=False`(Node.js에서는 `download: false`)를 전달하세요. 컨테이너 빌드 단계 등에서 엔진을 미리 다운로드하고 검증하려면 `ensure_binary()`(`ensureBinary()`)를 호출하거나 CLI `install` 명령을 사용하세요.

> **독립 실행:** 최신 엔진 빌드(`158.0.8127.37-2` 이상)는 무료이며 계정이나 라이선스 키가 필요하지 않습니다. `OMBRA_LICENSE_KEY`와 `login` 명령은 기존 라이선스 기반 구버전 빌드와의 호환성을 위해서만 유지됩니다.

**Playwright에서 마이그레이션**하는 데는 단 두 줄만 바꾸면 됩니다 — 모든 페이지 작업, 로케이터, 대기 로직은 그대로 동작합니다:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # 나머지 코드는 수정 없이 그대로 동작합니다
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ 프로젝트가 유용하다면 저장소에 **Star**를 눌러 주시고, **[릴리스 알림(Watch releases)](https://github.com/ombralabs/ombra/subscription)**을 설정하여 새 엔진, SDK, Ombra Desktop 빌드 소식을 받아보세요.

---

## 현재 상태 및 릴리스

생태계의 각 구성 요소는 공통 실행 계약을 따르며 독립적으로 버전을 관리합니다.

| 구성 요소 | 상태 / 버전 | 위치 |
|---|---|---|
| **SDK 계약** | Draft `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alpha `0.1.3` | [PyPI의 `ombrabrowser`](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alpha `0.1.0` | [npm의 `@ombralabs/sdk`](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium 엔진** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **단독 실행 브라우저** | `v158.0.8127.37-2` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-2) |
| **스키마 및 적합성 테스트** | JSON Schema + 공통 케이스 | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **스텔스 점검 방법론** | 6개 계층 (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

현재 릴리스에 포함된 기능:

- **소스 수준 패치** — `seed` 기반의 일관된 핑거프린트 파생, WebGL / WebGPU 및 확장 기능 정합성 유지, OS별 현실적인 폰트 테이블, 네이티브 TLS ClientHello 프로필(`chrome-<major>`), `Runtime.enable` 및 `UtilityScript` 스택 유출 억제, WebRTC 호스트 IP 유출 방지.
- **브라우저 수준 `Ombra` CDP 도메인** — 브라우저를 재시작하지 않고 Python 및 Node.js에서 자연스러운 입력 설정(`getHumanizeState`, `setHumanize`)을 실시간 제어.
- **브라우저 프로세스 내 네이티브 입력 시뮬레이션** — `cursory-rs` 포인터 플래너, 휠 및 트랙패드 스크롤 프로필, 오타 자체 수정이 포함된 타이핑 리듬, 격리된 클립보드를 통한 안전한 장문 텍스트 붙여넣기.
- **키 없는 독립 실행 빌드** — 최신 엔진 빌드(`158.0.8127.37-2`)와 Ombra Desktop `1.2.2`는 계정, 키, 텔레메트리 없이 완전히 로컬에서 실행.
- **엔진 버전 고정 (`version`)** — `launch(version="158.0.8127.37-2")`, `OMBRA_VERSION`, 또는 CLI `install --version`으로 정확한 빌드 버전 고정.
- **통합 프록시 릴레이** — Chromium 명령줄, 로그, 프로필 메타데이터에 자격 증명을 노출하지 않고 HTTP, HTTPS, SOCKS5 인증 프록시 지원.
- **영구 이름 지정 프로필** — `~/.ombra/profiles/<slug>` 아래에 `seed`, 쿠키, `localStorage`, IndexedDB를 저장하며 프로세스 간 잠금(`ProfileBusyError`) 제공.
- **암호학적 공급망 검증** — 압축 해제 전 릴리스 엔벨로프의 Ed25519 서명 검증 및 아카이브 SHA-256 무결성 검증.

전체 릴리스 이력은 [CHANGELOG.md](../../CHANGELOG.md)에서 확인하세요.

## 왜 Ombra인가

- **설정 수준 및 JS 패치는 쉽게 깨집니다.** `playwright-stealth`, `puppeteer-extra`, `undetected-chromedriver` 같은 도구는 페이지에 JavaScript를 주입하거나 실행 플래그를 조정합니다. Chrome 업데이트마다 자주 깨지며, 최신 탐지기는 패치 자체의 흔적(`Function.prototype.toString`, 프로토타입 이상, `addScriptToEvaluateOnNewDocument`)을 찾아냅니다.
- **변경 사항이 Chromium 소스 코드에 직접 컴파일됩니다.** 핑거프린트는 C++ 수준에서 생성되며 메인 프레임, 워커, iframe 전반에 일관되게 적용됩니다. SDK는 페이지에 스크립트를 주입하지 않으며 `Emulation.*` 오버라이드도 수행하지 않습니다.
- **입력 시뮬레이션이 Playwright 위가 아니라 브라우저 프로세스 내부에 있습니다.** 마우스 궤적, 키 입력, 스크롤이 Chromium 자체에서 처리되므로 SDK가 Playwright나 Puppeteer 객체를 감싸지 않습니다. 모든 로케이터, 프레임, 서드파티 라이브러리가 정상적으로 동작합니다.
- **별도 서비스 없는 로컬 아키텍처.** 백그라운드 컨트롤 플레인 데몬이나 스크립트와 브라우저 사이의 네트워크 홉이 없습니다. 단일 엔진 프로세스와 `127.0.0.1` 로컬 루프백 CDP만 사용하며, 프로필 수나 동시 실행 수에 제한이 없습니다.

## Ombra Desktop

**GUI를 갖춘 로컬 오프라인 프로필 관리자입니다.** 소스 코드는 이 저장소([`desktop/`](../../desktop/README.md))에 직접 포함되어 있으며 Tauri(Rust + Vue)로 제작되었습니다.

- **완전한 오프라인 및 로컬 동작** — 프로필 카탈로그는 로컬 암호화 키와 함께 사용자의 머신에 있는 로컬 SQLite 데이터베이스에 저장되며 계정, 클라우드 서비스, 네트워크 연결이 필요 없습니다.
- **체계적인 프로필 관리** — 프로필 생성, 이름·메모·번호별 검색, 설명 편집을 지원하며 Rust 카탈로그에서 그룹, 태그, 레이블, 북마크로 항목을 정리할 수 있습니다.
- **안전한 휴지통** — 프로필을 휴지통으로 이동해도 디스크의 파일이 보존되므로 나중에 복원할 수 있습니다.
- **프로필 개수 제한 없음** — 프로필 수 기반 요금제나 클라우드 할당량 없이 모든 데이터를 사용자가 직접 소유합니다.
- **사전 빌드 설치 프로그램** — macOS Apple Silicon(`.dmg`, Apple Developer ID 서명 및 공증 완료), Linux(`.deb` 및 `.rpm`), Windows x64(`setup.exe`) 지원.
- **격리된 카탈로그** — `OMBRA_DESKTOP_DATA_DIR`을 설정하여 별도의 테스트 카탈로그나 백업 복사본으로 작업할 수 있습니다.

[`desktop-v1.2.2` 다운로드 →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [프로필 및 로컬 키 가이드](../../docs/desktop/README.md)

## 핑거프린트 검증 및 스텔스 점검

Ombra는 근거 없는 "100% 탐지 불가"를 약속하는 대신, 기록된 조건 아래 재현 가능한 검증 절차에 기반합니다. 실제 사이트에서의 결과는 항상 출구 IP 평판, 지역, 프로필 이력, 탐지기 버전, 실행 구성에 따라 달라집니다.

### 엔진과 SDK가 처리하는 탐지 표면

| 표면 / 신호 | 기본 Playwright | Ombra | 구현 방식 |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++ 엔진 패치 |
| `window.chrome` | 헤드리스에서 누락 | 전체 객체 제공 | 일반 Chrome과 일치 |
| `navigator.plugins` | 헤드리스에서 `0` | 일관된 플러그인 세트 | 엔진 수준 |
| User-Agent 및 Client Hints | `HeadlessChrome`, 브랜드 불일치 | `Google Chrome` + 정합된 `Sec-CH-UA*` | 패치 `010-user-agent-and-webdriver` |
| CDP 흔적 (`Runtime.enable`, `UtilityScript`) | 탐지기에 플래그됨 | 엔진에서 억제, SDK는 `Runtime.enable` 미호출 | 패치 `110-runtime-enable` + 불변 규칙 `SI-02` |
| WebRTC IP 유출 | 로컬/호스트 IP 노출 | 실제 STUN 전송 없이 출구 IP 보고 | 패치 `100-webrtc-leak` (`--webrtc-ip`) |
| TLS 및 HTTP/2 | 환경에 따라 상이 | Chromium 네트워크 스택 + `chrome-<major>` ClientHello 프로필 | 패치 `210-tls-network-persona` |
| WebGL 및 WebGPU | 소프트웨어 렌더러 / GPU 불일치 | 통합 WebGL/WebGPU 한계값 및 확장 테이블 | 패치 `070`, `071`, `075`, `955` |
| 폰트, 로케일 및 시간대 | 호스트 값 노출, `Intl` 불일치 | 일관된 폰트 테이블, ICU 로케일 및 시간대 | 패치 `040`, `090`, `092`, `230` |
| 입력 시뮬레이션 | 커서 순간 이동, 즉시 `fill()` | `cursory-rs` 곡선, 타이핑 리듬, 스크롤 물리 | 브라우저 프로세스 내 패치 `135-ombra-humanize` |
| 핑거프린트 안정성 | 매번 변경되거나 호스트 유출 | 재시작 및 프레임 간 `seed`별 결정적 재현 | 패치 `001`, `002` + 영구 프로필 |

### 6단계 점검 계층

구성을 배포하거나 릴리스하기 전에, 실제 사용할 엔진 빌드, 자동화 클라이언트, 프록시 조합에 대해 6개 점검 계층을 모두 실행하세요:

| 계층 | 점검 대상 예시 | 통과 기준 |
|---|---|---|
| **L0 전송(Transport)** | TrackMe, IP/WebRTC 유출 테스트 페이지, 헤더 에코 | 프록시 출구 IP만 노출, JA4 및 HTTP/2가 Chromium 빌드와 일치, argv에 프록시 자격 증명 미노출 |
| **L1 신원(Identity)** | 로컬 프로브, Sannysoft, Intoli, UA-CH 점검 | UA, Client Hints, 플랫폼, GPU, 폰트, 화면, 로케일 간 모순 없음 |
| **L2 핑거프린트(Fingerprint)** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | 헤드리스 또는 `lie` 마커 없음, 새로고침 간 핑거프린트 일관 유지 |
| **L3 자동화(Automation)** | rebrowser, brotector, botd, CDP 명령 감사 | `Runtime.enable`, 초기화 스크립트, 바인딩, `navigator.webdriver` 유출 없음 |
| **L4 행동(Behavior)** | 입력 충실도 프로브, humanize 트레이스, 실제 챌린지 스모크 | `isTrusted: true` 이벤트, 자연스러운 순서와 타이밍, 현실적인 포인터 곡선 및 스크롤 |
| **L5 안정성(Stability)** | 반복 실행, 워커, 동일/교차 출처 iframe, SDK 간 패리티 | 동일한 `seed`가 모든 컨텍스트에서 동일한 핑거프린트를 재현 |

전체 절차, 상태 정의(`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), 신호 체크리스트 및 보고서 템플릿은 [영문 문서 (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) 및 [러시아어 문서 (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md)에서 확인할 수 있습니다.

## 비교

| 기능 | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| 자동화 API | Playwright | Playwright | Selenium | **Playwright 및 Puppeteer** |
| 패치 수준 | 없음 | 페이지 내 JS 인젝션 | 설정 플래그 | **C++ 소스 (Chromium)** |
| 일관된 핑거프린트 `seed` | 미지원 | 미지원 | 부분 지원 | **지원 (프로필 및 eTLD+1별)** |
| 입력 시뮬레이션 (`humanize`) | 미지원 | 미지원 | 미지원 | **브라우저 프로세스 내장** |
| `Runtime.enable` / CDP 유출 억제 | 미지원 | 미지원 | 부분 지원 | **엔진 패치 + SDK 불변 규칙** |
| CLI 유출 없는 인증 프록시 | 미지원 | 미지원 | 제한적 | **로컬 루프백 릴레이** |
| 프로필 격리 | 브라우저 컨텍스트 | 브라우저 컨텍스트 | 미지원 | **프로필 디렉터리 + 파일 잠금** |
| 오프라인 프로필 관리자 (GUI) | 미지원 | 미지원 | 미지원 | **Ombra Desktop (macOS, Linux, Windows)** |
| Playwright에서 마이그레이션 | — | 임포트 변경 | 코드 재작성 | **임포트와 `launch()` 교체** |

## 동작 방식

```mermaid
flowchart LR
    Script["사용자 스크립트<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP 브리지"]
    Relay["로컬 프록시 릴레이<br/>인증 필요 시 사용"]
    Engine["Ombra Chromium<br/>C++ 패치 엔진"]
    Client["네이티브 클라이언트<br/>Playwright · Puppeteer"]
    Profile[("프로필<br/>seed · 쿠키 · 스토리지")]

    Script -->|"launch()"| SDK
    SDK -->|"검증 후 실행"| Engine
    SDK -.->|"프록시 인증"| Relay
    Relay -.-> Engine
    SDK -->|"CDP 연결"| Client
    Script -->|"페이지 API"| Client
    Client -->|"루프백 CDP"| Engine
    Engine --> Profile
```

1. **`launch()`가 엔진을 찾거나 다운로드하고** Ed25519 서명과 SHA-256 체크섬을 검증합니다.
2. **프로필과 `seed`를 준비합니다.** 이름 지정 프로필은 프로세스 간 잠금을 획득하며, 프록시에 인증이 필요하면 SDK가 인메모리 루프백 릴레이를 시작합니다.
3. **Ombra Chromium이 시작됩니다.** 선택한 프로필, 핑거프린트 옵션, 로컬 디버깅 포트(`--remote-debugging-port=0`)가 적용됩니다.
4. **공식 클라이언트가 연결됩니다.** `DevToolsActivePort`가 생성되면 SDK가 `127.0.0.1`을 통해 Playwright(`no_defaults=True`) 또는 Puppeteer를 연결하고 네이티브 `Browser` 객체를 반환합니다.
5. **깔끔한 종료.** `browser.close()`는 `Browser.close`를 전송하고 엔진 프로세스 트리를 종료하며, 릴레이를 중지하고 프로필 잠금을 해제합니다.

실행이 완료된 후에는 SDK가 데이터 경로에서 빠지며, 모든 페이지 명령은 Playwright 또는 Puppeteer에서 Chromium으로 직접 전달됩니다.

### SDK 경계 및 스텔스 불변 규칙

[v0.1 SDK 계약 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md)은 모든 공식 SDK에 다음의 엄격한 불변 규칙을 강제합니다:

- **페이지에 스텔스 스크립트 주입 금지.** SDK는 `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument`를 호출하지 않으며 DOM 속성을 패치하지 않습니다.
- **`Runtime.enable` 호출 금지.** 준비 상태 확인에는 로컬 CDP HTTP 엔드포인트 또는 `Browser.getVersion`만 사용하며, SDK는 `Runtime`, `Debugger`, `Log`를 활성화하지 않습니다.
- **`Emulation.*` 오버라이드 금지.** SDK는 `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride`, `setDeviceMetricsOverride`를 호출하지 않습니다. 브라우저 신원은 엔진이 직접 제공합니다.
- **기본값으로 금지된 플래그 미주입.** SDK는 자체적으로 `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox`, `--user-agent`를 추가하지 않습니다.
- **루프백 CDP 전용.** 디버그 포트는 항상 `127.0.0.1`에만 바인딩되며, 비루프백 `--remote-debugging-address` 전달은 거부됩니다.
- **텔레메트리 및 민감 정보 유출 금지.** 프록시 자격 증명, 키, 쿠키는 로그와 오류 메시지에서 마스킹됩니다.

## Python API

### `launch()`

```python
from ombrabrowser import launch

# 기본 실행 (기본값은 헤드리스 모드)
browser = launch()

# 브라우저 창 표시 모드
browser = launch(headless=False)

# HTTP 또는 SOCKS5 프록시 (인증 정보는 로컬 루프백 릴레이로 처리)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# 우회 목록을 포함한 프록시 객체
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

# 핑거프린트 제어 (seed, OS, 프록시 기준 시간대/로케일 자동 설정, 화면, GPU)
# timezone="auto" / locale="auto" 사용 시 설치 필요: pip install "ombrabrowser[geoip]"
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

# 네이티브 마우스, 키보드 및 스크롤 시뮬레이션
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# 특정 엔진 빌드 고정 및 추가 Chromium 플래그 전달
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

표준 `playwright.sync_api.Browser` 객체를 반환합니다. 모든 Playwright 메서드(`new_page()`, `new_context()`, `close()` 등)가 정상 동작합니다. 새 페이지는 프로필의 창 크기를 덮어쓰지 않도록 기본적으로 `no_viewport=True`로 열립니다.

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

### `launch_context()` 및 `launch_context_async()`

브라우저를 실행하고 `BrowserContext`를 바로 반환하는 편의 헬퍼입니다(컨텍스트를 닫으면 엔진 프로세스도 함께 종료됩니다). `storage_state`, `permissions`, `extra_http_headers` 같은 추가 키워드 인자는 `browser.new_context()`로 그대로 전달됩니다:

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

비동기 버전: `await launch_context_async(...)`.

### `launch_persistent_context()` 및 `launch_persistent_context_async()`

영구 프로필로 브라우저를 실행하고 기본 `BrowserContext`를 반환합니다. 쿠키, `localStorage`, IndexedDB, 캐시, 핑거프린트 `seed`가 세션 간에 유지됩니다.

- `profile="pricing-eu"`를 전달하면 `~/.ombra/profiles/pricing-eu` 아래에 `.ombra/profile.json` 메타데이터와 잠금 파일을 포함한 프로필이 생성됩니다.
- `user_data_dir="./my-profile"`(또는 위치 경로 인자)을 전달하면 해당 명시적 디렉터리를 사용합니다.
- 다른 프로세스에서 동일한 프로필을 동시에 실행하면 프로필 데이터 손상을 방지하기 위해 `ProfileBusyError`가 발생합니다.

```python
from ombrabrowser import launch_persistent_context

# 이름 지정 프로필 사용 (~/.ombra/profiles/에 저장)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # 쿠키, 스토리지 및 seed가 보존됩니다

# 명시적 경로 지정 (예: Chrome 확장 프로그램 로드 시)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

비동기 버전: `await launch_persistent_context_async(...)`.

### 유틸리티 함수 및 진단 (Python)

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

# 결정된 엔진 바이너리 정보 확인
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# 브라우저를 실행하지 않고 엔진 다운로드 및 검증
ensure_binary(version="158.0.8127.37-2")

# SDK가 관리하는 엔진 바이너리 삭제 (~/.ombra/profiles 아래의 프로필은 유지됨)
clear_cache()

# Chromium을 실행하지 않고 최종 실행 명령 확인
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# 런타임 메타데이터(CDP 포트, ws_url, seed, pid) 조회 및 프로세스 상태 확인
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # 엔진 다운로드 및 검증 (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-2  # 특정 엔진 빌드 설치
ombrabrowser info                                # 환경, 바이너리 및 의존성 진단 (별칭: doctor)
ombrabrowser info --quick --json                 # 바이너리를 실행하지 않고 빠른 기계 판독 가능 보고서 출력
ombrabrowser info --proxy socks5://user:pass@host:1080  # 프록시를 통한 출구 IP, 시간대 및 로케일 확인 테스트
ombrabrowser update                              # 릴리스 채널 확인 및 캐시된 엔진 업데이트
ombrabrowser clear-cache                         # 캐시된 엔진 바이너리 삭제 (프로필은 보존)
ombrabrowser login                               # ~/.ombra/license.key에 라이선스 키 저장 (레거시 빌드 전용)
ombrabrowser logout                              # 저장된 라이선스 키 삭제
```

동일한 명령을 `python -m ombrabrowser <command>`로도 실행할 수 있습니다.

## Node.js 및 TypeScript API

`@ombralabs/sdk`는 완전한 TypeScript 타입 정의(`.d.ts`)와 함께 ESM + CommonJS 듀얼 빌드를 제공합니다. Playwright와 Puppeteer 모두 내부적으로 동일한 엔진 위에서 동작합니다.

### Playwright (기본값)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// 프록시, 핑거프린트 및 입력 시뮬레이션을 적용한 기본 실행
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

// 간편 실행: 브라우저와 컨텍스트를 한 번에 생성
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// 영구 프로필 — 실행 간 쿠키, localStorage 및 seed 유지
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> 위 각 코드 조각은 독립적으로 실행할 수 있습니다. 기존 Playwright 실행 코드를 마이그레이션하려면 임포트를 `import * as chromium from "@ombralabs/sdk"`로 바꾸고 기존 `await chromium.launch(...)` 호출을 그대로 유지할 수도 있습니다.

### Puppeteer

`@ombralabs/sdk`의 `launchPuppeteer()`를 사용하거나 `@ombralabs/sdk/puppeteer`에서 임포트하세요:

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

> **Puppeteer 참고 사항:** Puppeteer는 `connectOverCDP({ noDefaults: true })`를 사용하는 Playwright보다 기본 CDP 트래픽을 더 많이 전송합니다. 엄격한 CDP 검사를 수행하는 사이트에서는 Playwright 사용을 권장합니다.

### 유틸리티 및 CLI (Node.js)

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

## 자연스러운 입력

Ombra에서 입력 시뮬레이션(`humanize`)은 자동화 클라이언트 위의 JS 래퍼가 아니라 **Chromium 브라우저 프로세스 내부에 네이티브로 컴파일**되어 있습니다(`cursory-rs` 및 엔진 입력 스케줄러 기반). 이로 인해 다음과 같은 장점이 있습니다:

- 모든 표준 Playwright 및 Puppeteer 동작(`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`)이 브라우저 내부의 탭별 단일 입력 큐를 거쳐 실행됩니다.
- 행동 매개변수는 프로필 `seed` (`--fingerprint-humanize-seed`)로부터 결정적으로 파생됩니다.
- SDK가 `Page`나 `Browser`를 프록시 클래스로 감싸지 않으므로 네이티브 타입과 클라이언트 동작이 그대로 유지됩니다.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**`humanize=True` 적용 시 달라지는 점:**

| 동작 | `humanize` 미사용 | `humanize=True` 사용 |
|---|---|---|
| 마우스 이동 | 즉시 순간 이동 | 가속, 일시 정지, 미세한 오버슈트가 반영된 `cursory-rs` 곡선 이동 |
| 클릭 및 드래그 | 즉시 누름 | 대상 요소 내 조준 지점, 클릭 전 짧은 멈춤, 홀드 지속 시간 적용 |
| 텍스트 입력 | 값 즉시 설정 | 설정된 리듬과 키보드 레이아웃에 따른 문자 단위 입력, 간헐적 오타 및 자체 수정; 매우 긴 텍스트는 시스템 클립보드를 건드리지 않고 격리된 클립보드로 붙여넣기 |
| 스크롤 | 한 번에 점프 | 측정된 감속 프로필을 따르는 연속 휠/트랙패드 이벤트 |
| 유휴 구간 | 커서 정지 | `careful` 프리셋에서 동작 사이에 미세한 유휴 커서 움직임 발생 |

**프리셋** — `default`(일반 속도), `careful`(느리고 신중하며 유휴 미세 움직임 포함), `fast`(빠른 속도). 입력 시뮬레이션을 명시적으로 끄려면 `humanize=False`(`humanize: false`)를 전달하세요.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

`Ombra` CDP 도메인을 통해 브라우저를 재시작하지 않고 런타임에 모드를 전환하거나 프리셋을 변경할 수 있습니다:

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

## 핑거프린트 및 프로필 관리

엔진은 단일 `seed`로부터 일관된 브라우저 구성을 파생합니다. `seed`를 생략한 경우의 동작은 다음과 같습니다:

| 시나리오 | 동작 |
|---|---|
| **프로필 없이 `launch()` 호출** | SDK가 해당 세션용 무작위 `seed`를 생성하고 임시 디렉터리를 만들며, `close()` 후 삭제합니다. |
| **`profile="name"` 또는 `user_data_dir="./dir"`** | `seed`가 `.ombra/profile.json`에 저장되어 실행마다 재사용됩니다 — 사이트는 동일한 기기와 쿠키를 가진 재방문자로 인식합니다. |
| **`fingerprint={"seed": N, ...}`** | 명시된 `seed`로부터 결정적인 핑거프린트를 생성하며, 추가 필드는 나머지 설정의 일관성을 유지하면서 개별 값을 재정의합니다. |

캔버스/오디오 노이즈는 `eTLD+1`별로 키가 분리됩니다(동일 사이트에서는 일관 유지, 다른 사이트 간에는 연결 불가). 2D 캔버스 및 WebGL `readPixels`의 픽셀 노이즈는 "Canvas Tampering / Masking" 탐지기에 걸리는 것을 피하기 위해 기본적으로 비활성화되어 있으며, `--fingerprint-pixel-noise`로 명시적으로 활성화할 수 있습니다.

> **팁:** 같은 사이트를 반복 방문할 때는 임시 `launch()`에 고정 `seed`를 넘기는 대신 영구 프로필(`profile="name"` 또는 `launch_persistent_context()`)을 사용하세요. 그래야 핑거프린트와 함께 쿠키, 캐시, `localStorage`도 일관되게 유지됩니다.

### `fingerprint` 객체 필드

아래 필드 이름은 Python(`snake_case`) 기준입니다. Node.js에서는 `camelCase`(`osVersion`, `hardwareConcurrency`, `deviceMemory`)와 `snake_case`를 모두 지원합니다:

| 필드 | 타입 | 설명 |
|---|---|---|
| `seed` | `int` (`>= 0`) | 전체 핑거프린트 구성을 결정하는 생성기 시드 |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | 대상 OS (`navigator.platform`, UA, GPU 및 폰트 풀 결정) |
| `os_version` | `string` | Client Hints용 OS 버전 힌트 |
| `timezone` | IANA 시간대 또는 `"auto"` | 시간대(예: `"Europe/Berlin"`). `"auto"`는 GeoIP를 통해 프록시 출구 위치의 시간대를 자동 결정 |
| `locale` | BCP-47 또는 `"auto"` | 로케일(`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"`는 프록시 출구 기준 로케일 자동 결정 |
| `screen` | `{"width", "height"}` 또는 `"auto"` | 대상 OS의 작업 표시줄 / 메뉴 막대를 반영한 화면 및 작업 영역 크기 |
| `gpu` | `{"vendor", "renderer"}` 또는 `"auto"` | 명시적인 WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` 문자열 |
| `hardware_concurrency` | `int` 또는 `"auto"` | 보고되는 `navigator.hardwareConcurrency` 값 |
| `device_memory` | `int` 또는 `"auto"` | 보고되는 `navigator.deviceMemory` 값 (GB 단위) |
| `noise` | `bool` | 핑거프린트 노이즈 활성화/비활성화 (`False` 지정 시 `--disable-fingerprint-noise` 전달) |

> 핑거프린트 매개변수의 기본 소스로는 `seed`를 유지하세요. 호환되지 않는 OS와 GPU를 조합하는 등 정합성을 고려하지 않고 개별 값을 재정의하면 탐지기에 모순 신호를 줄 수 있습니다.

### 추가 엔진 플래그 (`args`)

엔진이 지원하지만 SDK가 자동으로 설정하지 않는 플래그입니다(`args=[...]`로 전달):

| 플래그 | 용도 |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | `Sec-CH-UA`의 브라우저 브랜드 지정 (SDK 기본값: `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | 지정한 Chrome 메이저 버전에 맞춘 TLS ClientHello 프로필 (SDK가 엔진 버전에서 자동 설정) |
| `--webrtc-ip=<ip>` | 실제 STUN 트래픽을 보내지 않고 WebRTC ICE 후보에 대체 IP 주소 적용 |
| `--fingerprint-location=<lat,lon>` | `navigator.geolocation`에서 보고할 좌표 |
| `--fingerprint-storage-quota=<MB>` | `navigator.storage.estimate()`에서 보고할 스토리지 할당량 |
| `--fingerprint-max-touch-points=<N>` | 터치 포인트 개수 (`navigator.maxTouchPoints` 및 포인터 미디어 쿼리) |
| `--fingerprint-device-pixel-ratio=<ratio>` | 디스플레이 픽셀 밀도 (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | 화면 색 심도 |
| `--disable-gpu-fingerprint` | 호스트의 실제 GPU 통과 (WebGL/WebGPU 문자열, 한계값, 확장 기능) |
| `--disable-gpu-string-spoof` | 다른 프로필 설정은 유지하면서 실제 GPU 문자열만 그대로 전달 |
| `--disable-fingerprint-noise` | 신원 매개변수는 유지하면서 캔버스/WebGL/오디오 노이즈 비활성화 |
| `--fingerprint-pixel-noise` | 2D 캔버스 및 `readPixels`에 대한 선택적 멱등 픽셀 노이즈 활성화 |
| `--profile-label=<text>` | 브라우저 주소 표시줄에 표시할 프로필 레이블 (UI 전용, 웹 페이지에는 노출되지 않음) |

### Linux 폰트 설정

최소 설치된 Linux 서버나 컨테이너에는 이모지 및 CJK 폰트가 없는 경우가 많아, 숨겨진 캔버스 텍스트 및 이모지 렌더링 결과가 비정상적인 해시를 만들 수 있습니다.

**1. 기본 레이어 (이모지 및 CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows 프로필용 Windows 폰트 (`os="windows"`):**
Linux에서 Windows 구성을 실행할 때 `C:\Windows\Fonts\`의 실제 폰트(`Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic` 포함)를 설치하면 폰트 열거 일관성이 크게 향상됩니다:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS 프로필용 macOS 폰트 (`os="macos"`):**
마찬가지로 Linux에서 `os="macos"`를 사용할 때는 `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/`, `/Library/Fonts/`의 폰트를 `~/.local/share/fonts/mac/`에 복사한 뒤 `fc-cache -f`를 실행하세요.

`Dockerfile`에서는 시스템 디렉터리 `/usr/local/share/fonts/`에 폰트를 배치하세요:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## 실행 옵션, 구성 및 오류

### `launch()` 옵션

옵션 이름은 Python API 및 [SDK 계약](../../docs/sdk-contract.md)을 따릅니다. Node.js는 `camelCase` 대응 이름(`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`)을 사용하며 `snake_case` 별칭도 허용합니다. 알 수 없는 옵션은 `InvalidOptionError`로 거부됩니다.

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `headless` | `true` | 창 없이 실행 (`--headless=new`) |
| `proxy` | 없음 | 프록시 URL(`http`, `https`, `socks5`) 또는 객체; 인증 프록시는 루프백 릴레이 사용 |
| `fingerprint` | 없음 | `seed`, OS, 시간대, 로케일, 화면, GPU, 메모리 및 노이즈 설정 |
| `profile` | 없음 | `~/.ombra/profiles/<slug>` 아래의 이름 지정 영구 프로필 (`user_data_dir`과 동시 사용 불가) |
| `user_data_dir` | 임시 경로 | 명시적 프로필 디렉터리 경로 (`profile`과 동시 사용 불가) |
| `args` | `[]` | 추가 Chromium 인자 (변경 없이 그대로 전달) |
| `binary_path` | 자동 탐색 | 엔진 실행 파일의 명시적 경로 |
| `version` | 환경 변수 / 자동 | 엔진 버전 고정(예: `158.0.8127.37-2`), `OMBRA_VERSION`보다 우선 |
| `timeout_ms` | `30000` | 엔진 시작 및 CDP 연결 제한 시간 (1000–600000 ms) |
| `humanize` | 엔진 기본값 | `False`, `True`, 또는 `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | 환경 변수 / 파일 | 레거시 라이선스 빌드용 키 (`158.0.8127.37-2+`에서는 불필요, 로그에 기록되지 않음) |
| `env` | `{}` | 엔진 프로세스에 전달할 추가 환경 변수 |
| `download` | `True` | 누락된 엔진 바이너리의 자동 다운로드 허용 여부 |

### 환경 변수

우선순위: **명시적 실행 옵션 → 환경 변수 → 프로필 메타데이터 → 기본값**.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `OMBRA_BINARY_PATH` | 미설정 | 엔진 바이너리의 명시적 경로 |
| `OMBRA_CACHE_DIR` | `~/.ombra` | 캐시된 엔진 및 이름 지정 프로필 저장 디렉터리 |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | 엔진 다운로드 기본 URL / 미러 (`none`/`off` 설정 시 다운로드 비활성화) |
| `OMBRA_VERSION` | 최신 호환 버전 | 고정할 엔진 버전(예: `158.0.8127.37-2`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | 엔진 릴리스 채널: `stable` 또는 `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | 실행 시 최신 엔진 빌드 확인 여부 |
| `OMBRA_SKIP_CHECKSUM` | `false` | 로컬 개발 전용: SHA-256 검증 비활성화 (경고 로그 출력) |
| `OMBRA_LICENSE_KEY` | 미설정 | 레거시 라이선스 빌드용 키 (로그에 기록되지 않음) |
| `OMBRA_TIMEOUT_MS` | `30000` | 기본 실행 타임아웃 (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | 로그 상세 수준: `error`, `warn`, `info`, `debug` |

### 타입이 지정된 오류

오류가 발생하면 SDK는 실행된 엔진 프로세스를 종료하고 프로필 잠금을 해제한 뒤, 안정적인 `kind`와 민감 정보가 마스킹된 `details`를 담은 `OmbraError` 하위 클래스를 발생시킵니다:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

전체 오류 분류 및 재시도 규칙은 [SDK 계약 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md)에 문서화되어 있습니다.

## 지원 플랫폼, 통합 및 컨테이너

### 지원 플랫폼 및 런타임

| 구성 요소 | 지원 여부 | 비고 |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | 독립 실행 빌드 `158.0.8127.37-2`; Ombra Desktop은 Developer ID 서명 및 공증 완료 |
| **macOS x64 (Intel)** | — | 현재 Chromium 158 릴리스 없음 |
| **Linux x64** | ✅ | 독립 실행 빌드 `158.0.8127.37-2`; `.tar.xz` 압축 해제를 위해 `xz-utils`(`xz`) 필요 |
| **Windows x64** | ✅ | 독립 실행 빌드 `158.0.8127.37-2` 및 Ombra Desktop 설치 프로그램 제공 |
| **Python** | `3.10+` | `ombrabrowser` 설치 시 Playwright `>=1.60,<2.0` 자동 설치 |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` 또는 Puppeteer `>=22` (Puppeteer 25+는 Node.js `>=22.12` 필요) |

### 프레임워크 및 AI 에이전트 통합

Ombra는 커스텀 Chromium 바이너리를 받거나 CDP로 연결하는 모든 자동화 도구 및 AI 에이전트 프레임워크(`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` 등)와 함께 사용할 수 있습니다:

```python
# 방법 1: 자체 러너에서 사용할 검증된 바이너리 경로와 엔진 인자 조회
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# 방법 2: Ombra SDK로 실행한 뒤 로컬 CDP 엔드포인트를 프레임워크에 전달
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# 프레임워크를 ws_url 또는 cdp_http에 연결하세요 — 핑거프린트 설정과 humanize는
# 엔진 내부에서 동작하므로 모든 CDP 클라이언트에서 그대로 유지됩니다
```

### Docker 및 Linux 서버에서 실행

이미지 빌드 시점에 엔진을 미리 다운로드하고 검증하는 `Dockerfile` 예시입니다:

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

> **컨테이너 및 웹 서버 환경:**
> - 컨테이너에서 Chromium 샌드박스를 초기화할 수 없다면 `args=["--no-sandbox"]`로 `--no-sandbox`를 명시적으로 전달하세요(SDK는 이 플래그를 자동으로 추가하지 않습니다).
> - 헤드리스 서버에서 `headless=False`로 실행하려면 `Xvfb`를 사용하세요([아래](#문제-해결) 참고).
> - `uvloop`와 함께 `uvicorn`에서 실행할 때는 서브프로세스 파이프 멈춤을 방지하기 위해 `--loop asyncio`를 전달하세요.

## 문제 해결

### 사이트가 헤드리스 모드를 차단하는 경우

일부 안티봇 시스템은 C++ 패치가 적용된 상태에서도 헤드리스 모드의 행동 및 렌더링 차이를 검사합니다. `Xvfb`를 사용해 가상 디스플레이에서 `headless=False`로 실행하세요:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

그런 다음 주거용 SOCKS5/HTTP 프록시, 영구 프로필, 일치하는 시간대/로케일, `headless=False`, `humanize=True` 조합으로 실행하세요:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Linux에서 차단이 계속된다면 [Linux 폰트 설정](#linux-폰트-설정)을 확인하세요.

### 방문할 때마다 사이트에서 검증을 요구하는 경우

`profile` 없이 `launch()`를 호출하면 매번 빈 임시 디렉터리와 새 `seed`로 시작하므로 사이트가 쿠키가 없는 완전히 새로운 방문자로 인식합니다. 실행 간 쿠키, `localStorage`, `seed`가 유지되도록 `profile="..."` 또는 `launch_persistent_context(...)`로 전환하세요.

### `ProfileBusyError`

이름 지정 프로필 또는 `user_data_dir`은 한 번에 하나의 프로세스에서만 열 수 있습니다. 병렬 워커마다 고유한 프로필 이름을 할당하세요(`profile=f"worker-{i}"`). 비정상 종료된 프로세스가 남긴 오래된 잠금 파일은 자동으로 감지되어 정리됩니다.

### `playwright install chromium`을 실행해야 하나요?

아니요. Ombra는 자체 엔진 바이너리를 실행하며 Playwright의 기본 Chromium을 사용하지 않습니다. Linux에서는 시스템 라이브러리와 `xz-utils`만 설치하면 됩니다:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### 엔진 업데이트, 채널 전환 및 롤백

SDK를 최신 릴리스로 업데이트합니다:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

`beta` 채널을 테스트하거나 특정 엔진 빌드로 고정/롤백합니다:

```python
# 특정 실행에 정확한 빌드 버전 고정
browser = launch(version="158.0.8127.37-2")
```

```bash
# 또는 환경 변수 / CLI로 설정
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# 또는 로컬에서 빌드한 바이너리 경로 지정
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper가 로컬 빌드를 차단하는 경우

Apple Silicon macOS용 공식 Ombra 릴리스는 Apple Developer ID 인증서로 서명 및 공증되어 있습니다. 서명되지 않은 로컬 개발자 빌드를 실행할 때 macOS가 격리 처리한다면 격리 속성을 한 번 제거하세요:

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### 동기 Python 환경에서 페이지 대기하기

동기 Playwright에서 `page.goto()` 직후에 긴 `time.sleep(15)`를 한 번 호출하면 Playwright의 이벤트 루프가 멈춰 검증 페이지가 진행되지 않을 수 있습니다. 대신 가벼운 컨텍스트 호출과 함께 짧은 간격으로 대기하세요:

```python
import time

for _ in range(15):
    page.context.cookies()  # 페이지 DOM에 접근하지 않고 Playwright 이벤트 루프를 계속 처리
    time.sleep(1)
```

비동기 Python에서는 `await asyncio.sleep(...)`을, Node.js에서는 `await new Promise(r => setTimeout(r, ms))`을 사용하세요. 또한 검증 전에 불필요한 CDP 트래픽이 발생하지 않도록 잦은 `page.wait_for_timeout()` 및 불필요한 `page.evaluate()` 호출을 피하세요.

## 보안

- **엔진 진위성 및 무결성 검증.** 압축을 풀기 전에 SDK가 고정된 공개 키로 릴리스 엔벨로프의 Ed25519 서명을 검증하고, 아카이브와 실행 파일 모두의 SHA-256 다이제스트를 확인합니다.
- **로컬 전용 CDP.** 디버그 포트는 엄격하게 `127.0.0.1`에만 바인딩됩니다. CDP는 브라우저 전체 제어 권한을 부여하므로 추가 인증 없이 공용 네트워크에 CDP 포트를 노출하지 마세요.
- **민감 정보 격리.** 프록시 자격 증명은 로컬 루프백 릴레이의 메모리에만 존재하며 프로세스 명령줄, 프로필 메타데이터, 로그, 오류 상세 내용에 절대 나타나지 않습니다.
- **텔레메트리 없음.** SDK는 분석 데이터, 크래시 리포트 또는 숨겨진 네트워크 핑을 전송하지 않습니다.

보안 취약점은 [SECURITY.md](../../SECURITY.md)의 안내에 따라 비공개로 제보해 주세요.

## 저장소 구조

```text
.
├── README.md                    # 영문 루트 README (English)
├── translations/
│   ├── ko/README.md             # 이 파일 (한국어)
│   ├── ru/README.md             # 러시아어 번역
│   └── <locale>/README.md       # 그 외 19개 언어 번역
├── desktop/                     # Ombra Desktop (Tauri: Rust 카탈로그 + Vue UI)
├── docs/
│   ├── architecture.md          # 아키텍처, 신뢰 경계, 수명 주기
│   ├── sdk-contract.md          # v0.1 실행 계약, 옵션, 오류, 불변 규칙
│   ├── stealth-checkup.md       # 스텔스 점검 방법론 (영문)
│   ├── stealth-checkup.ru.md    # 스텔스 점검 방법론 (러시아어)
│   ├── versioning.md            # SDK, 엔진 및 클라이언트 버전 관리
│   └── desktop/                 # Desktop 로컬 프로필 및 키 가이드
├── spec/
│   └── schemas/                 # 실행 옵션 및 바이너리 메타데이터용 JSON Schema
├── sdks/
│   ├── manifest.json            # 기계 판독 가능 SDK 레지스트리
│   ├── README.md                # SDK 구성 및 기여 규칙
│   ├── python/                  # Python SDK (ombrabrowser로 배포)
│   ├── node/                    # Node.js / TypeScript SDK (@ombralabs/sdk로 배포)
│   └── ...                      # 기타 언어 계약 스캐폴드 (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # 다국어 공통 실행 및 스텔스 불변 규칙 테스트 케이스
├── tools/check_repo.py          # 구조, 스키마 및 링크 검증 도구 (CI)
└── .github/workflows/ci.yml
```

이 저장소에는 SDK 계약, 스키마, 적합성 테스트 케이스, 문서 및 Ombra Desktop 소스 코드가 포함되어 있습니다. Chromium 엔진 패치는 별도 저장소에서 유지 관리되며, 컴파일된 빌드는 다운로드 채널과 [GitHub Releases](https://github.com/ombralabs/ombra/releases)를 통해 배포됩니다.

## 자주 묻는 질문 (FAQ)

### Playwright의 포크(fork)인가요?

아니요. SDK는 로컬 CDP를 통해 공식 Playwright(또는 Puppeteer) 클라이언트를 Ombra Chromium에 연결합니다. 모든 타입, 로케이터, 대기 메서드, 페이지 객체는 표준 그대로 유지됩니다.

### Ombra는 무료인가요? 라이선스 키가 필요한가요?

이 저장소의 SDK 소스 코드는 Apache License 2.0 오픈 소스입니다. 최신 엔진 빌드(`158.0.8127.37-2` 이상)와 로컬 Ombra Desktop 프로필 관리자(`desktop-v1.2.2`)는 계정, 라이선스 키, 하드웨어 ID, 프로필 수 제한 없이 무료로 독립 실행됩니다. `license_key`와 `OMBRA_LICENSE_KEY`는 기존 라이선스 기반 구버전 빌드에서만 필요합니다.

### SDK를 사용하려면 Ombra Desktop을 설치해야 하나요?

아니요. SDK는 엔진을 자식 프로세스로 직접 실행하므로 스크립트, 컨테이너, CI 환경에 적합합니다. Ombra Desktop은 GUI를 통해 로컬 프로필 카탈로그를 관리하고 싶을 때 선택적으로 사용하면 됩니다.

### Ombra는 `playwright-stealth`와 어떻게 다른가요?

`playwright-stealth`는 일반 브라우저 위의 페이지에 JavaScript를 주입하는 방식이라 최신 탐지기가 패치 자체를 식별하는 경우가 많습니다. Ombra는 수정 사항을 Chromium 소스 코드에 직접 컴파일하며 SDK는 페이지에 어떤 스크립트도 주입하지 않습니다.

### 직접 보유한 프록시를 사용할 수 있나요?

네. `proxy`에 `http://`, `https://`, 또는 `socks5://` 프록시를 전달하면 됩니다. 인증 정보가 포함된 경우 SDK가 로컬 루프백 릴레이를 실행하므로 프로세스 인자에 자격 증명이 노출되지 않습니다. 참고로 Playwright 자체의 `context.request` / `page.request` 클라이언트는 브라우저 수준 프록시 설정을 우회할 수 있으므로, 트래픽이 반드시 프록시를 거치게 하려면 페이지 컨텍스트에서 `fetch()`를 호출하세요.

### 어떤 Playwright 및 Puppeteer 버전을 지원하나요?

Python SDK는 Playwright `>=1.60,<2.0`을 필요로 합니다(`ombrabrowser`와 함께 자동 설치). Node.js SDK는 `playwright-core@^1.60.0` 또는 `puppeteer-core >=22.0.0`을 지원합니다. 호환성 규칙은 [버전 관리 가이드](../../docs/versioning.md)를 참고하세요.

### Ombra를 쓰면 모든 봇 검사를 통과하는 것이 보장되나요?

아니요. 탐지는 사이트, 지역, IP 평판, 프로필 이력, 탐지기 버전에 따라 계속 변하는 대상입니다. 특정 구성을 객관적으로 측정하고 추적하려면 [스텔스 점검 방법론](../../docs/stealth-checkup.md)을 사용하세요.

### Ombra는 어떤 용도로 만들어졌나요?

Ombra는 인가된 자동화, QA 테스트, 모니터링, 연구, 격리된 업무 프로필 관리를 위해 설계되었습니다. 무단 접근, 크리덴셜 스터핑, 악용 목적은 지원하지 않습니다.

## 기여하기

기여 지침은 [CONTRIBUTING.md](../../CONTRIBUTING.md), 커뮤니티 행동 강령은 [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), SDK 관련 안내는 [sdks/README.md](../../sdks/README.md)에 있습니다.

- 새 실행 옵션을 추가하기 전에 [SDK 계약](../../docs/sdk-contract.md)과 [스키마](../../spec/schemas)를 먼저 업데이트하세요.
- SDK 동작을 변경할 때는 구현, 테스트 및 [conformance](../../conformance/README.md)의 공통 케이스를 함께 업데이트하세요.
- 풀 리퀘스트를 열기 전에 `python3 tools/check_repo.py`를 실행하여 저장소 구조와 링크를 검증하세요.

## 라이선스

이 저장소의 SDK 소스 코드는 [Apache License 2.0](../../LICENSE)에 따라 라이선스가 부여됩니다. 이 라이선스는 Ombra 상표, Ombra Chromium 엔진 또는 Ombra Desktop에 대한 권리를 부여하지 않습니다. 상표 및 서드파티 약관은 [NOTICE](../../NOTICE)를 참고하세요.

## 링크

- 🌐 **웹사이트** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **릴리스 (엔진 & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **변경 이력** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **버그 제보 및 기능 요청** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **조직** — [Ombra Labs](https://github.com/ombralabs)
