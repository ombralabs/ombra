<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Ліцензія"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Останній коміт"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Зірки"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Завантаження з PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Завантаження з npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Реліз"></a>
</p>

<p align="center">
<a href="#встановлення"><strong>Встановлення</strong></a> ·
<a href="#python-api">Python API</a> ·
<a href="#nodejs-та-typescript-api">Node.js API</a> ·
<a href="#імітація-людського-введення">Імітація введення</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Мови</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium із контролем відбитка на рівні вихідного коду C++ та нативною імітацією людського введення.</h3>

<table><tr><td>
Не набір прапорців запуску і не ін'єкція JavaScript поверх сторінки. Це справжній бінарник Chromium із патчами відбитка, скомпільованими у вихідний код C++, та імітацією введення, що працює всередині процесу браузера. Підключайте офіційні Playwright або Puppeteer через локальний CDP — без об'єктів-обгорток і без переписування коду сторінки.
</td></tr></table>

<br>

<p align="center">
Пряма заміна запуску для Playwright і Puppeteer у Python та Node.js.<br>
Той самий API, ті самі селектори й типи — достатньо змінити імпорт і виклик <code>launch()</code>.
</p>

- **Патчі Chromium на рівні вихідного коду** — canvas, WebGL, WebGPU, аудіо, шрифти, GPU, екран, медіазапити CSS, параметри апаратного забезпечення, WebRTC без витоків STUN, TLS ClientHello, часовий пояс, локаль і видалення сигналів автоматизації (`navigator.webdriver`, `Runtime.enable`, маркери headless).
- **Нативна імітація людського введення в процесі браузера (`humanize=True`)** — траєкторії курсора (`cursory-rs`), прицільні кліки з тривалістю утримання, ритм набору тексту із самовиправленням одруківок і фізика прокручування виконуються всередині Chromium. SDK повертає звичайний нативний `Browser` без проксі-обгорток.
- **Автономна робота без ключів та облікових записів** — актуальні збірки рушія (`158.0.8127.37-3` і новіші) та Ombra Desktop працюють локально без реєстрації, ліцензійних ключів, апаратних ідентифікаторів чи сервера ліцензування.
- **Автоматичне встановлення й криптографічна перевірка бінарника** — `pip install ombrabrowser` або `npm install @ombralabs/sdk`; під час першого запуску SDK завантажує збірку для вашої платформи й перевіряє її підпис Ed25519 і контрольну суму SHA-256.
- **Постійні профілі та безпечний проксі-ретранслятор** — іменовані профілі зберігають cookies, `localStorage`, IndexedDB і `seed` між запусками з міжпроцесним блокуванням; проксі з автентифікацією (HTTP, HTTPS, SOCKS5) працюють через локальний loopback-ретранслятор, тому облікові дані ніколи не потрапляють в аргументи процесу.
- **Офлайн-менеджер профілів Ombra Desktop** — нативний десктопний застосунок у цьому репозиторії ([`desktop/`](../../desktop/README.md)) із готовими інсталяторами для macOS, Linux і Windows.

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

