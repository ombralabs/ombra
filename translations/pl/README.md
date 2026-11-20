<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Licencja"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Ostatni commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Gwiazdki"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Pobrania z PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Pobrania z npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Wydanie"></a>
</p>

<p align="center">
<a href="#instalacja"><strong>Instalacja</strong></a> ·
<a href="#api-pythona">API Pythona</a> ·
<a href="#api-nodejs-i-typescript">API Node.js</a> ·
<a href="#humanizacja-interakcji">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Języki</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium z kontrolą fingerprintu na poziomie kodu źródłowego C++ i natywną humanizacją interakcji.</h3>

<table><tr><td>
To nie zestaw flag uruchomieniowych ani wstrzykiwanie kodu JavaScript na stronę. To prawdziwy plik binarny Chromium z łatkami fingerprintu skompilowanymi bezpośrednio w kodzie źródłowym C++ oraz symulacją interakcji działającą wewnątrz procesu przeglądarki. Podłącz oficjalny Playwright lub Puppeteer przez lokalny CDP — bez obiektów opakowujących i bez przepisywania kodu obsługi stron.
</td></tr></table>

<br>

<p align="center">
Bezpośredni zamiennik wywołania uruchamiającego dla Playwrighta i Puppeteera w Pythonie oraz Node.js.<br>
To samo API, te same selektory i typy — wystarczy podmienić import oraz wywołanie <code>launch()</code>.
</p>

- **Łatki Chromium na poziomie kodu źródłowego** — canvas, WebGL, WebGPU, audio, czcionki, GPU, ekran, zapytania medialne CSS, raportowanie parametrów sprzętowych, WebRTC bez wycieków STUN, TLS ClientHello, strefa czasowa, ustawienia regionalne (locale) oraz usuwanie sygnałów automatyzacji (`navigator.webdriver`, `Runtime.enable`, znaczniki trybu headless).
- **Natywna humanizacja interakcji w procesie przeglądarki (`humanize=True`)** — trajektorie kursora (`cursory-rs`), celowane kliknięcia z czasem przytrzymania, rytm pisania z samokorektą literówek oraz fizyka przewijania działają bezpośrednio wewnątrz Chromium. SDK zwraca zwykły, natywny obiekt `Browser` bez żadnych klas pośredniczących (proxy wrapperów).
- **Autonomiczne działanie bez kluczy i kont** — bieżące kompilacje silnika (`158.0.8127.37-2` i nowsze) oraz Ombra Desktop działają lokalnie bez rejestracji, kluczy licencyjnych, identyfikatorów sprzętowych ani serwera licencji.
- **Automatyczna instalacja i kryptograficzna weryfikacja binariów** — `pip install ombrabrowser` lub `npm install @ombralabs/sdk`; przy pierwszym uruchomieniu SDK pobiera kompilację dla Twojej platformy i weryfikuje jej podpis Ed25519 oraz sumę kontrolną SHA-256.
- **Trwałe profile i bezpieczny przekaźnik proxy** — nazwane profile zachowują ciasteczka, `localStorage`, IndexedDB i `seed` między uruchomieniami z blokowaniem międzyprocesowym; uwierzytelniane serwery proxy (HTTP, HTTPS, SOCKS5) działają przez lokalny przekaźnik loopback, dzięki czemu dane logowania nigdy nie pojawiają się w argumentach procesu.
- **Lokalny menedżer profili offline Ombra Desktop** — natywna aplikacja desktopowa w tym repozytorium ([`desktop/`](../../desktop/README.md)) z gotowymi instalatorami dla systemów macOS, Linux i Windows.

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

