# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

In Python und Node.js startet `launch()` Ombra Chromium und gibt ein Playwright-Objekt vom Typ `Browser` zurück. Für Puppeteer in Node.js verwenden Sie `launchPuppeteer()`.

**[Installation](#installation)** · <a href="README.md">English</a>

<details>
<summary>Sprachen</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## Fingerprint-Steuerung in Chromium

Ombra steuert den Browser-Fingerprint direkt in Chromium. Das betrifft Canvas, WebGL, Audio, Schriftarten, die Zahl der logischen Prozessoren, die Abmessungen von Seitenelementen, GPU-Kennungen, Zeitzonen und Automatisierungssignale. Die Engine nutzt den TLS- und HTTP/2-Stack von Chromium und verarbeitet menschenähnliche Eingaben im Browserprozess.

Das SDK startet die Engine lokal und verbindet den Automatisierungsclient über das Chrome DevTools Protocol (CDP). Sie können es in einem Skript, einem Container oder einem CI-Job auch ohne die Ombra-Desktop-App ausführen.

## Status

Die Beispiele verwenden die veröffentlichten Alpha-Pakete für Python und Node.js. Dieses Repository enthält außerdem den gemeinsamen Startvertrag und Grundgerüste für acht SDKs.

| Komponente | Status |
|---|---|
| [SDK-Vertrag](docs/sdk-contract.md) | Entwurf `0.1.0` |
| Python-SDK | `0.1.3` Alpha · [`ombrabrowser` auf PyPI](https://pypi.org/project/ombrabrowser/) |
| Node.js-SDK | `0.1.0` Alpha · [`@ombralabs/sdk` auf npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Gemeinsame Schemas](spec/schemas) | Startoptionen und Metadaten der Engine-Binärdatei |
| [Sprachübergreifende Konformitätstests](conformance) | Gemeinsame Testfälle für beide SDKs |
| [Stealth-Checkup](docs/stealth-checkup.md) | Prüfkriterien und Berichtsvorlage |

## Installation

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Für Puppeteer installieren Sie `puppeteer-core` anstelle von `playwright-core`. Die unterstützten Client- und Laufzeitversionen finden Sie auf der [Paketseite bei npm](https://www.npmjs.com/package/@ombralabs/sdk).

Das SDK prüft zuerst den Pfad, den Sie in Python als `binary_path` oder in Node.js als `binaryPath` angeben. Danach prüft es der Reihe nach den Pfad aus `OMBRA_BINARY_PATH`, das Engine-Verzeichnis der Desktop-App und den SDK-Cache. Findet es keine Engine, lädt es eine herunter und prüft sie.

Mit `download=False` in Python oder `download: false` in Node.js deaktivieren Sie Downloads. Um die Engine ohne Browserstart vorzubereiten, rufen Sie in Python `ensure_binary()` oder in Node.js `ensureBinary()` auf.

## Schnellstart

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Öffnen Sie bei einem benannten Profil neue Seiten im vorhandenen Browserkontext, um Cookies und gespeicherte Websitedaten wiederzuverwenden. Das Beispiel richtet außerdem einen Proxy ein.

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

Mit `launchPuppeteer()` erhalten Sie ein `Browser`-Objekt von Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migration ohne Umschreiben

Installieren Sie für die Migration eines Python-Skripts von Playwright das Paket `ombrabrowser` und ändern Sie den Import und den Startaufruf. Seitenmethoden, Typen und Selektoren kommen weiterhin von Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

In Node.js ändern sich dafür zwei Zeilen.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Funktionsweise

```mermaid
flowchart LR
    Script["Ihr Skript<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP-Bridge"]
    Engine["Ombra Chromium<br/>gepatchte Engine"]
    Client["Nativer Automatisierungs-Client"]
    Profile[("Profil<br/>Seed · Cookies · Erweiterungen")]

    Script -->|launch()| SDK
    SDK -->|starten| Engine
    SDK -->|Verbindung über CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` sucht die Engine oder lädt sie herunter und prüft die Binärdatei.
2. Das SDK wählt das Profilverzeichnis und den Seed. Erfordert der Proxy eine Authentifizierung, startet das SDK einen lokalen Relay-Dienst.
3. Es startet Chromium mit dem gewählten Profil, den Startoptionen und einem Debugging-Port auf der Loopback-Schnittstelle.
4. Sobald `DevToolsActivePort` bereitsteht, verbindet das SDK Playwright oder Puppeteer über CDP und gibt das `Browser`-Objekt dieses Clients zurück.
5. `browser.close()` beendet die Engine und gibt die Profilsperre frei.

Nach dem Start sendet der Client seine Seitenbefehle direkt an Chromium.

## SDK-Matrix

| Laufzeit | Veröffentlichtes Paket | Browserobjekt |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Für sechs weitere SDKs gibt es bereits Verzeichnisse in diesem Repository. Das [SDK-Manifest](sdks/manifest.json) führt die geplanten Pakete und Clients auf. Der [SDK-Leitfaden](sdks/README.md) beschreibt die Verzeichnisstruktur.

| Ziellaufzeit | Geplantes Paket | Client oder Rückgabetyp |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Startoptionen

Die Optionsnamen folgen der Python-API und dem SDK-Vertrag. Node.js verwendet camelCase, zum Beispiel `timeoutMs`, `userDataDir` und `binaryPath`.

| Option | Standard | Bedeutung |
|---|---|---|
| `headless` | `true` | Engine ohne Fenster ausführen |
| `proxy` | keine | Proxy-URL oder Konfigurationsobjekt. Proxys mit Authentifizierung nutzen einen lokalen Relay-Dienst |
| `fingerprint` | keine | Seed und Einstellungen für Betriebssystem, Zeitzone, Sprache und Region, Bildschirm und GPU |
| `profile` | keine | Benanntes Profil, das Cookies, Websitedaten und Seed speichert |
| `user_data_dir` | temporär | Explizites Profilverzeichnis, nicht mit `profile` kombinierbar |
| `args` | `[]` | Zusätzliche Engine-Flags, unverändert durchgereicht |
| `timeout_ms` | `30000` | Zeitlimit in Millisekunden für den Start und den Aufbau der CDP-Verbindung |
| `humanize` | Standard der Engine | `false`, `true` oder ein Preset |
| `captcha` | `false` | Engine-Modul mit optionalen Limits aktivieren |
| `binary_path` | aufgelöst | Eine bestimmte Engine-Binärdatei verwenden |
| `download` | `true` | Fehlende Engine-Binärdatei herunterladen |

Der [SDK-Vertrag](docs/sdk-contract.md) führt alle Startoptionen auf und beschreibt die Fehlertypen und das Verhalten der Profile.

## Verwaltung der Binärdatei

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

Das SDK prüft die SHA-256-Prüfsumme der Engine vor dem Start. Lassen Sie diese Prüfung im Produktivbetrieb aktiviert. `OMBRA_SKIP_CHECKSUM=1` ist für lokale Entwicklungs-Builds vorgesehen.

## Konfiguration

| Variable | Standard | Bedeutung |
|---|---|---|
| `OMBRA_BINARY_PATH` | nicht gesetzt | Explizite Engine-Binärdatei |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Verwaltete Binärdateien und benannte Profile |
| `OMBRA_DOWNLOAD_URL` | Release-Endpunkt | Basis-URL für Binärdatei-Downloads |
| `OMBRA_VERSION` | neueste kompatible Version | Aufzulösende Engine-Version |
| `OMBRA_AUTO_UPDATE` | `true` | Beim Start auf eine neuere Engine prüfen |
| `OMBRA_SKIP_CHECKSUM` | `false` | Nur für die Entwicklung |
| `OMBRA_LICENSE_KEY` | nicht gesetzt | Wird an die Engine übergeben |
| `OMBRA_TIMEOUT_MS` | `30000` | Standardzeitlimit für den Start in Millisekunden |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Das SDK verwendet den ersten verfügbaren Wert. Es prüft der Reihe nach die Startoptionen, die Umgebungsvariablen, die Profilmetadaten und die Standardwerte.

## Vergleich

| Merkmal | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright oder Puppeteer |
| Patch-Ebene | keine | JavaScript auf der Seite | Konfigurations-Flags | Engine-Quellcode |
| Fingerprint-Seed | nein | nein | teilweise | pro Profil |
| Menschenähnliche Eingaben | nein | nein | nein | Engine |
| Profil-Isolation | Browser-Kontext | Browser-Kontext | nein | Benutzerdatenverzeichnis |
| Migration ohne Umschreiben | — | Importänderung | Neuschreiben | Importänderung |

Die Ergebnisse eines Detektors hängen von der Website, der Ausgangs-IP und dem Profil ab. Der [Checkup](docs/stealth-checkup.md) beschreibt das Messverfahren.

## Stealth ist eine Eigenschaft der Engine

Die Engine wendet die Fingerprint-Einstellungen an. Die SDKs übergeben ihr den Seed des Profils und explizite Startoptionen.

| Ebene | Wo Ombra ansetzt |
|---|---|
| TLS und HTTP/2 | Der eigene Netzwerk-Stack von Chromium, abgestimmt auf die Version des Engine-Builds |
| Browser-Identität | Engine-Patches auf Quellcode-Ebene, gesteuert durch den Seed des Profils |
| Automatisierungsoberfläche | Engine-Patches berücksichtigen WebDriver-Signale. Das SDK ruft `Runtime.enable` nicht auf |
| Eingabe | Menschenähnliche Maus-, Tastatur- und Scroll-Eingaben im Browserprozess |
| Netzwerk-Kohärenz | Zeitzone und Locale werden unter Berücksichtigung des Proxys aufgelöst |
| Zustand | Ein separates Benutzerdatenverzeichnis pro Profil |

### SDK-Grenzen

- Der CDP-Debugging-Port nimmt nur lokale Verbindungen über die Loopback-Schnittstelle an.
- Das SDK schreibt keine Proxy-Zugangsdaten, Lizenzschlüssel oder Cookies in die Protokolle. Es sendet keine Telemetriedaten.
- Ein bestehendes Profil behält seinen Seed, bis Sie ausdrücklich einen neuen angeben.
- Das SDK fügt weder mit `addScriptToEvaluateOnNewDocument` noch mit `evaluateOnNewDocument` Stealth-Skripte ein. Es verändert keine Seiteneigenschaften.
- Das SDK prüft die Bereitschaft über den HTTP-Endpunkt von CDP oder mit `Browser.getVersion`. Dafür ruft es `Runtime.enable` nicht auf.
- Die Engine legt die Browseridentität fest. Das SDK überschreibt weder den User-Agent noch andere Identitätsmerkmale über Playwright oder Puppeteer. Es verwendet dazu weder `Emulation.setUserAgentOverride` noch `setTimezoneOverride`, `setLocaleOverride` oder `setDeviceMetricsOverride`.
- Das SDK fügt `--enable-automation`, `--disable-blink-features=AutomationControlled` oder `--no-sandbox` nie von sich aus hinzu.

## Stealth-Checkup

Führen Sie diese Prüfungen mit dem Engine-Build, dem Automatisierungs-Client und dem Profil durch, die Sie verwenden wollen.

| Ebene | Beispielziele | Prüfkriterien |
|---|---|---|
| L0 Transport | TrackMe, Prüfungen auf IP-/WebRTC-Leaks | Nur die Ausgangs-IP ist sichtbar. JA4 und HTTP/2 entsprechen dem Chromium-Build der Engine |
| L1 Identität | Lokale Probe, Sannysoft, Intoli | Keine Widersprüche zwischen UA, UA-CH, Plattform, GPU, Schriften und Bildschirm |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | Keine Hinweise auf Headless-Betrieb oder vorgetäuschte Werte. Der Fingerprint bleibt beim Neuladen stabil |
| L3 Automatisierung | rebrowser, brotector, botd | Keine CDP-, Init-Script- oder WebDriver-Leaks |
| L4 Verhalten | Eingabetreue, Humanize-Spuren, Cloudflare-Smoke-Test | Vertrauenswürdige Events, realistische Reihenfolge, Challenge wird gelöst |
| L5 Stabilität | Seed, Worker, Iframes, Cross-Origin | Derselbe Seed erzeugt bei jedem Start dieselbe Persona |

Die Prüfanleitung erklärt die Ergebnisbewertung, die Fehlersuche und das Erstellen des Berichts. Sie ist auf [Englisch](docs/stealth-checkup.md) und [Russisch](docs/stealth-checkup.ru.md) verfügbar.

Halten Sie zu jedem Ergebnis den Engine-Build, die Clientversion, die Profileinstellungen, die Ausgangsadresse des Proxys und die Detektorversion fest, damit sich Läufe reproduzieren und vergleichen lassen.

## Repository-Übersicht

```text
.
├── README.md                  # englische Originalversion
├── README.ru.md               # russische Übersetzung
├── desktop/                   # Offline-Profilverwaltung
├── docs/
│   ├── desktop/               # Dokumentation zur Profilverwaltung
│   ├── architecture.md        # Komponenten, Startablauf, Grenzen
│   ├── sdk-contract.md        # Startvertrag v0 und SDK-Verhalten
│   ├── stealth-checkup.md     # Stealth-Validierungsmethode und Runbook
│   ├── stealth-checkup.ru.md  # russische Übersetzung
│   └── versioning.md          # Kompatibilität von SDK, Engine und Client
├── spec/
│   └── schemas/               # JSON Schema für Startoptionen und Binärdatei-Informationen
├── sdks/
│   ├── manifest.json          # maschinenlesbares SDK-Register
│   ├── README.md              # Aufbau und Regeln für Beiträge
│   ├── _template/             # Vorlage für weitere Sprachen
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # sprachneutrale Start- und Stealth-Fälle
├── tools/check_repo.py        # Prüfung von Struktur und Links (CI)
└── .github/workflows/ci.yml
```

Dieses Repository enthält die SDK-Grundgerüste, den Startvertrag, die Konformitätstests und die Offline-Profilverwaltung. Die Chromium-Engine und die vollständige Desktop-Version 1.2.1 liegen in eigenen Repositories. [Desktop-Quellcode und Build-Anleitung](desktop/README.md) · [Dokumentation zur Profilverwaltung](docs/desktop/README.md)

## Der Vertrag

- `launch(options)` startet die Engine und gibt das `Browser`-Objekt des Clients zurück. Der Client kommuniziert anschließend direkt über CDP mit Chromium.
- Vor dem Start prüft das SDK die Zielplattform und die SHA-256-Prüfsumme der Engine. Fehlt die Binärdatei, lädt das SDK sie bei aktivierten Downloads herunter.
- Benannte Profile bewahren Cookies, gespeicherte Websitedaten und ihren Seed über mehrere Starts hinweg.
- Schlägt der Start fehl, beendet das SDK den von ihm gestarteten Prozess und meldet einen typisierten Fehler. Über einen erneuten Versuch entscheidet der Aufrufer.
- SDK, Engine und Automatisierungsclient haben jeweils eigene Versionsbereiche. Den Engine-Build ermitteln Sie mit `binary_info()` in Python oder `binaryInfo()` in Node.js.

## Kompatibilität

| Komponente | Unterstützte Plattform oder Version |
|---|---|
| Engine | Vom SDK gewählter Build, abrufbar mit `binary_info()` oder `binaryInfo()` |
| macOS | Apple Silicon und Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ mit einer unterstützten Playwright-Version |
| Node.js | 20+ mit einer unterstützten Playwright- oder Puppeteer-Version |

SDK und Engine werden unabhängig voneinander versioniert. Sind ihre Versionen inkompatibel, meldet das SDK einen typisierten Fehler mit beiden Versionsangaben.

## Mitwirken

Der [Leitfaden für Beiträge](CONTRIBUTING.md) beschreibt den Review-Prozess. Build-Anleitungen finden Sie im [SDK-Leitfaden](sdks/README.md).

- Wenn Sie das Verhalten eines SDKs ändern, passen Sie die betroffene Implementierung an und ergänzen Sie einen Test oder einen gemeinsamen Konformitätsfall.
- Verwenden Sie für eine weitere Sprache die [SDK-Vorlage](sdks/_template), ergänzen Sie das [Manifest](sdks/manifest.json) und öffnen Sie einen Pull Request als Entwurf.
- Aktualisieren Sie bei einer neuen Startoption zuerst den [SDK-Vertrag](docs/sdk-contract.md) und die [Schemas](spec/schemas).
- Änderungen an den Stealth-Funktionen der Engine gehören ins Engine-Repository. Das SDK muss den Checkup weiterhin bestehen.
- Melden Sie Sicherheitsprobleme vertraulich über den in der [Sicherheitsrichtlinie](SECURITY.md) beschriebenen Weg.

## FAQ

### Ist Ombra ein Fork von Playwright?

Nein. Das SDK verbindet den offiziellen Playwright-Client mit Ombra Chromium. Sie können die Typen, Hilfsfunktionen und Page Objects von Playwright weiterverwenden.

### Brauche ich die Ombra-Desktop-App?

Das SDK startet die Engine direkt. Mit der optionalen Desktop-App können Sie Profile von Hand verwalten.

### Wie unterscheidet sich Ombra von playwright-stealth?

Die Fingerprint-Anpassungen von Ombra sind in Chromium einkompiliert. Das SDK verändert die Skripte der Seite nicht.

### Löst Ombra CAPTCHAs?

Die Engine enthält ein optionales CAPTCHA-Modul. Welche Aufgaben es unterstützt, hängt vom Aufgabentyp, vom Engine-Build und von den verfügbaren Modellen ab. Das SDK übergibt die Einstellungen für den jeweiligen Start und stellt die CDP-Befehle des Moduls bereit.

### Kann ich meinen eigenen Proxy verwenden?

Ja. Übergeben Sie ihn an `launch()`. Bei Proxys mit Authentifizierung sorgt ein lokaler Relay-Dienst dafür, dass die Zugangsdaten nicht in der Befehlszeile der Engine erscheinen.

### Welche Playwright- und Puppeteer-Versionen werden unterstützt?

Jedes SDK gibt die unterstützten Clientversionen in seinem Paketmanifest an. Die Clients sind separate Abhängigkeiten. Die unterstützten Versionsbereiche finden Sie im [Leitfaden zur Versionierung](docs/versioning.md).

### Besteht Ombra jede Bot-Prüfung?

Die Ergebnisse hängen von der Website, der Region, der Reputation der Ausgangs-IP, der Detektorversion und den Profileinstellungen ab. Der [Stealth-Checkup](docs/stealth-checkup.md) beschreibt, wie Sie eine bestimmte Konfiguration prüfen.

## Lizenz

Die SDK-Quellen in diesem Repository stehen unter der [Apache License 2.0](LICENSE). Die Lizenz gewährt keine Rechte an der Ombra-Engine, am Namen Ombra oder am Logo. Hinweise zu Marken und zur Nennung Dritter finden Sie in [NOTICE](NOTICE).

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
