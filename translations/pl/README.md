# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

W Pythonie i Node.js funkcja `launch()` uruchamia Ombra Chromium i zwraca obiekt `Browser` biblioteki Playwright. Aby korzystać z Puppeteera w Node.js, wywołaj `launchPuppeteer()`.

**[Instalacja](#instalacja)** · <a href="../../README.md">English</a>

<details>
<summary>Języki</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Kontrola fingerprintu w Chromium

Ombra zarządza odciskiem przeglądarki bezpośrednio w Chromium. Obejmuje to canvas, WebGL, dźwięk, czcionki, liczbę procesorów logicznych, wymiary elementów strony, identyfikatory GPU, strefy czasowe i sygnały automatyzacji. Silnik korzysta ze stosu TLS i HTTP/2 Chromium i obsługuje zdarzenia imitujące działania użytkownika w procesie przeglądarki.

SDK uruchamia silnik lokalnie i łączy z nim klienta automatyzacji przez Chrome DevTools Protocol (CDP). Możesz go używać w skrypcie, kontenerze lub zadaniu CI bez instalowania aplikacji desktopowej Ombra.

## Status

Przykłady korzystają z opublikowanych pakietów alfa dla Pythona i Node.js. W repozytorium znajdują się też wspólny kontrakt uruchomienia i szkielety SDK dla ośmiu języków.

| Komponent | Stan |
|---|---|
| [Kontrakt SDK](../../docs/sdk-contract.md) | Wersja robocza `0.1.0` |
| SDK dla Pythona | `0.1.3` alfa · [`ombrabrowser` w PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK dla Node.js | `0.1.0` alfa · [`@ombralabs/sdk` w npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Wspólne schematy](../../spec/schemas) | Opcje uruchomienia i metadane pliku binarnego silnika |
| [Zgodność między językami](../../conformance) | Wspólne przypadki testowe dla obu SDK |
| [Audyt stealth](../../docs/stealth-checkup.md) | Kryteria testów i szablon raportu |

## Instalacja

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Aby korzystać z Puppeteera, zainstaluj `puppeteer-core` zamiast `playwright-core`. Obsługiwane wersje klientów i środowiska uruchomieniowego znajdziesz na [stronie pakietu w npm](https://www.npmjs.com/package/@ombralabs/sdk).

SDK najpierw sprawdza ścieżkę podaną jako `binary_path` w Pythonie lub `binaryPath` w Node.js. Następnie sprawdza kolejno `OMBRA_BINARY_PATH`, katalog silnika aplikacji desktopowej i pamięć podręczną SDK. Jeśli nie znajdzie silnika, pobiera go i weryfikuje.

Aby wyłączyć pobieranie, przekaż `download=False` w Pythonie lub `download: false` w Node.js. Aby przygotować silnik bez otwierania przeglądarki, wywołaj `ensure_binary()` w Pythonie lub `ensureBinary()` w Node.js.

## Szybki start

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Jeśli korzystasz z profilu o określonej nazwie, otwieraj strony w jego istniejącym kontekście. Dzięki temu możesz ponownie użyć plików cookie i danych zapisanych przez witryny. W tym przykładzie ustawiono też serwer proxy.

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

Aby uzyskać obiekt `Browser` biblioteki Puppeteer, użyj `launchPuppeteer()`.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migracja bez przepisywania

Aby przenieść skrypt w Pythonie korzystający z Playwrighta, zainstaluj `ombrabrowser` i zmień import oraz wywołanie uruchamiające przeglądarkę. Metody stron, typy i selektory nadal pochodzą z Playwrighta.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

W Node.js ta sama zmiana obejmuje dwa wiersze.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Jak to działa

```mermaid
flowchart LR
    Script["Twój skrypt<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + mostek CDP"]
    Engine["Ombra Chromium<br/>silnik z patchem"]
    Client["Natywny klient automatyzacji"]
    Profile[("Profil<br/>seed · cookies · rozszerzenia")]

    Script -->|launch()| SDK
    SDK -->|uruchomienie| Engine
    SDK -->|połączenie przez CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` znajduje silnik lub go pobiera, po czym weryfikuje plik binarny.
2. SDK wybiera katalog profilu i jego ziarno (seed). Jeśli serwer proxy wymaga uwierzytelnienia, SDK uruchamia lokalny przekaźnik.
3. SDK uruchamia Chromium z wybranym profilem, opcjami uruchomienia i portem debugowania na interfejsie pętli zwrotnej.
4. Gdy `DevToolsActivePort` jest gotowy, SDK łączy Playwrighta lub Puppeteera z Chromium przez CDP i zwraca obiekt `Browser` tego klienta.
5. `browser.close()` zatrzymuje silnik i zwalnia blokadę profilu.

Po uruchomieniu klient wysyła polecenia dotyczące stron bezpośrednio do Chromium.

## Macierz SDK

| Środowisko uruchomieniowe | Opublikowany pakiet | Obiekt przeglądarki |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

W repozytorium przygotowano katalogi dla sześciu kolejnych SDK. [Manifest SDK](../../sdks/manifest.json) wymienia planowane pakiety i klientów. [Przewodnik po SDK](../../sdks/README.md) opisuje układ katalogów.

| Docelowe środowisko | Planowany pakiet | Klient lub zwracany typ |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Opcje uruchomienia

Nazwy opcji w tabeli pochodzą z API Pythona i kontraktu SDK. W Node.js obowiązuje zapis camelCase, na przykład `timeoutMs`, `userDataDir` i `binaryPath`.

| Opcja | Domyślnie | Znaczenie |
|---|---|---|
| `headless` | `true` | Uruchamianie silnika bez okna |
| `proxy` | brak | Adres URL proxy lub obiekt konfiguracji. Serwery proxy wymagające uwierzytelnienia korzystają z lokalnego przekaźnika |
| `fingerprint` | brak | Ziarno oraz ustawienia systemu operacyjnego, strefy czasowej, języka i regionu, ekranu i GPU |
| `profile` | brak | Profil z nazwą, który zachowuje pliki cookie, dane witryn i ziarno |
| `user_data_dir` | tymczasowy | Jawnie wskazany katalog profilu, wykluczający użycie `profile` |
| `args` | `[]` | Dodatkowe flagi silnika przekazywane bez zmian |
| `timeout_ms` | `30000` | Limit czasu na uruchomienie i nawiązanie połączenia CDP w milisekundach |
| `humanize` | domyślne w silniku | `false`, `true` lub preset |
| `binary_path` | ustalany | Użycie konkretnego pliku binarnego silnika |
| `download` | `true` | Pobieranie brakującego pliku binarnego silnika |

[Kontrakt SDK](../../docs/sdk-contract.md) zawiera pełną listę opcji uruchomienia oraz opis typów błędów i działania profili.

## Zarządzanie plikiem binarnym

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

Przed uruchomieniem SDK sprawdza sumę kontrolną SHA-256 silnika. W środowisku produkcyjnym pozostaw tę kontrolę włączoną. `OMBRA_SKIP_CHECKSUM=1` służy do pracy z lokalnymi kompilacjami deweloperskimi.

## Konfiguracja

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `OMBRA_BINARY_PATH` | nie ustawiona | Jawnie wskazany plik binarny silnika |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Zarządzane pliki binarne i nazwane profile |
| `OMBRA_DOWNLOAD_URL` | endpoint wydania | Bazowy URL do pobierania plików binarnych |
| `OMBRA_VERSION` | najnowsza zgodna | Wersja silnika, którą ma ustalić SDK |
| `OMBRA_AUTO_UPDATE` | `true` | Sprawdzanie nowszego silnika przy uruchomieniu |
| `OMBRA_SKIP_CHECKSUM` | `false` | Tylko w środowisku deweloperskim |
| `OMBRA_LICENSE_KEY` | nie ustawiona | Przekazywany do silnika |
| `OMBRA_TIMEOUT_MS` | `30000` | Domyślny limit czasu uruchomienia w milisekundach |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

SDK wybiera pierwszą dostępną wartość. Sprawdza kolejno opcje uruchomienia, zmienne środowiskowe, metadane profilu i wartości domyślne.

## Porównanie

| Cecha | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright lub Puppeteer |
| Poziom patchowania | brak | JavaScript na stronie | flagi konfiguracji | kod źródłowy silnika |
| Ziarno odcisku przeglądarki | nie | nie | częściowo | dla każdego profilu |
| Symulacja działań użytkownika | nie | nie | nie | silnik |
| Izolacja profilu | kontekst przeglądarki | kontekst przeglądarki | nie | katalog danych użytkownika |
| Migracja bez przepisywania | — | zmiana importu | przepisanie | zmiana importu |

Wyniki detektora zależą od witryny, wyjściowego adresu IP i profilu. Procedura [audytu stealth](../../docs/stealth-checkup.md) opisuje sposób pomiaru.

## Stealth jest cechą silnika

Silnik stosuje ustawienia odcisku przeglądarki. SDK przekazują mu ziarno profilu i jawnie podane opcje uruchomienia.

| Warstwa | Gdzie Ombra to obsługuje |
|---|---|
| TLS i HTTP/2 | Własny stos sieciowy Chromium, dopasowany wersją do kompilacji silnika |
| Tożsamość przeglądarki | Zmiany w kodzie źródłowym silnika uwzględniają ziarno profilu |
| Powierzchnia automatyzacji | Zmiany w silniku obejmują sygnały WebDrivera. SDK nie wywołuje `Runtime.enable` |
| Wprowadzanie | Symulacja ruchów wskaźnika, użycia klawiatury i przewijania w procesie przeglądarki |
| Spójność sieciowa | Dobór strefy czasowej i ustawień regionalnych z uwzględnieniem proxy |
| Stan | Osobny katalog danych użytkownika dla każdego profilu |

### Granice SDK

- Port debugowania CDP przyjmuje wyłącznie połączenia lokalne przez interfejs pętli zwrotnej.
- SDK nie zapisuje w logach danych uwierzytelniających proxy, kluczy licencyjnych ani plików cookie. Nie wysyła danych telemetrycznych.
- Istniejący profil zachowuje swoje ziarno, chyba że jawnie podasz nowe.
- SDK nie wstrzykuje skryptów stealth za pomocą `addScriptToEvaluateOnNewDocument` ani `evaluateOnNewDocument` i nie zmienia właściwości strony.
- Do sprawdzania gotowości SDK używa punktu końcowego HTTP protokołu CDP lub metody `Browser.getVersion`. Nie wywołuje w tym celu `Runtime.enable`.
- Za tożsamość przeglądarki odpowiada silnik. SDK nie nadpisuje ciągu User-Agent ani innych danych identyfikacyjnych w Playwrighcie lub Puppeteerze. Nie wywołuje `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ani `setDeviceMetricsOverride`.
- SDK nigdy samodzielnie nie dodaje flag `--enable-automation`, `--disable-blink-features=AutomationControlled` ani `--no-sandbox`.

## Audyt stealth

Przeprowadź te kontrole dla kompilacji silnika, klienta automatyzacji i profilu, których zamierzasz używać.

| Warstwa | Przykładowe cele | Kryteria zaliczenia |
|---|---|---|
| L0 Transport | TrackMe, testy wycieku IP/WebRTC | Widoczny jest tylko wyjściowy adres IP. JA4 i HTTP/2 odpowiadają kompilacji Chromium używanej przez silnik |
| L1 Tożsamość | Lokalna sonda, Sannysoft, Intoli | Brak sprzeczności między UA, UA-CH, platformą, GPU, czcionkami a ekranem |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | Brak oznak trybu headless lub fałszowania wartości. Odcisk przeglądarki jest stabilny po przeładowaniu strony |
| L3 Automatyzacja | rebrowser, brotector, botd | Brak wycieków CDP, skryptów inicjalizacyjnych i WebDriver |
| L4 Zachowanie | Wierność wprowadzania, ślady humanizacji, smoke test Cloudflare | Zaufane zdarzenia, realistyczna kolejność, rozwiązanie wyzwania |
| L5 Stabilność | Ziarno, workery, ramki iframe, różne źródła | To samo ziarno daje tę samą tożsamość przy kolejnych uruchomieniach |

Procedura testowa opisuje możliwe statusy, diagnozowanie problemów i przygotowanie raportu. Jest dostępna po [angielsku](../../docs/stealth-checkup.md) i [rosyjsku](../../docs/stealth-checkup.ru.md).

Przy każdym wyniku zapisuj kompilację silnika, wersję klienta, ustawienia profilu, adres wyjściowy proxy i wersję detektora, aby przebiegi można było odtworzyć i porównać.

## Mapa repozytorium

```text
.
├── README.md                  # oryginał angielski
├── translations/
│   └── <locale>/README.md
├── desktop/                   # menedżer profili działający offline
├── docs/
│   ├── desktop/               # dokumentacja menedżera profili
│   ├── architecture.md        # komponenty, przebieg uruchomienia, granice
│   ├── sdk-contract.md        # kontrakt uruchomienia v0 i zachowanie SDK
│   ├── stealth-checkup.md     # metodyka walidacji stealth i runbook
│   ├── stealth-checkup.ru.md  # tłumaczenie rosyjskie
│   └── versioning.md          # zgodność SDK, silnika i klienta
├── spec/
│   └── schemas/               # JSON Schema dla opcji uruchomienia i informacji o pliku binarnym
├── sdks/
│   ├── manifest.json          # rejestr SDK czytelny maszynowo
│   ├── README.md              # układ i zasady współtworzenia
│   ├── _template/             # szkielet SDK dla nowego języka
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # niezależne od języka przypadki uruchomienia i stealth
├── tools/check_repo.py        # walidacja struktury i linków (CI)
└── .github/workflows/ci.yml
```

Repozytorium zawiera szkielety SDK, kontrakt uruchomienia, testy zgodności i menedżer profili działający offline. Silnik Chromium i pełne wydanie Desktop 1.2.1 mają osobne repozytoria. [Kod źródłowy Desktop i instrukcja kompilacji](../../desktop/README.md) · [Dokumentacja menedżera profili](../../docs/desktop/README.md)

## Kontrakt

- `launch(options)` uruchamia silnik i zwraca obiekt `Browser` klienta. Od tej chwili klient komunikuje się bezpośrednio z Chromium przez CDP.
- Przed uruchomieniem SDK sprawdza platformę i sumę kontrolną SHA-256 silnika. Gdy brakuje pliku binarnego, SDK pobiera go, jeśli pobieranie jest włączone.
- Profile o określonej nazwie zachowują pliki cookie, dane witryn i ziarno profilu między uruchomieniami.
- Jeśli uruchomienie się nie powiedzie, SDK kończy uruchomiony przez siebie proces i zgłasza błąd określonego typu. Kod wywołujący decyduje o ponowieniu próby.
- SDK, silnik i klient automatyzacji mają osobne zakresy wersji. Wersję kompilacji silnika sprawdzisz za pomocą `binary_info()` w Pythonie lub `binaryInfo()` w Node.js.

## Kompatybilność

| Komponent | Obsługiwana platforma lub wersja |
|---|---|
| Silnik | Kompilacja wybrana przez SDK, wskazywana przez `binary_info()` lub `binaryInfo()` |
| macOS | Apple Silicon i Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ z obsługiwaną wersją Playwrighta |
| Node.js | 20+ z obsługiwaną wersją Playwrighta lub Puppeteera |

SDK i silnik są wersjonowane niezależnie. Jeśli ich wersje są niezgodne, SDK zgłasza błąd określonego typu z numerami obu wersji.

## Współtworzenie

[Przewodnik dla współtwórców](../../CONTRIBUTING.md) opisuje proces przeglądu zmian. Instrukcje kompilacji znajdziesz w [przewodniku po SDK](../../sdks/README.md).

- Gdy zmieniasz działanie SDK, zaktualizuj odpowiednią implementację i dodaj test lub wspólny przypadek testowy sprawdzający zgodność.
- Aby dodać obsługę kolejnego języka, skopiuj [szablon SDK](../../sdks/_template), dodaj wpis w [manifeście](../../sdks/manifest.json) i otwórz roboczy pull request.
- Przy dodawaniu opcji uruchomienia najpierw zaktualizuj [kontrakt SDK](../../docs/sdk-contract.md) i [schematy](../../spec/schemas).
- Zmiany w mechanizmach stealth silnika wprowadzaj w repozytorium silnika. SDK musi nadal przechodzić audyt.
- Problemy z bezpieczeństwem zgłaszaj poufnie zgodnie z [polityką bezpieczeństwa](../../SECURITY.md).

## FAQ

### Czy Ombra to fork Playwrighta?

Nie. SDK łączy oficjalnego klienta Playwrighta z Ombra Chromium. Nadal możesz korzystać z typów, funkcji pomocniczych i obiektów stron Playwrighta.

### Czy potrzebuję aplikacji desktopowej Ombra?

SDK uruchamia silnik bezpośrednio. Opcjonalna aplikacja desktopowa pozwala ręcznie zarządzać profilami.

### Czym Ombra różni się od playwright-stealth?

Zmiany wpływające na odcisk przeglądarki są wbudowane w Chromium podczas kompilacji. SDK nie modyfikuje skryptów stron.

### Czy mogę użyć własnego serwera proxy?

Tak. Przekaż go do `launch()`. Jeśli proxy wymaga uwierzytelnienia, lokalny przekaźnik pozwala uniknąć umieszczania danych logowania w wierszu poleceń silnika.

### Które wersje Playwrighta i Puppeteera są obsługiwane?

Każdy SDK podaje obsługiwane wersje klientów w manifeście swojego pakietu. Klienty są oddzielnymi zależnościami. Zakresy wersji znajdziesz w [przewodniku po wersjonowaniu](../../docs/versioning.md).

### Czy Ombra przejdzie każdą kontrolę antybotową?

Wyniki zależą od witryny, regionu, reputacji wyjściowego adresu IP, wersji detektora i ustawień profilu. [Audyt stealth](../../docs/stealth-checkup.md) opisuje, jak ocenić konkretną konfigurację.

## Licencja

Źródła SDK w tym repozytorium są objęte licencją [Apache License 2.0](../../LICENSE). Licencja nie przyznaje praw do silnika Ombra, nazwy Ombra ani logo. Informacje o znakach towarowych i atrybucjach stron trzecich znajdziesz w [NOTICE](../../NOTICE).

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