Puppeteer jest również obsługiwany poprzez `import { launch } from "@ombralabs/sdk/puppeteer"` lub `launchPuppeteer()` ([szczegóły](#puppeteer)).

**W przypadku witryn z ochroną antybotową** połącz proxy rezydencjalne, trwały profil oraz spójne ustawienia środowiska:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # rezydencjalny adres IP jest lepszy niż z centrum danych
    fingerprint={"timezone": "auto", "locale": "auto"},  # dopasuj strefę czasową i locale do wyjścia proxy
    headless=False,                                      # niektóre witryny wykrywają różnice trybu headless
    humanize=True,                                       # natywna symulacja myszy, klawiatury i przewijania
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

Zobacz [Rozwiązywanie problemów](#rozwiązywanie-problemów), aby poznać rozwiązania typowych problemów w systemie Linux, kontenerach oraz na chronionych stronach.

## Instalacja

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opcjonalnie: automatyczne wykrywanie strefy czasowej i locale z wyjścia proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Z Playwrightem (1.60.0+, bez konieczności pobierania standardowego Chromium)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Lub z Puppeteerem
npm install @ombralabs/sdk puppeteer-core

# Opcjonalnie: czytnik offline bazy GeoIP dla timezone: "auto" i locale: "auto"
npm install mmdb-lib
```

---

Podczas uruchamiania SDK wyszukuje silnik w ściśle określonej kolejności: `binary_path` (`binaryPath` w Node.js), `OMBRA_BINARY_PATH`, katalog silników Ombra Desktop oraz pamięć podręczna SDK (`~/.ombra/engines`). Jeśli nie zostanie znaleziony zgodny silnik, SDK pobiera kompilację z podpisanego kanału wydań, weryfikuje jej podpis Ed25519 i sumę kontrolną SHA-256, a następnie zapisuje ją lokalnie w pamięci podręcznej. Uruchamianie polecenia `playwright install chromium` nie jest wymagane.

Aby wyłączyć automatyczne pobieranie, przekaż `download=False` (`download: false` w Node.js). Aby pobrać i zweryfikować silnik z wyprzedzeniem (na przykład podczas budowania obrazu kontenera), wywołaj `ensure_binary()` (`ensureBinary()`) lub użyj polecenia CLI `install`.

> **Autonomiczne uruchamianie:** bieżące kompilacje silnika (`158.0.8127.37-2` i nowsze) są darmowe i nie wymagają konta ani klucza licencyjnego. Zmienna `OMBRA_LICENSE_KEY` oraz polecenie `login` pozostają dostępne wyłącznie dla zachowania kompatybilności ze starszymi kompilacjami licencjonowanymi.

**Migracja z Playwrighta** wymaga zmiany dwóch wierszy — wszystkie operacje na stronach, lokatory i oczekiwania pozostają bez zmian:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # reszta kodu działa bez zmian
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Oznacz repozytorium gwiazdką**, jeśli uważasz je za przydatne, oraz **[Obserwuj wydania](https://github.com/ombralabs/ombra/subscription)**, aby otrzymywać powiadomienia o nowych kompilacjach silnika, SDK i Ombra Desktop.

---

## Bieżący status i wydania

Każdy komponent ekosystemu przestrzega wspólnego kontraktu uruchamiania i jest wersjonowany niezależnie.

| Komponent | Status / wersja | Lokalizacja |
|---|---|---|
| **Kontrakt SDK** | Szkic `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python SDK** | Alfa `0.1.3` | [`ombrabrowser` w PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js / TypeScript SDK** | Alfa `0.1.0` | [`@ombralabs/sdk` w npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Silnik Ombra Chromium** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Samodzielna przeglądarka** | `v158.0.8127.37-1` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-1) |
| **Schematy i testy zgodności** | JSON Schema + wspólne przypadki | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Metodyka przeglądu stealth** | 6 warstw (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Zawartość bieżących wydań:

- **Łatki na poziomie kodu źródłowego** — spójne wyznaczanie fingerprintu na podstawie `seed`, dopasowanie WebGL / WebGPU i rozszerzeń, realistyczne tabele czcionek dla poszczególnych systemów operacyjnych, natywny profil TLS ClientHello (`chrome-<major>`), tłumienie `Runtime.enable` oraz wycieków stosu `UtilityScript`, a także ochrona przed wyciekiem lokalnego adresu IP przez WebRTC.
- **Domena CDP `Ombra` na poziomie przeglądarki** — sterowanie humanizacją interakcji w czasie rzeczywistym (`getHumanizeState`, `setHumanize`) w Pythonie i Node.js bez ponownego uruchamiania przeglądarki.
- **Natywna symulacja interakcji w procesie przeglądarki** — planer ruchu kursora `cursory-rs`, profile przewijania kółkiem myszy i gładzikiem, rytm pisania z samokorektą literówek oraz bezpieczne wklejanie długich tekstów przez izolowany schowek.
- **Autonomiczne kompilacje bez kluczy** — bieżące kompilacje silnika (`158.0.8127.37-2`) oraz Ombra Desktop `1.2.2` działają całkowicie lokalnie bez kont, kluczy i telemetrii.
- **Przypinanie wersji silnika (`version`)** — wskaż konkretną kompilację przez `launch(version="158.0.8127.37-2")`, `OMBRA_VERSION` lub polecenie CLI `install --version`.
- **Zunifikowany przekaźnik proxy** — obsługa uwierzytelnianych serwerów proxy HTTP, HTTPS i SOCKS5 bez ujawniania danych uwierzytelniających w wierszu poleceń Chromium, logach ani metadanych profilu.
- **Trwałe nazwane profile** — przechowywanie `seed`, ciasteczek, `localStorage` i IndexedDB w katalogu `~/.ombra/profiles/<slug>` z blokowaniem międzyprocesowym (`ProfileBusyError`).
- **Kryptograficzna weryfikacja łańcucha dostaw** — weryfikacja podpisu Ed25519 kopert wydań oraz weryfikacja sum kontrolnych SHA-256 archiwów przed ich rozpakowaniem.

Pełna historia zmian znajduje się w pliku [CHANGELOG.md](../../CHANGELOG.md).

## Dlaczego Ombra

- **Łatki konfiguracyjne i w JavaScripcie łatwo się psują.** Narzędzia takie jak `playwright-stealth`, `puppeteer-extra` czy `undetected-chromedriver` wstrzykują JavaScript do stron albo modyfikują flagi uruchomieniowe. Aktualizacje Chrome regularnie je psują, a nowoczesne detektory wykrywają same łatki (`Function.prototype.toString`, anomalie prototypów, `addScriptToEvaluateOnNewDocument`).
- **Zmiany są skompilowane bezpośrednio w kodzie źródłowym Chromium.** Fingerprinty są generowane na poziomie C++ i stosowane spójnie w głównej ramce, workerach i elementach iframe. SDK nie wstrzykuje żadnych skryptów na strony i nie wykonuje nadpisań `Emulation.*`.
- **Symulacja interakcji działa w procesie przeglądarki, a nie jako nakładka na Playwright.** Ponieważ trajektorie myszy, naciśnięcia klawiszy i przewijanie są obsługiwane wewnątrz samego Chromium, SDK nie opakowuje obiektów Playwrighta ani Puppeteera — wszystkie lokatory, ramki i biblioteki zewnętrzne działają normalnie.
- **Lokalna architektura bez dodatkowych usług.** Brak demona sterującego działającego w tle i brak dodatkowych przeskoków sieciowych między skryptem a przeglądarką: jeden proces silnika, lokalny CDP na `127.0.0.1` oraz brak limitów liczby profili i współbieżności.

## Ombra Desktop

**Lokalny menedżer profili offline z interfejsem graficznym (GUI).** Jego kod źródłowy znajduje się bezpośrednio w tym repozytorium ([`desktop/`](../../desktop/README.md)) i został zbudowany w oparciu o Tauri (Rust + Vue).

- **W pełni lokalny i offline** — katalog profili jest przechowywany w lokalnej bazie SQLite na Twoim komputerze z lokalnym kluczem szyfrowania; nie wymaga konta, usługi chmurowej ani dostępu do sieci.
- **Uporządkowane zarządzanie profilami** — twórz profile, wyszukuj po nazwie, notatce lub numerze, edytuj opisy i organizuj wpisy za pomocą grup, tagów, etykiet oraz zakładek w katalogu napisanym w języku Rust.
- **Bezpieczny Kosz** — przeniesienie profilu do Kosza zachowuje jego pliki na dysku, umożliwiając późniejsze przywrócenie.
- **Brak limitów profili** — brak płatnych progów za liczbę profili czy limitów chmurowych: wszystkie dane pozostają wyłącznie u Ciebie.
- **Gotowe instalatory** — macOS Apple Silicon (`.dmg`, podpisany za pomocą Apple Developer ID i notaryzowany), Linux (`.deb` i `.rpm`) oraz Windows x64 (`setup.exe`).
- **Izolowane katalogi** — ustaw `OMBRA_DESKTOP_DATA_DIR`, aby pracować na osobnym katalogu testowym lub kopii zapasowej.

[Pobierz `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [README aplikacji Desktop](../../desktop/README.md) · [Przewodnik po profilach i lokalnych kluczach](../../docs/desktop/README.md)

## Weryfikacja fingerprintu i przegląd stealth

Zamiast składać ogólne obietnice „100% niewykrywalności”, Ombra opiera się na powtarzalnej procedurze weryfikacji w udokumentowanych warunkach. Rzeczywiste wyniki na konkretnej witrynie zawsze zależą od reputacji wyjściowego adresu IP, regionu, historii profilu, wersji detektora oraz konfiguracji uruchomieniowej.

### Powierzchnie obsługiwane przez silnik i SDK

| Powierzchnia / sygnał | Standardowy Playwright | Ombra | Implementacja |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Łatka silnika w C++ |
| `window.chrome` | brak w trybie headless | pełny obiekt | Zgodny ze zwykłym Chrome |
| `navigator.plugins` | `0` w trybie headless | spójny zestaw wtyczek | Poziom silnika |
| User-Agent i Client Hints | `HeadlessChrome`, niespójność marki | `Google Chrome` + dopasowane `Sec-CH-UA*` | Łatka `010-user-agent-and-webdriver` |
| Artefakty CDP (`Runtime.enable`, `UtilityScript`) | oznaczane przez detektory | tłumione przez silnik; SDK nigdy nie wywołuje `Runtime.enable` | Łatka `110-runtime-enable` + niezmiennik `SI-02` |
| Wyciek IP przez WebRTC | ujawnia lokalny adres IP hosta | raportuje wyjściowy adres IP bez wysyłania prawdziwego ruchu STUN | Łatka `100-webrtc-leak` (`--webrtc-ip`) |
| TLS i HTTP/2 | zależy od konfiguracji | stos sieciowy Chromium + profil ClientHello `chrome-<major>` | Łatka `210-tls-network-persona` |
| WebGL i WebGPU | renderer programowy / niezgodność GPU | ujednolicone limity WebGL/WebGPU i tabele rozszerzeń | Łatki `070`, `071`, `075`, `955` |
| Czcionki, locale i strefa czasowa | wartości hosta, rozbieżności `Intl` | spójne tabele czcionek, locale ICU i strefa czasowa | Łatki `040`, `090`, `092`, `230` |
| Symulacja interakcji | teleportacja kursora, natychmiastowe `fill()` | krzywe `cursory-rs`, rytm pisania, fizyka przewijania | Łatka `135-ombra-humanize` w procesie przeglądarki |
| Stabilność fingerprintu | zmienia się lub ujawnia hosta | deterministyczny dla danego `seed` między restartami i ramkami | Łatki `001`, `002` + trwały profil |

### Sześć warstw przeglądu

Przed wydaniem lub wdrożeniem konfiguracji wykonaj wszystkie sześć warstw przeglądu na dokładnie tej kompilacji silnika, kliencie automatyzacji i serwerze proxy, których zamierzasz używać:

| Warstwa | Przykładowe cele | Kryteria zaliczenia |
|---|---|---|
| **L0 Transport** | TrackMe, strony testujące wycieki IP/WebRTC, echo nagłówków | Widoczny jest wyłącznie wyjściowy adres IP proxy; JA4 i HTTP/2 pasują do kompilacji Chromium; brak danych logowania proxy w argv |
| **L1 Tożsamość** | Lokalna sonda, Sannysoft, Intoli, test UA-CH | Brak sprzeczności między UA, Client Hints, platformą, GPU, czcionkami, ekranem i locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Brak znaczników trybu headless oraz `lie`; fingerprint pozostaje stabilny po przeładowaniu strony |
| **L3 Automatyzacja** | rebrowser, brotector, botd, audyt poleceń CDP | Brak wycieków `Runtime.enable`, skryptów inicjalizujących (init-script), wiązań (binding) ani `navigator.webdriver` |
| **L4 Zachowanie** | Sonda wierności zdarzeń wejścia, ślady humanize, testy dymne na rzeczywistych ekranach weryfikacyjnych | Zdarzenia z `isTrusted: true`, naturalna kolejność i czasy zdarzeń, realistyczne krzywe ruchu kursora i przewijanie |
| **L5 Stabilność** | Wielokrotne uruchomienia, workery, ramki iframe z tej samej i innych domen, spójność między SDK | Ten sam `seed` odtwarza identyczny fingerprint we wszystkich kontekstach |

Pełna procedura, statusy (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), lista kontrolna sygnałów oraz szablon raportu: [po angielsku (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) oraz [po rosyjsku (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Porównanie

| Funkcja | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API automatyzacji | Playwright | Playwright | Selenium | **Playwright i Puppeteer** |
| Poziom łatek | Brak | Wstrzykiwanie JS na stronę | Flagi konfiguracyjne | **Kod źródłowy C++ (Chromium)** |
| Spójny `seed` fingerprintu | Nie | Nie | Częściowo | **Tak, na profil i eTLD+1** |
| Symulacja interakcji (`humanize`) | Nie | Nie | Nie | **Wbudowana w proces przeglądarki** |
| Tłumienie `Runtime.enable` / wycieków CDP | Nie | Nie | Częściowo | **Łatka silnika + niezmienniki SDK** |
| Uwierzytelniane proxy bez wycieków w CLI | Nie | Nie | Ograniczone | **Lokalny przekaźnik loopback** |
| Izolacja profili | Kontekst przeglądarki | Kontekst przeglądarki | Nie | **Katalog profilu + blokada plikowa** |
| Menedżer profili offline (GUI) | Nie | Nie | Nie | **Ombra Desktop (macOS, Linux, Windows)** |
| Migracja z Playwrighta | — | Zmiana importu | Przepisanie kodu | **Podmiana importu i `launch()`** |

## Jak to działa

```mermaid
flowchart LR
    Script["Twój skrypt<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + mostek CDP"]
    Relay["Lokalny przekaźnik proxy<br/>gdy wymagane jest uwierzytelnianie"]
    Engine["Ombra Chromium<br/>silnik z łatkami w C++"]
    Client["Natywny klient<br/>Playwright · Puppeteer"]
    Profile[("Profil<br/>seed · ciasteczka · storage")]

    Script -->|"launch()"| SDK
    SDK -->|"weryfikacja + uruchomienie"| Engine
    SDK -.->|"uwierzytelnianie proxy"| Relay
    Relay -.-> Engine
    SDK -->|"połączenie przez CDP"| Client
    Script -->|"API strony"| Client
    Client -->|"loopback CDP"| Engine
    Engine --> Profile
```

1. **`launch()` wyszukuje lub pobiera silnik** i weryfikuje jego podpis Ed25519 oraz sumę kontrolną SHA-256.
2. **Przygotowywany jest profil oraz `seed`.** Nazwany profil zakłada blokadę międzyprocesową; jeśli proxy wymaga danych uwierzytelniających, SDK uruchamia działający w pamięci przekaźnik loopback.
3. **Ombra Chromium uruchamia się** z wybranym profilem, opcjami fingerprintu oraz lokalnym portem debugowania (`--remote-debugging-port=0`).
4. **Oficjalny klient nawiązuje połączenie.** Gdy pojawi się plik `DevToolsActivePort`, SDK podłącza Playwrighta (z opcją `no_defaults=True`) lub Puppeteera poprzez `127.0.0.1` i zwraca natywny obiekt `Browser`.
5. **Czyste zamykanie.** Wywołanie `browser.close()` wysyła `Browser.close`, kończy drzewo procesów silnika, zatrzymuje przekaźnik i zwalnia blokadę profilu.

Po uruchomieniu SDK opuszcza ścieżkę danych: wszystkie polecenia obsługi strony trafiają bezpośrednio z Playwrighta lub Puppeteera do Chromium.

### Granice SDK i niezmienniki stealth

[Kontrakt SDK v0.1 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) narzuca ścisłe niezmienniki każdemu oficjalnemu SDK:

- **Brak skryptów stealth na stronach.** SDK nigdy nie wywołuje `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` i nigdy nie modyfikuje właściwości DOM.
- **Brak `Runtime.enable`.** Sprawdzanie gotowości korzysta wyłącznie z lokalnego punktu końcowego HTTP CDP lub `Browser.getVersion`; SDK nigdy nie włącza domen `Runtime`, `Debugger` ani `Log`.
- **Brak nadpisań `Emulation.*`.** SDK nigdy nie wywołuje `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ani `setDeviceMetricsOverride` — tożsamość przeglądarki pochodzi z silnika.
- **Brak zakazanych flag domyślnie.** SDK nigdy samoczynnie nie wstrzykuje `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` ani `--user-agent`.
- **Wyłącznie lokalny CDP (loopback).** Port debugowania zawsze nasłuchuje na `127.0.0.1`; przekazanie nielokalnego adresu w `--remote-debugging-address` jest odrzucane.
- **Brak telemetrii i wycieków sekretów.** Dane logowania proxy, klucze i ciasteczka są maskowane w logach oraz komunikatach błędów.

## API Pythona

### `launch()`

```python
from ombrabrowser import launch

# Podstawowe uruchomienie (domyślnie w trybie headless)
browser = launch()

# Okno przeglądarki w trybie graficznym (headed)
browser = launch(headless=False)

# Proxy HTTP lub SOCKS5 (dane logowania obsługiwane przez lokalny przekaźnik loopback)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Obiekt proxy z listą wyjątków (bypass)
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

# Kontrola fingerprintu (seed, system operacyjny, auto strefa czasowa/locale z proxy, ekran, GPU)
# Dla timezone="auto" / locale="auto" zainstaluj: pip install "ombrabrowser[geoip]"
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

# Natywna symulacja myszy, klawiatury i przewijania
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Przypięcie konkretnej kompilacji silnika i przekazanie dodatkowych flag Chromium
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Zwraca standardowy obiekt `playwright.sync_api.Browser`. Wszystkie metody Playwrighta działają normalnie (`new_page()`, `new_context()`, `close()` itd.). Nowe strony domyślnie korzystają z `no_viewport=True`, aby wymiary okna z profilu nie były nadpisywane.

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

### `launch_context()` i `launch_context_async()`

Wygodna funkcja pomocnicza, która uruchamia przeglądarkę i bezpośrednio zwraca obiekt `BrowserContext` (zamknięcie kontekstu kończy również proces silnika). Dodatkowe argumenty nazwane są przekazywane do `browser.new_context()` — na przykład `storage_state`, `permissions` lub `extra_http_headers`:

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

Odpowiednik asynchroniczny: `await launch_context_async(...)`.

### `launch_persistent_context()` i `launch_persistent_context_async()`

Uruchamia przeglądarkę z trwałym profilem i zwraca jej domyślny obiekt `BrowserContext`. Ciasteczka, `localStorage`, IndexedDB, pamięć podręczna oraz `seed` fingerprintu są zachowywane między sesjami.

- Przekazanie `profile="pricing-eu"` tworzy profil w katalogu `~/.ombra/profiles/pricing-eu` z metadanymi w `.ombra/profile.json` oraz plikiem blokady.
- Przekazanie `user_data_dir="./my-profile"` (lub ścieżki jako argumentu pozycyjnego) używa dokładnie tego wskazanego katalogu.
- Równoczesne uruchomienie tego samego profilu z innego procesu zgłasza błąd `ProfileBusyError`, zamiast doprowadzić do uszkodzenia danych profilu.

```python
from ombrabrowser import launch_persistent_context

# Przez nazwany profil (przechowywany w ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # ciasteczka, storage i seed zostają zapisane

# Przez jawną ścieżkę (na przykład do ładowania rozszerzeń Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Odpowiednik asynchroniczny: `await launch_persistent_context_async(...)`.

### Funkcje pomocnicze i diagnostyka (Python)

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

# Sprawdź informacje o wybranym pliku binarnym silnika
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Pobierz i zweryfikuj silnik bez uruchamiania przeglądarki
ensure_binary(version="158.0.8127.37-2")

# Usuń pliki binarne silnika zarządzane przez SDK (profile w ~/.ombra/profiles pozostają nienaruszone)
clear_cache()

# Sprawdź docelowe polecenie uruchomieniowe bez uruchamiania Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Odczytaj metadane uruchomienia (port CDP, ws_url, seed, pid) i sprawdź kondycję procesu
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # pobierz i zweryfikuj silnik (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-2  # zainstaluj konkretną kompilację silnika
ombrabrowser info                                # diagnostyka środowiska, pliku binarnego i zależności (alias: doctor)
ombrabrowser info --quick --json                 # szybki raport maszynowy bez uruchamiania pliku binarnego
ombrabrowser info --proxy socks5://user:pass@host:1080  # przetestuj wyjściowe IP oraz rozpoznawanie strefy czasowej i locale przez proxy
ombrabrowser update                              # sprawdź kanał wydań i zaktualizuj zapisany silnik
ombrabrowser clear-cache                         # wyczyść pamięć podręczną binariów silnika (profile są zachowywane)
ombrabrowser login                               # zapisz klucz licencyjny w ~/.ombra/license.key (tylko starsze kompilacje)
ombrabrowser logout                              # usuń zapisany klucz licencyjny
```

Te same polecenia są dostępne przez `python -m ombrabrowser <command>`.

## API Node.js i TypeScript

Pakiet `@ombralabs/sdk` dostarcza podwójne kompilacje ESM + CommonJS wraz z pełnymi definicjami typów TypeScript (`.d.ts`). Zarówno Playwright, jak i Puppeteer korzystają pod spodem z tego samego silnika.

### Playwright (domyślny)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Podstawowe uruchomienie z proxy, fingerprintem i symulacją interakcji
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

// Wygodne uruchomienie: przeglądarka + kontekst w jednym wywołaniu
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Trwały profil — ciasteczka, localStorage i seed są zachowywane między uruchomieniami
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Każdy powyższy przykład jest samodzielny. Aby zmigrować istniejący kod uruchamiający Playwrighta, możesz również zamienić import na `import * as chromium from "@ombralabs/sdk"` i pozostawić wywołanie `await chromium.launch(...)`.

### Puppeteer

Użyj `launchPuppeteer()` z `@ombralabs/sdk` lub zaimportuj z `@ombralabs/sdk/puppeteer`:

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

> **Uwaga dotycząca Puppeteera:** Puppeteer generuje domyślnie większy ruch CDP niż Playwright używający `connectOverCDP({ noDefaults: true })`. W przypadku stron z rygorystycznymi kontrolami CDP zalecany jest Playwright.

### Narzędzia pomocnicze i CLI (Node.js)

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

## Humanizacja interakcji

W Ombrze symulacja interakcji (`humanize`) jest skompilowana **natywnie wewnątrz procesu przeglądarki Chromium** (napędzana przez `cursory-rs` oraz harmonogram zdarzeń wejściowych silnika), zamiast być zaimplementowana jako nakładka JavaScript wokół klienta automatyzacji. Oznacza to, że:

- Każda standardowa akcja Playwrighta i Puppeteera (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) przechodzi przez jedną wspólną kolejkę zdarzeń wejściowych dla danej karty wewnątrz przeglądarki.
- Parametry behawioralne są wyznaczane deterministycznie na podstawie `seed` profilu (`--fingerprint-humanize-seed`).
- SDK nigdy nie opakowuje obiektów `Page` ani `Browser` w klasy proxy — natywne typy i zachowanie klienta pozostają nienaruszone.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Co zmienia się przy `humanize=True`:**

| Akcja | Bez `humanize` | Z `humanize=True` |
|---|---|---|
| Ruch myszy | Natychmiastowa teleportacja | Krzywe `cursory-rs` z przyspieszeniem, pauzami i delikatnym przesterowaniem |
| Kliknięcia i przeciągania | Natychmiastowe naciśnięcie | Wyznaczony punkt celowania w obrębie elementu, pauza przed kliknięciem i czas przytrzymania |
| Wprowadzanie tekstu | Natychmiastowe ustawienie wartości | Wpisywanie znak po znaku ze skonfigurowanym rytmem i układem klawiatury, okazjonalnymi literówkami i samokorektą; bardzo długie teksty są wklejane przez izolowany schowek bez naruszania schowka systemowego |
| Przewijanie | Pojedynczy skok | Seria zdarzeń kółka/gładzika zgodna ze zmierzonymi profilami wyhamowywania |
| Okresy bezczynności | Nieruchomy kursor | W presecie `careful` subtelny dryf kursora w stanie bezczynności między akcjami |

**Presety** — `default` (normalne tempo), `careful` (wolniejsze, ostrożne, z mikroruchami w stanie bezczynności) oraz `fast` (szybsze tempo). Przekaż `humanize=False` (`humanize: false`), aby jawnie wyłączyć symulację interakcji.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Możesz włączać lub wyłączać tryb oraz przełączać presety w trakcie działania bez ponownego uruchamiania przeglądarki poprzez domenę CDP `Ombra`:

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

## Zarządzanie fingerprintem i profilami

Silnik wyznacza spójną konfigurację przeglądarki z pojedynczego `seed`. Gdy `seed` zostanie pominięty:

| Scenariusz | Zachowanie |
|---|---|
| **`launch()` bez profilu** | SDK generuje losowy `seed` na czas sesji i tworzy katalog tymczasowy, który jest usuwany po wywołaniu `close()`. |
| **`profile="name"` lub `user_data_dir="./dir"`** | Wartość `seed` jest zapisywana w `.ombra/profile.json` i ponownie używana przy każdym uruchomieniu — witryny widzą powracającego użytkownika z tym samym urządzeniem i ciasteczkami. |
| **`fingerprint={"seed": N, ...}`** | Deterministyczny fingerprint z jawnie podanego `seed`; dodatkowe pola nadpisują poszczególne ustawienia przy zachowaniu spójności pozostałych parametrów. |

Szum canvas/audio jest kluczowany dla domeny `eTLD+1` (stabilny w ramach tej samej witryny, niemożliwy do powiązania między różnymi witrynami). Szum pikseli dla canvas 2D oraz WebGL `readPixels` jest domyślnie wyłączony, aby uniknąć uruchamiania detektorów typu „Canvas Tampering / Masking”; można go włączyć jawnie flagą `--fingerprint-pixel-noise`.

> **Wskazówka:** wracając wielokrotnie na tę samą stronę, używaj trwałego profilu (`profile="name"` lub `launch_persistent_context()`) zamiast przekazywać stały `seed` do efemerycznego wywołania `launch()` — dzięki temu ciasteczka, pamięć podręczna i `localStorage` pozostaną spójne razem z fingerprintem.

### Pola obiektu `fingerprint`

Nazwy pól poniżej stosują konwencję Pythona (`snake_case`); Node.js akceptuje zarówno `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`), jak i `snake_case`:

| Pole | Typ | Opis |
|---|---|---|
| `seed` | `int` (`>= 0`) | Ziarno generatora określające całościową konfigurację fingerprintu |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Docelowy system operacyjny (`navigator.platform`, UA, pule GPU i czcionek) |
| `os_version` | `string` | Wskazówka wersji systemu operacyjnego dla Client Hints |
| `timezone` | strefa IANA lub `"auto"` | Strefa czasowa (np. `"Europe/Berlin"`). Wartość `"auto"` określa strefę na podstawie wyjścia proxy przez GeoIP |
| `locale` | BCP-47 lub `"auto"` | Ustawienia regionalne (`Accept-Language`, `navigator.languages`, ICU `Intl`). Wartość `"auto"` określa locale na podstawie wyjścia proxy |
| `screen` | `{"width", "height"}` lub `"auto"` | Wymiary ekranu i obszaru roboczego z uwzględnieniem paska zadań / paska menu docelowego systemu |
| `gpu` | `{"vendor", "renderer"}` lub `"auto"` | Jawne ciągi znaków WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` lub `"auto"` | Raportowana wartość `navigator.hardwareConcurrency` |
| `device_memory` | `int` lub `"auto"` | Raportowana wartość `navigator.deviceMemory` (w GB) |
| `noise` | `bool` | Włączenie/wyłączenie szumu fingerprintu (`False` przekazuje `--disable-fingerprint-noise`) |

> Traktuj `seed` jako główne źródło parametrów fingerprintu: ręczne nadpisywanie pojedynczych wartości bez dbania o ich wzajemną spójność (np. połączenie systemu operacyjnego z niekompatybilnym GPU) może wprowadzić sprzeczności wykrywane przez detektory.

### Dodatkowe flagi silnika (`args`)

Flagi obsługiwane przez silnik, których SDK nie ustawia automatycznie (przekazuj przez `args=[...]`):

| Flaga | Przeznaczenie |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Marka przeglądarki w `Sec-CH-UA` (SDK domyślnie używa `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | Profil TLS ClientHello dopasowany do wskazanej głównej wersji Chrome (ustawiany automatycznie przez SDK na podstawie wersji silnika) |
| `--webrtc-ip=<ip>` | Podstawiony adres IP w kandydatach WebRTC ICE bez wysyłania prawdziwego ruchu STUN |
| `--fingerprint-location=<lat,lon>` | Współrzędne raportowane przez `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Limit pamięci raportowany przez `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Liczba punktów dotyku (`navigator.maxTouchPoints` i zapytania medialne pointer) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Gęstość pikseli ekranu (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Głębia kolorów ekranu |
| `--disable-gpu-fingerprint` | Przepuszczenie rzeczywistego GPU hosta (ciągi WebGL/WebGPU, limity i rozszerzenia) |
| `--disable-gpu-string-spoof` | Przepuszczenie rzeczywistych ciągów GPU przy zachowaniu pozostałych ustawień profilu |
| `--disable-fingerprint-noise` | Wyłączenie szumu canvas/WebGL/audio przy zachowaniu aktywnych parametrów tożsamości |
| `--fingerprint-pixel-noise` | Włączenie opcjonalnego, idempotentnego szumu pikseli dla canvas 2D oraz `readPixels` |
| `--profile-label=<text>` | Etykieta profilu wyświetlana na pasku adresu przeglądarki (tylko UI; niewidoczna dla stron internetowych) |

### Konfiguracja czcionek w systemie Linux

Minimalistycznym serwerom i kontenerom Linux często brakuje czcionek emoji oraz CJK, przez co ukryte renderowanie tekstu i emoji w canvas daje nietypowe skróty (hashe).

**1. Warstwa bazowa (emoji i CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Czcionki Windows dla profili Windows (`os="windows"`):**
Podczas uruchamiania konfiguracji Windows w systemie Linux zainstalowanie prawdziwych czcionek z `C:\Windows\Fonts\` (w tym `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) znacząco poprawia spójność wykrywania czcionek:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Czcionki macOS dla profili macOS (`os="macos"`):**
Analogicznie, używając `os="macos"` na Linuksie, skopiuj czcionki z `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` oraz `/Library/Fonts/` do `~/.local/share/fonts/mac/` i uruchom `fc-cache -f`.

W pliku `Dockerfile` umieść czcionki w katalogu systemowym `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Opcje uruchamiania, konfiguracja i błędy

### Opcje `launch()`

Nazwy opcji odpowiadają API Pythona oraz [kontraktowi SDK](../../docs/sdk-contract.md); Node.js używa odpowiedników `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`), ale akceptuje również aliasy `snake_case`. Nieznane opcje są odrzucane błędem `InvalidOptionError`.

| Opcja | Wartość domyślna | Opis |
|---|---|---|
| `headless` | `true` | Uruchomienie bez okna (`--headless=new`) |
| `proxy` | brak | Adres URL proxy (`http`, `https`, `socks5`) lub obiekt; uwierzytelniane proxy korzystają z przekaźnika loopback |
| `fingerprint` | brak | Ustawienia dla `seed`, systemu operacyjnego, strefy czasowej, locale, ekranu, GPU, pamięci i szumu |
| `profile` | brak | Nazwany trwały profil w `~/.ombra/profiles/<slug>` (wyklucza się wzajemnie z `user_data_dir`) |
| `user_data_dir` | tymczasowy | Jawna ścieżka katalogu profilu (wyklucza się wzajemnie z `profile`) |
| `args` | `[]` | Dodatkowe argumenty Chromium (przekazywane bez zmian) |
| `binary_path` | wyznaczana automatycznie | Jawna ścieżka do pliku wykonywalnego silnika |
| `version` | zmienna środowiskowa / auto | Przypięcie wersji silnika (na przykład `158.0.8127.37-2`), nadpisuje `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Limit czasu uruchomienia silnika i połączenia CDP (1000–600000 ms) |
| `humanize` | domyślne ustawienie silnika | `False`, `True` lub `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | zmienna środowiskowa / plik | Klucz dla starszych kompilacji licencjonowanych (niepotrzebny w `158.0.8127.37-2+`; nigdy nie jest logowany) |
| `env` | `{}` | Dodatkowe zmienne środowiskowe dla procesu silnika |
| `download` | `True` | Zezwolenie na automatyczne pobranie brakującego pliku binarnego silnika |

### Zmienne środowiskowe

Kolejność pierwszeństwa: **jawna opcja uruchomienia → zmienna środowiskowa → metadane profilu → wartość domyślna**.

| Zmienna | Wartość domyślna | Opis |
|---|---|---|
| `OMBRA_BINARY_PATH` | nieustawiona | Jawna ścieżka do pliku binarnego silnika |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Katalog pamięci podręcznej silników i nazwanych profili |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Bazowy adres URL / mirror do pobierania silnika (`none`/`off` wyłącza pobieranie) |
| `OMBRA_VERSION` | najnowsza kompatybilna | Przypięta wersja silnika (na przykład `158.0.8127.37-2`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Kanał wydań silnika: `stable` lub `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Sprawdzanie nowszych kompilacji silnika przy uruchomieniu |
| `OMBRA_SKIP_CHECKSUM` | `false` | Wyłącznie do lokalnego rozwoju: wyłącza weryfikację SHA-256 (zapisuje ostrzeżenie w logu) |
| `OMBRA_LICENSE_KEY` | nieustawiona | Klucz dla starszych kompilacji licencjonowanych (nigdy nie jest logowany) |
| `OMBRA_TIMEOUT_MS` | `30000` | Domyślny limit czasu uruchomienia (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Poziom szczegółowości logów: `error`, `warn`, `info`, `debug` |

### Typowane błędy

W przypadku jakiegokolwiek błędu SDK kończy uruchomiony proces silnika, zwalnia blokadę profilu i rzuca podklasę `OmbraError` ze stabilnym polem `kind` oraz polem `details` z zamaskowanymi sekretami:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Pełna taksonomia błędów i zasady ponawiania prób są udokumentowane w [kontrakcie SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Platformy, integracje i kontenery

### Obsługiwane platformy i środowiska uruchomieniowe

| Komponent | Obsługa | Uwagi |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Autonomiczna kompilacja `158.0.8127.37-2`; Ombra Desktop jest podpisany certyfikatem Developer ID i notaryzowany |
| **macOS x64 (Intel)** | — | Brak aktualnego wydania Chromium 158 |
| **Linux x64** | ✅ | Autonomiczna kompilacja `158.0.8127.37-2`; wymaga `xz-utils` (`xz`) do rozpakowania `.tar.xz` |
| **Windows x64** | ✅ | Autonomiczna kompilacja `158.0.8127.37-2` oraz instalator Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` jest instalowany automatycznie wraz z `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` lub Puppeteer `>=22` (Puppeteer 25+ wymaga Node.js `>=22.12`) |

### Integracje z frameworkami i agentami AI

Ombra współpracuje z dowolnym narzędziem automatyzacji lub frameworkiem agentów AI, który przyjmuje niestandardowy plik binarny Chromium albo łączy się przez CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` i inne):

```python
# Opcja 1: uzyskaj zweryfikowaną ścieżkę binarną i argumenty silnika dla własnego runnera
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opcja 2: uruchom przez Ombra SDK i przekaż lokalny punkt końcowy CDP do swojego frameworka
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Podłącz swój framework do ws_url lub cdp_http — ustawienia fingerprintu i humanize
# działają wewnątrz silnika i pozostają aktywne dla każdego klienta CDP
```

### Uruchamianie w Dockerze i na serwerach Linux

Przykładowy `Dockerfile`, który pobiera i weryfikuje silnik już na etapie budowania obrazu:

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

> **Kontenery i serwery WWW:**
> - Jeśli kontener nie może zainicjalizować piaskownicy (sandbox) Chromium, przekaż jawnie `--no-sandbox` przez `args=["--no-sandbox"]` (SDK nigdy nie dodaje tej flagi samodzielnie).
> - Aby uruchamiać przeglądarkę z `headless=False` na serwerze bez monitora, użyj `Xvfb` (zobacz [poniżej](#rozwiązywanie-problemów)).
> - Uruchamiając kod pod `uvicorn` z `uvloop`, przekaż `--loop asyncio`, aby uniknąć zawieszania się potoków podprocesów.

## Rozwiązywanie problemów

### Strona blokuje tryb headless

Niektóre systemy antybotowe wykrywają różnice behawioralne i renderowania w trybie headless nawet przy łatkach C++. Uruchamiaj przeglądarkę z `headless=False` na wirtualnym ekranie za pomocą `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Następnie uruchom sesję z rezydencjalnym proxy SOCKS5/HTTP, trwałym profilem, dopasowaną strefą czasową/locale, `headless=False` oraz `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Jeśli blokady w systemie Linux nadal występują, sprawdź sekcję [Konfiguracja czcionek w systemie Linux](#konfiguracja-czcionek-w-systemie-linux).

### Strona wymaga weryfikacji przy każdej wizycie

Wywołanie `launch()` bez parametru `profile` za każdym razem startuje z pustego katalogu tymczasowego i nowym `seed`, więc witryna traktuje każde uruchomienie jako zupełnie nowego użytkownika bez ciasteczek. Przełącz się na `profile="..."` lub `launch_persistent_context(...)`, aby ciasteczka, `localStorage` i `seed` były zachowywane między uruchomieniami.

### `ProfileBusyError`

Nazwany profil lub katalog `user_data_dir` może być otwarty jednocześnie tylko w jednym procesie. Przypisz unikalną nazwę profilu każdemu równoległemu workerowi (`profile=f"worker-{i}"`). Nieaktualne blokady pozostawione przez procesy, które uległy awarii, są wykrywane i usuwane automatycznie.

### Czy muszę uruchamiać `playwright install chromium`?

Nie. Ombra używa własnego pliku binarnego silnika i nie korzysta ze standardowego Chromium z Playwrighta. W systemie Linux potrzebujesz jedynie bibliotek systemowych oraz `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Aktualizacja, zmiana kanałów i cofanie wersji silnika

Zaktualizuj SDK do najnowszego wydania:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Przetestuj kanał `beta` albo przypnij / cofnij silnik do konkretnej kompilacji:

```python
# Przypięcie konkretnej kompilacji dla pojedynczego uruchomienia
browser = launch(version="158.0.8127.37-2")
```

```bash
# Lub konfiguracja przez zmienne środowiskowe / CLI
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# Lub wskazanie lokalnie zbudowanego pliku binarnego
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper blokuje lokalną kompilację

Oficjalne wydania Ombra dla macOS Apple Silicon są podpisane certyfikatem Apple Developer ID oraz notaryzowane. Jeśli uruchamiasz lokalną niepodpisaną kompilację deweloperską i macOS obejmuje ją kwarantanną, usuń jednorazowo atrybut kwarantanny:

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### Oczekiwanie na stronie w synchronicznym Pythonie

W synchronicznym Playwrightcie pojedyncze długie `time.sleep(15)` po `page.goto()` wstrzymuje pętlę zdarzeń Playwrighta, co może zablokować działanie stron weryfikacyjnych. Zamiast tego czekaj w krótkich odstępach z lekkim wywołaniem kontekstu:

```python
import time

for _ in range(15):
    page.context.cookies()  # utrzymuje przetwarzanie Playwrighta bez dotykania DOM strony
    time.sleep(1)
```

W asynchronicznym Pythonie użyj `await asyncio.sleep(...)`; w Node.js użyj `await new Promise(r => setTimeout(r, ms))`. Unikaj też częstego wywoływania `page.wait_for_timeout()` oraz zbędnych `page.evaluate()` przed weryfikacją, aby nie generować dodatkowego ruchu CDP.

## Bezpieczeństwo

- **Autentyczność i integralność silnika.** Przed rozpakowaniem SDK weryfikuje podpis Ed25519 koperty wydania przy użyciu przypiętego klucza publicznego oraz sprawdza skrót SHA-256 zarówno archiwum, jak i pliku wykonywalnego.
- **Wyłącznie lokalny CDP.** Port debugowania nasłuchuje wyłącznie na `127.0.0.1`. Nigdy nie wystawiaj portu CDP do sieci publicznej bez dodatkowego uwierzytelniania — CDP zapewnia pełną kontrolę nad przeglądarką.
- **Izolacja sekretów.** Dane uwierzytelniające proxy istnieją wyłącznie w pamięci lokalnego przekaźnika loopback i nigdy nie pojawiają się w wierszu poleceń procesu, metadanych profilu, logach ani szczegółach błędów.
- **Brak telemetrii.** SDK nie wysyła żadnych danych analitycznych, raportów błędów ani ukrytych zapytań sieciowych.

Zgłaszaj podatności bezpieczeństwa poufnie zgodnie z [SECURITY.md](../../SECURITY.md).

## Mapa repozytorium

```text
.
├── README.md                    # główny plik README (English)
├── translations/
│   ├── pl/README.md             # ten plik (Polski)
│   └── <locale>/README.md       # 20 pozostałych lokalizacji
├── desktop/                     # Ombra Desktop (Tauri: katalog w Rust + interfejs Vue)
├── docs/
│   ├── architecture.md          # architektura, granice zaufania, cykl życia
│   ├── sdk-contract.md          # kontrakt uruchamiania v0.1, opcje, błędy, niezmienniki
│   ├── stealth-checkup.md       # metodyka przeglądu stealth (po angielsku)
│   ├── stealth-checkup.ru.md    # metodyka przeglądu stealth (po rosyjsku)
│   ├── versioning.md            # wersjonowanie SDK, silnika i klienta
│   └── desktop/                 # przewodniki po lokalnych profilach i kluczach Desktop
├── spec/
│   └── schemas/                 # schematy JSON Schema dla opcji uruchamiania i metadanych binariów
├── sdks/
│   ├── manifest.json            # maszynowy rejestr SDK
│   ├── README.md                # struktura SDK i zasady współtworzenia
│   ├── python/                  # Python SDK (publikowane jako ombrabrowser)
│   ├── node/                    # Node.js / TypeScript SDK (publikowane jako @ombralabs/sdk)
│   └── ...                      # szkielety kontraktowe dla innych języków (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # międzyjęzykowe przypadki uruchamiania i niezmienników stealth
├── tools/check_repo.py          # walidator struktury, schematów i linków (CI)
└── .github/workflows/ci.yml
```

To repozytorium zawiera kontrakt SDK, schematy, przypadki testów zgodności, dokumentację oraz kod źródłowy Ombra Desktop. Łatki silnika Chromium są utrzymywane w osobnym repozytorium, a skompilowane wydania są publikowane przez kanał pobierania oraz [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### Czy to fork Playwrighta?

Nie. SDK podłącza oficjalnego klienta Playwright (lub Puppeteer) do Ombra Chromium przez lokalny CDP. Wszystkie typy, lokatory, oczekiwania i obiekty stron pozostają standardowe.

### Czy Ombra jest darmowa i czy potrzebuję klucza licencyjnego?

Kod źródłowy SDK w tym repozytorium jest otwarty na licencji Apache License 2.0. Bieżące kompilacje silnika (`158.0.8127.37-2` i nowsze) oraz lokalny menedżer profili Ombra Desktop (`desktop-v1.2.2`) działają bezpłatnie i autonomicznie — bez konta, klucza licencyjnego, identyfikatora sprzętowego ani limitu liczby profili. Parametry `license_key` oraz `OMBRA_LICENSE_KEY` są potrzebne wyłącznie dla starszych kompilacji licencjonowanych.

### Czy muszę zainstalować Ombra Desktop, aby korzystać z SDK?

Nie. SDK uruchamia silnik bezpośrednio jako proces potomny, dzięki czemu świetnie nadaje się do skryptów, kontenerów i CI. Ombra Desktop jest opcjonalny, jeśli chcesz zarządzać lokalnym katalogiem profili poprzez interfejs graficzny (GUI).

### Czym Ombra różni się od `playwright-stealth`?

`playwright-stealth` wstrzykuje JavaScript do stron na wierzchu zwykłej przeglądarki, a nowoczesne detektory często wykrywają same łatki. Ombra kompiluje modyfikacje bezpośrednio w kodzie źródłowym Chromium, a SDK nie wstrzykuje żadnych skryptów na strony.

### Czy mogę używać własnego proxy?

Tak. Przekaż proxy `http://`, `https://` lub `socks5://` w parametrze `proxy`. Gdy obecne są dane uwierzytelniające, SDK uruchamia lokalny przekaźnik loopback, dzięki czemu nigdy nie pojawiają się one w argumentach procesu. Pamiętaj, że własny klient `context.request` / `page.request` Playwrighta może pomijać ustawienia proxy na poziomie przeglądarki — aby mieć pewność, że ruch przechodzi przez proxy, wywołuj `fetch()` z kontekstu strony.

### Które wersje Playwrighta i Puppeteera są obsługiwane?

Python SDK wymaga Playwrighta `>=1.60,<2.0` (instalowanego automatycznie wraz z `ombrabrowser`). Node.js SDK obsługuje `playwright-core@^1.60.0` lub `puppeteer-core >=22.0.0`. Zobacz zasady kompatybilności w [przewodniku po wersjonowaniu](../../docs/versioning.md).

### Czy Ombra gwarantuje przejście każdej kontroli antybotowej?

Nie. Wykrywanie botów to ruchomy cel, który zależy od witryny, regionu, reputacji adresu IP, historii profilu i wersji detektora. Skorzystaj z [metodyki przeglądu stealth](../../docs/stealth-checkup.md), aby obiektywnie mierzyć i śledzić konkretną konfigurację.

### Do jakich zastosowań stworzono Ombrę?

Ombra powstała z myślą o autoryzowanej automatyzacji, testach QA, monitoringu, badaniach oraz zarządzaniu izolowanymi profilami roboczymi. Nieautoryzowany dostęp, credential stuffing ani nadużycia nie są wspierane.

## Współtworzenie

Wytyczne dotyczące współtworzenia znajdują się w [CONTRIBUTING.md](../../CONTRIBUTING.md), zasady społeczności w [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), a instrukcje dotyczące SDK w [sdks/README.md](../../sdks/README.md).

- Zaktualizuj [kontrakt SDK](../../docs/sdk-contract.md) oraz [schematy](../../spec/schemas) przed dodaniem nowej opcji uruchamiania.
- Zmieniając zachowanie SDK, zaktualizuj implementację, testy oraz wspólne przypadki w [conformance](../../conformance/README.md).
- Przed otwarciem pull requesta uruchom `python3 tools/check_repo.py`, aby zweryfikować strukturę repozytorium i linki.

## Licencja

Kod źródłowy SDK w tym repozytorium jest udostępniany na licencji [Apache License 2.0](../../LICENSE). Licencja nie przyznaje praw do znaków towarowych Ombra, silnika Ombra Chromium ani Ombra Desktop — warunki dotyczące znaków towarowych oraz komponentów stron trzecich znajdziesz w pliku [NOTICE](../../NOTICE).

## Linki

- 🌐 **Strona internetowa** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Wydania (silnik i Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Lista zmian** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Błędy i propozycje funkcji** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organizacja** — [Ombra Labs](https://github.com/ombralabs)
