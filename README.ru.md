<div align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="Логотип Ombra">
  <h1>Ombra SDK</h1>
  <p><strong>Один stealth-движок. Восемь языков. Один контракт.</strong></p>
  <p>Официальные SDK для браузера Ombra: Chromium с управлением отпечатком,<br>изолированные профили, имитация ввода и локальный API автоматизации. Продукт: <a href="https://ombrabrowser.dev">ombrabrowser.dev</a>.</p>

  [![License](https://img.shields.io/badge/license-Apache--2.0-202939?style=flat-square)](LICENSE)
  [![Status](https://img.shields.io/badge/status-developer%20preview-6E87E8?style=flat-square)](#статус)
  [![SDKs](https://img.shields.io/badge/SDKs-8-6E87E8?style=flat-square)](#матрица-sdk)
  [![Contract](https://img.shields.io/badge/contract-0.1.0-202939?style=flat-square)](docs/sdk-contract.md)
  [![Stealth checkup](https://img.shields.io/badge/docs-stealth%20checkup-202939?style=flat-square)](docs/stealth-checkup.ru.md)

  <sub><a href="README.md">English version</a></sub>
</div>

---

> **Developer preview.** Контракт находится на версии `0.1.0`, каталоги языков — заготовки, ни один пакет ещё не опубликован в реестре. Первыми выходят Python и Node.js; они задают поведение, которому должны соответствовать остальные SDK. Если интеграция нужна сегодня, используйте Local API напрямую — он стабилен, документирован и уже реализован в приложении Ombra.

## Статус

| Направление | Состояние |
|---|---|
| Контракт | Черновик `0.1.0` — [docs/sdk-contract.md](docs/sdk-contract.md) |
| Общие схемы | [spec/schemas](spec/schemas) |
| Python, Node.js | Заготовки; референсные реализации выходят первыми |
| .NET, Java, Go | Заготовки |
| PHP, Ruby, Rust | Заготовки |
| Кросс-языковой conformance | Кейсы описаны — [conformance](conformance) |
| Stealth-чекап | Методика описана — [docs/stealth-checkup.ru.md](docs/stealth-checkup.ru.md) |

Имена пакетов в матрице ниже — цели, а не опубликованные артефакты. Доступность имён в реестрах проверяется перед первым релизом.

## Зачем этот репозиторий

Большинство стеков автоматизации считают stealth свойством скрипта: JavaScript-шим, пропатченный драйвер, другой `navigator.webdriver`. Это ломается с каждым релизом Chromium и приводит к тому, что один и тот же профиль ведёт себя по-разному в зависимости от библиотеки.

Ombra разделяет эти задачи.

> **Stealth живёт в движке. SDK остаются скучными.**
>
> Поверхности отпечатка патчатся в исходниках Chromium и компилируются в браузер. Состояние профиля лежит в изолированном каталоге данных. Ввод очеловечивается внутри процесса браузера, а не синтетическими DOM-событиями. Local API запускает и останавливает профили и возвращает CDP-эндпоинт.
>
> Задача SDK — хорошо говорить с этим API на вашем языке, отдать жизненный цикл профиля типизированными объектами и не мешать. SDK не внедряет скрипты, не вызывает `Runtime.enable`, не подделывает `navigator.webdriver` и не переписывает логику отпечатка на восьми языках.

Это даёт три свойства, которые действительно нужны командам:

- **Нет расхождений отпечатка между языками.** Профиль с одним и тем же seed ведёт себя одинаково из Python, Node.js, Go и Rust, потому что браузер не знает, какой SDK его запустил.
- **Одно исправление доходит до всех SDK.** Детекторы меняются в движке, а не в восьми обвязках. SDK следят только за контрактом.
- **Маленькая поверхность для аудита.** SDK — это клиент жизненного цикла плюс помощник подключения по CDP, а не ещё один фреймворк автоматизации.

## Стек

```mermaid
flowchart LR
    Script["Ваш скрипт<br/>Python · Node · .NET · Java · Go · PHP · Ruby · Rust"]
    SDK["Ombra SDK<br/>типизированный клиент"]
    API["Local API<br/>127.0.0.1:45678"]
    App["Приложение Ombra<br/>профили · прокси · запуск движка"]
    Engine["Ombra Chromium<br/>патчи движка · humanize · CAPTCHA"]
    Profile[("Профиль<br/>seed отпечатка · cookies<br/>прокси · расширения")]

    Script --> SDK
    SDK --> API
    API --> App
    App --> Engine
    SDK -. "CDP WebSocket" .-> Engine
    Engine --> Profile
```

SDK не запускает Chromium сам. Он просит приложение Ombra запустить профиль, получает CDP WebSocket из ответа Local API и передаёт адрес тому клиенту автоматизации, который вы уже используете.

## Быстрый старт

Примеры ниже — целевой API из [контракта v0](docs/sdk-contract.md). Это ещё не опубликованные пакеты.

**Python**

```python
from ombra import Ombra

client = Ombra("http://127.0.0.1:45678")

profile = client.profiles.create(
    name="pricing-eu",
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"os": "macos", "seed": 20261116},
    humanize={"enabled": True, "preset": "default"},
)

session = client.launch(profile.id, headless=False)
browser = session.connect_playwright()
page = browser.new_page()
page.goto("https://example.com")
browser.close()
session.close()
```

**Node.js / TypeScript**

```ts
import { Ombra } from "@ombra/sdk";

const client = new Ombra({ endpoint: "http://127.0.0.1:45678" });

const profile = await client.profiles.create({
  name: "pricing-eu",
  proxy: "socks5://user:pass@proxy:1080",
  fingerprint: { os: "macos", seed: 20261116 },
  humanize: { enabled: true, preset: "default" },
});

const session = await client.launch(profile.id, { headless: false });
const browser = await session.connectPlaywright();
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
await session.close();
```

Те же вызовы для Go, Java, .NET, PHP, Ruby и Rust — в README каждого SDK. Имена методов следуют конвенции языка (`profiles.create`, `Profiles.Create`, `profilesCreate`), а формат на проводе остаётся `snake_case`.

## Local API уже сегодня

Local API — стабильный шов между SDK и приложением. Он слушает только loopback, принимает `GET` и `POST` и использует стабильный JSON-envelope.

```bash
curl -s http://127.0.0.1:45678/api/v2/browser-profile/start \
  -H 'Content-Type: application/json' \
  -d '{"profile_id": "<profile-id>", "headless": false}'
```

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "ws": {
      "puppeteer": "ws://127.0.0.1:9222/devtools/browser/…",
      "selenium": "127.0.0.1:9222"
    },
    "debug_port": "9222",
    "webdriver": ""
  }
}
```

Передайте `data.ws.puppeteer` в Playwright, Puppeteer или любой другой CDP-клиент:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.connect_over_cdp("ws://127.0.0.1:9222/devtools/browser/…")
    page = browser.new_page()
    page.goto("https://example.com")
```

Полный список эндпоинтов, правила envelope и модель ошибок — в [docs/sdk-contract.md](docs/sdk-contract.md). API-ключ необязателен; если он включён в приложении, передаётся как `Authorization: Bearer`.

## Матрица SDK

| Язык | Пакет (цель) | Среда | Подключение | Статус |
|---|---|---|---|---|
| Python | `ombra` (PyPI) | 3.10+ | Playwright | Заготовка |
| Node.js / TypeScript | `@ombra/sdk` (npm) | Node 20+ | Playwright, Puppeteer | Заготовка |
| C# / .NET | `Ombra` (NuGet) | .NET 8+ | Microsoft.Playwright, Selenium | Заготовка |
| Java | `dev.ombra:ombra` (Maven Central) | 17+ | Playwright, Selenium | Заготовка |
| Go | `github.com/ombralabs/ombra/sdks/go` | 1.22+ | chromedp, playwright-go | Заготовка |
| PHP | `ombralabs/ombra` (Packagist) | 8.2+ | Любой CDP-клиент | Заготовка |
| Ruby | `ombra` (RubyGems) | 3.2+ | Ferrum | Заготовка |
| Rust | `ombra` (crates.io) | 1.78+ | chromiumoxide | Заготовка |

Каждый SDK следует раскладке своего экосистемы, а не общему дереву: `src/ombra` для Python, `src/Ombra` для .NET, `src/main/java` для Java, `lib/ombra` для Ruby, корень пакета для Go. Машиночитаемый источник истины — [sdks/manifest.json](sdks/manifest.json); соглашения — в [sdks/README.md](sdks/README.md).

## Что SDK делает и чего не делает

**Делает**

- Находит Local API и проверяет, что приложение доступно.
- Создаёт, читает, изменяет и удаляет профили, включая прокси, seed отпечатка, humanize и настройки CAPTCHA.
- Запускает и останавливает профили, ждёт готовности и возвращает сессию с `cdp_url`, `selenium_address` и `debug_port`.
- Даёт тонкий помощник подключения для основного CDP-клиента в языке.
- Преобразует envelope `code`/`msg`/`data` в типизированные результаты и ошибки со стабильными категориями.
- Читает конфигурацию из `OMBRA_API_URL` и `OMBRA_API_KEY`, если аргументы не переданы.
- Не включает телеметрию по умолчанию.

**Не делает**

- Не автоматизирует страницы. Для этого есть Playwright, Puppeteer, Selenium, chromedp, Ferrum и chromiumoxide.
- Не патчит отпечаток на клиенте. Движок владеет каждым значением.
- Не внедряет скрипты, не вызывает `Runtime.enable` и не использует `Emulation.*` для подмены идентичности.
- Не ротирует прокси и не решает CAPTCHA в SDK. Это задачи профиля и движка.
- Не скачивает и не обновляет браузер. Установкой браузера владеет приложение Ombra; см. [ombrabrowser.dev](https://ombrabrowser.dev).
- Не скрывает повторы и не подавляет ошибки. Запуск — явная операция.

## Stealth — свойство движка

SDK намеренно не имеют власти над значениями отпечатка. Это дизайн, а не недостающая функция.

| Слой | Где Ombra его обеспечивает |
|---|---|
| TLS и HTTP/2 | Сетевой стек Chromium, согласованный с версией движка |
| Идентичность браузера | Патчи движка, управляемые seed профиля |
| Поверхность автоматизации | Скруб WebDriver, гигиена CDP, отсутствие `Runtime.enable`, изолированный мир |
| Ввод | Очеловеченные указатель, клавиатура и прокрутка в процессе браузера |
| Согласованность сети | Выход прокси задаёт часовой пояс, локаль и кандидатов WebRTC |
| Состояние | Один профиль — один каталог данных, без перетекания между профилями |

Чекап, который проверяет эти утверждения, описан в [docs/stealth-checkup.ru.md](docs/stealth-checkup.ru.md). Он определяет цели, гейты, модель статусов и условия, при которых результат валиден. Числа без такого контекста — маркетинг, а не измерение.

### Чего SDK не должен делать никогда

Это блокеры релиза, а не стилистические предпочтения:

1. Вызывать `Runtime.enable`. Это самая частая утечка CDP, и Ombra она не нужна.
2. Внедрять stealth-скрипты — никаких `Page.addScriptToEvaluateOnNewDocument`, `evaluateOnNewDocument` и шимов свойств.
3. Использовать `Emulation.setUserAgentOverride`, `setTimezoneOverride` или `setDeviceMetricsOverride`, чтобы «поправить» профиль.
4. Добавлять `--enable-automation`, `--disable-blink-features=AutomationControlled` или `--no-sandbox` без ведома пользователя.
5. Заменять доверенный ввод на `element.click()` или прямое присваивание значения на чувствительных шагах.
6. Случайно менять, выводить или переопределять seed профиля. Seed — контракт идентичности пользователя.
7. Общаться с движком как-то иначе, кроме возвращённого CDP-эндпоинта и Local API.
8. Отправлять данные профиля, учётные данные прокси или телеметрию во внешний сервис.

## Stealth-чекап

Чекап организован по слоям, от провода до поведения. Релиз-кандидат не принимается по одному удачному скриншоту.

| Слой | Примеры целей | Жёсткий гейт |
|---|---|---|
| L0 Транспорт | TrackMe, проверки утечки IP/WebRTC | Только IP выхода; JA4 и HTTP/2 совпадают с Chromium движка |
| L1 Идентичность | Локальная проба, Sannysoft, Intoli | Нет противоречий между UA, UA-CH, платформой, GPU, шрифтами, экраном |
| L2 Отпечаток | CreepJS, FingerprintJS, BrowserScan | Нет маркеров headless и «лжи»; стабильность между перезагрузками |
| L3 Автоматизация | rebrowser, brotector, botd | Нет утечек `Runtime.enable`, init-скриптов и WebDriver |
| L4 Поведение | Input fidelity, трассы humanize, Cloudflare smoke | Доверенные события, реалистичный порядок, челлендж проходит |
| L5 Стабильность | Seed, воркеры, iframe, cross-origin | Один seed даёт одну и ту же персону между запусками |

Полный регламент, правила оценки, таблицу триажа и шаблон отчёта смотрите в [docs/stealth-checkup.ru.md](docs/stealth-checkup.ru.md). Английский оригинал — [docs/stealth-checkup.md](docs/stealth-checkup.md).

## Карта репозитория

```text
.
├── README.md                  # английская версия
├── README.ru.md               # этот файл (русский)
├── docs/
│   ├── architecture.md        # компоненты, границы, поток запуска
│   ├── sdk-contract.md        # контракт v0 и поведение SDK
│   ├── stealth-checkup.md     # методика и регламент чекапа
│   ├── stealth-checkup.ru.md  # русский перевод
│   └── versioning.md          # совместимость контракта, SDK и движка
├── spec/
│   └── schemas/               # JSON Schema для payload'ов
├── sdks/
│   ├── manifest.json          # машиночитаемый реестр SDK
│   ├── README.md              # раскладка и правила
│   ├── _template/             # стартовая точка для нового языка
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # языконезависимые кейсы и схема отчёта
├── tools/check_repo.py        # проверка структуры и ссылок (CI)
└── .github/workflows/ci.yml
```

Движок и приложение живут в отдельных репозиториях. Здесь — исходники SDK, общий контракт, conformance-кейсы и документация, которая их связывает.

## Контракт

- **Транспорт.** Loopback HTTP, по умолчанию `http://127.0.0.1:45678`. `GET` и `POST` эквивалентны для совместимости.
- **Envelope.** `{ "code": 0, "msg": "success", "data": { … } }`; `code: -1` при ошибке, обычно с HTTP 200. SDK обязан смотреть на envelope, а не на статус.
- **Имена.** Поля на проводе — `snake_case`; поверхности языков следуют местной конвенции.
- **ID.** ID профиля — короткая строка. Не предполагайте числовой ID.
- **Повторы.** Автоматически повторяются только идемпотентные чтения. Запуск не повторяется; остановка идемпотентна и может повторяться.
- **Версионирование.** Ломающие изменения на проводе поднимают минор контракта, пока контракт `0.x`; см. [docs/versioning.md](docs/versioning.md).

## Совместимость

| Элемент | Цель |
|---|---|
| Приложение Ombra | Текущая сборка; SDK считает его внешним сервисом |
| Движок | Сборка, установленная приложением; SDK не выбирает сборку |
| macOS | Apple Silicon и Intel |
| Windows | x64 |
| Linux | x64 |
| Local API | Только loopback; API-ключ необязателен |

Контракт версионируется независимо от приложения и движка. SDK отказывается стартовать, если его поддерживаемый диапазон контракта не включает реализуемый контракт, и сообщает о расхождении типизированной ошибкой вместо тихого ухудшения.

## Участие

Самый быстрый способ повлиять на SDK — открыть issue с API, которого не хватает. Для кода читайте [CONTRIBUTING.md](CONTRIBUTING.md), затем начните с conformance-кейса, а не с клиента.

- Новый язык? Скопируйте [sdks/_template](sdks/_template), добавьте запись в [sdks/manifest.json](sdks/manifest.json) и откройте draft PR.
- Изменение провода? Сначала обновите [docs/sdk-contract.md](docs/sdk-contract.md) и [spec/schemas](spec/schemas).
- Изменение stealth? Им владеет движок; сторона SDK должна остаться неизменной и пройти чекап.
- Уязвимость? Не открывайте публичный issue — см. [SECURITY.md](SECURITY.md).

## FAQ

**Ombra заменяет Playwright?**
Нет. Playwright, Puppeteer, Selenium и chromedp остаются слоем автоматизации. Ombra заменяет браузер и жизненный цикл профиля за ними и отдаёт CDP-эндпоинт.

**Почему не одно SDK, которое оборачивают все языки?**
Потому что одно нативное ядро всё равно потребует восемь привязок и матрицу сборок под каждую платформу. Маленький контракт на проводе проще аудировать, версионировать и портировать, чем общую нативную библиотеку.

**Движок открыт?**
Нет. Исходники SDK в этом репозитории — Apache-2.0. Движок и приложение Ombra проприетарны и распространяются отдельно.

**Решает ли Ombra CAPTCHA?**
В движке есть опциональный модуль CAPTCHA, включаемый для профиля. Поддержка зависит от типа задания, сборки и доступных моделей. Это не гарантия, и в SDK он не реализован.

**Можно использовать свой прокси?**
Да. Задайте его в профиле. Приложение направит трафик профиля через него, а движок выведет часовой пояс, локаль и кандидатов WebRTC из выхода.

**Это законно?**
Браузер — это браузер. Ответственность за использование — на вас. Автоматизируйте только те системы, к которым у вас есть доступ, и соблюдайте их условия и применимое право. Проект не поддерживает злоупотребления.

**Пройдёт ли это любую проверку?**
Ни один честный проект не может это обещать. Детект — гонка вооружений, и результат зависит от сайта, региона, репутации IP, версии детектора и согласованности профиля. Ombra даёт воспроизводимый чекап вместо гарантии.

## Лицензия

Исходники SDK в этом репозитории лицензированы по [Apache License 2.0](LICENSE). Лицензия не даёт прав на движок Ombra, имя Ombra или логотип. См. [NOTICE](NOTICE) о товарных знаках и сторонних атрибуциях.

---

<div align="center">
  <sub>Сделано <a href="https://github.com/ombralabs">Ombra Labs</a> · <a href="https://ombrabrowser.dev">ombrabrowser.dev</a></sub>
</div>
