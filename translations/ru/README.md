<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra?style=flat" alt="Лицензия"></a>
<a href="https://github.com/ombralabs/ombra/commits/main"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Последний коммит"></a>
<br>
<a href="https://github.com/ombralabs/ombra/stargazers"><img src="https://img.shields.io/github/stars/ombralabs/ombra?style=flat" alt="Звёзды"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Загрузки PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Загрузки npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Релиз"></a>
</p>

<p align="center">
<a href="#установка"><strong>Установка</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-и-typescript-api">Node.js API</a> ·
<a href="#имитация-пользовательского-ввода">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Языки</summary>

[English](../../README.md) · [Русский](README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium с управлением отпечатком на уровне C++ и нативной имитацией ввода.</h3>

<table><tr><td>
Не набор флагов запуска и не JavaScript-инъекция поверх страницы. Настоящий бинарник Chromium с патчами отпечатка на уровне исходного кода и имитацией пользовательского ввода внутри процесса браузера. Вы подключаете официальный Playwright или Puppeteer по локальному CDP — без обёрток и без переписывания кода страниц.
</td></tr></table>

<br>

<p align="center">
Прямая замена запуска для Playwright и Puppeteer в Python и Node.js.<br>
Тот же API, те же селекторы и типы — достаточно заменить импорт и вызов <code>launch()</code>.
</p>

- **Патчи на уровне исходного кода Chromium** — canvas, WebGL, WebGPU, аудио, шрифты, GPU, экран, CSS media queries, аппаратные характеристики, WebRTC без утечек STUN, TLS ClientHello, часовой пояс, локаль и удаление признаков автоматизации (`navigator.webdriver`, `Runtime.enable`, маркеры headless).
- **Нативная имитация ввода в процессе браузера (`humanize=True`)** — траектории указателя (`cursory-rs`), клики с прицеливанием и удержанием, ритм печати с исправлением опечаток и физика прокрутки работают внутри Chromium. SDK возвращает чистый нативный `Browser` без прокси-обёрток.
- **Автономная работа без ключей и аккаунтов** — актуальные сборки движка и Ombra Desktop запускаются локально без регистрации, лицензионного ключа, аппаратного ID и сервера лицензирования.
- **Автоматическая установка и криптографическая проверка движка** — `pip install ombrabrowser` или `npm install @ombralabs/sdk`; при первом запуске SDK скачивает совместимую сборку из [GitHub Releases](https://github.com/ombralabs/ombra/releases) и проверяет подпись Ed25519 и контрольную сумму SHA-256.
- **Постоянные профили и безопасный прокси-ретранслятор** — именованные профили сохраняют cookies, `localStorage`, IndexedDB и `seed`, защищены кросс-процессной блокировкой; прокси с авторизацией (HTTP, HTTPS, SOCKS5) работают через локальный loopback-ретранслятор без передачи паролей в аргументах процесса.
- **Офлайн-менеджер профилей Ombra Desktop** — нативное настольное приложение в этом же репозитории ([`desktop/`](../../desktop/README.md)) с готовыми установщиками для macOS, Linux и Windows.

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

Также поддерживается Puppeteer: `import { launch } from "@ombralabs/sdk/puppeteer"` или `launchPuppeteer()` ([подробнее](#puppeteer)).

**Для сайтов с антибот-защитой** используйте резидентный прокси, постоянный профиль и согласованные параметры среды:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # резидентный IP предпочтительнее дата-центра
    fingerprint={"timezone": "auto", "locale": "auto"},  # подбор часового пояса и локали по выходу прокси
    headless=False,                                      # часть сайтов проверяет отличия headless-режима
    humanize=True,                                       # нативная имитация мыши, клавиатуры и прокрутки
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

См. [Устранение неполадок](#устранение-неполадок) для разбора типовых проблем на Linux, в контейнерах и на защищённых сайтах.

## Установка

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Дополнительно: автоопределение часового пояса и локали по выходу прокси (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# С Playwright (1.60.0+, загрузка штатного Chromium не требуется)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Или с Puppeteer (для Puppeteer 25+ требуется Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Дополнительно: офлайн-чтение базы GeoIP для timezone: "auto" и locale: "auto"
npm install mmdb-lib
```

---

При запуске SDK ищет движок в строгом порядке: сначала путь из `binary_path` (`binaryPath` в Node.js), затем переменную `OMBRA_BINARY_PATH`, каталог движков Ombra Desktop и кеш SDK (`~/.ombra/engines`). Если подходящий движок не найден, SDK скачивает сборку из [GitHub Releases](https://github.com/ombralabs/ombra/releases), проверяет подпись Ed25519 и контрольную сумму SHA-256 и кеширует её локально. Команда `playwright install chromium` не нужна.

Чтобы отключить автоматическую загрузку, передайте `download=False` (`download: false` в Node.js). Чтобы скачать и проверить движок заранее (например, при сборке контейнера), вызовите `ensure_binary()` (`ensureBinary()`) или команду CLI `install`.

> **Автономный запуск:** актуальные сборки движка бесплатны и не требуют аккаунта или ключа лицензии. Переменная `OMBRA_LICENSE_KEY` и команда `login` сохранены для совместимости со старыми лицензируемыми сборками.

**Миграция с Playwright** занимает две строки — весь код работы со страницами, локаторами и ожиданиями остаётся прежним:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # остальной код работает без изменений
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ Поставьте **звезду** репозиторию, если проект полезен, и включите **[Watch releases](https://github.com/ombralabs/ombra/subscription)**, чтобы получать уведомления о новых сборках движка, SDK и Ombra Desktop.

---

## Актуальное состояние и релизы

Все компоненты экосистемы развиваются по общему контракту запуска и имеют независимую версионность.

| Компонент | Статус / версия | Где найти |
|---|---|---|
| **Контракт SDK** | Черновик `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Альфа `0.2.0` | [`ombrabrowser` на PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Альфа `0.2.0` | [`@ombralabs/sdk` на npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Движок Ombra Chromium** | Диапазон SDK `>=151.0.7922.108,<159` | Автозагрузка через SDK из [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Офлайн-менеджер профилей | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Автономный браузер** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Схемы и проверка соответствия** | JSON Schema + кейсы | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Методика проверки движка** | 6 слоёв (`L0`–`L5`) | [`docs/stealth-checkup.ru.md`](../../docs/stealth-checkup.ru.md) |

Подробная история изменений — в [CHANGELOG.md](../../CHANGELOG.md).

## Почему Ombra

- **Патчи на уровне конфигурации и JS быстро ломаются.** Инструменты вроде `playwright-stealth`, `puppeteer-extra` и `undetected-chromedriver` внедряют JavaScript на страницу или подбирают флаги запуска. Очередное обновление Chrome ломает их, а современные детекторы обнаруживают сами следы подмены (`Function.prototype.toString`, аномалии прототипов, `addScriptToEvaluateOnNewDocument`).
- **Изменения встроены в исходный код Chromium.** Отпечаток формируется на уровне C++ и применяется согласованно в главном фрейме, воркерах и iframe. SDK не внедряет скрипты на страницу и не вызывает `Emulation.*`-переопределения.
- **Имитация ввода в процессе браузера, а не поверх Playwright.** Поскольку траектории мыши, набор текста и прокрутка обрабатываются в самом движке, SDK не подменяет объекты Playwright и Puppeteer — работают любые локаторы, фреймы и сторонние библиотеки.
- **Локальная архитектура без лишних сервисов.** Нет отдельного фонового сервера-контроллера и сетевых прослоек между скриптом и браузером: один процесс движка, локальный CDP на `127.0.0.1`, никаких ограничений на количество профилей и потоков.

## Ombra Desktop

**Локальный офлайн-менеджер профилей с графическим интерфейсом.** Исходный код приложения находится прямо в этом репозитории ([`desktop/`](../../desktop/README.md)) и построен на Tauri (Rust + Vue).

- **Полностью офлайн и локально** — каталог профилей хранится в локальной SQLite-базе на вашей машине с локальным ключом шифрования; аккаунт, облако и доступ в сеть не требуются.
- **Удобная организация профилей** — создание профилей, поиск по имени, заметке и номеру, редактирование описаний, поддержка групп, тегов, меток и закладок на уровне Rust-каталога.
- **Безопасная корзина** — перемещение профиля в корзину сохраняет его файлы на диске и позволяет восстановить профиль позже.
- **Без лимитов на число профилей** — никаких тарифов за количество сохранённых профилей: все данные принадлежат вам.
- **Готовые установщики** — macOS Apple Silicon (`.dmg`, подписан Apple Developer ID и нотаризован), Linux (`.deb` и `.rpm`) и Windows x64 (`setup.exe`).
- **Изоляция каталогов** — переменная окружения `OMBRA_DESKTOP_DATA_DIR` позволяет открыть отдельный тестовый каталог или резервную копию.

[Скачать последний релиз →](https://github.com/ombralabs/ombra/releases) · [Документация Desktop](../../desktop/README.md) · [Руководство по профилям и ключам](../../docs/desktop/README.md)

## Проверка отпечатка и stealth-чекап

Вместо голословных обещаний о «100% обходе любых защит» Ombra опирается на воспроизводимую методику проверки в зафиксированных условиях. Итоговый результат на конкретном сайте всегда зависит от репутации выходного IP, региона, истории профиля, версии детектора и настроек запуска.

### Что закрывается на уровне движка и SDK

| Поверхность / сигнал | Штатный Playwright | Ombra | Как реализовано |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Патч на уровне C++ в движке |
| `window.chrome` | отсутствует в headless | полноценный объект | Как в обычном Chrome |
| `navigator.plugins` | `0` в headless | согласованный набор | На уровне движка |
| User-Agent и Client Hints | `HeadlessChrome`, расхождение брендов | `Google Chrome` + согласованный `Sec-CH-UA*` | Патч `010-user-agent-and-webdriver` |
| Артефакты CDP (`Runtime.enable`, `UtilityScript`) | фиксируются детекторами | подавляются движком; SDK не вызывает `Runtime.enable` | Патч `110-runtime-enable` + инвариант `SI-01` |
| WebRTC IP-утечка | раскрывает локальный/хостовый IP | подставляется IP выхода без реального STUN | Патч `100-webrtc-leak` (`--webrtc-ip`) |
| TLS и HTTP/2 | зависит от конфигурации | сетевой стек Chromium + профиль ClientHello `chrome-<major>` | Патч `210-tls-network-persona` |
| WebGL и WebGPU | программный рендерер / расхождение с GPU | единая таблица лимитов и расширений WebGL/WebGPU | Патчи `070`, `071`, `075`, `955` |
| Шрифты, локаль и часовой пояс | значения хоста, дрейф `Intl` | согласованные таблицы шрифтов, ICU-локаль и TZ | Патчи `040`, `090`, `092`, `230` |
| Имитация ввода | телепортация курсора, мгновенный `fill()` | траектории `cursory-rs`, ритм печати, физика прокрутки | Патч `135-ombra-humanize` в процессе браузера |
| Стабильность отпечатка | меняется или выдаёт хост | детерминирована по `seed` между перезапусками и фреймами | Патчи `001`, `002` + постоянный профиль |

### Шесть слоёв методики проверки

Перед релизом и при проверке своей конфигурации прогоняйте шесть слоёв чекапа на той сборке движка, клиенте автоматизации и прокси, которые планируете использовать в работе:

| Слой | Типовые цели | Критерий прохождения |
|---|---|---|
| **L0 Транспорт** | TrackMe, проверки утечек IP и WebRTC, эхо заголовков | Виден только выходной IP прокси; JA4 и HTTP/2 соответствуют сборке Chromium; пароли прокси не попадают в argv |
| **L1 Идентичность** | Локальная проба, Sannysoft, Intoli, проверка UA-CH | Нет противоречий между UA, Client Hints, платформой, GPU, шрифтами, экраном и локалью |
| **L2 Отпечаток** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Нет маркеров headless и «лжи» (`lie`); стабильный отпечаток при перезагрузках |
| **L3 Автоматизация** | rebrowser, brotector, botd, аудит команд CDP | Нет утечек `Runtime.enable`, init-скриптов, биндингов и `navigator.webdriver` |
| **L4 Поведение** | Проба достоверности ввода, трассы humanize, smoke живого челленджа | События `isTrusted: true`, естественный порядок и тайминги, реалистичные траектории и прокрутка |
| **L5 Согласованность** | Повторные запуски, воркеры, same/cross-origin iframe, разные SDK | Один и тот же `seed` воспроизводит идентичный отпечаток во всех контекстах |

Полная методика, статусы (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), чеклист сигналов и шаблон отчёта: [на русском (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md) и [на английском (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md).

## Сравнение

| Характеристика | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API автоматизации | Playwright | Playwright | Selenium | **Playwright и Puppeteer** |
| Уровень модификации | Нет | JS-инъекции на страницу | Флаги конфигурации | **Исходный код C++ (Chromium)** |
| Согласованный `seed` отпечатка | Нет | Нет | Частично | **Да, на профиль и eTLD+1** |
| Имитация ввода (`humanize`) | Нет | Нет | Нет | **Встроена в процесс браузера** |
| Подавление `Runtime.enable` / CDP-утечек | Нет | Нет | Частично | **Патч движка + инварианты SDK** |
| Прокси с авторизацией без утечки в CLI | Нет | Нет | Ограничено | **Локальный loopback-ретранслятор** |
| Изоляция профилей | Контекст браузера | Контекст браузера | Нет | **Каталог профиля + блокировка** |
| Офлайн-менеджер профилей (GUI) | Нет | Нет | Нет | **Ombra Desktop (macOS, Linux, Windows)** |
| Миграция с Playwright | — | Замена импорта | Переписывание кода | **Замена импорта и `launch()`** |

## Как это работает

```mermaid
flowchart LR
    Script["Ваш скрипт<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP-мост"]
    Relay["Локальный прокси-ретранслятор<br/>если нужен логин/пароль"]
    Engine["Ombra Chromium<br/>движок с C++-патчами"]
    Client["Нативный клиент<br/>Playwright · Puppeteer"]
    Profile[("Профиль<br/>seed · cookies · хранилище")]

    Script -->|"launch()"| SDK
    SDK -->|"проверка + запуск"| Engine
    SDK -.->|"авторизация прокси"| Relay
    Relay -.-> Engine
    SDK -->|"подключение по CDP"| Client
    Script -->|"API страниц"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **`launch()` находит или скачивает движок** и проверяет его подпись Ed25519 и контрольную сумму SHA-256.
2. **Подготавливается профиль и `seed`.** Для именованного профиля ставится кросс-процессная блокировка; если прокси требует логин и пароль, SDK поднимает локальный loopback-ретранслятор в памяти.
3. **Запускается Ombra Chromium** с выбранным профилем, параметрами отпечатка и локальным портом отладки `--remote-debugging-port=0`.
4. **Подключается официальный клиент.** Как только появляется `DevToolsActivePort`, SDK подключает Playwright (с `no_defaults=True`) или Puppeteer по `127.0.0.1` и возвращает нативный объект `Browser`.
5. **Чистое завершение.** Вызов `browser.close()` отправляет `Browser.close`, завершает дерево процессов движка, останавливает ретранслятор и снимает блокировку профиля.

После запуска SDK уходит с пути данных: все команды работы со страницами идут напрямую от Playwright или Puppeteer к Chromium.

### Границы и stealth-инварианты SDK

Контракт [v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) закрепляет обязательные ограничения для каждого официального SDK:

- **Никаких stealth-скриптов на странице.** SDK никогда не вызывает `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` и не переписывает свойства DOM.
- **Никакого `Runtime.enable`.** Для проверки готовности используется только локальный HTTP-эндпоинт CDP или `Browser.getVersion`; SDK не включает домены `Runtime`, `Debugger` и `Log`.
- **Никаких `Emulation.*`-переопределений.** SDK не вызывает `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` и `setDeviceMetricsOverride` — идентичность задаёт движок.
- **Никаких запрещённых флагов по умолчанию.** SDK сам не добавляет `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` и `--user-agent`.
- **Только локальный CDP.** Порт отладки всегда привязан к `127.0.0.1`; попытка передать внешний `--remote-debugging-address` отклоняется с ошибкой.
- **Никакой телеметрии и утечек секретов.** Пароли прокси, ключи и cookies вырезаются из логов и сообщений об ошибках.

## Python API

### `launch()`

```python
from ombrabrowser import launch

# Базовый запуск (headless по умолчанию)
browser = launch()

# Видимое окно браузера
browser = launch(headless=False)

# С HTTP или SOCKS5 прокси (поддерживаются учётные данные через loopback-ретранслятор)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# С объектом прокси и списком исключений (bypass)
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

# Управление отпечатком (seed, ОС, автоподбор TZ/локали по прокси, экран, GPU)
# Для timezone="auto" / locale="auto" установите: pip install "ombrabrowser[geoip]"
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

# Нативная имитация мыши, клавиатуры и прокрутки
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Закрепление точной сборки движка и дополнительные флаги Chromium
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Возвращает стандартный `playwright.sync_api.Browser`. Доступны все методы Playwright (`new_page()`, `new_context()`, `close()` и т. д.). По умолчанию новые страницы создаются с `no_viewport=True`, чтобы не перезаписывать размеры окна профиля.

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

### `launch_context()` и `launch_context_async()`

Удобная обёртка, которая запускает браузер и сразу возвращает `BrowserContext` (закрытие контекста автоматически завершает процесс движка). Дополнительные аргументы пробрасываются в `browser.new_context()` — например, `storage_state`, `permissions`, `extra_http_headers`:

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

Асинхронный аналог — `await launch_context_async(...)`.

### `launch_persistent_context()` и `launch_persistent_context_async()`

Запускает браузер с постоянным профилем и возвращает его основной `BrowserContext`. Cookies, `localStorage`, IndexedDB, кеш и `seed` отпечатка сохраняются между сессиями.

- При передаче `profile="pricing-eu"` профиль создаётся в `~/.ombra/profiles/pricing-eu` с метаданными в `.ombra/profile.json` и файлом блокировки.
- При передаче пути `user_data_dir="./my-profile"` (или первого позиционного аргумента) используется указанный каталог.
- Повторный параллельный запуск того же профиля из другого процесса завершается ошибкой `ProfileBusyError`, не повреждая данные.

```python
from ombrabrowser import launch_persistent_context

# По имени профиля (хранится в ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookies, хранилище и seed сохранены

# По явному пути (например, для загрузки расширений)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Асинхронный аналог — `await launch_persistent_context_async(...)`.

### Служебные функции и диагностика (Python)

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

# Информация об установленном движке
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Скачать и проверить движок без запуска браузера
ensure_binary(version="158.0.8127.37-3")

# Удалить кеш движков SDK (профили в ~/.ombra/profiles не затрагиваются)
clear_cache()

# Предпросмотр итоговой команды запуска (dry-run, без старта процесса)
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Получить метаданные запущенной сессии (CDP-порт, ws_url, seed, pid) и проверить здоровье процесса
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # скачать и проверить движок (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # установить конкретную сборку
ombrabrowser info                                # диагностика окружения, движка и зависимостей (алиас: doctor)
ombrabrowser info --quick --json                 # быстрая машиночитаемая диагностика без запуска бинарника
ombrabrowser info --proxy socks5://user:pass@host:1080  # проверить разрешение IP, TZ и локали через прокси
ombrabrowser update                              # проверить GitHub Releases и обновить кешированный движок
ombrabrowser clear-cache                         # очистить кеш движков (профили сохраняются)
ombrabrowser login                               # сохранить ключ в ~/.ombra/license.key (для старых сборок)
ombrabrowser logout                              # удалить сохранённый ключ
```

Те же команды доступны через `python -m ombrabrowser <команда>`.

## Node.js и TypeScript API

Пакет `@ombralabs/sdk` поставляется с двойной сборкой ESM + CommonJS и полными типами TypeScript (`.d.ts`). Поддерживаются Playwright и Puppeteer поверх одного и того же движка.

### Playwright (по умолчанию)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Базовый запуск с прокси, отпечатком и имитацией ввода
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

// Удобный запуск: браузер + контекст в одном вызове
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Постоянный профиль — cookies, localStorage и seed сохраняются между запусками
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Каждый фрагмент выше — самостоятельный пример; для переноса существующего скрипта можно также заменить импорт на `import * as chromium from "@ombralabs/sdk"` и оставить вызов `await chromium.launch(...)`.

### Puppeteer

Используйте `launchPuppeteer()` из `@ombralabs/sdk` или подмодуль `@ombralabs/sdk/puppeteer`:

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

> **Замечание по Puppeteer:** клиент Puppeteer сам отправляет больше служебного CDP-трафика по умолчанию, чем Playwright с `connectOverCDP({ noDefaults: true })`. Для сайтов со строгой проверкой CDP рекомендуется Playwright.

### Утилиты и CLI (Node.js)

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

## Имитация пользовательского ввода

В Ombra имитация ввода (`humanize`) встроена **нативно в процесс браузера Chromium** (на базе `cursory-rs` и планировщика ввода движка), а не реализована как JS-обёртка поверх клиента автоматизации. Это означает:

- Все стандартные вызовы Playwright и Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) проходят через единую очередь ввода на вкладку прямо внутри браузера.
- Параметры поведения детерминированно выводятся из `seed` профиля (`--fingerprint-humanize-seed`).
- SDK не оборачивает `Page` и `Browser` в прокси-классы — сохраняются оригинальные типы и поведение клиента.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Что меняется при `humanize=True`:**

| Действие | Без `humanize` | С `humanize=True` |
|---|---|---|
| Движение мыши | Мгновенный переход в точку | Кривые `cursory-rs` с ускорением, паузой и лёгким перелётом |
| Клики и перетаскивание | Мгновенное нажатие | Прицеливание в пределах элемента, задержка перед нажатием и время удержания |
| Ввод текста | Мгновенная вставка | Посимвольный набор с заданными параметрами ритма и раскладки, опечатками и самоисправлением; очень длинный текст вставляется через собственный буфер обмена без затрагивания системного |
| Прокрутка | Резкий скачок | Серия событий колёсика/трекпада по измеренной таблице затухания |
| Паузы между действиями | Неподвижный курсор | В пресете `careful` — естественный дрейф курсора в состоянии покоя |

**Пресеты** — `default` (обычный темп), `careful` (аккуратный, более медленный с микродвижениями в покое) и `fast` (ускоренный). Чтобы явно выключить имитацию ввода, передайте `humanize=False` (`humanize: false`).

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Режим и пресет можно переключать на лету без перезапуска браузера через CDP-домен `Ombra`:

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

## Управление отпечатком и профилями

Движок формирует согласованный набор параметров браузера из одного `seed`. Если `seed` не передан:

| Сценарий | Что происходит |
|---|---|
| **`launch()` без профиля** | SDK генерирует случайный `seed` на время сессии и создаёт временный каталог, который удаляется после `close()`. |
| **`profile="name"` или `user_data_dir="./dir"`** | `seed` сохраняется в `.ombra/profile.json` и переиспользуется при каждом следующем запуске — сайт видит возвращающегося пользователя с прежним устройством и cookies. |
| **`fingerprint={"seed": N, ...}`** | Детерминированный отпечаток по явному `seed`; остальные поля объекта переопределяют отдельные параметры, сохраняя согласованность остальных. |

Шум canvas/аудио привязывается к `eTLD+1` сайта (внутри одного домена значения стабильны, между разными сайтами не связываются). Пиксельный шум canvas/WebGL по умолчанию отключён, чтобы не вызывать ложных срабатываний детекторов «Canvas Tampering / Masking», и включается явно флагом `--fingerprint-pixel-noise`.

> **Совет:** если вы возвращаетесь на один и тот же сайт, используйте постоянный профиль (`profile="name"` или `launch_persistent_context()`), а не один и тот же `seed` с пустым временным профилем — так вместе с отпечатком сохраняются cookies, кеш и `localStorage`.

### Поля объекта `fingerprint`

Поля ниже указаны в стиле Python (`snake_case`); в Node.js доступны как `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`), так и `snake_case`:

| Поле | Тип | Описание |
|---|---|---|
| `seed` | `int` (`>= 0`) | Начальное значение генератора, определяющее всю конфигурацию отпечатка |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Целевая ОС (`navigator.platform`, UA, пул GPU и шрифтов) |
| `os_version` | `string` | Версия ОС для Client Hints |
| `timezone` | IANA-зона или `"auto"` | Часовой пояс (например, `"Europe/Berlin"`). `"auto"` подбирает зону по выходу прокси через GeoIP |
| `locale` | BCP-47 или `"auto"` | Язык (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` подбирает локаль по выходу прокси |
| `screen` | `{"width", "height"}` или `"auto"` | Размеры экрана и рабочей области с учётом панели задач / строки меню целевой ОС |
| `gpu` | `{"vendor", "renderer"}` или `"auto"` | Явные строки WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` или `"auto"` | Значение `navigator.hardwareConcurrency` |
| `device_memory` | `int` или `"auto"` | Значение `navigator.deviceMemory` (в ГБ) |
| `noise` | `bool` | Включение/отключение шума отпечатка (`False` передаёт `--disable-fingerprint-noise`) |

> Сохраняйте `seed` основным источником параметров отпечатка: ручное изменение отдельных полей без согласования (например, несовместимой пары ОС и GPU) может создать противоречие для детекторов.

### Дополнительные флаги движка (`args`)

Дополнительные флаги движка (можно задать или переопределить через `args=[...]`):

| Флаг | Назначение |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Выбор бренда браузера в `Sec-CH-UA` (по умолчанию SDK задаёт `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | Профиль TLS ClientHello под указанную мажорную версию Chrome (SDK задаёт автоматически по версии движка) |
| `--webrtc-ip=<ip>` | Подстановка IP-адреса в WebRTC ICE-кандидаты без отправки реальных STUN-запросов |
| `--fingerprint-location=<lat,lon>` | Координаты для `navigator.geolocation` |
| `--fingerprint-storage-quota=<МБ>` | Квота хранилища в `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Число точек касания (`navigator.maxTouchPoints` и pointer media queries) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Плотность пикселей (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<бит>` | Глубина цвета экрана |
| `--disable-gpu-fingerprint` | Передать реальный GPU хоста (строки, лимиты и расширения WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | Передать реальные строки GPU, сохранив остальные параметры профиля |
| `--disable-fingerprint-noise` | Отключить шум canvas/WebGL/аудио, сохранив параметры идентичности (также задаётся через `fingerprint={"noise": False}`) |
| `--fingerprint-pixel-noise` | Включить опциональный идемпотентный пиксельный шум для 2D canvas и `readPixels` |
| `--profile-label=<текст>` | Подпись профиля в адресной строке браузера (только в UI; задаётся автоматически из `profile`, передавайте через `args` только без `profile`) |

### Настройка шрифтов на Linux

На минимальных Linux-серверах и в контейнерах часто отсутствуют базовые шрифты emoji и CJK, из-за чего рендеринг текста и эмодзи на скрытом canvas даёт нетипичные хеши.

**1. Базовый слой (emoji и CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Шрифты Windows для Windows-профилей (`os="windows"`):**
Если вы запускаете Windows-конфигурацию на Linux, установка реальных шрифтов из `C:\Windows\Fonts\` (включая `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) заметно улучшает согласованность проверки шрифтов:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Шрифты macOS для macOS-профилей (`os="macos"`):**
Аналогично, при использовании `os="macos"` на Linux скопируйте шрифты из `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` и `/Library/Fonts/` в `~/.local/share/fonts/mac/` и выполните `fc-cache -f`.

В `Dockerfile` размещайте шрифты в системном каталоге `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Параметры запуска, конфигурация и ошибки

### Параметры `launch()`

Имена указаны по Python API и [контракту SDK](../../docs/sdk-contract.md); в Node.js используются эквиваленты в `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`), при этом `snake_case`-алиасы также принимаются. Неизвестные параметры отклоняются с ошибкой `InvalidOptionError`.

| Параметр | По умолчанию | Описание |
|---|---|---|
| `headless` | `true` | Запуск без окна (`--headless=new`) |
| `proxy` | нет | URL прокси (`http`, `https`, `socks5`) или объект; прокси с авторизацией используют loopback-ретранслятор |
| `fingerprint` | нет | Объект настроек `seed`, ОС, часового пояса, локали, экрана, GPU, памяти и шума |
| `profile` | нет | Имя постоянного профиля в `~/.ombra/profiles/<slug>` (взаимоисключим с `user_data_dir`) |
| `user_data_dir` | временный | Явный путь к каталогу профиля (взаимоисключим с `profile`) |
| `args` | `[]` | Дополнительные аргументы Chromium (передаются без изменений) |
| `binary_path` | автопоиск | Явный путь к исполняемому файлу движка |
| `version` | из env / авто | Закрепление версии движка (например, `158.0.8127.37-3`), переопределяет `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Лимит времени на старт движка и подключение по CDP (1000–600000 мс) |
| `humanize` | по умолчанию движка | `False`, `True` или `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | из env / файла | Ключ для старых лицензируемых сборок (не требуется на актуальных сборках; не логируется) |
| `env` | `{}` | Дополнительные переменные окружения для процесса движка |
| `download` | `True` | Разрешить автоматическую загрузку отсутствующего движка |

### Переменные окружения

Приоритет разрешения: **явный параметр запуска → переменная окружения → метаданные профиля → значение по умолчанию**.

| Переменная | По умолчанию | Описание |
|---|---|---|
| `OMBRA_BINARY_PATH` | не задана | Явный путь к бинарнику движка |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Каталог кеша движков и именованных профилей |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Источник загрузки движка; свой URL включает режим зеркала (`none`/`off` отключает загрузку) |
| `OMBRA_VERSION` | последняя совместимая | Закреплённая версия движка (например, `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Канал обновлений движка: `stable` (релизы GitHub) или `beta` (пререлизы GitHub) |
| `OMBRA_AUTO_UPDATE` | `true` | Проверять наличие новой сборки движка при запуске |
| `OMBRA_SKIP_CHECKSUM` | `false` | Только для локальной разработки: отключает проверку SHA-256 (выводит предупреждение) |
| `OMBRA_LICENSE_KEY` | не задана | Ключ для старых лицензируемых сборок (не логируется) |
| `OMBRA_TIMEOUT_MS` | `30000` | Таймаут запуска по умолчанию (мс) |
| `OMBRA_LOG_LEVEL` | `warn` | Уровень логирования: `error`, `warn`, `info`, `debug` |

### Типизированные ошибки

При любом сбое SDK завершает запущенный процесс движка, снимает блокировку профиля и выбрасывает подкласс `OmbraError` с полем `kind` и очищенным от секретов `details`:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Полная спецификация ошибок и политики повторов — в [контракте SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Платформы, интеграции и контейнеры

### Поддерживаемые платформы и рантаймы

| Компонент | Поддержка | Примечания |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Автономные сборки движка через GitHub Releases; Ombra Desktop подписан Developer ID и нотаризован |
| **macOS x64 (Intel)** | — | Текущей сборки Chromium 158 нет |
| **Linux x64** | ✅ | Автономные сборки движка через GitHub Releases; Node.js SDK требует `xz-utils` (`xz`) для распаковки `.tar.xz` |
| **Windows x64** | ✅ | Автономные сборки движка через GitHub Releases и установщик Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` устанавливается вместе с `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` или Puppeteer `>=22` (для Puppeteer 25+ нужен Node.js `>=22.12`) |

### Интеграция с фреймворками и ИИ-агентами

Ombra работает с любыми инструментами и агентными фреймворками, которые умеют запускать свой бинарник Chromium или подключаться по CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` и др.):

```python
# Вариант 1: получить путь к проверенному движку и рабочие аргументы для своего раннера
# Примечание: build_launch_options() — dry-run-утилита; передавайте явные user_data_dir и seed
# (именованные профили и прокси с авторизацией требуют Вариант 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Вариант 2: запустить через Ombra SDK и передать локальный WebSocket CDP фреймворку
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Подключите фреймворк по ws_url или cdp_http — настройка отпечатка и humanize
# работают внутри движка и сохраняются для любого CDP-клиента
```

### Запуск в Docker и на Linux-сервере

Пример `Dockerfile` с предзагрузкой проверенного движка на этапе сборки образа:

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

> **Контейнеры и веб-серверы:**
> - Если среда контейнера не позволяет запустить sandbox Chromium, передайте `--no-sandbox` явно через `args=["--no-sandbox"]` (SDK никогда не добавляет этот флаг сам).
> - Для запуска в режиме `headless=False` на сервере без монитора используйте `Xvfb` (см. [ниже](#устранение-неполадок)).
> - При запуске из-под `uvicorn` с `uvloop` используйте `--loop asyncio`, чтобы избежать зависаний каналов дочерних процессов.

## Устранение неполадок

### Сайт блокирует headless-режим

Некоторые антибот-системы проверяют поведенческие и графические отличия headless-режима даже при наличии C++-патчей. Запустите браузер с `headless=False` на виртуальном дисплее `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Затем используйте рекомендуемую конфигурацию: резидентный SOCKS5/HTTP прокси, постоянный профиль, согласование часового пояса и локали, `headless=False` и `humanize=True` (см. пример `launch_persistent_context()` в начале этого README).

Если блокировки сохраняются на Linux, проверьте [установку шрифтов](#настройка-шрифтов-на-linux).

### Сайт выдаёт проверку на каждом заходе

Обычный вызов `launch()` без параметра `profile` каждый раз стартует с чистым временным каталогом и новым `seed`, поэтому сайт видит совершенно нового посетителя без cookies. Перейдите на `profile="..."` или `launch_persistent_context(...)` — cookies, `localStorage` и `seed` будут сохраняться между запусками.

### Ошибка `ProfileBusyError`

Один именованный профиль или каталог `user_data_dir` может использоваться только одним процессом одновременно. Для параллельных воркеров назначайте каждому потоку отдельное имя профиля (`profile=f"worker-{i}"`). Устаревшие блокировки от аварийно завершившихся процессов SDK распознаёт и очищает автоматически.

### Нужно ли выполнять `playwright install chromium`?

Нет. Ombra использует собственный движок и не запускает штатный Chromium из Playwright. На Linux могут понадобиться только системные библиотеки браузера и `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Обновление, выбор канала и откат версии движка

Обновить SDK до последней версии:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Проверить сборку из канала `beta` или закрепить/откатить конкретную сборку движка:

```python
# Закрепить точную сборку для конкретного запуска
browser = launch(version="158.0.8127.37-3")
```

```bash
# Проверка канала beta (сбросьте OMBRA_VERSION — точный пин с суффиксом -N игнорирует канал)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Или закрепить / откатить точную сборку движка
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Или указать локально собранный бинарник
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: блокировка Gatekeeper на локальной сборке

Официальные релизы Ombra для macOS Apple Silicon подписываются сертификатом Apple Developer ID и проходят нотаризацию. Если вы запускаете локальную неподписанную сборку разработчика и macOS блокирует её карантином, снимите атрибут карантина один раз:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Как ждать на странице в синхронном Python

В синхронном Playwright один длинный `time.sleep(15)` после `page.goto()` останавливает цикл обработки событий Playwright, из-за чего страница с проверкой может зависать на этапе верификации. Ждите короткими шагами с лёгким вызовом контекста:

```python
import time

for _ in range(15):
    page.context.cookies()  # поддерживает цикл Playwright, не вмешивается в DOM страницы
    time.sleep(1)
```

В асинхронном Python используйте `await asyncio.sleep(...)`, в Node.js — `await new Promise(r => setTimeout(r, ms))`. Старайтесь также избегать частых `page.wait_for_timeout()` и лишних `page.evaluate()` перед проверками, чтобы не создавать избыточный CDP-трафик.

## Безопасность

- **Проверка подлинности и целостности движка.** Перед распаковкой SDK проверяет подпись Ed25519 подписанного конверта релиза закреплённым публичным ключом и сверяет контрольную сумму SHA-256 архива и исполняемого файла.
- **Локальный CDP.** Порт отладки привязывается только к `127.0.0.1`. Не публикуйте порт CDP во внешнюю сеть без дополнительной аутентификации — CDP даёт полный контроль над браузером.
- **Изоляция секретов.** Логин и пароль прокси хранятся только в памяти локального loopback-ретранслятора, не попадают в аргументы командной строки процесса, метаданные профиля, логи и тексты исключений.
- **Нет телеметрии.** SDK не отправляет аналитику, отчёты о сбоях и скрытые запросы.

О найденных уязвимостях сообщайте конфиденциально по правилам [SECURITY.md](../../SECURITY.md).

## Карта репозитория

```text
.
├── README.md                    # Основной README (English)
├── translations/
│   ├── ru/README.md             # этот файл (Русский)
│   └── <locale>/README.md       # ещё 20 локализаций
├── desktop/                     # Ombra Desktop (Tauri: Rust-каталог + Vue UI)
├── docs/
│   ├── architecture.md          # архитектура, границы доверия, жизненный цикл
│   ├── sdk-contract.md          # контракт запуска v0.2, опции, ошибки, инварианты
│   ├── stealth-checkup.md       # методика проверки (English)
│   ├── stealth-checkup.ru.md    # методика проверки (Русский)
│   ├── versioning.md            # версионность SDK, движка и клиентов
│   └── desktop/                 # руководства по локальным профилям и ключам Desktop
├── spec/
│   └── schemas/                 # JSON Schema параметров запуска и сведений о движке
├── sdks/
│   ├── manifest.json            # машиночитаемый реестр SDK
│   ├── README.md                # правила структуры и разработки SDK
│   ├── python/                  # Python SDK (опубликован как ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (опубликован как @ombralabs/sdk)
│   └── ...                      # заготовки контракта для других языков (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # общие межъязыковые кейсы запуска и stealth-инвариантов
├── tools/check_repo.py          # валидация структуры, схем и ссылок в CI
└── .github/workflows/ci.yml
```

В этом репозитории находятся контракт SDK, схемы, тесты соответствия, документация и исходный код Ombra Desktop. Исходный код патчей движка Chromium ведётся в отдельном репозитории, а готовые сборки публикуются в [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### Это форк Playwright?

Нет. SDK подключает официальный клиент Playwright (или Puppeteer) к Ombra Chromium по локальному CDP. Все типы, локаторы, ожидания и page-объекты остаются стандартными.

### Бесплатен ли Ombra и нужен ли лицензионный ключ?

Исходный код SDK в этом репозитории открыт под лицензией Apache 2.0. Актуальные сборки движка и локальный менеджер профилей Ombra Desktop работают бесплатно и автономно — без аккаунта, ключа, аппаратного ID и лимита на число профилей. Параметр `license_key` и `OMBRA_LICENSE_KEY` нужны только для старых лицензируемых сборок.

### Нужно ли устанавливать Ombra Desktop для работы с SDK?

Нет. SDK запускает движок напрямую как дочерний процесс — удобно для скриптов, контейнеров и CI. Ombra Desktop нужен, если вы хотите управлять каталогом профилей вручную через графический интерфейс.

### Чем Ombra отличается от `playwright-stealth`?

`playwright-stealth` внедряет JavaScript на страницу поверх обычного браузера, и современные детекторы часто находят сами патчи. В Ombra модификации встроены в исходный код Chromium, а SDK не внедряет на страницу никаких скриптов.

### Можно ли использовать свой прокси?

Да. Передайте `http://`, `https://` или `socks5://` в параметр `proxy`. Если прокси требует логин и пароль, SDK поднимает локальный loopback-ретранслятор, чтобы учётные данные не попадали в аргументы процесса. Учтите, что клиент `context.request` / `page.request` в Playwright может отправлять запросы в обход настроек браузерного прокси — для гарантированной отправки через прокси выполняйте `fetch()` из контекста страницы.

### Какие версии Playwright и Puppeteer поддерживаются?

Python SDK требует Playwright `>=1.60,<2.0` (ставится автоматически вместе с `ombrabrowser`). Node.js SDK работает с `playwright-core@^1.60.0` или `puppeteer-core >=22.0.0`. Подробная политика совместимости описана в [руководстве по версионности](../../docs/versioning.md).

### Гарантирует ли Ombra прохождение всех антибот-проверок?

Нет. Детект — движущаяся цель, зависящая от сайта, региона, репутации IP, истории профиля и версии детектора. Чтобы измерять и контролировать качество своей конфигурации без догадок, используйте [методику проверки движка](../../docs/stealth-checkup.ru.md).

### Для каких задач предназначен Ombra?

Ombra предназначен для авторизованной автоматизации, QA-тестирования, мониторинга, исследований и управления изолированными рабочими профилями. Использование для несанкционированного доступа, подбора учётных данных и злоупотреблений не поддерживается.

## Участие

Порядок внесения изменений описан в [CONTRIBUTING.md](../../CONTRIBUTING.md), правила сообщества — в [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), а инструкции по SDK — в [sdks/README.md](../../sdks/README.md).

- Перед добавлением нового параметра запуска обновите [контракт SDK](../../docs/sdk-contract.md) и [схемы](../../spec/schemas).
- При изменении поведения SDK обновите реализацию, тесты и общие кейсы в [conformance](../../conformance/README.md).
- Перед отправкой PR проверьте структуру и ссылки командой `python3 tools/check_repo.py`.

## Лицензия

Исходный код SDK в этом репозитории распространяется по лицензии [Apache License 2.0](../../LICENSE). Лицензия не предоставляет прав на товарные знаки Ombra, движок Ombra Chromium и настольное приложение Ombra Desktop — подробности и условия сторонних компонентов приведены в [NOTICE](../../NOTICE).

## Ссылки

- 🌐 **Сайт** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Релизы (движок и Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **История изменений** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Баги и предложения** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Организация** — [Ombra Labs](https://github.com/ombralabs)
