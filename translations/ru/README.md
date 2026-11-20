# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

В Python и Node.js `launch()` запускает Ombra Chromium и возвращает объект `Browser` из Playwright. Для Puppeteer в Node.js используйте `launchPuppeteer()`.

**[Установка](#установка)** · <a href="../../README.md">English</a>

<details>
<summary>Языки</summary>

[English](../../README.md) · [Русский](README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Настройка отпечатка в Chromium

В Ombra настройки отпечатка встроены в Chromium. Они охватывают canvas, WebGL, аудио, шрифты, число аппаратных потоков, координаты и размеры элементов, строки GPU, часовые пояса и признаки автоматизации. За TLS и HTTP/2 отвечает сетевой стек Chromium, а за имитацию пользовательского ввода — процесс браузера.

SDK запускает движок локально и подключает клиент автоматизации через Chrome DevTools Protocol (CDP). Движок можно запускать из скрипта, в контейнере или в CI без установки настольного приложения Ombra.

## Статус

Примеры используют опубликованные альфа-версии пакетов для Python и Node.js. В этом репозитории также хранятся общий контракт запуска и заготовки для восьми SDK.

| Компонент | Состояние |
|---|---|
| [Контракт SDK](../../docs/sdk-contract.md) | Черновик `0.1.0` |
| SDK для Python | Альфа `0.1.3` · [`ombrabrowser` на PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK для Node.js | Альфа `0.1.0` · [`@ombralabs/sdk` на npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Общие схемы](../../spec/schemas) | Параметры запуска и сведения о файле движка |
| [Проверка соответствия контракту](../../conformance) | Общие проверки для двух SDK |
| [Методика проверки движка](../../docs/stealth-checkup.ru.md) | Критерии проверки и шаблон отчёта |

## Установка

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Для Puppeteer установите `puppeteer-core` вместо `playwright-core`. Поддерживаемые версии клиентов и Node.js указаны [на странице пакета в npm](https://www.npmjs.com/package/@ombralabs/sdk).

Сначала SDK проверяет путь, указанный в параметре `binary_path` (Python) или `binaryPath` (Node.js). Затем ищет движок по пути из `OMBRA_BINARY_PATH`, в каталоге настольного приложения и, наконец, в кеше SDK. Если движок не найден, SDK скачивает и проверяет его.

Чтобы отключить загрузку, передайте `download=False` в Python или `download: false` в Node.js. Чтобы подготовить движок без запуска браузера, вызовите `ensure_binary()` в Python или `ensureBinary()` в Node.js.

## Быстрый старт

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Чтобы использовать файлы cookie и данные сайтов из именованного профиля, откройте страницу в его существующем контексте. В этом примере также задан прокси.

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

Чтобы получить объект `Browser` из Puppeteer, вызовите `launchPuppeteer()`.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Миграция без переписывания

Установите `ombrabrowser` и замените в скрипте на Python импорт и код запуска браузера. Методы страниц, типы и селекторы по-прежнему предоставляет Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

В Node.js достаточно заменить две строки.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Как это работает

```mermaid
flowchart LR
    Script["Ваш скрипт<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() и подключение по CDP"]
    Engine["Ombra Chromium<br/>модифицированный движок"]
    Client["Нативный клиент автоматизации"]
    Profile[("Профиль<br/>seed · cookies · расширения")]

    Script -->|launch()| SDK
    SDK -->|запуск| Engine
    SDK -->|подключение по CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` находит или скачивает движок и проверяет файл.
2. SDK выбирает каталог профиля и начальное значение отпечатка (`seed`). Если прокси требует аутентификации, SDK запускает локальный ретранслятор.
3. SDK запускает Chromium с выбранным профилем, параметрами запуска и локальным портом отладки.
4. Когда появляется `DevToolsActivePort`, SDK подключает Playwright или Puppeteer по CDP и возвращает объект `Browser` выбранного клиента.
5. `browser.close()` останавливает движок и снимает блокировку профиля.

После запуска клиент отправляет команды для работы со страницами напрямую в Chromium.

## Матрица SDK

| Среда выполнения | Опубликованный пакет | Объект браузера |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → `Browser` из Playwright |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → `Browser` из Playwright<br>`launchPuppeteer()` → `Browser` из Puppeteer |

Для шести других SDK подготовлены каталоги. Планируемые имена пакетов и клиенты перечислены в [манифесте SDK](../../sdks/manifest.json). Структура каталогов описана в [руководстве для разработчиков](../../sdks/README.md).

| Целевая среда | Имя будущего пакета | Клиент или возвращаемый тип |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Опции запуска

В таблице указаны имена параметров из Python и контракта SDK. В Node.js они записываются в camelCase, например `timeoutMs`, `userDataDir` и `binaryPath`.

| Опция | По умолчанию | Значение |
|---|---|---|
| `headless` | `true` | Запускать движок без окна |
| `proxy` | нет | URL прокси или объект с настройками. Для прокси с аутентификацией SDK запускает локальный ретранслятор |
| `fingerprint` | нет | `seed` и параметры отпечатка, включая ОС, часовой пояс, локаль, экран и GPU |
| `profile` | нет | Именованный профиль сохраняет файлы cookie, данные сайтов и `seed` |
| `user_data_dir` | временный каталог | Путь к каталогу профиля. Используется отдельно от `profile` |
| `args` | `[]` | Дополнительные флаги движка, передаваемые без изменений |
| `timeout_ms` | `30000` | Время на запуск и подключение по CDP, в миллисекундах |
| `humanize` | по умолчанию в движке | `false`, `true` или пресет |
| `binary_path` | определяется автоматически | Путь к исполняемому файлу движка |
| `download` | `true` | Скачать движок, если его нет на диске |

В [контракте SDK](../../docs/sdk-contract.md) перечислены все параметры запуска, типы ошибок и правила работы с профилями.

## Управление бинарником

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # скачать и проверить движок без запуска
clear_cache()     # удалить загруженные движки, сохранив профили
```

Перед запуском SDK проверяет контрольную сумму SHA-256 файла движка. В рабочей среде оставляйте проверку включённой. Отключать её через `OMBRA_SKIP_CHECKSUM=1` можно только для локальных сборок при разработке.

## Конфигурация

| Переменная | По умолчанию | Значение |
|---|---|---|
| `OMBRA_BINARY_PATH` | не задана | Путь к исполняемому файлу движка |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Каталог для загруженных движков и именованных профилей |
| `OMBRA_DOWNLOAD_URL` | адрес сервера релизов | Базовый URL для загрузки движка |
| `OMBRA_VERSION` | последняя совместимая | Версия движка для запуска |
| `OMBRA_AUTO_UPDATE` | `true` | Проверять наличие более нового движка при запуске |
| `OMBRA_SKIP_CHECKSUM` | `false` | Только для разработки |
| `OMBRA_LICENSE_KEY` | не задана | Передаётся движку |
| `OMBRA_TIMEOUT_MS` | `30000` | Время ожидания запуска по умолчанию, в миллисекундах |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Сначала SDK использует значение из параметров запуска, затем проверяет переменные окружения и метаданные профиля. Если значение нигде не задано, применяется значение по умолчанию.

## Сравнение

| Возможность | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright или Puppeteer |
| Уровень патча | нет | JavaScript на странице | флаги конфигурации | исходники движка |
| Seed отпечатка | нет | нет | частично | на профиль |
| Имитация пользовательского ввода | нет | нет | нет | движок |
| Изоляция профиля | контекст браузера | контекст браузера | нет | каталог данных пользователя |
| Миграция без переписывания | — | смена импорта | переписывание | смена импорта |

Результат проверки зависит от сайта, выходного IP-адреса и профиля. Порядок измерений описан в [методике проверки движка](../../docs/stealth-checkup.ru.md).

## Stealth — свойство движка

SDK передаёт движку значение `seed` из профиля и параметры запуска. Движок применяет настройки отпечатка.

| Компонент | Как он устроен в Ombra |
|---|---|
| TLS и HTTP/2 | Собственный сетевой стек Chromium, согласованный по версии со сборкой движка |
| Идентичность браузера | Патчи движка на уровне исходников, управляемые seed профиля |
| Признаки автоматизации | Движок обрабатывает признаки WebDriver, а SDK не вызывает `Runtime.enable` |
| Ввод | Движения указателя, нажатия клавиш и прокрутку имитирует процесс браузера |
| Согласованность сети | Определение часового пояса и локали с учётом прокси |
| Состояние | Отдельный каталог данных для каждого профиля |

### Границы SDK

- Порт отладки CDP принимает только локальные подключения через интерфейс loopback.
- Учётные данные прокси, лицензионные ключи и файлы cookie не попадают в журналы. SDK не отправляет телеметрию.
- Существующий профиль сохраняет своё значение `seed`, пока вы явно не передадите новое.
- SDK не внедряет скрипты через `addScriptToEvaluateOnNewDocument` или `evaluateOnNewDocument` и не подменяет свойства страницы.
- Готовность браузера SDK проверяет через HTTP-интерфейс CDP или `Browser.getVersion`. Для этой проверки он не вызывает `Runtime.enable`.
- За идентификационные данные браузера отвечает движок. SDK не подменяет User-Agent или другие данные через Playwright и Puppeteer и не вызывает `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` и `setDeviceMetricsOverride`.
- SDK не добавляет флаги `--enable-automation`, `--disable-blink-features=AutomationControlled` и `--no-sandbox` без явного указания.

## Stealth-чекап

Выполняйте эти проверки для сборки движка, клиента автоматизации и профиля, которые собираетесь использовать.

| Уровень | Примеры проверок | Критерии прохождения |
|---|---|---|
| L0 Транспорт | TrackMe, проверки утечки IP/WebRTC | Виден только выходной IP. JA4 и HTTP/2 соответствуют сборке Chromium |
| L1 Идентичность | Локальная проба, Sannysoft, Intoli | Нет противоречий между UA, UA-CH, платформой, GPU, шрифтами, экраном |
| L2 Отпечаток | CreepJS, FingerprintJS, BrowserScan | Нет признаков headless или пометок о подмене данных. Отпечаток стабилен при перезагрузке |
| L3 Автоматизация | rebrowser, brotector, botd | Нет утечек CDP, init-скриптов или WebDriver |
| L4 Поведение | Проверки ввода, трассировка humanize, базовая проверка Cloudflare | События доверенные, их порядок реалистичен, проверка завершается успешно |
| L5 Стабильность | Seed, воркеры, iframe, cross-origin | Один seed даёт одну и ту же персону между запусками |

Методика описывает статусы, разбор результатов и формат отчёта. Она доступна [на русском](../../docs/stealth-checkup.ru.md) и [на английском](../../docs/stealth-checkup.md).

В отчёте укажите сборку движка, версии клиента и детектора, настройки профиля и выходной IP-адрес прокси. Это позволит воспроизвести и сравнить результаты.

## Карта репозитория

```text
.
├── README.md                  # английский оригинал
├── translations/
│   └── <locale>/README.md
├── desktop/                   # автономный менеджер профилей
├── docs/
│   ├── desktop/               # документация менеджера профилей
│   ├── architecture.md        # компоненты, порядок запуска и границы SDK
│   ├── sdk-contract.md        # контракт запуска v0 и поведение SDK
│   ├── stealth-checkup.md     # методика проверки движка
│   ├── stealth-checkup.ru.md  # русский перевод
│   └── versioning.md          # совместимость SDK, движка и клиента
├── spec/
│   └── schemas/               # схемы JSON для параметров запуска и сведений о движке
├── sdks/
│   ├── manifest.json          # машиночитаемый реестр SDK
│   ├── README.md              # структура каталогов и правила участия
│   ├── _template/             # заготовка для нового языка
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # общие сценарии проверки запуска и поведения движка
├── tools/check_repo.py        # проверка структуры и ссылок (CI)
└── .github/workflows/ci.yml
```

В этом репозитории находятся заготовки SDK, контракт запуска, общие проверки и автономный менеджер профилей. У движка Chromium и полной версии Desktop 1.2.1 свои репозитории. [Исходники и сборка Desktop](../../desktop/README.md) · [Документация менеджера профилей](../../docs/desktop/README.md)

## Контракт

- `launch(options)` запускает движок и возвращает объект `Browser` выбранного клиента. Дальше клиент обращается к Chromium напрямую по CDP.
- Перед запуском SDK проверяет платформу и контрольную сумму SHA-256 файла движка. Если файла нет и загрузка разрешена, SDK скачивает его.
- Именованный профиль сохраняет файлы cookie, данные сайтов и значение `seed` между запусками.
- Если запуск не удался, SDK завершает созданный процесс. Вызывающий код получает типизированную ошибку и сам решает, повторять ли запуск.
- У SDK, движка и клиента автоматизации свои диапазоны версий. Узнать сборку движка можно через `binary_info()` в Python или `binaryInfo()` в Node.js.

## Совместимость

| Компонент | Поддержка |
|---|---|
| Движок | Сборку выбирает SDK. Её можно узнать через `binary_info()` или `binaryInfo()` |
| macOS | Apple Silicon и Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ с поддерживаемой версией Playwright |
| Node.js | 20+ с поддерживаемой версией Playwright или Puppeteer |

Версии SDK и движка меняются независимо. При несовместимости SDK выдаёт типизированную ошибку с обеими версиями.

## Участие

Порядок работы над изменениями описан в [правилах участия](../../CONTRIBUTING.md), а инструкции по сборке — в [руководстве по SDK](../../sdks/README.md).

- Если меняете поведение SDK, обновите соответствующую реализацию и добавьте тест или общий сценарий проверки контракта.
- Для SDK на новом языке скопируйте [шаблон](../../sdks/_template), добавьте пакет в [манифест](../../sdks/manifest.json) и откройте черновой PR.
- Для нового параметра запуска сначала обновите [контракт SDK](../../docs/sdk-contract.md) и [схемы](../../spec/schemas).
- Изменения механизмов stealth вносят в репозиторий движка. SDK должен по-прежнему проходить проверку.
- Об уязвимостях сообщайте по закрытому каналу, указанному в [политике безопасности](../../SECURITY.md).

## FAQ

### Это форк Playwright?

Нет. SDK подключает официальный клиент Playwright к Ombra Chromium. Вы можете использовать привычные типы, вспомогательные функции и объекты страниц Playwright.

### Нужно ли настольное приложение Ombra?

SDK запускает движок напрямую. В настольном приложении можно управлять профилями вручную.

### Чем Ombra отличается от playwright-stealth?

В Ombra изменения отпечатка встроены в Chromium. SDK не добавляет скрипты на страницы.

### Можно ли использовать свой прокси?

Да. Передайте его в `launch()`. Для прокси с аутентификацией SDK запускает локальный ретранслятор, поэтому учётные данные не попадают в командную строку движка.

### Какие версии Playwright и Puppeteer поддерживаются?

Поддерживаемые версии указаны в манифесте каждого SDK и в [руководстве по совместимости](../../docs/versioning.md). Сами клиенты поставляются как отдельные зависимости.

### Проходит ли Ombra все проверки на ботов?

Результат зависит от сайта, региона, репутации выходного IP-адреса, версии детектора и настроек профиля. Порядок проверки конкретной конфигурации описан в [методике проверки движка](../../docs/stealth-checkup.ru.md).

## Лицензия

Исходный код SDK в этом репозитории распространяется по [лицензии Apache 2.0](../../LICENSE). Лицензия не даёт прав на движок, название и логотип Ombra. Сведения о товарных знаках и сторонних материалах приведены в [NOTICE](../../NOTICE).

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