Puppeteer також підтримується через `import { launch } from "@ombralabs/sdk/puppeteer"` або `launchPuppeteer()` ([детальніше](#puppeteer)).

**Для сайтів з антибот-захистом** поєднуйте резидентський проксі, постійний профіль та узгоджені параметри середовища:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # резидентський IP кращий за IP дата-центру
    fingerprint={"timezone": "auto", "locale": "auto"},  # узгодити часовий пояс і локаль із вихідним вузлом проксі
    headless=False,                                      # деякі сайти виявляють відмінності headless-режиму
    humanize=True,                                       # нативна імітація миші, клавіатури та прокручування
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

Див. розділ [Усунення проблем](#усунення-проблем) для типових ситуацій у Linux, контейнерах та на захищених сайтах.

## Встановлення

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Необов'язково: автовизначення часового поясу й локалі за вихідним вузлом проксі (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Із Playwright (1.60.0+, завантажувати стандартний Chromium не потрібно)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Або з Puppeteer
npm install @ombralabs/sdk puppeteer-core

# Необов'язково: офлайн-читач бази GeoIP для timezone: "auto" і locale: "auto"
npm install mmdb-lib
```

---

Під час запуску SDK шукає рушій у суворо визначеному порядку: `binary_path` (`binaryPath` у Node.js), `OMBRA_BINARY_PATH`, каталог рушія Ombra Desktop і кеш SDK (`~/.ombra/engines`). Якщо сумісного рушія не знайдено, SDK завантажує збірку з підписаного каналу релізів, перевіряє її підпис Ed25519 та контрольну суму SHA-256 і кешує локально. Запускати `playwright install chromium` не потрібно.

Щоб вимкнути автоматичне завантаження, передайте `download=False` (`download: false` у Node.js). Щоб завантажити й перевірити рушій заздалегідь (наприклад, під час збирання контейнера), викличте `ensure_binary()` (`ensureBinary()`) або скористайтеся командою CLI `install`.

> **Автономний запуск:** актуальні збірки рушія (`158.0.8127.37-3` і новіші) безкоштовні й не потребують облікового запису чи ліцензійного ключа. `OMBRA_LICENSE_KEY` і команда `login` залишені лише для сумісності зі старішими ліцензованими збірками.

**Міграція з Playwright** займає два рядки — усі операції зі сторінками, локатори й очікування залишаються без змін:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # решта вашого коду працює без змін
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Поставте зірку** репозиторію, якщо проєкт вам корисний, і натисніть **[Watch releases](https://github.com/ombralabs/ombra/subscription)**, щоб отримувати сповіщення про нові збірки рушія, SDK та Ombra Desktop.

---

## Поточний стан і релізи

Кожен компонент екосистеми дотримується спільного контракту запуску та версіонується незалежно.

| Компонент | Стан / версія | Розташування |
|---|---|---|
| **Контракт SDK** | Чернетка `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Альфа `0.2.0` | [`ombrabrowser` на PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Альфа `0.2.0` | [`@ombralabs/sdk` на npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Рушій Ombra Chromium** | Chromium `158.0.8127.37` | `158.0.8127.37-3` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Окремий браузер** | `v158.0.8127.37-3` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-3) |
| **Схеми та тести сумісності** | JSON Schema + спільні кейси | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Методика перевірки непомітності** | 6 рівнів (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Що входить до поточних релізів:

- **Патчі на рівні вихідного коду** — узгоджена генерація відбитка на основі `seed`, узгодження WebGL / WebGPU та їхніх розширень, реалістичні таблиці шрифтів для кожної ОС, нативний профіль TLS ClientHello (`chrome-<major>`), придушення витоків `Runtime.enable` і стеку `UtilityScript`, а також захист від витоку хостової IP-адреси через WebRTC.
- **Домен CDP `Ombra` рівня браузера** — динамічне керування імітацією людського введення (`getHumanizeState`, `setHumanize`) у Python і Node.js без перезапуску браузера.
- **Нативна імітація введення в процесі браузера** — планувальник курсора `cursory-rs`, профілі прокручування коліщатком і трекпадом, ритм набору тексту із самовиправленням одруківок та безпечна вставка довгих текстів через ізольований буфер обміну.
- **Автономні збірки без ключів** — поточні збірки рушія (`158.0.8127.37-3`) та Ombra Desktop `1.2.2` працюють повністю локально без облікових записів, ключів чи телеметрії.
- **Фіксація версії рушія (`version`)** — закріплюйте точну збірку через `launch(version="158.0.8127.37-3")`, `OMBRA_VERSION` або команду CLI `install --version`.
- **Єдиний проксі-ретранслятор** — підтримка проксі HTTP, HTTPS і SOCKS5 з автентифікацією без розкриття облікових даних у командному рядку Chromium, логах чи метаданих профілю.
- **Постійні іменовані профілі** — збереження `seed`, cookies, `localStorage` та IndexedDB у `~/.ombra/profiles/<slug>` із міжпроцесним блокуванням (`ProfileBusyError`).
- **Криптографічні перевірки ланцюжка постачання** — перевірка підпису Ed25519 конверта релізу та перевірка SHA-256 архівів перед розпакуванням.

Повну історію змін див. у [CHANGELOG.md](../../CHANGELOG.md).

## Чому Ombra

- **Патчі на рівні конфігурації та JS легко ламаються.** Такі інструменти, як `playwright-stealth`, `puppeteer-extra` та `undetected-chromedriver`, вставляють JavaScript у сторінки або підкручують прапорці запуску. Оновлення Chrome регулярно ламають їх, а сучасні детектори виявляють самі патчі (`Function.prototype.toString`, аномалії прототипів, `addScriptToEvaluateOnNewDocument`).
- **Зміни скомпільовано у вихідний код Chromium.** Відбитки генеруються на рівні C++ і застосовуються узгоджено в головному фреймі, воркерах та iframe. SDK не вставляє жодних скриптів у сторінки й не використовує перевизначення `Emulation.*`.
- **Імітація введення працює в процесі браузера, а не поверх Playwright.** Оскільки траєкторії миші, натискання клавіш і прокручування обробляються всередині самого Chromium, SDK не загортає об'єкти Playwright або Puppeteer — кожен локатор, фрейм і стороння бібліотека продовжують працювати штатно.
- **Локальна архітектура без зайвих сервісів.** Жодного фонового демона керування та жодного мережевого проміжного вузла між вашим скриптом і браузером: один процес рушія, локальний loopback CDP на `127.0.0.1` і жодних обмежень на кількість профілів чи паралелізм.

## Ombra Desktop

**Локальний офлайн-менеджер профілів із графічним інтерфейсом.** Його вихідний код міститься безпосередньо в цьому репозиторії ([`desktop/`](../../desktop/README.md)) і побудований на Tauri (Rust + Vue).

- **Повністю офлайн і локально** — каталог профілів зберігається в локальній базі даних SQLite на вашому комп'ютері з локальним ключем шифрування; обліковий запис, хмарний сервіс чи доступ до мережі не потрібні.
- **Структуроване керування профілями** — створюйте профілі, шукайте за назвою, нотаткою чи номером, редагуйте описи та впорядковуйте записи за допомогою груп, тегів, міток і закладок у каталозі на Rust.
- **Безпечний кошик** — переміщення профілю до кошика зберігає його файли на диску, щоб ви могли відновити його пізніше.
- **Жодних лімітів на профілі** — без тарифів за кількість профілів і хмарних квот: усі дані належать лише вам.
- **Готові інсталятори** — macOS Apple Silicon (`.dmg`, підписаний сертифікатом Apple Developer ID і нотаризований), Linux (`.deb` і `.rpm`) та Windows x64 (`setup.exe`).
- **Ізольовані каталоги** — задайте `OMBRA_DESKTOP_DATA_DIR`, щоб працювати з окремим тестовим каталогом або резервною копією.

[Завантажити `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [README для Desktop](../../desktop/README.md) · [Посібник із профілів і локальних ключів](../../docs/desktop/README.md)

## Перевірка відбитка та непомітності

Замість голослівних обіцянок про «100% невидимість» Ombra спирається на відтворювану процедуру перевірки за зафіксованих умов. Реальні результати на конкретному сайті завжди залежать від репутації вихідної IP-адреси, регіону, історії профілю, версії детектора та конфігурації запуску.

### Поверхні, які обробляють рушій і SDK

| Поверхня / сигнал | Стандартний Playwright | Ombra | Реалізація |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++-патч рушія |
| `window.chrome` | відсутній у headless | повний об'єкт | Відповідає звичайному Chrome |
| `navigator.plugins` | `0` у headless | узгоджений набір плагінів | На рівні рушія |
| User-Agent та Client Hints | `HeadlessChrome`, розбіжність бренду | `Google Chrome` + узгоджені `Sec-CH-UA*` | Патч `010-user-agent-and-webdriver` |
| Артефакти CDP (`Runtime.enable`, `UtilityScript`) | фіксуються детекторами | придушуються рушієм; SDK ніколи не викликає `Runtime.enable` | Патч `110-runtime-enable` + інваріант `SI-02` |
| Витік IP через WebRTC | розкриває локальну/хостову IP-адресу | передає вихідну IP-адресу без реального STUN | Патч `100-webrtc-leak` (`--webrtc-ip`) |
| TLS і HTTP/2 | залежить від конфігурації | мережевий стек Chromium + профіль ClientHello `chrome-<major>` | Патч `210-tls-network-persona` |
| WebGL і WebGPU | програмний рендерер / невідповідність GPU | єдині ліміти й таблиці розширень WebGL/WebGPU | Патчі `070`, `071`, `075`, `955` |
| Шрифти, локаль і часовий пояс | значення хоста, розсинхронізація `Intl` | узгоджені таблиці шрифтів, локаль ICU і часовий пояс | Патчі `040`, `090`, `092`, `230` |
| Імітація введення | телепортація курсора, миттєвий `fill()` | криві `cursory-rs`, ритм набору, фізика прокручування | Патч `135-ombra-humanize` у процесі браузера |
| Стабільність відбитка | змінюється або розкриває хост | детермінований для заданого `seed` між перезапусками та фреймами | Патчі `001`, `002` + постійний профіль |

### Шість рівнів перевірки

Перед релізом або розгортанням конфігурації виконайте всі шість рівнів перевірки на тій самій збірці рушія, з тим самим клієнтом автоматизації та проксі, які ви плануєте використовувати:

| Рівень | Приклади перевірок | Критерії проходження |
|---|---|---|
| **L0 Транспорт** | TrackMe, сторінки перевірки витоків IP/WebRTC, ехо заголовків | Видима лише вихідна IP-адреса проксі; JA4 та HTTP/2 відповідають збірці Chromium; у argv немає облікових даних проксі |
| **L1 Ідентичність** | Локальна проба, Sannysoft, Intoli, перевірка UA-CH | Немає суперечностей між UA, Client Hints, платформою, GPU, шрифтами, екраном і локаллю |
| **L2 Відбиток** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Немає маркерів headless або `lie`; відбиток стабільний між перезавантаженнями |
| **L3 Автоматизація** | rebrowser, brotector, botd, аудит команд CDP | Немає витоків `Runtime.enable`, init-скриптів, binding або `navigator.webdriver` |
| **L4 Поведінка** | Проба достовірності введення, траси humanize, живий smoke-тест | Події з `isTrusted: true`, природний порядок і таймінги, реалістичні криві курсора й прокручування |
| **L5 Стабільність** | Повторні запуски, воркери, same/cross-origin iframe, паритет між SDK | Той самий `seed` відтворює ідентичний відбиток у всіх контекстах |

Повна процедура, статуси (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), чекліст сигналів і шаблон звіту: [англійською (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) та [російською (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Порівняння

| Можливість | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API автоматизації | Playwright | Playwright | Selenium | **Playwright і Puppeteer** |
| Рівень патчів | Немає | Ін'єкція JS на сторінку | Прапорці конфігурації | **Вихідний код C++ (Chromium)** |
| Узгоджений `seed` відбитка | Ні | Ні | Частково | **Так, на профіль та eTLD+1** |
| Імітація введення (`humanize`) | Ні | Ні | Ні | **Вбудовано в процес браузера** |
| Придушення витоків `Runtime.enable` / CDP | Ні | Ні | Частково | **Патч рушія + інваріанти SDK** |
| Проксі з автентифікацією без витоку в CLI | Ні | Ні | Обмежено | **Локальний loopback-ретранслятор** |
| Ізоляція профілів | Контекст браузера | Контекст браузера | Ні | **Каталог профілю + файлове блокування** |
| Офлайн-менеджер профілів (GUI) | Ні | Ні | Ні | **Ombra Desktop (macOS, Linux, Windows)** |
| Міграція з Playwright | — | Зміна імпорту | Переписування коду | **Заміна імпорту та `launch()`** |

## Як це працює

```mermaid
flowchart LR
    Script["Ваш скрипт<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + міст CDP"]
    Relay["Локальний проксі-ретранслятор<br/>коли потрібна автентифікація"]
    Engine["Ombra Chromium<br/>рушій із патчами C++"]
    Client["Нативний клієнт<br/>Playwright · Puppeteer"]
    Profile[("Профіль<br/>seed · cookies · сховище")]

    Script -->|"launch()"| SDK
    SDK -->|"перевірка + запуск"| Engine
    SDK -.->|"автентифікація проксі"| Relay
    Relay -.-> Engine
    SDK -->|"підключення через CDP"| Client
    Script -->|"API сторінки"| Client
    Client -->|"локальний CDP"| Engine
    Engine --> Profile
```

1. **`launch()` знаходить або завантажує рушій** і перевіряє його підпис Ed25519 та контрольну суму SHA-256.
2. **Готуються профіль і `seed`.** Іменований профіль захоплює міжпроцесне блокування; якщо проксі вимагає облікових даних, SDK запускає локальний loopback-ретранслятор у пам'яті.
3. **Запускається Ombra Chromium** з обраним профілем, параметрами відбитка та локальним портом налагодження (`--remote-debugging-port=0`).
4. **Підключається офіційний клієнт.** Щойно з'являється `DevToolsActivePort`, SDK підключає Playwright (із `no_defaults=True`) або Puppeteer через `127.0.0.1` і повертає нативний об'єкт `Browser`.
5. **Чисте завершення роботи.** `browser.close()` надсилає `Browser.close`, завершує дерево процесів рушія, зупиняє ретранслятор і звільняє блокування профілю.

Після запуску SDK виходить із тракту даних: усі команди сторінки йдуть напряму від Playwright або Puppeteer до Chromium.

### Межі SDK та інваріанти непомітності

[Контракт SDK v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) задає суворі інваріанти для кожного офіційного SDK:

- **Жодних скриптів маскування на сторінках.** SDK ніколи не викликає `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` і не патчить властивості DOM.
- **Без `Runtime.enable`.** Перевірка готовності використовує лише локальний HTTP-ендпоінт CDP або `Browser.getVersion`; SDK ніколи не вмикає `Runtime`, `Debugger` або `Log`.
- **Без перевизначень `Emulation.*`.** SDK ніколи не викликає `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` або `setDeviceMetricsOverride` — ідентичність браузера формує рушій.
- **Без заборонених прапорців за замовчуванням.** SDK самостійно ніколи не додає `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` або `--user-agent`.
- **Лише loopback CDP.** Порт налагодження завжди прив'язується до `127.0.0.1`; передача не-loopback адреси в `--remote-debugging-address` відхиляється.
- **Без телеметрії та витоку секретів.** Облікові дані проксі, ключі та cookies приховуються в логах і повідомленнях про помилки.

## Python API

### `launch()`

```python
from ombrabrowser import launch

# Базовий запуск (headless за замовчуванням)
browser = launch()

# Запуск із вікном браузера
browser = launch(headless=False)

# HTTP- або SOCKS5-проксі (облікові дані проходять через локальний loopback-ретранслятор)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Об'єкт проксі зі списком винятків (bypass)
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

# Керування відбитком (seed, ОС, автовизначення часового поясу й локалі через проксі, екран, GPU)
# Для timezone="auto" / locale="auto" встановіть: pip install "ombrabrowser[geoip]"
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

# Нативна імітація миші, клавіатури та прокручування
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Фіксація точної збірки рушія та передача додаткових прапорців Chromium
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Повертає стандартний `playwright.sync_api.Browser`. Усі методи Playwright працюють штатно (`new_page()`, `new_context()`, `close()` тощо). Нові сторінки за замовчуванням створюються з `no_viewport=True`, щоб не перезаписувати розміри вікна профілю.

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

### `launch_context()` і `launch_context_async()`

Зручний помічник, який запускає браузер і одразу повертає `BrowserContext` (закриття контексту також завершує процес рушія). Додаткові іменовані аргументи передаються в `browser.new_context()` — наприклад, `storage_state`, `permissions` або `extra_http_headers`:

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

Асинхронний аналог: `await launch_context_async(...)`.

### `launch_persistent_context()` і `launch_persistent_context_async()`

Запускає браузер із постійним профілем і повертає його типовий `BrowserContext`. Cookies, `localStorage`, IndexedDB, кеш і `seed` відбитка зберігаються між сесіями.

- Передача `profile="pricing-eu"` створює профіль у `~/.ombra/profiles/pricing-eu` з метаданими в `.ombra/profile.json` і файлом блокування.
- Передача `user_data_dir="./my-profile"` (або позиційного аргументу зі шляхом) використовує цей явний каталог.
- Одночасний запуск того самого профілю з іншого процесу генерує помилку `ProfileBusyError`, запобігаючи пошкодженню даних профілю.

```python
from ombrabrowser import launch_persistent_context

# За іменованим профілем (зберігається в ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookies, сховище та seed зберігаються

# За явним шляхом (наприклад, для завантаження розширень Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Асинхронний аналог: `await launch_persistent_context_async(...)`.

### Допоміжні функції та діагностика (Python)

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

# Перевірити знайдений бінарник рушія
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Завантажити й перевірити рушій без запуску браузера
ensure_binary(version="158.0.8127.37-3")

# Видалити керовані SDK бінарники рушія (профілі в ~/.ombra/profiles залишаються недоторканими)
clear_cache()

# Переглянути сформовану команду запуску без старту Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Прочитати метадані виконання (порт CDP, ws_url, seed, pid) і перевірити стан процесу
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # завантажити й перевірити рушій (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # встановити конкретну збірку рушія
ombrabrowser info                                # діагностика середовища, бінарника та залежностей (псевдонім: doctor)
ombrabrowser info --quick --json                 # швидкий машинозчитуваний звіт без запуску бінарника
ombrabrowser info --proxy socks5://user:pass@host:1080  # перевірити визначення вихідного IP, часового поясу та локалі через проксі
ombrabrowser update                              # перевірити канал релізів і оновити кешований рушій
ombrabrowser clear-cache                         # очистити кешовані бінарники рушія (профілі зберігаються)
ombrabrowser login                               # зберегти ліцензійний ключ у ~/.ombra/license.key (лише для застарілих збірок)
ombrabrowser logout                              # видалити збережений ліцензійний ключ
```

Ті самі команди доступні через `python -m ombrabrowser <command>`.

## Node.js та TypeScript API

`@ombralabs/sdk` постачається у подвійній збірці ESM + CommonJS із повними описами типів TypeScript (`.d.ts`). І Playwright, і Puppeteer працюють поверх одного й того самого рушія.

### Playwright (за замовчуванням)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Базовий запуск із проксі, відбитком та імітацією введення
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

// Зручний запуск: браузер + контекст в одному виклику
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Постійний профіль — cookies, localStorage і seed зберігаються між запусками
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Кожен фрагмент вище є самодостатнім. Для міграції наявного коду запуску Playwright також можна замінити імпорт на `import * as chromium from "@ombralabs/sdk"` і залишити `await chromium.launch(...)`.

### Puppeteer

Використовуйте `launchPuppeteer()` з `@ombralabs/sdk` або імпортуйте з `@ombralabs/sdk/puppeteer`:

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

> **Примітка щодо Puppeteer:** Puppeteer надсилає більше стандартного CDP-трафіку, ніж Playwright із `connectOverCDP({ noDefaults: true })`. Для сайтів із суворими перевірками CDP рекомендується Playwright.

### Утиліти та CLI (Node.js)

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

## Імітація людського введення

В Ombra імітація введення (`humanize`) скомпільована **нативно в процес браузера Chromium** (на базі `cursory-rs` та планувальника введення рушія), а не реалізована як JS-обгортка над клієнтом автоматизації. Це означає:

- Усі стандартні дії Playwright і Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) проходять через єдину чергу введення на вкладку всередині браузера.
- Поведінкові параметри детерміновано обчислюються із `seed` профілю (`--fingerprint-humanize-seed`).
- SDK ніколи не загортає `Page` чи `Browser` у проксі-класи — нативні типи та поведінка клієнта залишаються незмінними.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Що змінюється з `humanize=True`:**

| Дія | Без `humanize` | Із `humanize=True` |
|---|---|---|
| Рух миші | Миттєва телепортація | Криві `cursory-rs` із прискоренням, паузами та легким перельотом |
| Кліки й перетягування | Миттєве натискання | Точка прицілювання в межах елемента, пауза перед кліком і тривалість утримання |
| Введення тексту | Миттєве встановлення значення | Посимвольний набір із заданим ритмом і розкладкою клавіатури, зрідка одруківки із самовиправленням; дуже довгий текст вставляється через ізольований буфер обміну, не зачіпаючи системний |
| Прокручування | Один стрибок | Серія подій коліщатка/трекпада за виміряними профілями сповільнення |
| Інтервали простою | Статичний курсор | У пресеті `careful` — ледь помітний дрейф курсора між діями |

**Пресети** — `default` (звичайний темп), `careful` (повільніший, обережний, із мікрорухами під час простою) та `fast` (прискорений темп). Передайте `humanize=False` (`humanize: false`), щоб явно вимкнути імітацію введення.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Режим і пресет можна перемикати під час виконання без перезапуску браузера через домен CDP `Ombra`:

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

## Керування відбитком і профілями

Рушій формує узгоджену конфігурацію браузера з єдиного `seed`. Якщо `seed` не вказано:

| Сценарій | Поведінка |
|---|---|
| **`launch()` без профілю** | SDK генерує випадковий `seed` на сесію і створює тимчасовий каталог, який видаляється після `close()`. |
| **`profile="name"` або `user_data_dir="./dir"`** | Значення `seed` зберігається в `.ombra/profile.json` і повторно використовується під час кожного запуску — сайти бачать того самого відвідувача з тим самим пристроєм і cookies. |
| **`fingerprint={"seed": N, ...}`** | Детермінований відбиток від явно заданого `seed`; додаткові поля перевизначають окремі параметри, зберігаючи узгодженість решти. |

Шум canvas/аудіо прив'язаний до `eTLD+1` (стабільний у межах одного сайту й не пов'язується між різними сайтами). Піксельний шум для 2D canvas і WebGL `readPixels` вимкнено за замовчуванням, щоб не спрацьовували детектори «Canvas Tampering / Masking», і його можна явно ввімкнути через `--fingerprint-pixel-noise`.

> **Порада:** для повторних візитів на той самий сайт використовуйте постійний профіль (`profile="name"` або `launch_persistent_context()`), а не фіксований `seed` в ефемерному `launch()` — так cookies, кеш і `localStorage` залишаться узгодженими з відбитком.

### Поля об'єкта `fingerprint`

Назви полів нижче наведено у стилі Python (`snake_case`); Node.js приймає як `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`), так і `snake_case`:

| Поле | Тип | Опис |
|---|---|---|
| `seed` | `int` (`>= 0`) | Початкове значення генератора, що визначає загальну конфігурацію відбитка |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Цільова ОС (`navigator.platform`, UA, пули GPU та шрифтів) |
| `os_version` | `string` | Підказка версії ОС для Client Hints |
| `timezone` | зона IANA або `"auto"` | Часовий пояс (наприклад, `"Europe/Berlin"`). `"auto"` визначає зону за вихідним вузлом проксі через GeoIP |
| `locale` | BCP-47 або `"auto"` | Локаль (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` визначає локаль за вихідним вузлом проксі |
| `screen` | `{"width", "height"}` або `"auto"` | Розміри екрана та робочої області з урахуванням панелі завдань / рядка меню цільової ОС |
| `gpu` | `{"vendor", "renderer"}` або `"auto"` | Явні рядки WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` або `"auto"` | Значення `navigator.hardwareConcurrency` |
| `device_memory` | `int` або `"auto"` | Значення `navigator.deviceMemory` (у ГБ) |
| `noise` | `bool` | Увімкнути/вимкнути шум відбитка (`False` передає `--disable-fingerprint-noise`) |

> Залишайте `seed` основним джерелом параметрів відбитка: ручне перевизначення окремих значень без збереження їхньої узгодженості (наприклад, поєднання ОС із несумісним GPU) може створювати суперечності для детекторів.

### Додаткові прапорці рушія (`args`)

Прапорці, які підтримує рушій, але SDK не додає автоматично (передаються через `args=[...]`):

| Прапорець | Призначення |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Бренд браузера в `Sec-CH-UA` (за замовчуванням SDK задає `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | Профіль TLS ClientHello, що відповідає вказаній мажорній версії Chrome (автоматично задається SDK за версією рушія) |
| `--webrtc-ip=<ip>` | Підстановка IP-адреси в ICE-кандидатах WebRTC без надсилання реального трафіку STUN |
| `--fingerprint-location=<lat,lon>` | Координати, які повертає `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Квота сховища, яку повертає `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Кількість точок дотику (`navigator.maxTouchPoints` та медіазапити pointer) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Щільність пікселів дисплея (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Глибина кольору екрана |
| `--disable-gpu-fingerprint` | Передати напряму реальний GPU хоста (рядки WebGL/WebGPU, ліміти та розширення) |
| `--disable-gpu-string-spoof` | Передати напряму реальні рядки GPU, зберігши решту налаштувань профілю |
| `--disable-fingerprint-noise` | Вимкнути шум canvas/WebGL/аудіо, залишивши активними параметри ідентичності |
| `--fingerprint-pixel-noise` | Увімкнути опційний ідемпотентний піксельний шум для 2D canvas і `readPixels` |
| `--profile-label=<text>` | Мітка профілю в адресному рядку браузера (лише інтерфейс; невидима для вебсторінок) |

### Налаштування шрифтів у Linux

На мінімальних серверах і в контейнерах Linux часто бракує шрифтів емодзі та CJK, через що прихований рендеринг тексту й емодзі в canvas дає нетипові хеші.

**1. Базовий набір (емодзі та CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Шрифти Windows для профілів Windows (`os="windows"`):**
Під час запуску конфігурації Windows на Linux встановлення справжніх шрифтів із `C:\Windows\Fonts\` (зокрема `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) суттєво підвищує узгодженість переліку шрифтів:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Шрифти macOS для профілів macOS (`os="macos"`):**
Аналогічно, якщо ви використовуєте `os="macos"` у Linux, скопіюйте шрифти з `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` та `/Library/Fonts/` у `~/.local/share/fonts/mac/` і виконайте `fc-cache -f`.

У `Dockerfile` розміщуйте шрифти в системному каталозі `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Параметри запуску, конфігурація та помилки

### Параметри `launch()`

Назви параметрів відповідають Python API та [контракту SDK](../../docs/sdk-contract.md); Node.js використовує аналоги у `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`), а також приймає псевдоніми `snake_case`. Невідомі параметри відхиляються з помилкою `InvalidOptionError`.

| Параметр | За замовчуванням | Опис |
|---|---|---|
| `headless` | `true` | Запуск без вікна (`--headless=new`) |
| `proxy` | немає | URL проксі (`http`, `https`, `socks5`) або об'єкт; проксі з автентифікацією працюють через loopback-ретранслятор |
| `fingerprint` | немає | Налаштування `seed`, ОС, часового поясу, локалі, екрана, GPU, пам'яті та шуму |
| `profile` | немає | Іменований постійний профіль у `~/.ombra/profiles/<slug>` (взаємовиключний із `user_data_dir`) |
| `user_data_dir` | тимчасовий | Явний шлях до каталогу профілю (взаємовиключний із `profile`) |
| `args` | `[]` | Додаткові аргументи Chromium (передаються без змін) |
| `binary_path` | автовизначення | Явний шлях до виконуваного файлу рушія |
| `version` | змінна / авто | Фіксація версії рушія (наприклад, `158.0.8127.37-3`), має пріоритет над `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Таймаут запуску рушія та підключення CDP (1000–600000 мс) |
| `humanize` | типове для рушія | `False`, `True` або `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | змінна / файл | Ключ для застарілих ліцензованих збірок (не потрібен на `158.0.8127.37-3+`; ніколи не логується) |
| `env` | `{}` | Додаткові змінні середовища для процесу рушія |
| `download` | `True` | Дозволити автоматичне завантаження відсутнього бінарника рушія |

### Змінні середовища

Порядок пріоритету: **явний параметр запуску → змінна середовища → метадані профілю → значення за замовчуванням**.

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `OMBRA_BINARY_PATH` | не задано | Явний шлях до бінарника рушія |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Каталог для кешованих рушіїв та іменованих профілів |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Базовий URL / дзеркало для завантаження рушія (`none`/`off` вимикає завантаження) |
| `OMBRA_VERSION` | остання сумісна | Зафіксована версія рушія (наприклад, `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Канал релізів рушія: `stable` або `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Перевіряти наявність новіших збірок рушія під час запуску |
| `OMBRA_SKIP_CHECKSUM` | `false` | Лише для локальної розробки: вимикає перевірку SHA-256 (виводить попередження) |
| `OMBRA_LICENSE_KEY` | не задано | Ключ для застарілих ліцензованих збірок (ніколи не логується) |
| `OMBRA_TIMEOUT_MS` | `30000` | Таймаут запуску за замовчуванням (мс) |
| `OMBRA_LOG_LEVEL` | `warn` | Рівень деталізації логів: `error`, `warn`, `info`, `debug` |

### Типізовані помилки

У разі будь-якого збою SDK завершує запущений процес рушія, звільняє блокування профілю та генерує підклас `OmbraError` зі стабільним полем `kind` і очищеними від секретів даними `details`:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Повну таксономію помилок і правила повторних спроб задокументовано в [контракті SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Платформи, інтеграції та контейнери

### Підтримувані платформи й середовища виконання

| Компонент | Підтримка | Примітки |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Автономна збірка `158.0.8127.37-3`; Ombra Desktop підписаний Developer ID і нотаризований |
| **macOS x64 (Intel)** | — | Поточної збірки Chromium 158 немає |
| **Linux x64** | ✅ | Автономна збірка `158.0.8127.37-3`; потрібен `xz-utils` (`xz`) для розпакування `.tar.xz` |
| **Windows x64** | ✅ | Автономна збірка `158.0.8127.37-3` та інсталятор Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` встановлюється автоматично разом з `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` або Puppeteer `>=22` (Puppeteer 25+ потребує Node.js `>=22.12`) |

### Інтеграція з фреймворками та AI-агентами

Ombra працює з будь-яким інструментом автоматизації або фреймворком AI-агентів, який приймає власний бінарник Chromium або підключається через CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` тощо):

```python
# Варіант 1: отримати перевірений шлях до бінарника та аргументи рушія для власного раннера
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Варіант 2: запустити через Ombra SDK і передати локальну точку доступу CDP у ваш фреймворк
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Підключіть ваш фреймворк до ws_url або cdp_http — налаштування відбитка та humanize
# працюють усередині рушія й залишаються активними для будь-якого клієнта CDP
```

### Запуск у Docker і на серверах Linux

Приклад `Dockerfile`, який заздалегідь завантажує й перевіряє рушій на етапі збирання образу:

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

> **Контейнери та вебсервери:**
> - Якщо ваш контейнер не може ініціалізувати пісочницю Chromium, передайте `--no-sandbox` явно через `args=["--no-sandbox"]` (SDK ніколи не додає цей прапорець самостійно).
> - Щоб запускати з `headless=False` на сервері без дисплея, використовуйте `Xvfb` (див. [нижче](#усунення-проблем)).
> - Під час запуску під `uvicorn` із `uvloop` передавайте `--loop asyncio`, щоб уникнути зависань каналів підпроцесів.

## Усунення проблем

### Сайт блокує headless-режим

Деякі антибот-системи перевіряють поведінкові та графічні відмінності в headless-режимі навіть за наявності C++-патчів. Запускайте з `headless=False` на віртуальному дисплеї за допомогою `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Після цього запускайте з резидентським SOCKS5/HTTP-проксі, постійним профілем, узгодженими часовим поясом/локаллю, `headless=False` і `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Якщо блокування на Linux тривають, перевірте розділ [Налаштування шрифтів у Linux](#налаштування-шрифтів-у-linux).

### Сайт показує перевірку під час кожного візиту

Виклик `launch()` без `profile` щоразу стартує з порожнього тимчасового каталогу та нового `seed`, тому сайт сприймає кожен запуск як абсолютно нового відвідувача без cookies. Перейдіть на `profile="..."` або `launch_persistent_context(...)`, щоб cookies, `localStorage` і `seed` зберігалися між запусками.

### `ProfileBusyError`

Іменований профіль або `user_data_dir` може бути відкритий одночасно лише в одному процесі. Призначайте кожному паралельному воркеру окрему назву профілю (`profile=f"worker-{i}"`). Застарілі блокування, що залишилися після аварійного завершення процесів, виявляються й очищуються автоматично.

### Чи потрібно виконувати `playwright install chromium`?

Ні. Ombra використовує власний бінарник рушія й не покладається на стандартний Chromium від Playwright. У Linux потрібні лише системні бібліотеки та `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Оновлення, перемикання каналів і відкат рушія

Оновіть SDK до останнього релізу:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Протестуйте канал `beta` або зафіксуйте / відкотіть точну збірку рушія:

```python
# Зафіксувати точну збірку для конкретного запуску
browser = launch(version="158.0.8127.37-3")
```

```bash
# Або налаштувати через змінні середовища / CLI
export OMBRA_VERSION=158.0.8127.37-3
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-3

# Або вказати шлях до локально зібраного бінарника
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper блокує локальну збірку

Офіційні релізи Ombra для Apple Silicon macOS підписані сертифікатом Apple Developer ID і нотаризовані. Якщо ви запускаєте локальну непідписану збірку для розробки й macOS поміщає її в карантин, одноразово зніміть атрибут карантину:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Очікування на сторінці в синхронному Python

У синхронному Playwright один тривалий виклик `time.sleep(15)` після `page.goto()` зупиняє цикл подій Playwright, через що сторінки перевірки можуть зависати. Натомість очікуйте короткими інтервалами з легким зверненням до контексту:

```python
import time

for _ in range(15):
    page.context.cookies()  # підтримує роботу циклу подій Playwright без звернення до DOM сторінки
    time.sleep(1)
```

В асинхронному Python використовуйте `await asyncio.sleep(...)`; у Node.js — `await new Promise(r => setTimeout(r, ms))`. Також уникайте частих викликів `page.wait_for_timeout()` і зайвих `page.evaluate()` до проходження перевірок, щоб не створювати додатковий трафік CDP.

## Безпека

- **Автентичність і цілісність рушія.** Перед розпакуванням SDK перевіряє підпис Ed25519 конверта релізу за закріпленим публічним ключем і звіряє дайджест SHA-256 як архіву, так і виконуваного файлу.
- **Лише локальний CDP.** Порт налагодження прив'язується виключно до `127.0.0.1`. Ніколи не відкривайте порт CDP у публічну мережу без додаткової автентифікації — CDP надає повний контроль над браузером.
- **Ізоляція секретів.** Облікові дані проксі існують лише в пам'яті локального loopback-ретранслятора й ніколи не потрапляють у командний рядок процесів, метадані профілю, логи чи деталі помилок.
- **Без телеметрії.** SDK не надсилає аналітики, звітів про збої чи прихованих мережевих пінгів.

Повідомляйте про проблеми безпеки конфіденційно відповідно до [SECURITY.md](../../SECURITY.md).

## Карта репозиторію

```text
.
├── README.md                    # кореневий README (англійською)
├── translations/
│   ├── uk/README.md             # цей файл (Українська)
│   ├── ru/README.md             # переклад російською
│   └── <locale>/README.md       # 19 інших локалізацій
├── desktop/                     # Ombra Desktop (Tauri: каталог на Rust + інтерфейс на Vue)
├── docs/
│   ├── architecture.md          # архітектура, межі довіри, життєвий цикл
│   ├── sdk-contract.md          # контракт запуску v0.2, параметри, помилки, інваріанти
│   ├── stealth-checkup.md       # методика перевірки (англійською)
│   ├── stealth-checkup.ru.md    # методика перевірки (російською)
│   ├── versioning.md            # версіонування SDK, рушія та клієнтів
│   └── desktop/                 # посібники щодо локальних профілів і ключів Desktop
├── spec/
│   └── schemas/                 # JSON-схеми параметрів запуску та метаданих бінарника
├── sdks/
│   ├── manifest.json            # машинозчитуваний реєстр SDK
│   ├── README.md                # структура SDK та правила внеску
│   ├── python/                  # Python SDK (публікується як ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (публікується як @ombralabs/sdk)
│   └── ...                      # заготовки контракту для інших мов (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # кросмовні тести запуску та інваріантів непомітності
├── tools/check_repo.py          # валідатор структури, схем і посилань (CI)
└── .github/workflows/ci.yml
```

Цей репозиторій містить контракт SDK, схеми, тести сумісності, документацію та вихідний код Ombra Desktop. Патчі рушія Chromium підтримуються в окремому репозиторії, а скомпільовані збірки публікуються через канал завантаження та [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## Часті запитання (FAQ)

### Чи є це форком Playwright?

Ні. SDK підключає офіційний клієнт Playwright (або Puppeteer) до Ombra Chromium через локальний CDP. Усі типи, локатори, очікування й об'єкти сторінки залишаються стандартними.

### Чи безкоштовний Ombra і чи потрібен ліцензійний ключ?

Вихідний код SDK у цьому репозиторії відкритий за ліцензією Apache License 2.0. Поточні збірки рушія (`158.0.8127.37-3` і новіші) та локальний менеджер профілів Ombra Desktop (`desktop-v1.2.2`) працюють безкоштовно й автономно — без облікового запису, ліцензійного ключа, апаратного ідентифікатора чи обмеження на кількість профілів. `license_key` і `OMBRA_LICENSE_KEY` потрібні лише для застарілих ліцензованих збірок.

### Чи потрібно встановлювати Ombra Desktop для використання SDK?

Ні. SDK запускає рушій безпосередньо як дочірній процес, що підходить для скриптів, контейнерів і CI. Ombra Desktop є опційним, якщо вам потрібен графічний інтерфейс для керування локальним каталогом профілів.

### Чим Ombra відрізняється від `playwright-stealth`?

`playwright-stealth` вставляє JavaScript на сторінки поверх звичайного браузера, і сучасні детектори часто виявляють самі патчі. Ombra компілює модифікації у вихідний код Chromium, а SDK не вставляє жодних скриптів у сторінки.

### Чи можна використовувати власний проксі?

Так. Передайте `http://`, `https://` або `socks5://` проксі в параметр `proxy`. За наявності облікових даних SDK запускає локальний loopback-ретранслятор, щоб вони ніколи не потрапляли в аргументи процесу. Зверніть увагу, що власний клієнт Playwright `context.request` / `page.request` може оминати налаштування проксі рівня браузера — щоб гарантувати проходження трафіку через проксі, викликайте `fetch()` із контексту сторінки.

### Які версії Playwright і Puppeteer підтримуються?

Python SDK потребує Playwright `>=1.60,<2.0` (встановлюється автоматично разом з `ombrabrowser`). Node.js SDK підтримує `playwright-core@^1.60.0` або `puppeteer-core >=22.0.0`. Правила сумісності див. у [посібнику з версіонування](../../docs/versioning.md).

### Чи гарантує Ombra проходження будь-якої перевірки на ботів?

Ні. Виявлення ботів постійно змінюється й залежить від сайту, регіону, репутації IP, історії профілю та версії детектора. Використовуйте [методику перевірки непомітності](../../docs/stealth-checkup.md), щоб об'єктивно вимірювати й відстежувати конкретну конфігурацію.

### Для яких сценаріїв створено Ombra?

Ombra створено для авторизованої автоматизації, QA-тестування, моніторингу, досліджень і керування ізольованими робочими профілями. Несанкціонований доступ, підбір облікових даних (credential stuffing) і зловживання не підтримуються.

## Як зробити внесок

Настанови щодо внеску наведено в [CONTRIBUTING.md](../../CONTRIBUTING.md), стандарти спільноти — в [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), а інструкції щодо SDK — в [sdks/README.md](../../sdks/README.md).

- Оновлюйте [контракт SDK](../../docs/sdk-contract.md) і [схеми](../../spec/schemas) перед додаванням нового параметра запуску.
- Змінюючи поведінку SDK, оновлюйте реалізацію, тести та спільні кейси в [conformance](../../conformance/README.md).
- Перед відкриттям pull request запускайте `python3 tools/check_repo.py` для перевірки структури репозиторію та посилань.

## Ліцензія

Вихідний код SDK у цьому репозиторії ліцензовано на умовах [Apache License 2.0](../../LICENSE). Ліцензія не надає прав на торговельні марки Ombra, рушій Ombra Chromium або Ombra Desktop — умови щодо торговельних марок і сторонніх компонентів див. у [NOTICE](../../NOTICE).

## Посилання

- 🌐 **Вебсайт** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Релізи (рушій і Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Історія змін** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Помилки та запити функцій** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Організація** — [Ombra Labs](https://github.com/ombralabs)
