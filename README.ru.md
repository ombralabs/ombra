<div align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="Логотип Ombra">
  <h1>Ombra SDK</h1>
  <p><strong>Stealth Chromium для Playwright и Puppeteer.</strong></p>
  <p>Тот же API. Тот же код. Поменяйте импорт.<br>Восемь языков, один патченный движок, один контракт запуска.</p>

  [![License](https://img.shields.io/badge/license-Apache--2.0-202939?style=flat-square)](LICENSE)
  [![Status](https://img.shields.io/badge/status-developer%20preview-6E87E8?style=flat-square)](#статус)
  [![SDKs](https://img.shields.io/badge/SDKs-8-6E87E8?style=flat-square)](#матрица-sdk)
  [![Contract](https://img.shields.io/badge/contract-0.1.0-202939?style=flat-square)](docs/sdk-contract.md)
  [![Stealth checkup](https://img.shields.io/badge/docs-stealth%20checkup-202939?style=flat-square)](docs/stealth-checkup.md)

  <sub><a href="README.md">English version</a> · <a href="https://ombrabrowser.dev">ombrabrowser.dev</a></sub>
</div>

---

> **Developer preview.** Контракт API находится на версии `0.1.0`; каталоги языков — заготовки, и ни один пакет ещё не опубликован в реестре. Python и Node.js выходят первыми и задают поведение, которому должны соответствовать остальные SDK.

## Stealth, который переживает обновление браузера

Большинство stealth-инструментов работают на уровне конфигурации: JavaScript-шим, патченный драйвер, другой `navigator.webdriver`. Они ломаются с выходом новой версии Chromium, а сам патч становится отпечатком.

Ombra идёт другим путём. Поверхности отпечатка изменяются в исходниках Chromium и компилируются в браузер: canvas, WebGL, аудио, шрифты, число аппаратных потоков, client rects, строки GPU, работа с часовым поясом и поверхность автоматизации. TLS и HTTP/2 берутся из собственного сетевого стека Chromium, поэтому совпадают с браузером, из которого собран движок. Ввод очеловечивается внутри процесса браузера, а не синтетическими DOM-событиями.

SDK намеренно остаются маленькими. `launch()` запускает движок, ждёт CDP-эндпоинт, подключает Playwright или Puppeteer и возвращает обычный объект браузера. Не нужно учить новый page API, нет диалекта селекторов и нет обёртки вокруг вашего кода.

```python
from ombra import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")  # your existing Playwright code
print(page.title())
browser.close()
```

SDK запускает движок напрямую, поэтому работает в скрипте, контейнере или CI без запущенного десктопного приложения.

## Статус

| Направление | Состояние |
|---|---|
| Контракт API SDK | Черновик `0.1.0` — [docs/sdk-contract.md](docs/sdk-contract.md) |
| Python, Node.js | Заготовки; референсные реализации выходят первыми |
| .NET, Java, Go | Заготовки |
| PHP, Ruby, Rust | Заготовки |
| Общие схемы | [spec/schemas](spec/schemas) |
| Кросс-языковой conformance | Кейсы описаны — [conformance](conformance) |
| Stealth-чекап | Методика описана — [docs/stealth-checkup.md](docs/stealth-checkup.md) |

Имена пакетов и команды установки ниже — цели релиза, а не опубликованные артефакты. Доступность в реестрах проверяется перед первым релизом.

## Установка

```bash
# Python
pip install ombra

# Node.js
npm install @ombra/sdk
```

Бинарник движка определяется при первом запуске: явный `binary_path`, затем `OMBRA_BINARY_PATH`, затем движок, установленный приложением Ombra, затем кеш SDK, затем проверенная загрузка. `ensure_binary()` выполняет тот же шаг, не запуская браузер.

## Быстрый старт

**Python**

```python
from ombra import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

С постоянным профилем и прокси:

```python
browser = launch(
    profile="pricing-eu",
    headless=False,
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"seed": 20261116, "os": "macos"},
)
```

**Node.js / TypeScript**

```ts
import { launch } from "@ombra/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Puppeteer использует отдельную точку входа, потому что тип возвращаемого значения другой:

```ts
import { launchPuppeteer } from "@ombra/sdk";

const browser = await launchPuppeteer({ headless: false });
```

В каждом языке SDK возвращает нативный объект клиента: браузер Playwright или Puppeteer там, где эти клиенты есть, сессию chromedp в Go, браузер Ferrum в Ruby и браузер chromiumoxide в Rust. Это никогда не обёртка.

## Миграция без переписывания

Существующему коду Playwright нужен один импорт и одна строка:

```diff
- from playwright.sync_api import sync_playwright
- playwright = sync_playwright().start()
- browser = playwright.chromium.launch(headless=False)
+ from ombra import launch
+ browser = launch(headless=False)

  page = browser.new_page()
  page.goto("https://example.com")
  # the rest of the script is unchanged
```

Node.js:

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombra/sdk";
+ const browser = await launch();
```

Возвращённый объект — настоящий Playwright `Browser` (или настоящий Puppeteer `Browser` из `launchPuppeteer()`). Проверки типов, вспомогательные библиотеки и существующие page objects продолжают работать.

## Как это работает

```mermaid
flowchart LR
    Script["Ваш скрипт<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP-мост"]
    Engine["Ombra Chromium<br/>патченный движок"]
    Client["Нативный клиент автоматизации"]
    Profile[("Профиль<br/>seed · cookies · расширения")]

    Script -->|launch()| SDK
    SDK -->|запуск| Engine
    SDK -->|подключение по CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. SDK находит и проверяет бинарник движка или скачивает его при первом использовании.
2. Он определяет каталог профиля и seed персоны и запускает прокси-релей, если прокси требует аутентификации.
3. Он запускает движок с loopback-портом отладки, каталогом профиля и опциями запуска.
4. Он ждёт `DevToolsActivePort`, подключает Playwright или Puppeteer по CDP и возвращает браузер.
5. При `browser.close()` SDK завершает движок и освобождает блокировку профиля.

После установки CDP-соединения SDK не находится в пути запросов. Он не может переписывать заголовки, внедрять скрипты или наблюдать за страницами. Именно это делает его маленьким и проверяемым.

## Матрица SDK

| Язык | Пакет (цель) | Среда выполнения | Что возвращает `launch()` | Статус |
|---|---|---|---|---|
| Python | `ombra` (PyPI) | 3.10+ | Playwright `Browser` | Заготовка |
| Node.js / TypeScript | `@ombra/sdk` (npm) | Node 20+ | Playwright `Browser`; Puppeteer через `launchPuppeteer()` | Заготовка |
| C# / .NET | `Ombra` (NuGet) | .NET 8+ | Playwright `IBrowser` | Заготовка |
| Java | `dev.ombra:ombra` (Maven Central) | 17+ | Playwright `Browser` | Заготовка |
| Go | `github.com/ombralabs/ombra/sdks/go` | 1.22+ | Сессия, готовая для chromedp | Заготовка |
| PHP | `ombralabs/ombra` (Packagist) | 8.2+ | `Ombra\Browser` (CDP-хендл) | Заготовка |
| Ruby | `ombra` (RubyGems) | 3.2+ | `Ferrum::Browser` | Заготовка |
| Rust | `ombra` (crates.io) | 1.78+ | `chromiumoxide::Browser` | Заготовка |

Каждый SDK следует раскладке своей экосистемы, а не навязанному общему дереву — `src/ombra` для Python, `src/Ombra` для .NET, `src/main/java` для Java, `lib/ombra` для Ruby, корень пакета для Go. Машиночитаемый источник истины — [sdks/manifest.json](sdks/manifest.json); соглашения — в [sdks/README.md](sdks/README.md).

## Опции запуска

| Опция | По умолчанию | Значение |
|---|---|---|
| `headless` | `true` | Запускать движок без окна |
| `proxy` | нет | URL прокси или объект; прокси с аутентификацией используют loopback-релей |
| `fingerprint` | нет | Подсказки seed и персоны: ОС, часовой пояс, локаль, экран, GPU |
| `profile` | нет | Именованный профиль с постоянными cookies, storage и seed |
| `user_data_dir` | временный | Явный каталог профиля, взаимоисключающий с `profile` |
| `args` | `[]` | Дополнительные флаги движка, передаваемые без изменений |
| `timeout_ms` | `30000` | Дедлайн запуска и готовности CDP |
| `humanize` | по умолчанию в движке | `false`, `true` или пресет |
| `captcha` | `false` | Включить модуль движка с необязательными лимитами |
| `binary_path` | определяется | Использовать конкретный бинарник движка |

Полная таблица опций, таксономия ошибок и семантика профиля — в [docs/sdk-contract.md](docs/sdk-contract.md).

## Управление бинарником

```python
from ombra import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK проверяет SHA-256 перед запуском. `OMBRA_SKIP_CHECKSUM=1` существует для локальных dev-сборок и никогда не должен использоваться в продакшене.

## Конфигурация

| Переменная | По умолчанию | Значение |
|---|---|---|
| `OMBRA_BINARY_PATH` | не задана | Явный бинарник движка |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Управляемые бинарники и именованные профили |
| `OMBRA_DOWNLOAD_URL` | эндпоинт релиза | Базовый URL для загрузки бинарников |
| `OMBRA_VERSION` | последняя совместимая | Версия движка, которую нужно определить |
| `OMBRA_AUTO_UPDATE` | `true` | Проверять наличие более нового движка при запуске |
| `OMBRA_SKIP_CHECKSUM` | `false` | Только для разработки |
| `OMBRA_LICENSE_KEY` | не задана | Передаётся движку |
| `OMBRA_TIMEOUT_MS` | `30000` | Дедлайн запуска по умолчанию |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Приоритет: явная опция, затем переменная окружения, затем метаданные профиля, затем значение по умолчанию.

## Сравнение

| | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright или Puppeteer |
| Уровень патча | нет | JavaScript на странице | флаги конфигурации | исходники движка |
| Seed отпечатка | нет | нет | частично | на профиль |
| Очеловеченный ввод | нет | нет | нет | движок |
| Изоляция профиля | контекст браузера | контекст браузера | нет | каталог данных пользователя |
| Миграция без переписывания | — | смена импорта | переписывание | смена импорта |

Это сравнение об архитектуре, а не о баллах. Результат детектора зависит от сайта, IP выхода и профиля; [чекап](docs/stealth-checkup.md) — это то, как такие результаты получают.

## Stealth — свойство движка

SDK намеренно не имеют власти над значениями отпечатка. Это дизайн, а не недостающая функция.

| Слой | Где Ombra его обеспечивает |
|---|---|
| TLS и HTTP/2 | Собственный сетевой стек Chromium, согласованный по версии со сборкой движка |
| Идентичность браузера | Патчи движка на уровне исходников, управляемые seed профиля |
| Поверхность автоматизации | Скруб WebDriver, гигиена CDP, отсутствие `Runtime.enable` со стороны SDK |
| Ввод | Очеловеченные указатель, клавиатура и прокрутка внутри процесса браузера |
| Согласованность сети | Выход прокси и часовой пояс/локаль профиля проверяются вместе |
| Состояние | Один профиль, один каталог данных, без утечек между профилями |

### Чего каждый SDK не должен делать никогда

1. Внедрять stealth-JavaScript — никаких `addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument` и шимов свойств.
2. Вызывать `Runtime.enable`; готовность проверяется через HTTP-эндпоинт CDP или `Browser.getVersion`.
3. Использовать `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` или `setDeviceMetricsOverride`.
4. Добавлять `--enable-automation`, `--disable-blink-features=AutomationControlled` или `--no-sandbox` втайне от пользователя.
5. Переопределять user agent или идентичность на уровне Playwright/Puppeteer.
6. Выводить, рандомизировать или молча менять seed профиля.
7. Выставлять CDP-порт за пределы loopback.
8. Логировать учётные данные прокси, лицензионные ключи, cookies или телеметрию.

## Stealth-чекап

Чекап организован по слоям, от сети до поведения. Релиз-кандидат не принимается по одному удачному скриншоту.

| Слой | Примеры целей | Жёсткий гейт |
|---|---|---|
| L0 Транспорт | TrackMe, проверки утечки IP/WebRTC | Только IP выхода; JA4 и HTTP/2 совпадают с Chromium движка |
| L1 Идентичность | Локальная проба, Sannysoft, Intoli | Нет противоречий между UA, UA-CH, платформой, GPU, шрифтами, экраном |
| L2 Отпечаток | CreepJS, FingerprintJS, BrowserScan | Нет маркеров headless или «лжи»; стабильность между перезагрузками |
| L3 Автоматизация | rebrowser, brotector, botd | Нет утечек CDP, init-скриптов или WebDriver |
| L4 Поведение | Достоверность ввода, трассы humanize, Cloudflare smoke | Доверенные события, реалистичный порядок, челлендж проходит |
| L5 Стабильность | Seed, воркеры, iframe, cross-origin | Один seed даёт одну и ту же персону между запусками |

Полный ранбук, модель статусов, таблица триажа и шаблон отчёта — в [docs/stealth-checkup.md](docs/stealth-checkup.md). Русский перевод — [docs/stealth-checkup.ru.md](docs/stealth-checkup.ru.md).

Мы не публикуем stealth-числа без условий, при которых они получены. Чекап существует, чтобы результат можно было воспроизвести, сравнить с базлайном и заблокировать при регрессии.

## Карта репозитория

```text
.
├── README.md                  # английский оригинал
├── README.ru.md               # этот файл (русский)
├── docs/
│   ├── architecture.md        # компоненты, поток запуска, границы
│   ├── sdk-contract.md        # контракт запуска v0 и поведение SDK
│   ├── stealth-checkup.md     # методика и ранбук stealth-проверки
│   ├── stealth-checkup.ru.md  # русский перевод
│   └── versioning.md          # совместимость SDK, движка и клиента
├── spec/
│   └── schemas/               # JSON Schema для опций запуска и информации о бинарнике
├── sdks/
│   ├── manifest.json          # машиночитаемый реестр SDK
│   ├── README.md              # раскладка и правила участия
│   ├── _template/             # стартовая точка для нового языка
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # языконезависимые кейсы запуска и stealth
├── tools/check_repo.py        # проверка структуры и ссылок (CI)
└── .github/workflows/ci.yml
```

Движок и приложение Ombra живут в отдельных репозиториях. Этот репозиторий содержит исходники SDK, контракт запуска, conformance-кейсы и документацию, которая их связывает.

## Контракт

- **Одна точка входа.** `launch(options)` запускает движок и возвращает нативный объект браузера.
- **Бинарник проверен.** Проверки SHA-256 и платформы перед запуском; загрузки необязательны и явны.
- **Профили сохраняют seed.** Именованный профиль хранит cookies, storage и seed персоны между запусками.
- **Нет control plane.** SDK общается с движком по CDP; между вашим скриптом и браузером нет сервиса.
- **Никаких скрытых повторов.** Неудачный запуск — типизированная ошибка; SDK убирает процесс.
- **Версионирование.** Диапазоны версий SDK, движка и клиента автоматизации раздельны; `binary_info()` сообщает сборку движка.

## Совместимость

| Элемент | Цель |
|---|---|
| Движок | Сборка, определяемая SDK; сообщается через `binary_info()` |
| macOS | Apple Silicon и Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+; поддерживаемый диапазон Playwright |
| Node.js | 20+; поддерживаемые диапазоны Playwright и Puppeteer |
| .NET | 8+; поддерживаемый диапазон Microsoft.Playwright |
| Java | 17+; поддерживаемый диапазон Playwright |

Версия пакета SDK и версия движка развиваются независимо. Несовпадение контракта сообщается типизированной ошибкой с обеими версиями в сообщении и никогда — как тихое ухудшение.

## Участие

Самый быстрый способ повлиять на SDK — открыть issue с API, которого вам не хватает. Для вклада в код прочитайте [CONTRIBUTING.md](CONTRIBUTING.md), затем начните с conformance-кейса, прежде чем писать лаунчер.

- Новый язык? Скопируйте [sdks/_template](sdks/_template), добавьте запись в [sdks/manifest.json](sdks/manifest.json) и откройте draft PR.
- Опция запуска? Сначала обновите [docs/sdk-contract.md](docs/sdk-contract.md) и [spec/schemas](spec/schemas).
- Изменение stealth? Им владеет движок; сторона SDK должна остаться неизменной и пройти чекап.
- Проблема безопасности? Не открывайте публичный issue — см. [SECURITY.md](SECURITY.md).

## FAQ

**Это форк Playwright?**
Нет. Он возвращает официальный объект браузера Playwright. Вы продолжаете использовать типы, помощники и page objects Playwright.

**Нужно ли десктопное приложение Ombra?**
Нет. SDK запускает движок напрямую. Приложение нужно для ручного управления профилями и не входит в путь SDK.

**Чем это отличается от playwright-stealth?**
`playwright-stealth` внедряет JavaScript и патчит свойства после старта страницы. Ombra патчит Chromium до компиляции. В странице нет шима, который можно обнаружить, и SDK его не добавляет.

**Решает ли он CAPTCHA?**
В движке есть опциональный модуль CAPTCHA, включаемый для каждого запуска. Поддержка зависит от типа задания, сборки и доступных моделей. Это не гарантия, и в SDK он не реализован.

**Можно использовать свой прокси?**
Да. Передайте его в `launch()`. Прокси с аутентификацией проходят через loopback-релей, поэтому учётные данные никогда не появляются в командной строке процесса.

**Какие версии Playwright и Puppeteer поддерживаются?**
Диапазоны объявляются в манифесте пакета и отслеживаются в [docs/versioning.md](docs/versioning.md). SDK не вендорит ни одну из библиотек.

**Пройдёт ли это каждую проверку на ботов?**
Ни один честный проект не может это обещать. Детект — гонка вооружений, и результат зависит от сайта, региона, репутации IP, версии детектора и согласованности профиля. Ombra даёт воспроизводимый чекап вместо гарантии.

## Лицензия

Исходники SDK в этом репозитории лицензированы по [Apache License 2.0](LICENSE). Лицензия не даёт прав на движок Ombra, имя Ombra или логотип. См. [NOTICE](NOTICE) о товарных знаках и сторонних атрибуциях.

---

<div align="center">
  <sub>Сделано <a href="https://github.com/ombralabs">Ombra Labs</a> · <a href="https://ombrabrowser.dev">ombrabrowser.dev</a></sub>
</div>
