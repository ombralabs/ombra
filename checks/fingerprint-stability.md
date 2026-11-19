# Ombra Local Probe: ссылки, план проверок и чекер

**Один документ: ссылки на проверки отпечатка, план проверок и локальный чекер.**

Дата сборки: **2026-11-19**. Все внешние ссылки — публичные страницы третьих лиц; часть из них может не открываться из-за Cloudflare, блокировщиков или сетевых ограничений. Это не значит, что страница мертва: проверяйте в обычном браузере.

Главный принцип: **стабильность отпечатка проверяется локально, детерминированным кодом, без отправки данных в LLM и без внешних API.** Внешние сайты нужны только как независимая перекрёстная проверка того, что видит сервер и чужие скрипты.

---

## 0. Быстрый старт

```bash
cd checks
python3 benchmark/serve.py
# откроется http://127.0.0.1:8787/
```

Дальше:

1. Снимите первый слепок — он станет базой.
2. Полностью закройте браузер (не вкладку), запустите снова с тем же профилем, окном и зумом 100%.
3. Снимите ещё 4 слепка. Ожидаемо: **hard 100%, шум 0**.
4. Для автоматизации (из корня репозитория; раннер сам поднимает сервер):

```bash
node checks/benchmark/run.mjs --runs 5 --headless --transport file --no-sandbox
python3 checks/benchmark/compare.py checks/results/*.json
```

`--no-sandbox` нужен только в контейнерах/песочницах, где Chrome не может поднять свой sandbox. Для обычной проверки на своей машине запускайте harness **без** `--headless` и **без** `--no-sandbox`: так отпечаток ближе к реальному.

Что важно:

- чекер не делает сетевых запросов: в `index.html` стоит CSP `connect-src 'none'`, нет `fetch/XHR/WebSocket`, внешних скриптов, шрифтов и картинок;
- все вычисления — обычный JS и хеши, сравнение — арифметика и правила, не модель;
- данные лежат в `localStorage` этого браузера; экспорт JSON содержит сырые значения (UA, экран, шрифты, WebRTC-типы) — не публикуйте его без необходимости;
- «стабильно» ≠ «уникально» и ≠ «не палится». Чекер отвечает на вопрос «сайт видит тот же отпечаток при следующем запуске?», а не «достаточно ли он редкий».

---

## 1. Что вообще снимает сайт

Отпечаток — это не один хеш, а вектор сигналов. Разные антибот-системы берут разные подмножества и по-разному их взвешивают. Практически всё сводится к четырём слоям.

### 1.1. Сетевой и транспортный слой (видит сервер)

| Сигнал | Что именно | Кто снимает |
|---|---|---|
| IP, ASN, geo | адрес, провайдер, страна/город, тип (resident/datacenter/mobile), репутация | любой сервер, Cloudflare, DataDome, PerimeterX |
| Reverse DNS, WHOIS | историческая связь IP с организацией | серверные проверки |
| TCP/IP fingerprint | TTL, window size, TCP options, MTU, JA4T | p0f, zardaxt, Incipit |
| TLS ClientHello | cipher suites, extensions, curves, ALPN, GREASE → JA3/JA4/JA4H | Cloudflare, Akamai, DataDome |
| HTTP/2 fingerprint | SETTINGS, WINDOW_UPDATE, priority, pseudo-header order → Akamai hash | Akamai, Cloudflare |
| HTTP/3/QUIC | QUIC transport parameters, версия | Cloudflare, Google |
| HTTP headers | порядок, регистр, `Accept-Language`, `Sec-CH-UA*`, `Sec-Fetch-*`, `Referer`, cookies | любой сервер |
| Cookie/ID history | связка «этот отпечаток уже видели с этим IP/аккаунтом» | антифрод, антибот |

### 1.2. Клиентский JS-слой (видит страница)

| Группа | Примеры |
|---|---|
| Navigator | `userAgent`, `platform`, `vendor`, `languages`, `hardwareConcurrency`, `deviceMemory`, `maxTouchPoints`, plugins, `webdriver` |
| User-Agent Client Hints | `brands`, `mobile`, `platform`, `architecture`, `bitness`, `model`, `platformVersion`, `fullVersionList` |
| Экран/окно | `screen.*`, `devicePixelRatio`, `inner/outerWidth`, `screenX/Y`, `visualViewport`, orientation |
| Локаль/время | `Intl.DateTimeFormat().resolvedOptions()`, timezone offset, форматы дат/чисел, collation, plural rules |
| Canvas 2D | растеризация текста/фигур, `measureText`, fill rules, `OffscreenCanvas` |
| WebGL/WebGPU | vendor/renderer, лимиты, расширения, precision, результат рендера, adapter info |
| Audio | `OfflineAudioContext`, sample rate, `maxChannelCount`, AudioWorklet |
| Шрифты | набор установленных шрифтов, метрики, emoji-рендеринг |
| JS-движок | Math-функции, точность чисел, формат stack trace, `Function.prototype.toString`, Proxy/Reflect, WASM |
| CSS | `CSS.supports`, media queries, `color-gamut`, `prefers-*` |
| Медиа | кодеки `canPlayType`, `MediaRecorder`, `enumerateDevices`, speech voices |
| Разрешения | `Permissions.query`, `Notification.permission`, состояние камеры/микрофона |
| WebRTC | host/srflx-кандидаты, mDNS, локальные интерфейсы |
| Железо/батарея/сеть | `getBattery`, `navigator.connection`, gamepads, Bluetooth/USB/HID/Serial |
| Автоматизация | `navigator.webdriver`, `window.chrome`, CDP-артефакты, headless-эвристики |

### 1.3. Производные сигналы

- **Согласованность**: Chrome UA + `navigator.platform=Win32` + WebGL-рендерер Apple GPU + `maxTouchPoints=0` + timezone Europe/Moscow при IP во Франкфурте — это набор противоречий, а не «отпечаток».
- **«Ложь» (lies)**: подмена `Function.prototype.toString`, Proxy-ловушки, переопределённые getters, несовпадение `Notification.permission` и `Permissions.query`, канвас с шумом на каждый вызов.
- **Уникальность/энтропия**: насколько редко встречается комбинация среди популяции. Это AmIUnique / Cover Your Tracks / FingerprintJS, а не стабильность.
- **Поведение**: мышь, клавиатура, скролл, тайминги, порядок запросов. К JS-отпечатку не относится, но антиботы смотрят и на это.

### 1.4. Что из этого нельзя проверить из JS

TLS/JA3/JA4, HTTP/2, TCP/IP, порядок заголовков, IP/ASN/geo, DNS, репутацию IP — это серверный слой. Чекер их не видит. Для них — внешние страницы из раздела 2 и отдельный протокол сравнения (раздел 3.8).

---

## 2. Ссылки на проверки

Формат: **URL — что проверяет — чем полезен — ограничения**. Ссылки сгруппированы по назначению, а не по «рейтингу».

### 2.1. Комплексные полигоны

| URL | Что проверяет | Зачем в аудите | Ограничения |
|---|---|---|---|
| [browserleaks.com](https://browserleaks.com/) | IP, headers, JS, WebRTC, canvas, WebGL, fonts, TLS, HTTP/2, QUIC, TCP, CSS, Client Hints | самый широкий набор отдельных лабораторий; хорош для поиска конкретной утечки | много страниц, часть инструментов историческая; не даёт «одну оценку» |
| [abrahamjuliot.github.io/creepjs](https://abrahamjuliot.github.io/creepjs/) | trust score, lies, entropy, canvas/WebGL/audio/fonts, worker/iframe, headless | лучший публичный детектор «лжи» и несоответствий; видно, какие API подменены | тяжёлый, шумный, score нестабилен между версиями; смотреть на конкретные строки, не на процент |
| [browserscan.net](https://www.browserscan.net/) | fingerprint authenticity, bot/CDP, WebRTC, DNS, TLS, canvas, WebGPU, timezone, media | удобная «одна страница» + отдельные компонентные тесты; популярен в антидетект-сообществе | коммерческий продукт (AdsPower), score — эвристика |
| [pixelscan.net](https://pixelscan.net/) | consistency, bot, proxy/VPN, WebRTC/DNS, canvas/audio | проверка «похож ли профиль на реального пользователя» | нужен клик Start; алгоритмы меняются; возможны ложные срабатывания |
| [iphey.com](https://iphey.com/) | MX score, fingerprint, IP, VPN, bot, DNS, IP blacklist | быстрый сводный «trust» + проверка IP/прокси | score зависит от базы MixVisit; не истина в последней инстанции |
| [fingerprint-scan.com](https://fingerprint-scan.com/) | fingerprint hash/ID, bot risk, WebRTC, headers, GPU, DRM, automation | новый независимый полигон с явным разделением «fingerprint hash» и «bot score» | молодой проект; меньше исторических данных |
| [deviceandbrowserinfo.com/info_device](https://deviceandbrowserinfo.com/info_device) | device/browser fingerprint, headers, IP | полезно для серверного слоя и полей, которые снимает антифрод | ориентирован на anti-fraud; часть данных платная |
| [deviceandbrowserinfo.com/are_you_a_bot](https://deviceandbrowserinfo.com/are_you_a_bot) | fingerprint-based bot test | проверка автоматизации и согласованности | эвристика, не приговор |
| [fv.pro/check-privacy](https://fv.pro/check-privacy) | privacy/fingerprint summary: canvas, WebGL, fonts, automation | популярен в anti-detect-сообществах; хорошо ловит утечки канваса/шрифтов | интерфейс и вердикт могут меняться; относиться как к диагностике |
| [demo.fingerprint.com/playground](https://demo.fingerprint.com/playground) | FingerprintJS signals, visitor ID, bot/incognito/VPN/tampering | посмотреть, как коммерческий SDK строит ID и какие сигналы видит | проприетарный SDK; visitor ID — их алгоритм, не ваш «истинный» отпечаток |
| [amiunique.org/fingerprint](https://amiunique.org/fingerprint) | атрибуты и уникальность относительно датасета | понять, насколько редка комбинация | это про уникальность, не про стабильность; датасет не ваш трафик |
| [coveryourtracks.eff.org](https://coveryourtracks.eff.org/) | tracker blocking + uniqueness | независимая проверка EFF, хороший «второй взгляд» | нужен клик; фокус на трекинге, не на антиботе |
| [whoer.net](https://whoer.net/) | anonymity %, proxy/VPN, DNS/WebRTC, browser consistency | классическая проверка «что видно снаружи» | может блокировать соединения/показывать рекламу; не открывается из некоторых сетей |
| [bot.incolumitas.com](https://bot.incolumitas.com/) | behavioral + TCP/TLS + WebRTC + proxy + headers + fingerprint | один из самых полных публичных бот-полигонов; есть TCP/TLS | поведенческий score шумит; часть тестов требует времени |
| [bot-detector.rebrowser.net](https://bot-detector.rebrowser.net/) | modern CDP/Puppeteer/Playwright leaks | лучший компактный тест утечек автоматизации | заточен под Chromium-автоматизацию; для ручного Chrome почти всё «OK» |
| [bot.sannysoft.com](https://bot.sannysoft.com/) | классические WebDriver/plugins/WebGL/permissions тесты | исторический baseline; быстро видно грубые проблемы | старый набор, не ловит современные CDP-утечки |
| [fingerprintjs.github.io/fingerprintjs](https://fingerprintjs.github.io/fingerprintjs/) | OSS-демо FingerprintJS | сравнить visitor ID/компоненты с коммерческим playground | это библиотека, а не аудит «всего браузера» |

### 2.2. Компонентные проверки

#### BrowserLeaks

| URL | Что проверяет |
|---|---|
| [browserleaks.com/javascript](https://browserleaks.com/javascript) | navigator, screen, plugins, timezone, battery, connection, JS-параметры |
| [browserleaks.com/client-hints](https://browserleaks.com/client-hints) | HTTP и JS Client Hints, `Sec-CH-UA*` |
| [browserleaks.com/canvas](https://browserleaks.com/canvas) | canvas fingerprint, стабильность/уникальность |
| [browserleaks.com/webgl](https://browserleaks.com/webgl) | WebGL report, GPU, лимиты, расширения, рендер |
| [browserleaks.com/webgpu](https://browserleaks.com/webgpu) | WebGPU adapter/report |
| [browserleaks.com/fonts](https://browserleaks.com/fonts) | список шрифтов, метрики, font fingerprint |
| [browserleaks.com/css](https://browserleaks.com/css) | media queries, CSS-возможности |
| [browserleaks.com/rects](https://browserleaks.com/rects) | ClientRects/DOMRect fingerprint |
| [browserleaks.com/features](https://browserleaks.com/features) | HTML5/JS features detection |
| [browserleaks.com/webrtc](https://browserleaks.com/webrtc) | WebRTC leak: local/public IP, mDNS, STUN |
| [browserleaks.com/dns](https://browserleaks.com/dns) | DNS leak |
| [browserleaks.com/ip](https://browserleaks.com/ip) | IP, headers, reverse lookup, TCP/IP OS fingerprint |
| [browserleaks.com/geo](https://browserleaks.com/geo) | Geolocation API и разрешения |
| [browserleaks.com/tls](https://browserleaks.com/tls) | TLS ClientHello, JA3/JA4, ciphers, ECH |
| [browserleaks.com/http2](https://browserleaks.com/http2) | HTTP/2 fingerprint (Akamai) |
| [browserleaks.com/quic](https://browserleaks.com/quic) | QUIC/HTTP3 fingerprint |
| [browserleaks.com/tcp](https://browserleaks.com/tcp) | TCP/IP fingerprint, JA4T, MTU/hops |
| [browserleaks.com/chrome](https://browserleaks.com/chrome) | Chrome extension detection |
| [browserleaks.com/donottrack](https://browserleaks.com/donottrack) | DNT/GPC |
| [browserleaks.com/proxy](https://browserleaks.com/proxy) | content filters/proxy detection |

#### BrowserScan

| URL | Что проверяет |
|---|---|
| [browserscan.net/bot-detection](https://www.browserscan.net/bot-detection) | WebDriver, CDP, Selenium/Puppeteer/Playwright, headless, navigator lies |
| [browserscan.net/browser-checker](https://www.browserscan.net/browser-checker) | kernel/UA/platform consistency |
| [browserscan.net/canvas](https://www.browserscan.net/canvas) | canvas fingerprint |
| [browserscan.net/webgpu](https://www.browserscan.net/webgpu) | WebGPU report |
| [browserscan.net/webrtc](https://www.browserscan.net/webrtc) | WebRTC leak |
| [browserscan.net/dns-leak](https://www.browserscan.net/dns-leak) | DNS leak |
| [browserscan.net/tls](https://www.browserscan.net/tls) | HTTP2/SSL/TLS fingerprint |
| [browserscan.net/client-hints](https://www.browserscan.net/client-hints) | Client Hints |
| [browserscan.net/timezone](https://www.browserscan.net/timezone) | timezone consistency |
| [browserscan.net/media-devices](https://www.browserscan.net/media-devices) | media devices enumeration |
| [browserscan.net/chrome-extensions](https://www.browserscan.net/chrome-extensions) | plugin/extension detection |
| [browserscan.net/user-agent](https://www.browserscan.net/user-agent) | UA parser |
| [browserscan.net/ipcheck](https://www.browserscan.net/ipcheck) | IP lookup |
| [browserscan.net/tools](https://www.browserscan.net/tools) | индекс инструментов |

#### CreepJS sub-tests

| URL | Что проверяет |
|---|---|
| [creepjs/tests/workers.html](https://abrahamjuliot.github.io/creepjs/tests/workers.html) | worker-контекст: navigator, GPU, timezone, UA |
| [creepjs/tests/iframes.html](https://abrahamjuliot.github.io/creepjs/tests/iframes.html) | iframe-контекст и изоляция |
| [creepjs/tests/fonts.html](https://abrahamjuliot.github.io/creepjs/tests/fonts.html) | шрифты и их метрики |
| [creepjs/tests/timezone.html](https://abrahamjuliot.github.io/creepjs/tests/timezone.html) | timezone/Intl |
| [creepjs/tests/window.html](https://abrahamjuliot.github.io/creepjs/tests/window.html) | window version/keys |
| [creepjs/tests/screen.html](https://abrahamjuliot.github.io/creepjs/tests/screen.html) | screen/window |
| [creepjs/tests/prototype.html](https://abrahamjuliot.github.io/creepjs/tests/prototype.html) | prototype tampering |
| [creepjs/tests/domrect.html](https://abrahamjuliot.github.io/creepjs/tests/domrect.html) | DOMRect fingerprint |
| [creepjs/tests/emojis.html](https://abrahamjuliot.github.io/creepjs/tests/emojis.html) | emoji rendering |
| [creepjs/tests/math.html](https://abrahamjuliot.github.io/creepjs/tests/math.html) | Math/JS engine |
| [creepjs/tests/machine.html](https://abrahamjuliot.github.io/creepjs/tests/machine.html) | machine/OS hints |
| [creepjs/tests/extensions.html](https://abrahamjuliot.github.io/creepjs/tests/extensions.html) | Chrome extensions |
| [creepjs/tests/proxy.html](https://abrahamjuliot.github.io/creepjs/tests/proxy.html) | Proxy/Reflect behavior |

#### GPU, audio, fonts

| URL | Что проверяет | Примечание |
|---|---|---|
| [webglreport.com](https://webglreport.com/) | полный WebGL1/2 report | эталон для GPU-параметров |
| [webglreport.com/?v=2](https://webglreport.com/?v=2) | WebGL2 | то же |
| [webgpureport.org](https://webgpureport.org/) | WebGPU adapter/limits | если браузер поддерживает WebGPU |
| [browserscan.net](https://www.browserscan.net/) | секция Audio на главной | audio fingerprint |
| [creepjs](https://abrahamjuliot.github.io/creepjs/) | секция Audio | audio fingerprint |
| [audiofingerprint.openwpm.com](https://audiofingerprint.openwpm.com/) | классический audio fingerprint test | архивный/нестабильный, может не открываться; используйте CreepJS/BrowserScan |
| [browserleaks.com/fonts](https://browserleaks.com/fonts) | font fingerprint | основной font-тест |
| [creepjs/tests/fonts.html](https://abrahamjuliot.github.io/creepjs/tests/fonts.html) | font detection | дополнительный |

#### TLS / HTTP / TCP

| URL | Что проверяет | Примечание |
|---|---|---|
| [browserleaks.com/tls](https://browserleaks.com/tls) | TLS ClientHello, JA3/JA4, ciphers, ECH | основной TLS-тест |
| [browserleaks.com/http2](https://browserleaks.com/http2) | HTTP/2 fingerprint | Akamai-style |
| [browserleaks.com/quic](https://browserleaks.com/quic) | QUIC/HTTP3 | если включён QUIC |
| [browserleaks.com/tcp](https://browserleaks.com/tcp) | TCP/IP fingerprint | JA4T, MTU |
| [tls.peet.ws/api/all](https://tls.peet.ws/api/all) | JSON: JA3/JA4, HTTP/2, headers, IP | удобно сравнивать между запусками |
| [tls.browserleaks.com/json](https://tls.browserleaks.com/json) | JSON TLS fingerprint | альтернатива peet.ws |
| [tlsfingerprint.io](https://tlsfingerprint.io/) | TLS fingerprint observatory | независимый тест |
| [ssllabs.com/ssltest/viewMyClient.html](https://www.ssllabs.com/ssltest/viewMyClient.html) | TLS capabilities клиента | не JA3, но полезно для проверки поддерживаемых протоколов |
| [httpbin.org/headers](https://httpbin.org/headers) | JSON всех заголовков | эталон порядка/набора |
| [deviceandbrowserinfo.com/api/http_headers](https://deviceandbrowserinfo.com/api/http_headers) | JSON заголовков | антифрод-взгляд |

#### IP / DNS / WebRTC leaks

| URL | Что проверяет |
|---|---|
| [browserleaks.com/webrtc](https://browserleaks.com/webrtc) | WebRTC local/public IP, mDNS |
| [browserleaks.com/dns](https://browserleaks.com/dns) | DNS leak |
| [ipleak.net](https://ipleak.net/) | IP, DNS, WebRTC, torrent leaks |
| [dnsleaktest.com](https://dnsleaktest.com/) | DNS leak (standard/extended) |
| [browserscan.net/webrtc](https://www.browserscan.net/webrtc) | WebRTC leak |
| [browserscan.net/dns-leak](https://www.browserscan.net/dns-leak) | DNS leak |

### 2.3. Скрепер-сервисы, антидетект и бенчмарки

Это не «истина», а полезный контекст: как вендоры сами описывают проверки и какие сигналы считают важными. У части страниц есть маркетинговый уклон. Отдельных публичных «fingerprint checker» у ScrapingAnt/ZenRows/ScrapeOps на 2026-11-19 нет — есть docs, бенчмарки и интеграции; они ниже.

| URL | Что полезно |
|---|---|
| [scrapeops.io/proxy-providers/stealth-browser-fingerprint-benchmark](https://scrapeops.io/proxy-providers/stealth-browser-fingerprint-benchmark/) | бенчмарк 10 scraping-провайдеров по 15 категориям сигналов; хорошая карта того, что вообще проверяют |
| [zenrows.com/blog/browser-fingerprinting](https://www.zenrows.com/blog/browser-fingerprinting) | обзор слоёв отпечатка и методов обхода |
| [zenrows.com/blog/creepjs](https://www.zenrows.com/blog/creepjs) | разбор CreepJS по группам сигналов |
| [docs.scrapingant.com/v1/captcha-and-cloudflare](https://docs.scrapingant.com/v1/captcha-and-cloudflare) | как scraping-API описывает fingerprinting и anti-bot |
| [brightdata.com/integration/browserscan](https://brightdata.com/integration/browserscan) | связка Bright Data + BrowserScan: что смотреть в профиле |
| [brightdata.com/integration/pixelscan](https://brightdata.com/integration/pixelscan) | связка Bright Data + Pixelscan |
| [developers.oxylabs.io/products/agent-browser/engine-and-fingerprints](https://developers.oxylabs.io/products/agent-browser/engine-and-fingerprints) | какие fingerprint-профили предлагает Oxylabs Agent Browser |
| [scalebrowser.net/blog/browser-fingerprint-test](https://scalebrowser.net/blog/browser-fingerprint-test) | обзор 8 детекторов: BrowserLeaks, CreepJS, Sannysoft, FingerprintJS, BrowserScan, Pixelscan, IPhey, AmIUnique |
| [multilogin.com/review/creepjs](https://multilogin.com/review/creepjs/) | взгляд антидетект-вендора на CreepJS и «lies» |
| [scrapeops.io/blog/tags/tls-fingerprinting](https://scrapeops.io/blog/tags/tls-fingerprinting/) | материалы про TLS-слой и почему «идеальный» JS-отпечаток всё равно палится |
| [scrapingbee.com/blog/tls-fingerprinting-burp-suite](https://www.scrapingbee.com/blog/tls-fingerprinting-burp-suite/) | практический разбор TLS ClientHello/JA3/JA4 |

### 2.4. Исходники и локальные инструменты

| URL | Что это |
|---|---|
| [github.com/fingerprintjs/fingerprintjs](https://github.com/fingerprintjs/fingerprintjs) | OSS-библиотека FingerprintJS: какие компоненты и как хешируются |
| [github.com/abrahamjuliot/creepjs](https://github.com/abrahamjuliot/creepjs) | исходники CreepJS: конкретные тесты и эвристики |
| [github.com/rebrowser/rebrowser-bot-detector](https://github.com/rebrowser/rebrowser-bot-detector) | исходники тестов CDP/Puppeteer/Playwright |
| [github.com/antoinevastel/fpscanner](https://github.com/antoinevastel/fpscanner) | FPScanner: extension + набор тестов |
| [github.com/NikolaiT/zardaxt](https://github.com/NikolaiT/zardaxt) | пассивный TCP/IP fingerprint |
| [github.com/mixvisit-service/mixvisit](https://github.com/mixvisit-service/mixvisit) | движок IPhey/MixVisit |
| [github.com/OpenWPM/openwpm](https://github.com/OpenWPM/openwpm) | исследовательская платформа для измерений fingerprint/tracking |

### 2.5. Ориентировочная карта: кто что проверяет

Обозначения: `●` — основная функция, `○` — вспомогательная/частичная, `—` — не основной профиль. Это сводка по публичным страницам, а не гарантия реализации.

| Сигнал | BrowserLeaks | CreepJS | BrowserScan | Pixelscan | IPhey | AmIUnique | FingerprintJS | Incolumitas |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| IP / ASN / geo | ● | ○ | ● | ● | ● | — | — | ● |
| DNS / WebRTC leak | ● | ○ | ● | ● | ● | — | — | ● |
| HTTP headers / Client Hints | ● | ○ | ● | ● | ○ | ● | ○ | ● |
| TLS / HTTP2 / TCP | ● | — | ● | ○ | ○ | — | — | ● |
| Canvas / WebGL / WebGPU | ● | ● | ● | ● | ● | ● | ● | ● |
| Audio / fonts | ● | ● | ● | ● | ● | ● | ● | ● |
| Lies / prototype tampering | ○ | ● | ○ | ○ | ○ | ○ | — | ○ |
| WebDriver / CDP / bot | ○ | ● | ● | ● | ● | ○ | ○ | ● |
| Uniqueness vs population | ○ | ○ | ○ | ○ | ○ | ● | — | ○ |
| Timeline / ID stability | — | ○ | ○ | ○ | ○ | ● | ● | ○ |
| Tracker blocking | — | — | — | — | — | — | — | — |

---

## 3. План проверок

### 3.1. Цели

1. **Повторяемость (repeatability).** Один и тот же профиль на одной машине после полного перезапуска даёт тот же hard-отпечаток.
2. **Устойчивость во времени.** Через 1 час, 24 часа и 7 дней без обновлений hard-отпечаток не меняется.
3. **Независимость от сети.** Смена IP/прокси/VPN не меняет JS-hard; меняются только сетевые сигналы, и они остаются согласованными с geo/timezone/locale.
4. **Независимость от окна/дисплея.** Изменение размера окна, зума, монитора меняет только context-пробы.
5. **Правдоподобность.** Нет «лжи», automation-маркеров и грубых противоречий; отпечаток похож на реальный браузер.
6. **Изоляция (для антидетект-профилей).** Разные профили различаются по персона-полям; один профиль стабилен.
7. **Регрессия.** После обновления браузера/движка/драйвера понятно, что именно изменилось и это ожидаемо.

### 3.2. Определения

- **Слепок** — один прогон 78 проб (65 hard, 10 context, 3 volatile) в одном состоянии браузера.
- **База (baseline)** — слепок, с которым сравниваются остальные. Обычно первый в серии.
- **Cold start** — полный выход браузера (все процессы завершены), затем запуск с тем же профилем, окном, зумом и флагами. Не «перезагрузка вкладки» и не `chrome://restart`.
- **Hard** — обязан совпадать бит-в-бит. Любое изменение = провал.
- **Context** — зависит от окна/дисплея/разрешений/сети. Изменение допустимо, если объяснимо.
- **Volatile** — меняется всегда (батарея, throughput, memory); в оценку не входит.
- **HSS** (Hard Stability Score) — доля совпавших hard-проб среди доступных.
- **Шум** — проба, которая дала разные хеши в двух прогонах подряд. Шумная hard-проба = нестабильность, даже если «в среднем» значение похоже.
- **Стабильность ≠ уникальность.** Стабильный, но редкий отпечаток всё равно выделяется. Уникальность проверяется отдельно (AmIUnique/Cover Your Tracks).

### 3.3. Стенд

Зафиксируйте и запишите:

- железо (CPU/GPU), ОС и версию, драйвер GPU;
- точную сборку браузера (version + revision), флаги запуска;
- профиль (путь), набор расширений (для чистого теста — ноль), настройки приватности;
- размер окна, зум, количество и разрешение мониторов, scaling;
- сеть: прямой канал / прокси / VPN, страна выхода, DNS;
- время и часовой пояс системы;
- что открыто: DevTools лучше закрыть (CDP может детектироваться), посторонние вкладки/расширения — убрать.

Для «эталонного» сравнения держите рядом **чистый Chrome** на той же машине: он показывает, как выглядит правдоподобный отпечаток, и помогает отличить «так задумано» от «сломалось».

### 3.4. Матрица сценариев

| ID | Сценарий | Что делаем | Ожидание | Критерий прохождения |
|---|---|---|---|---|
| S0 | Базовая точка | 3 cold start, прямой канал, окно/зум фиксированы | hard одинаков | HSS 100%, шум 0 |
| S1 | Серия перезапусков | 5–10 cold start | hard одинаков | HSS 100%, шум 0 |
| S2 | Время | +1 ч, +24 ч, +7 дней без обновлений | hard одинаков | HSS 100% |
| S3 | Сеть | прямой → proxy A (та же страна) → proxy B (другая страна) | JS-hard одинаков; IP/TLS/headers меняются; timezone/locale согласованы с geo | hard 100% внутри одного geo-профиля; нет leak; нет противоречий |
| S4 | Окно/дисплей | resize, zoom 90/110/125%, второй монитор | меняется только context | hard 100%; context-изменения объяснены |
| S5 | Разрешения | выдать/забрать mic/camera/notifications | context может измениться; hard — нет | hard 100%; `Notification` vs `Permissions` без mismatch |
| S6 | Локаль/время | сменить OS timezone/язык и вернуть | hard меняется предсказуемо; после возврата — снова база | нет «лжи»; возврат к baseline |
| S7 | Перенос профиля | копия профиля на другую машину/пользователя | hard может измениться из-за GPU/шрифтов | изменения объяснены; нет случайного шума |
| S8 | Обновление | новая версия браузера/движка | hard меняется | diff изучен, новый baseline, нет регрессий |
| S9 | Внешние детекторы | CreepJS, BrowserScan, Pixelscan, Incolumitas, Rebrowser | нет lies/webdriver/CDP; scores в разумных пределах | нет P0/P1 (см. 3.5) |
| S10 | Изоляция профилей | 3 профиля на одной машине | внутри профиля hard 100%; между профилями — разные persona-поля | нет общих canvas/audio/fonts там, где они должны различаться |

### 3.5. Критерии pass/fail

**P0 — блокер, выпускать нельзя:**

- любая hard-проба изменилась между cold start;
- любая hard-проба шумит (два прогона подряд дают разные хеши);
- `navigator.webdriver === true` или найдены CDP/automation-артефакты в обычном (не тестовом) профиле;
- WebRTC отдаёт публичный IP, не совпадающий с прокси/VPN;
- timezone/locale/язык противоречат IP-geo (для профиля, который должен выглядеть как локальный пользователь);
- TLS/HTTP2 fingerprint не соответствует заявленному браузеру (проверяется внешними страницами).

**P1 — серьёзно, разобрать до масштабирования:**

- CreepJS/Pixelscan/FV.pro показывают «lies»/tampering;
- UA и UA-CH/platform противоречат друг другу;
- GPU-рендерер не соответствует платформе (например, Apple GPU при Windows UA);
- canvas/WebGL/audio/fonts пустые или нестабильные;
- внешний authenticity score < 90% или bot risk высокий без объяснения;
- WebRTC-кандидаты/разрешения выдают неожиданные устройства.

**P2 — допустимо, но зафиксировать:**

- context-пробы меняются из-за окна/зума/монитора;
- отпечаток редкий/уникальный (это не нестабильность);
- единичные внешние score-колебания без изменения hard;
- `absent` для API, которого нет в данном браузере (например, WebGPU в старой версии).

**Acceptance:** HSS = 100%, шум hard = 0, нет P0/P1, все context-изменения объяснены, внешние детекторы не показывают lies/automation. Для антидетект-профилей дополнительно: изоляция S10.

### 3.6. Пошаговый протокол

1. **Зафиксируйте стенд** (3.3). Запишите версию браузера и флаги.
2. **Подготовьте профиль.** Чистый профиль без расширений; для рабочего профиля — тот же набор, что у пользователей.
3. **Снимите baseline.** Чекер → «Снять слепок», метка `base`.
4. **Сделайте 4 cold start.** Метки `cold 2…5`. После каждого — полный выход и проверка, что процессов браузера нет.
5. **Сравните.** В чекере выберите базу; hard должен быть 100%, шум 0. Если нет — разбирайте конкретную пробу, не «средний score».
6. **Внешняя перекрёстная проверка.** Откройте BrowserLeaks (canvas/WebGL/fonts/TLS), CreepJS, BrowserScan, Pixelscan, Incolumitas, Rebrowser. Запишите: canvas hash, WebGL renderer, audio sum, fonts count, timezone, UA-CH, IP/geo, JA3/JA4, bot/trust score, lies.
7. **Сеть.** Повторите 3 замера через proxy A и 3 через proxy B. JS-hard должен остаться тем же; timezone/locale — либо совпадать с geo, либо профиль должен быть явно «нелокальным» и согласованным.
8. **Окно/дисплей.** Resize, zoom, второй монитор. Убедитесь, что меняется только context.
9. **Время.** Через 1 ч и 24 ч повторите по одному слепку.
10. **Разрешения.** Выдайте/заберите mic/camera/notifications. Проверьте hard и `auto.permissions`.
11. **Экспорт.** Сохраните JSON и отчёт. Для автоматизации — harness + compare.py.
12. **Новый baseline** — только после осознанного изменения (обновление браузера, смена GPU, смена персона-профиля).

### 3.7. Частота

- **Перед каждым релизом/сборкой** — полный S0–S1 + S9.
- **После обновления Chrome/движка/драйвера GPU/ОС** — S8 + S9.
- **Раз в неделю** — smoke: 2 cold start + 3 внешних детектора.
- **Перед масштабированием** — S3 + S10 на 3–5 профилях.
- **После инцидента** (бан/капча) — S9 + S3, сравнить с последним стабильным артефактом.

### 3.8. Угрозы валидности

- **Автообновление браузера** посреди серии — hard изменится «сам». Зафиксируйте версию на время серии.
- **GPU switching** (ноутбук на батарее/от сети) может менять WebGL renderer. Проверяйте на одном питании.
- **Драйвер GPU/ОС** может изменить canvas/WebGL, даже если браузер тот же.
- **Шрифты** ставятся/удаляются приложениями; это hard-изменение, а не «шум».
- **Зум/размер окна/монитор** меняют context и могут влиять на canvas metrics.
- **Расширения** (adblock, антидетект, переводчик) подменяют API и добавляют шум.
- **Разрешения** меняют media devices/voices/permissions.
- **Сеть** меняет WebRTC-кандидаты и, конечно, IP/TLS/headers.
- **Внешние сайты** обновляют алгоритмы и A/B-тесты; сравнивайте результаты одного сайта между запусками, а не абсолютные score между сайтами.
- **Headless** отличается от headed по GPU/audio/window; используйте его для регрессии, а не для финального «правдоподобия».
- **CDP/DevTools** могут детектироваться; для финальных замеров не держите DevTools открытым.
- **Canvas/audio noise** может быть намеренной защитой; чекер пометит такие пробы как шумные. Это всё равно нестабильность с точки зрения сайта.

---

## 4. Чекер

### 4.1. Состав

```
checks/
  README.md                  ← benchmark, targets, regression gate
  fingerprint-stability.md   ← этот документ: ссылки и план
  benchmark/
    run.mjs                  ← N холодных стартов + JSON-отчёт
    compare.py               ← сравнение без браузера
    serve.py                 ← static server на 127.0.0.1
    probe/
      index.html             ← UI
      fp-core.js             ← 78 проб, хеши, сравнение
      app.js                 ← история, baseline, экспорт, отчёт
      styles.css
  results/                   ← принятые JSON-отчёты
```

### 4.2. Гарантии независимости

- **Нет сети.** CSP: `default-src 'none'; connect-src 'none'`. Нет `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, внешних `<script>`, `<img>`, `@font-face`.
- **Нет LLM.** Никаких API-вызовов и никакой модели в цикле сравнения. Логика — хеши и правила.
- **Нет телеметрии.** Ни аналитики, ни «проверки версии», ни remote config.
- **Локальное хранение.** `localStorage` ключа `ombra-fp-probe/v1`; данные не покидают профиль, пока вы сами не нажмёте «Экспорт».
- **Проверяемость.** Откройте DevTools → Network: после загрузки `index.html`, `styles.css`, `fp-core.js`, `app.js` не должно быть запросов. CSP-заголовок виден в `<meta>`.

Важно: сам браузер может делать фоновые запросы (обновления, favicon, sync). Это не запросы чекера. Для чистоты запускайте отдельный профиль и смотрите Network именно на странице чекера.

### 4.3. Запуск

```bash
python3 checks/benchmark/serve.py
# или любой static server из checks/benchmark/probe:
python3 -m http.server 8787 --bind 127.0.0.1
# затем http://127.0.0.1:8787/
```

Почему нужен HTTP, а не `file://`:

- `localStorage` на `file://` в разных браузерах ведёт себя по-разному;
- часть API (Client Hints high-entropy, WebGPU, Clipboard) требует secure context; `http://127.0.0.1` считается secure;
- CSP с `script-src 'self'` надёжнее работает на origin.

`python3 checks/benchmark/serve.py --no-open` — не открывать браузер. `PORT=9000 python3 checks/benchmark/serve.py` — другой порт.

### 4.4. Интерфейс

- **Профиль** — метка серии (`chrome-work`, `profile-42`). Сравнение по умолчанию идёт с выбранной базой, но профиль помогает не смешивать серии.
- **Метка слепка** — `base`, `cold 2`, `proxy NL`, `after update`.
- **Двойной прогон** — каждая проба выполняется дважды; если хеши разошлись, проба помечается `noisy`. Для hard это провал. Отключение ускоряет, но скрывает шум.
- **Снять слепок** — прогнать все пробы и сохранить в историю.
- **База для сравнения** — любой слепок; по умолчанию первый.
- **Строгий режим** — context-изменения тоже считаются ошибкой (для проверки «идеально того же окна»).
- **Экспорт/Импорт** — JSON со всеми слепками; импорт сливает по `id`.
- **Копировать отчёт** — Markdown с вердиктом и таблицей изменений.
- **Очистить всё** — удаляет историю из `localStorage` (с подтверждением).

Карточки:

- **Hard stability** — HSS и число совпавших hard-проб;
- **Context stability** — то же для context;
- **Шум/ошибки** — сколько проб шумит и сколько API недоступно;
- **Слепок** — общее число проб и `hardHash` (клик — копировать).

Вердикты: `STABLE`, `STABLE / CONTEXT`, `REVIEW`, `UNSTABLE`, `INCOMPLETE`, `BASE`.

### 4.5. Что измеряется

| Группа | Пробы | Класс |
|---|---|---|
| Navigator/CH | UA, appVersion, platform, vendor, languages, cores, memory, touch, PDF, webdriver, cookies, DNT/GPC, plugins, MIME, UA-CH + high entropy | hard |
| Экран/окно | screen geometry; inner/outer, DPR, screenX/Y, visualViewport, orientation, media queries | geometry — hard; остальное — context |
| Локаль/время | timezone + offsets + names, Intl resolvedOptions, даты, числа, Collator, PluralRules | hard |
| Canvas | сцена 320×100, text metrics, nonzero/evenodd, OffscreenCanvas (pixels) | hard |
| WebGL | WebGL1/2 info, лимиты, precision, расширения, рендер 64×64 | hard |
| WebGPU | adapter info, features, limits | hard (если API есть) |
| Audio | OfflineAudioContext, AudioContext-параметры, AudioWorklet | offline/worklet — hard; context — context |
| Шрифты | список установленных, метрики, emoji-рендеринг | hard |
| JS-движок | Math, числа, Error stack, native toString, Proxy/Reflect, WASM | hard |
| CSS | `CSS.supports` (29 свойств + селекторы), CSS API | hard |
| Медиа/речь | canPlayType, MediaCapabilities/MediaSource, MediaRecorder, enumerateDevices, speech voices | кодеки/capabilities — hard; devices/voices — context |
| Железо/API | Bluetooth/USB/HID/Serial/WakeLock/Share/Clipboard/Keyboard/…; `jsHeapSizeLimit`; `keyboard.getLayoutMap()`; storage; permissions; battery; connection; memory; gamepads | APIs/heapLimit/keyboard — hard; storage/permissions/gamepads — context; battery/connection/memory — volatile |
| DOM / Контекст | `ClientRects` vs `Range` + сетка `1/512 px`; согласованность Main / Worker / `iframe` / detached `iframe` (`L5-02`) | hard |
| Автоматизация | `window.chrome`, CDP-артефакты, `Runtime.enable` leak, нативность прототипов/геттеров, кросс-полевая согласованность UA/platform/GPU/touch/plugins, headless-эвристики, Notification vs Permissions | hard |
| WebRTC | типы host-кандидатов и address kinds (mDNS/IPv4/IPv6), без STUN | context |

Всего **78 проб**: 65 hard, 10 context, 3 volatile. Точное число может меняться при обновлении чекера; смотрите `counts` в экспорте.

### 4.6. Как считается стабильность

1. Каждая проба возвращает JSON-значение; оно канонизируется (сортировка ключей) и хешируется 64-битным некриптографическим хешем.
2. При двойном прогоне сравниваются хеши двух проходов. Расхождение → `noisy`. Волатильные пробы (батарея, throughput, memory) в шум не входят: они меняются всегда.
3. `hardHash` — хеш отсортированного набора `id:hash` для **стабильных** hard-проб (не `noisy`, не `absent`).
4. `sessionHash` — то же для hard + context.
5. При сравнении с базой каждая проба получает статус:
   - `same` — хеши совпали;
   - `changed` — оба доступны, хеши разные;
   - `noisy` — хотя бы в одном слепке проба шумит;
   - `missing` — пробы нет в одном из слепков (например, после обновления чекера);
   - `absent` — API недоступен в обоих (не ошибка стабильности, но пробел в покрытии);
   - `volatile` — исключена из оценки.
6. `HSS = same / (все hard, кроме absent)`. `noisy` и `changed` считаются провалом; `missing` — `INCOMPLETE`.
7. **Не сравнивайте только `hardHash`.** Одинаковый хеш может скрывать разные наборы проб (если часть `absent`). Источник истины — таблица по пробам. Хеш удобен для быстрого взгляда и артефактов.

Почему не криптохеш: задача — детектировать изменение, а не противостоять злоумышленнику. 64-бит достаточно; коллизии negligibly маловероятны. Если нужен криптохеш для отчёта, можно добавить SHA-256, но это не меняет логику.

### 4.7. Автоматизация: N холодных стартов

`checks/benchmark/run.mjs` запускает движок N раз с одним профилем и одним `--fingerprint` seed, между запусками полностью закрывает браузер и вызывает `window.FPAudit.run()` через CDP. Это проверяет именно повторяемость, а не «перезагрузку вкладки».

```bash
# 5 холодных стартов + контрольный запуск с другим seed; по умолчанию — hard-only (65 проб)
node checks/benchmark/run.mjs --runs 5 --headless

# сравнить отчёты (headless и headed группируются автоматически)
python3 checks/benchmark/compare.py checks/results/
```

`--transport file` нужен только там, где loopback HTTP заблокирован; при этом пропущенные hard-пробы (`auto.permissions`, worker в `context.agreement`) переводят цель в `DEGRADED` с `known_gap`. На обычной машине используйте HTTP по умолчанию: раннер сам поднимает временный сервер на `127.0.0.1` и не отправляет `Runtime.enable`.

| Опция | Смысл |
|---|---|
| `--runs N` | число холодных стартов (по умолчанию 5) |
| `--engine PATH` | бинарник Ombra Chromium (по умолчанию — выбранный установленный) |
| `--profile DIR` | существующий тестовый профиль (по умолчанию временный) |
| `--mode headed\|headless` | режим; для релиза нужны оба |
| `--transport http\|file` | HTTP (по умолчанию) или self-contained file fallback |
| `--seed VALUE` | передаётся как `--fingerprint=VALUE` (по умолчанию 20261119) |
| `--seed2 VALUE` / `--no-seed-check` | альтернативный seed для проверки чувствительности `L5-01` |
| `--platform OS` | `--fingerprint-platform` (`windows\|macos\|linux\|android`) |
| `--dpr N` | опциональный `--fingerprint-device-pixel-ratio=N` |
| `--baseline FILE` | сравнить с конкретным предыдущим отчётом (отсутствующий файл → ошибка) |
| `--all-probes` | добавить context/volatile (78 проб вместо 65 hard) |
| `--no-double` | без двойного прогона (быстрее, но без детекта шума) |
| `--no-sandbox` | только для хостов, где sandbox не инициализируется (ставит `DEGRADED` + `known_gap`) |
| `--no-redact` | сохранить сырые значения (только локально, не коммитить) |

Важно:

- harness использует **тот же профиль** между запусками. Для `--profile` берите отдельную копию, а не живой default-профиль: современный Chrome не даёт remote debugging на default-профиле.
- harness закрывает браузер через `Browser.close`; если процесс не вышел, добивает. Убедитесь, что в профиле не осталось других окон.
- `--headless` может дать другой GPU/audio/window и `uaHeadless=true`; для «правдоподобия» используйте headed, для CI — headless. Это разные baseline.
- `--no-sandbox` ослабляет sandbox; отчёт помечает такой запуск и не считает его `L0-01` pass.
- JSON в `checks/results/` редактируется: сырые значения проб удаляются, остаются хеши, статусы и метрики. `--no-redact` — только для локальной отладки.

Пример вывода:

```
run 1/5: hard=a29179f464e0 probes=55 noise=0 hardErrors=0 duration=2642ms
...
L1-01: PASS
L5-01: PASS
baseline: 2026-11-19T14-34-53Z-151.0.7922.108-7-headless (PASS)
result: checks/results/<run_id>.json
VERDICT: PASS
```

### 4.8. CLI-сравнение без браузера

```bash
python3 checks/benchmark/compare.py checks/results/*.json
python3 checks/benchmark/compare.py export.json --baseline "cold 1"
python3 checks/benchmark/compare.py export.json --profile chrome-work --strict
python3 checks/benchmark/compare.py export.json --json report.json
```

| Опция | Смысл |
|---|---|
| `--baseline ID\|LABEL` | выбрать базу по id или подстроке метки (отключает автогруппировку) |
| `--profile NAME` | фильтр по профилю |
| `--no-group` | сравнить все слепки против одной базы без автогруппировки |
| `--strict` | context-изменения → exit 2 |
| `--fail-on hard\|context\|none` | что считать ошибкой для exit code |
| `--json FILE` | машинный отчёт |
| `--list` | только список слепков |

Exit codes: `0` — hard стабилен; `1` — hard changed/noisy/missing; `2` — context при `--strict`/`--fail-on context`; `3` — нет данных/ошибка.

### 4.9. Как читать результат

- **STABLE** — все hard совпали, шума нет. Можно переходить к внешним проверкам и сети.
- **STABLE / CONTEXT** — hard совпал; изменились окно/дисплей/разрешения/сеть. Если это ожидаемо — нормально.
- **REVIEW** — строгий режим, context изменился. Разберите, что именно.
- **UNSTABLE** — hard изменился или шумит. Это провал. Смотрите `diff`: canvas/WebGL/audio/fonts → GPU/драйвер/шрифты/зум; UA/CH → обновление/подмена; timezone/locale → ОС/прокси; automation → CDP/расширение.
- **INCOMPLETE** — не хватает проб (обновление чекера/старый экспорт). Снимите новый baseline.

Типовые причины:

| Что изменилось | Вероятная причина | Что делать |
|---|---|---|
| canvas, WebGL, audio | драйвер GPU, обновление браузера, зум, другой монитор, intentional noise | зафиксировать драйвер/зум; проверить `noisy`; сравнить с чистым Chrome |
| fonts | установили/удалили шрифт, обновили ОС | зафиксировать набор шрифтов; пересобрать baseline |
| UA / UA-CH | автообновление, расширение, подмена | записать версию; проверить `js.native`; отключить расширения |
| timezone/locale | сменили ОС/прокси, VPN | согласовать с geo или использовать отдельный профиль |
| screen/window | resize/zoom/монитор | это context; зафиксировать окно |
| WebRTC | смена сети/интерфейса, VPN | проверить leak; не использовать STUN в чекере |
| automation | DevTools/CDP, Puppeteer/Playwright, расширение | закрыть DevTools; для финальных замеров — ручной запуск |
| `absent` | API нет в браузере/версии | не считать провалом; обновить чекер/браузер |

### 4.10. Ограничения чекера

- **Не видит серверный слой**: TLS/JA3/JA4, HTTP/2, TCP/IP, порядок заголовков, IP/ASN/geo, DNS, репутацию IP. Для этого — раздел 2 и сравнение ответов внешних страниц.
- **Не видит поведение**: мышь, клавиатура, скролл, тайминги. Incipit/Incolumitas/IPhey — отдельно.
- **Не измеряет уникальность** относительно популяции. AmIUnique/Cover Your Tracks/FingerprintJS — отдельно.
- **Видит только то, что отдаёт браузер**. Если браузер подменяет `navigator`, чекер увидит подмену (как и сайт), но не сможет доказать, что это ложь; для этого есть CreepJS/Pixelscan/FV.pro.
- **Headless/автоматизация** может менять отпечаток. Для финальной проверки — headed, без DevTools, без CDP.
- **История в localStorage** привязана к origin (порт). Сменили порт — история «пропала»; экспортируйте/импортируйте.
- **После обновления чекера** старые слепки могут не сравниться: меняется набор проб/алгоритм. Снимите новый baseline; для старых артефактов используйте ту версию, которой они сняты.
- **Экспорт чувствителен**: UA, экран, шрифты, WebRTC-типы, IP-адреса могут быть в значениях. Не коммитьте в git и не отправляйте в LLM.

---

## 5. Чек-лист (копировать в тикет)

```text
[ ] Версия браузера/движка зафиксирована: ____________
[ ] Профиль: ____________; расширения: ____________
[ ] Окно/зум/монитор: ____________; питание: сеть/батарея
[ ] Сеть: прямой / proxy ____ / VPN ____; страна: ____
[ ] S0: 3 cold start, HSS 100%, шум 0
[ ] S1: 5 cold start, HSS 100%, шум 0
[ ] S2: +1 ч и +24 ч, HSS 100%
[ ] S3: proxy A/B, JS-hard 100%, timezone/locale согласованы, leak нет
[ ] S4: resize/zoom/монитор — только context
[ ] S5: permissions — hard не изменился, Notification/Permissions без mismatch
[ ] S9: BrowserLeaks canvas/WebGL/fonts/TLS — стабильны между запусками
[ ] S9: CreepJS — нет lies/tampering; score: ____
[ ] S9: BrowserScan — authenticity: ____; bot/CDP: ____
[ ] S9: Pixelscan — verdict: ____; IPhey MX: ____
[ ] S9: Incolumitas/Rebrowser — нет webdriver/CDP
[ ] WebRTC/DNS: публичный IP = прокси; локальные IP не утекают
[ ] TLS/JA3/JA4/HTTP2: соответствуют заявленному Chrome
[ ] Артефакт экспортирован: checks/results/____________.json
[ ] Baseline обновлён после осознанного изменения
```

---

## 6. Карта «сигнал → где проверить»

| Сигнал | Локальный чекер | Внешние страницы |
|---|---|---|
| IP / ASN / geo | — | BrowserLeaks /ip, IPhey, BrowserScan |
| HTTP headers / Client Hints | `nav.uaData`, `screen.*` (частично) | BrowserLeaks /ip, /client-hints; httpbin /headers; Device & Browser Info |
| TLS / JA3 / JA4 | — | BrowserLeaks /tls; tls.peet.ws; tls.browserleaks.com; TLSFingerprint.io; SSL Labs |
| HTTP/2 / QUIC / TCP | — | BrowserLeaks /http2, /quic, /tcp; BrowserScan /tls; Incolumitas |
| DNS / WebRTC | `rtc.candidates` (типы) | BrowserLeaks /webrtc, /dns; IPLeak; DNSLeakTest; BrowserScan /webrtc |
| Canvas | `canvas.*` | BrowserLeaks /canvas; BrowserScan /canvas; CreepJS |
| WebGL / WebGPU | `webgl*`, `webgpu.*` | WebGL Report; WebGPU Report; BrowserLeaks /webgl, /webgpu |
| Audio | `audio.*` | BrowserScan (Audio); CreepJS (Audio); OpenWPM audio (если доступен) |
| Fonts | `fonts.*` | BrowserLeaks /fonts; CreepJS /tests/fonts |
| UA-CH | `nav.uaData` | BrowserLeaks /client-hints; BrowserScan /client-hints |
| Timezone / locale | `locale.*` | BrowserScan /timezone; BrowserLeaks /javascript; CreepJS /tests/timezone |
| Automation / CDP | `auto.*` | Sannysoft; Rebrowser; BrowserScan /bot-detection; Incolumitas |
| Lies / tampering | `js.native`, `auto.consistency` | CreepJS; Pixelscan; FV.pro; BrowserScan |
| Uniqueness | — | AmIUnique; Cover Your Tracks; FingerprintJS Playground |
| Behaviour | — | Incolumitas; IPhey bot check; Pixelscan |
| Tracker blocking | — | Cover Your Tracks |

---

## 7. Источники и оговорки

- Ссылки проверялись 2026-11-19; часть сайтов использует Cloudflare/антибот и может не открываться из скрипта или из вашей сети.
- Внешние сайты — третьи лица; их алгоритмы, score и даже доступность меняются без предупреждения. Не делайте вывод «стабильно/нестабильно» только по одному внешнему score.
- Бенчмарки scraping-вендоров и статьи антидетект-компаний могут быть маркетинговыми; используйте их как карту сигналов, а не как доказательство.
- Чекер — не антибот-обход и не гарантия «незаметности». Он измеряет повторяемость и согласованность; решение о том, достаточно ли этого для конкретного сайта, остаётся за вами.
- Никакой LLM не получает доступ к отпечатку: сравнение и отчёт формируются локально, в браузере. Если вы копируете отчёт в чат с моделью — это уже ваше решение и утечка.

---

## Приложение A. Мини-глоссарий

- **Fingerprint** — вектор сигналов, а не один хеш. Разные сайты берут разные подмножества.
- **Hard fingerprint** — то, что обязано быть стабильным: canvas/WebGL/audio/fonts/JS/UA-CH/timezone/screen.
- **Context** — окно, DPR, media queries, permissions, WebRTC; зависит от окружения.
- **Volatile** — батарея/сеть/память; меняется всегда.
- **JA3/JA4** — хеши TLS ClientHello; **JA4T** — TCP/IP; **Akamai hash** — HTTP/2.
- **CDP** — Chrome DevTools Protocol; его артефакты палят автоматизацию.
- **Lies** — обнаруженная подмена API/значений (CreepJS).
- **Entropy/uniqueness** — редкость комбинации среди популяции.
- **Cold start** — полный выход браузера и новый запуск, а не перезагрузка вкладки.

## Приложение B. Почему 5 холодных стартов, а не 1

Один запуск не отличает «стабильное значение» от «случайно совпало». Пять запусков дают:

- 4 сравнения с базой;
- обнаружение шума, который проявляется не в каждом запуске;
- устойчивость к единичному сбою инициализации GPU/audio;
- основу для статистики: если 4 из 5 совпали, а один нет — это всё равно нестабильность, и надо искать причину, а не усреднять.

Для критичных профилей — 10 запусков и 24 часа. Для быстрого smoke — 2 запуска, но тогда вывод только «есть ли грубая поломка», не «стабильно».
