<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Lizenz"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Letzter Commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Sterne"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI-Downloads"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm-Downloads"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Release"></a>
</p>

<p align="center">
<a href="#installation"><strong>Installation</strong></a> ·
<a href="#python-api">Python-API</a> ·
<a href="#nodejs-api-und-typescript-api">Node.js-API</a> ·
<a href="#menschliche-eingabesimulation">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Sprachen</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium mit Fingerprint-Steuerung auf C++-Quellcode-Ebene und nativer menschlicher Eingabesimulation.</h3>

<table><tr><td>
Keine Sammlung von Start-Flags und keine JavaScript-Injektion oberhalb der Seite. Eine echte Chromium-Binärdatei mit direkt in den C++-Quellcode einkompilierten Fingerprint-Patches und einer Eingabesimulation, die im Browserprozess selbst läuft. Verbinden Sie das offizielle Playwright oder Puppeteer über lokales CDP — ohne Wrapper-Objekte und ohne Ihren Seitencode umzuschreiben.
</td></tr></table>

<br>

<p align="center">
Drop-in-Ersatz für den Browser-Start mit Playwright und Puppeteer in Python und Node.js.<br>
Dieselbe API, dieselben Selektoren und Typen — tauschen Sie einfach den Import und den <code>launch()</code>-Aufruf aus.
</p>

- **Chromium-Patches auf Quellcode-Ebene** — Canvas, WebGL, WebGPU, Audio, Schriftarten, GPU, Bildschirm, CSS-Media-Queries, Hardware-Angaben, WebRTC ohne STUN-Lecks, TLS ClientHello, Zeitzone, Locale sowie Entfernung von Automatisierungssignalen (`navigator.webdriver`, `Runtime.enable`, Headless-Marker).
- **Native menschliche Eingabesimulation im Browserprozess (`humanize=True`)** — Zeigerbahnen (`cursory-rs`), gezielte Klicks mit Haltedauer, Tipprhythmus mit Tippfehler-Selbstkorrektur und Scroll-Physik laufen direkt in Chromium. Das SDK liefert ein reguläres natives `Browser`-Objekt ohne Proxy-Wrapper zurück.
- **Autonomer Betrieb ohne Schlüssel oder Konten** — aktuelle Engine-Builds sowie Ombra Desktop laufen lokal ohne Registrierung, Lizenzschlüssel, Hardware-IDs oder Lizenzserver.
- **Automatische Installation und kryptografische Binärprüfung** — `pip install ombrabrowser` oder `npm install @ombralabs/sdk`; beim ersten Start lädt das SDK einen kompatiblen Build von [GitHub Releases](https://github.com/ombralabs/ombra/releases) herunter und prüft dessen Ed25519-Signatur sowie die SHA-256-Prüfsumme.
- **Persistente Profile und sicheres Proxy-Relay** — benannte Profile speichern Cookies, `localStorage`, IndexedDB und `seed` sitzungsübergreifend mit prozessübergreifender Sperrung; authentifizierte Proxys (HTTP, HTTPS, SOCKS5) laufen über ein lokales Loopback-Relay, sodass Zugangsdaten niemals in Prozessargumenten erscheinen.
- **Offline-Profilmanager Ombra Desktop** — eine native Desktop-Anwendung direkt in diesem Repository ([`desktop/`](../../desktop/README.md)) mit vorgefertigten Installationsprogrammen für macOS, Linux und Windows.

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

Puppeteer wird ebenfalls über `import { launch } from "@ombralabs/sdk/puppeteer"` oder `launchPuppeteer()` unterstützt ([Details](#puppeteer)).

**Für Websites mit Anti-Bot-Schutz** kombinieren Sie einen Residential-Proxy, ein persistentes Profil und stimmige Umgebungseinstellungen:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # Residential-IP ist gegenüber Rechenzentrums-IP vorzuziehen
    fingerprint={"timezone": "auto", "locale": "auto"},  # Zeitzone und Locale an den Proxy-Exit anpassen
    headless=False,                                      # manche Websites erkennen Unterschiede im Headless-Modus
    humanize=True,                                       # native Maus-, Tastatur- und Scroll-Simulation
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

Siehe [Fehlerbehebung](#fehlerbehebung) für häufige Probleme unter Linux, in Containern und auf geschützten Zielseiten.

## Installation

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Optional: Zeitzone und Locale automatisch anhand des Proxy-Exits erkennen (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Mit Playwright (1.60.0+, kein Download des Standard-Chromium erforderlich)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Oder mit Puppeteer (Puppeteer 25+ erfordert Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Optional: Offline-GeoIP-Datenbankleser für timezone: "auto" und locale: "auto"
npm install mmdb-lib
```

---

Beim Start ermittelt das SDK die Engine in fester Reihenfolge: `binary_path` (`binaryPath` in Node.js), `OMBRA_BINARY_PATH`, das Engine-Verzeichnis von Ombra Desktop und der SDK-Cache (`~/.ombra/engines`). Wird keine kompatible Engine gefunden, lädt das SDK einen Build von [GitHub Releases](https://github.com/ombralabs/ombra/releases) herunter, prüft Ed25519-Signatur und SHA-256-Prüfsumme und speichert ihn lokal im Cache. Der Aufruf von `playwright install chromium` ist nicht erforderlich.

Um automatische Downloads zu deaktivieren, übergeben Sie `download=False` (`download: false` in Node.js). Um die Engine im Voraus herunterzuladen und zu verifizieren (beispielsweise während eines Container-Builds), rufen Sie `ensure_binary()` (`ensureBinary()`) auf oder verwenden Sie den CLI-Befehl `install`.

> **Autonomer Start:** Aktuelle Engine-Builds sind kostenlos und benötigen weder Konto noch Lizenzschlüssel. `OMBRA_LICENSE_KEY` und der Befehl `login` bleiben ausschließlich aus Kompatibilitätsgründen für ältere lizenzierte Builds verfügbar.

**Die Migration von Playwright** erfordert nur zwei Zeilen — alle Seitenoperationen, Lokatoren und Wartezeiten bleiben unverändert:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # der Rest Ihres Codes funktioniert unverändert
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Geben Sie dem Repository einen Stern**, wenn Sie es hilfreich finden, und aktivieren Sie **[Watch releases](https://github.com/ombralabs/ombra/subscription)**, um über neue Engine-, SDK- und Ombra-Desktop-Builds benachrichtigt zu werden.

---

## Aktueller Status und Releases

Jede Komponente im Ökosystem folgt dem gemeinsamen Startvertrag und wird unabhängig versioniert.

| Komponente | Status / Version | Speicherort |
|---|---|---|
| **SDK-Vertrag** | Entwurf `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python-SDK** | Alpha `0.1.3` | [`ombrabrowser` auf PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js-/TypeScript-SDK** | Alpha `0.1.0` | [`@ombralabs/sdk` auf npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium Engine** | SDK-Bereich `>=151.0.7922.108,<159` | Automatischer Download durch das SDK von [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Offline-Profilmanager | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Standalone-Browser** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Schemas und Konformität** | JSON Schema + gemeinsame Testfälle | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Stealth-Checkup-Methode** | 6 Ebenen (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Die vollständige Release-Historie finden Sie in [CHANGELOG.md](../../CHANGELOG.md).

## Warum Ombra

- **Konfigurations- und JS-Patches brechen leicht.** Werkzeuge wie `playwright-stealth`, `puppeteer-extra` und `undetected-chromedriver` injizieren JavaScript in Webseiten oder verändern Start-Flags. Chrome-Updates machen sie regelmäßig unbrauchbar, und moderne Detektoren erkennen die Patches selbst (`Function.prototype.toString`, Prototyp-Anomalien, `addScriptToEvaluateOnNewDocument`).
- **Änderungen sind direkt in den Chromium-Quellcode einkompiliert.** Fingerprints werden auf C++-Ebene erzeugt und konsistent über Hauptframe, Worker und Iframes angewendet. Das SDK injiziert keine Skripte in Seiten und nimmt keine `Emulation.*`-Überschreibungen vor.
- **Die Eingabesimulation läuft im Browserprozess, nicht oberhalb von Playwright.** Da Mausbahnen, Tastatureingaben und Scrollen direkt in Chromium verarbeitet werden, kapselt das SDK keine Playwright- oder Puppeteer-Objekte — jeder Lokator, jedes Frame und jede Drittanbieterbibliothek funktioniert normal weiter.
- **Lokale Architektur ohne zusätzliche Dienste.** Kein Hintergrund-Daemon für die Steuerungsebene und kein Netzwerk-Hop zwischen Skript und Browser: ein Engine-Prozess, lokales Loopback-CDP auf `127.0.0.1` und keine Begrenzung von Profilanzahl oder Parallelität.

## Ombra Desktop

**Ein lokaler Offline-Profilmanager mit grafischer Oberfläche.** Sein Quellcode liegt direkt in diesem Repository ([`desktop/`](../../desktop/README.md)) und basiert auf Tauri (Rust + Vue).

- **Vollständig offline und lokal** — der Profilkatalog liegt in einer lokalen SQLite-Datenbank auf Ihrem Rechner mit lokalem Verschlüsselungsschlüssel; kein Konto, kein Cloud-Dienst und kein Netzwerkzugriff erforderlich.
- **Strukturierte Profilverwaltung** — legen Sie Profile an, suchen Sie nach Name, Notiz oder Nummer, bearbeiten Sie Beschreibungen und organisieren Sie Einträge im Rust-Katalog mit Gruppen, Tags, Labels und Lesezeichen.
- **Sicherer Papierkorb** — beim Verschieben eines Profils in den Papierkorb bleiben dessen Dateien auf der Festplatte erhalten, sodass Sie es später wiederherstellen können.
- **Keine Profil-Limits** — keine Preisstufen pro Profil und keine Cloud-Kontingente: alle Daten bleiben bei Ihnen.
- **Vorgefertigte Installationsprogramme** — macOS Apple Silicon (`.dmg`, mit Apple Developer ID signiert und notarisiert), Linux (`.deb` und `.rpm`) sowie Windows x64 (`setup.exe`).
- **Isolierte Kataloge** — setzen Sie `OMBRA_DESKTOP_DATA_DIR`, um mit einem separaten Testkatalog oder einer Sicherungskopie zu arbeiten.

[Neuestes Release herunterladen →](https://github.com/ombralabs/ombra/releases) · [Desktop-README](../../desktop/README.md) · [Leitfaden zu Profilen und lokalen Schlüsseln](../../docs/desktop/README.md)

## Fingerprint-Verifizierung und Stealth-Checkup

Statt pauschaler „100 % unauffindbar“-Versprechen setzt Ombra auf ein reproduzierbares Prüfverfahren unter dokumentierten Bedingungen. Reale Ergebnisse auf einer Website hängen stets von der Reputation der Exit-IP, der Region, der Profilhistorie, der Detektorversion und der Startkonfiguration ab.

### Von Engine und SDK abgedeckte Oberflächen

| Oberfläche / Signal | Standard-Playwright | Ombra | Umsetzung |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++-Engine-Patch |
| `window.chrome` | fehlt im Headless-Modus | vollständiges Objekt | Entspricht regulärem Chrome |
| `navigator.plugins` | `0` im Headless-Modus | kohärenter Plugin-Satz | Auf Engine-Ebene |
| User-Agent und Client Hints | `HeadlessChrome`, Markenabweichung | `Google Chrome` + abgestimmte `Sec-CH-UA*` | Patch `010-user-agent-and-webdriver` |
| CDP-Artefakte (`Runtime.enable`, `UtilityScript`) | von Detektoren markiert | durch die Engine unterdrückt; SDK ruft niemals `Runtime.enable` auf | Patch `110-runtime-enable` + Invariante `SI-01` |
| WebRTC-IP-Leck | legt lokale/Host-IP offen | meldet Exit-IP, ohne echtes STUN zu senden | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS und HTTP/2 | abhängig von der Konfiguration | Chromium-Netzwerkstack + `chrome-<major>` ClientHello-Profil | Patch `210-tls-network-persona` |
| WebGL und WebGPU | Software-Renderer / GPU-Abweichung | einheitliche WebGL-/WebGPU-Limits und Erweiterungstabellen | Patches `070`, `071`, `075`, `955` |
| Schriftarten, Locale und Zeitzone | Host-Werte, `Intl`-Abweichung | kohärente Schriftarttabellen, ICU-Locale und Zeitzone | Patches `040`, `090`, `092`, `230` |
| Eingabesimulation | Cursor-Teleport, sofortiges `fill()` | `cursory-rs`-Kurven, Tipprhythmus, Scroll-Physik | Patch `135-ombra-humanize` im Browserprozess |
| Fingerprint-Stabilität | ändert sich oder leakt Host-Daten | deterministisch pro `seed` über Neustarts und Frames hinweg | Patches `001`, `002` + persistentes Profil |

### Sechs Ebenen des Checkups

Führen Sie vor einem Release oder Produktiv-Deployment alle sechs Checkup-Ebenen mit genau dem Engine-Build, Automatisierungsclient und Proxy aus, die Sie einsetzen möchten:

| Ebene | Beispielziele | Bestehenskriterien |
|---|---|---|
| **L0 Transport** | TrackMe, IP-/WebRTC-Leck-Testseiten, Header-Echo | Nur die Proxy-Exit-IP ist sichtbar; JA4 und HTTP/2 passen zum Chromium-Build; keine Proxy-Zugangsdaten in argv |
| **L1 Identität** | Lokaler Probe-Test, Sannysoft, Intoli, UA-CH-Prüfung | Keine Widersprüche zwischen UA, Client Hints, Plattform, GPU, Schriftarten, Bildschirm und Locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Keine Headless- oder `lie`-Marker; Fingerprint bleibt über Neuladen hinweg stabil |
| **L3 Automatisierung** | rebrowser, brotector, botd, CDP-Befehlsaudit | Keine Lecks durch `Runtime.enable`, Init-Skripte, Bindings oder `navigator.webdriver` |
| **L4 Verhalten** | Eingabetreue-Probe, Humanize-Traces, Live-Challenge-Smoke-Test | `isTrusted: true`-Ereignisse, natürliche Reihenfolge und Zeitabstände, realistische Zeigerkurven und Scroll-Verläufe |
| **L5 Stabilität** | Wiederholte Starts, Worker, Same-/Cross-Origin-Iframes, SDK-übergreifende Parität | Derselbe `seed` reproduziert in allen Kontexten einen identischen Fingerprint |

Vollständiges Verfahren, Statuswerte (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), Signal-Checkliste und Berichtsvorlage: [Englisch (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) und [Russisch (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Vergleich

| Funktion | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| Automatisierungs-API | Playwright | Playwright | Selenium | **Playwright und Puppeteer** |
| Patch-Ebene | Keine | In-Page-JS-Injektion | Konfigurations-Flags | **C++-Quellcode (Chromium)** |
| Kohärenter Fingerprint-`seed` | Nein | Nein | Teilweise | **Ja, pro Profil und eTLD+1** |
| Eingabesimulation (`humanize`) | Nein | Nein | Nein | **Im Browserprozess integriert** |
| Unterdrückung von `Runtime.enable` / CDP-Lecks | Nein | Nein | Teilweise | **Engine-Patch + SDK-Invarianten** |
| Authentifizierte Proxys ohne CLI-Lecks | Nein | Nein | Eingeschränkt | **Lokales Loopback-Relay** |
| Profilisolierung | BrowserContext | BrowserContext | Nein | **Profilverzeichnis + Dateisperre** |
| Offline-Profilmanager (GUI) | Nein | Nein | Nein | **Ombra Desktop (macOS, Linux, Windows)** |
| Migration von Playwright | — | Import ändern | Code umschreiben | **Import und `launch()` tauschen** |

## Funktionsweise

```mermaid
flowchart LR
    Script["Ihr Skript<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP-Brücke"]
    Relay["Lokales Proxy-Relay<br/>bei Authentifizierung"]
    Engine["Ombra Chromium<br/>C++-gepatchte Engine"]
    Client["Nativer Client<br/>Playwright · Puppeteer"]
    Profile[("Profil<br/>Seed · Cookies · Speicher")]

    Script -->|"launch()"| SDK
    SDK -->|"prüfen + starten"| Engine
    SDK -.->|"Proxy-Auth"| Relay
    Relay -.-> Engine
    SDK -->|"über CDP verbinden"| Client
    Script -->|"Seiten-API"| Client
    Client -->|"Loopback-CDP"| Engine
    Engine --> Profile
```

1. **`launch()` sucht oder lädt die Engine herunter** und überprüft deren Ed25519-Signatur und SHA-256-Prüfsumme.
2. **Profil und `seed` werden vorbereitet.** Ein benanntes Profil erwirbt eine prozessübergreifende Sperre; wenn der Proxy Zugangsdaten erfordert, startet das SDK ein In-Memory-Loopback-Relay.
3. **Ombra Chromium startet** mit dem gewählten Profil, den Fingerprint-Optionen und einem lokalen Debugging-Port (`--remote-debugging-port=0`).
4. **Der offizielle Client verbindet sich.** Sobald `DevToolsActivePort` erscheint, verbindet das SDK Playwright (mit `no_defaults=True`) oder Puppeteer über `127.0.0.1` und gibt das native `Browser`-Objekt zurück.
5. **Sauberes Beenden.** `browser.close()` sendet `Browser.close`, beendet den gesamten Engine-Prozessbaum, stoppt das Relay und gibt die Profilsperre frei.

Nach dem Start verlässt das SDK den Datenpfad: sämtliche Seitenbefehle laufen direkt zwischen Playwright oder Puppeteer und Chromium.

### SDK-Grenzen und Stealth-Invarianten

Der [SDK-Vertrag v0.1 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) schreibt für jedes offizielle SDK strikte Invarianten vor:

- **Keine Stealth-Skripte auf Seiten.** Das SDK ruft niemals `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` auf und patcht keine DOM-Eigenschaften.
- **Kein `Runtime.enable`.** Bereitschaftsprüfungen nutzen ausschließlich den lokalen CDP-HTTP-Endpunkt oder `Browser.getVersion`; das SDK aktiviert niemals `Runtime`, `Debugger` oder `Log`.
- **Keine `Emulation.*`-Überschreibungen.** Das SDK ruft niemals `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` oder `setDeviceMetricsOverride` auf — die Browser-Identität stammt direkt aus der Engine.
- **Keine unzulässigen Flags als Standard.** Das SDK fügt niemals eigenständig `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` oder `--user-agent` hinzu.
- **CDP ausschließlich über Loopback.** Der Debug-Port bindet immer an `127.0.0.1`; ein nicht auf Loopback zeigendes `--remote-debugging-address` wird abgelehnt.
- **Keine Telemetrie und keine Geheimnis-Lecks.** Proxy-Zugangsdaten, Schlüssel und Cookies werden in Protokollen und Fehlermeldungen geschwärzt.

## Python-API

### `launch()`

```python
from ombrabrowser import launch

# Einfacher Start (standardmäßig headless)
browser = launch()

# Sichtbares Browserfenster
browser = launch(headless=False)

# HTTP- oder SOCKS5-Proxy (Zugangsdaten laufen über das lokale Loopback-Relay)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Proxy-Objekt mit Bypass-Liste
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

# Fingerprint-Steuerung (Seed, OS, automatische Zeitzone/Locale über Proxy, Bildschirm, GPU)
# Für timezone="auto" / locale="auto" installieren Sie: pip install "ombrabrowser[geoip]"
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

# Native Maus-, Tastatur- und Scroll-Simulation
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Exakten Engine-Build festlegen und zusätzliche Chromium-Flags übergeben
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Gibt ein reguläres `playwright.sync_api.Browser`-Objekt zurück. Alle Playwright-Methoden funktionieren wie gewohnt (`new_page()`, `new_context()`, `close()` usw.). Neue Seiten verwenden standardmäßig `no_viewport=True`, damit die Fensterabmessungen des Profils nicht überschrieben werden.

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

### `launch_context()` und `launch_context_async()`

Komfortfunktion, die den Browser startet und direkt einen `BrowserContext` zurückgibt (das Schließen des Kontexts beendet auch den Engine-Prozess). Zusätzliche Schlüsselwortargumente werden an `browser.new_context()` weitergereicht — etwa `storage_state`, `permissions` oder `extra_http_headers`:

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

Asynchrones Gegenstück: `await launch_context_async(...)`.

### `launch_persistent_context()` und `launch_persistent_context_async()`

Startet den Browser mit einem persistenten Profil und gibt dessen Standard-`BrowserContext` zurück. Cookies, `localStorage`, IndexedDB, Cache und der Fingerprint-`seed` bleiben über Sitzungen hinweg erhalten.

- Die Angabe `profile="pricing-eu"` erstellt das Profil unter `~/.ombra/profiles/pricing-eu` samt Metadaten in `.ombra/profile.json` und Sperrdatei.
- Die Angabe `user_data_dir="./my-profile"` (oder ein positionelles Pfadargument) nutzt das angegebene Verzeichnis.
- Das gleichzeitige Starten desselben Profils aus einem anderen Prozess löst `ProfileBusyError` aus, anstatt Profildaten zu beschädigen.

```python
from ombrabrowser import launch_persistent_context

# Über benanntes Profil (gespeichert unter ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # Cookies, Speicher und Seed bleiben erhalten

# Über expliziten Pfad (z. B. zum Laden von Chrome-Erweiterungen)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Asynchrones Gegenstück: `await launch_persistent_context_async(...)`.

### Hilfsfunktionen und Diagnose (Python)

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

# Aufgelöste Engine-Binärdatei prüfen
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Engine herunterladen und verifizieren, ohne einen Browser zu starten
ensure_binary(version="158.0.8127.37-3")

# Vom SDK verwaltete Engine-Binärdateien entfernen (Profile unter ~/.ombra/profiles bleiben unangetastet)
clear_cache()

# Dry-Run-Vorschau des aufgelösten Startbefehls, ohne Chromium zu starten
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Laufzeit-Metadaten (CDP-Port, ws_url, seed, pid) auslesen und Prozesszustand prüfen
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # Engine herunterladen und verifizieren (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # bestimmten Engine-Build installieren
ombrabrowser info                                # Diagnose von Umgebung, Binärdatei und Abhängigkeiten (Alias: doctor)
ombrabrowser info --quick --json                 # schneller maschinenlesbarer Bericht ohne Start der Binärdatei
ombrabrowser info --proxy socks5://user:pass@host:1080  # Exit-IP, Zeitzone und Locale-Auflösung über Proxy testen
ombrabrowser update                              # GitHub Releases prüfen und Engine im Cache aktualisieren
ombrabrowser clear-cache                         # zwischengespeicherte Engine-Binärdateien löschen (Profile bleiben erhalten)
ombrabrowser login                               # Lizenzschlüssel in ~/.ombra/license.key speichern (nur ältere Builds)
ombrabrowser logout                              # gespeicherten Lizenzschlüssel entfernen
```

Dieselben Befehle stehen auch über `python -m ombrabrowser <command>` zur Verfügung.

## Node.js-API und TypeScript-API

`@ombralabs/sdk` liefert duale ESM- und CommonJS-Builds mit vollständigen TypeScript-Typdefinitionen (`.d.ts`). Sowohl Playwright als auch Puppeteer nutzen im Hintergrund dieselbe Engine.

### Playwright (Standard)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Standardstart mit Proxy, Fingerprint und Eingabesimulation
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

// Komfortstart: Browser + Kontext in einem Aufruf
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Persistentes Profil — Cookies, localStorage und Seed bleiben sitzungsübergreifend erhalten
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Jedes Codebeispiel oben ist eigenständig. Um einen bestehenden Playwright-Starter zu migrieren, können Sie den Import auch durch `import * as chromium from "@ombralabs/sdk"` ersetzen und `await chromium.launch(...)` beibehalten.

### Puppeteer

Verwenden Sie `launchPuppeteer()` aus `@ombralabs/sdk` oder importieren Sie aus `@ombralabs/sdk/puppeteer`:

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

> **Hinweis zu Puppeteer:** Puppeteer sendet standardmäßig mehr CDP-Datenverkehr als Playwright mit `connectOverCDP({ noDefaults: true })`. Für Websites mit strengen CDP-Prüfungen wird Playwright empfohlen.

### Hilfsfunktionen und CLI (Node.js)

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

## Menschliche Eingabesimulation

In Ombra ist die Eingabesimulation (`humanize`) **nativ in den Chromium-Browserprozess einkompiliert** (angetrieben von `cursory-rs` und dem Eingabe-Scheduler der Engine) und nicht als JS-Wrapper um den Automatisierungsclient umgesetzt. Das bedeutet:

- Jede Standardaktion von Playwright und Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) durchläuft eine einzige Eingabewarteschlange pro Tab innerhalb des Browsers.
- Verhaltensparameter werden deterministisch aus dem Profil-`seed` abgeleitet (`--fingerprint-humanize-seed`).
- Das SDK kapselt `Page` oder `Browser` niemals in Proxy-Klassen — native Typen und Client-Verhalten bleiben vollständig erhalten.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Was sich mit `humanize=True` ändert:**

| Aktion | Ohne `humanize` | Mit `humanize=True` |
|---|---|---|
| Mausbewegung | Sofortiger Teleport | `cursory-rs`-Kurven mit Beschleunigung, Pausen und leichtem Überschwingen |
| Klicks und Ziehen | Sofortiger Tastendruck | Zielpunkt innerhalb des Elements, Pause vor dem Klick und Haltedauer |
| Texteingabe | Sofortiges Setzen des Werts | Zeichenweises Tippen mit konfiguriertem Rhythmus und Tastaturlayout, gelegentlichen Tippfehlern und Selbstkorrektur; sehr langer Text wird über eine isolierte Zwischenablage eingefügt, ohne die System-Zwischenablage zu berühren |
| Scrollen | Einzelner Sprung | Ereignisserie für Mausrad/Trackpad nach gemessenen Verzögerungsprofilen |
| Leerlaufphasen | Statischer Cursor | Im Preset `careful` subtile Cursor-Bewegungen im Leerlauf zwischen Aktionen |

**Presets** — `default` (normales Tempo), `careful` (langsamer, bedachter, mit feinen Mikrobewegungen im Leerlauf) und `fast` (schnelleres Tempo). Übergeben Sie `humanize=False` (`humanize: false`), um die Eingabesimulation explizit zu deaktivieren.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Über die `Ombra`-CDP-Domäne können Sie den Modus zur Laufzeit umschalten oder das Preset wechseln, ohne den Browser neu zu starten:

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

## Fingerprint- und Profilverwaltung

Die Engine leitet aus einem einzelnen `seed` eine in sich stimmige Browserkonfiguration ab. Wenn `seed` nicht angegeben ist:

| Szenario | Verhalten |
|---|---|
| **`launch()` ohne Profil** | Das SDK erzeugt einen zufälligen `seed` für die Sitzung und legt ein temporäres Verzeichnis an, das nach `close()` gelöscht wird. |
| **`profile="name"` oder `user_data_dir="./dir"`** | Der `seed` wird in `.ombra/profile.json` gespeichert und bei jedem Start wiederverwendet — Websites sehen einen wiederkehrenden Besucher mit demselben Gerät und denselben Cookies. |
| **`fingerprint={"seed": N, ...}`** | Deterministischer Fingerprint aus dem expliziten `seed`; zusätzliche Felder überschreiben einzelne Werte, während der Rest kohärent bleibt. |

Canvas- und Audio-Rauschen wird pro `eTLD+1` abgeleitet (stabil auf derselben Website, nicht verknüpfbar zwischen verschiedenen Websites). Pixelrauschen für 2D-Canvas und WebGL-`readPixels` ist standardmäßig deaktiviert, um keine „Canvas Tampering / Masking“-Detektoren auszulösen, und lässt sich explizit über `--fingerprint-pixel-noise` aktivieren.

> **Tipp:** Verwenden Sie bei wiederholten Besuchen derselben Website ein persistentes Profil (`profile="name"` oder `launch_persistent_context()`), statt einem flüchtigen `launch()` einen festen `seed` zu übergeben — so bleiben Cookies, Cache und `localStorage` im Einklang mit dem Fingerprint.

### Felder des `fingerprint`-Objekts

Die folgenden Feldnamen entsprechen Python (`snake_case`); Node.js akzeptiert sowohl `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) als auch `snake_case`:

| Feld | Typ | Beschreibung |
|---|---|---|
| `seed` | `int` (`>= 0`) | Generator-Seed, der die gesamte Fingerprint-Konfiguration bestimmt |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Zielbetriebssystem (`navigator.platform`, UA, GPU- und Schriftarten-Pools) |
| `os_version` | `string` | Betriebssystemversions-Hinweis für Client Hints |
| `timezone` | IANA-Zone oder `"auto"` | Zeitzone (z. B. `"Europe/Berlin"`). `"auto"` ermittelt die Zone über GeoIP anhand des Proxy-Exits |
| `locale` | BCP-47 oder `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` ermittelt die Locale anhand des Proxy-Exits |
| `screen` | `{"width", "height"}` oder `"auto"` | Bildschirm- und Arbeitsbereich-Abmessungen unter Berücksichtigung von Taskleiste / Menüleiste des Ziel-OS |
| `gpu` | `{"vendor", "renderer"}` oder `"auto"` | Explizite WebGL-Strings für `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` oder `"auto"` | Gemeldeter Wert für `navigator.hardwareConcurrency` |
| `device_memory` | `int` oder `"auto"` | Gemeldeter Wert für `navigator.deviceMemory` (in GB) |
| `noise` | `bool` | Aktiviert/deaktiviert Fingerprint-Rauschen (`False` übergibt `--disable-fingerprint-noise`) |

> Behalten Sie `seed` als primäre Quelle für Fingerprint-Parameter bei: Das Überschreiben einzelner Werte ohne gegenseitige Abstimmung (etwa ein Betriebssystem kombiniert mit einer inkompatiblen GPU) kann Widersprüche für Detektoren erzeugen.

### Zusätzliche Engine-Flags (`args`)

Zusätzliche Engine-Flags (über `args=[...]` setzen oder überschreiben):

| Flag | Zweck |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Browser-Marke in `Sec-CH-UA` (das SDK verwendet standardmäßig `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | TLS-ClientHello-Profil passend zur angegebenen Chrome-Hauptversion (vom SDK automatisch anhand der Engine-Version gesetzt) |
| `--webrtc-ip=<ip>` | Ersetzt die IP-Adresse in WebRTC-ICE-Kandidaten, ohne echten STUN-Verkehr zu senden |
| `--fingerprint-location=<lat,lon>` | Koordinaten für `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Speicherkontingent für `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Anzahl der Touch-Punkte (`navigator.maxTouchPoints` und Pointer-Media-Queries) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Pixeldichte des Displays (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Farbtiefe des Bildschirms |
| `--disable-gpu-fingerprint` | Reicht die echte GPU des Hosts durch (WebGL-/WebGPU-Strings, Limits und Erweiterungen) |
| `--disable-gpu-string-spoof` | Reicht echte GPU-Strings durch, während übrige Profileinstellungen aktiv bleiben |
| `--disable-fingerprint-noise` | Deaktiviert Canvas-/WebGL-/Audio-Rauschen bei weiterhin aktiven Identitätsparametern (wird auch durch `fingerprint={"noise": False}` gesetzt) |
| `--fingerprint-pixel-noise` | Aktiviert optionales idempotentes Pixelrauschen für 2D-Canvas und `readPixels` |
| `--profile-label=<text>` | Profilbezeichnung in der Adressleiste des Browsers (nur Oberfläche; wird automatisch aus `profile` gesetzt — nur über `args` übergeben, wenn `profile` nicht gesetzt ist) |

### Schriftarten unter Linux einrichten

Minimalen Linux-Servern und Containern fehlen häufig Emoji- und CJK-Schriftarten, wodurch verborgenes Canvas-Text- und Emoji-Rendering ungewöhnliche Hashes erzeugt.

**1. Basisschicht (Emoji und CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows-Schriftarten für Windows-Profile (`os="windows"`):**
Wenn Sie unter Linux eine Windows-Konfiguration verwenden, verbessert die Installation echter Schriftarten aus `C:\Windows\Fonts\` (einschließlich `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) die Kohärenz bei der Schriftarten-Aufzählung erheblich:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS-Schriftarten für macOS-Profile (`os="macos"`):**
Kopieren Sie entsprechend bei Verwendung von `os="macos"` unter Linux die Schriftarten aus `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` und `/Library/Fonts/` nach `~/.local/share/fonts/mac/` und führen Sie `fc-cache -f` aus.

Platzieren Sie Schriftarten in einem `Dockerfile` im Systemverzeichnis `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Startoptionen, Konfiguration und Fehler

### Optionen für `launch()`

Die Optionsnamen folgen der Python-API und dem [SDK-Vertrag](../../docs/sdk-contract.md); Node.js nutzt die `camelCase`-Entsprechungen (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) und akzeptiert zusätzlich `snake_case`-Aliase. Unbekannte Optionen werden mit `InvalidOptionError` abgelehnt.

| Option | Standardwert | Beschreibung |
|---|---|---|
| `headless` | `true` | Ohne sichtbares Fenster ausführen (`--headless=new`) |
| `proxy` | keiner | Proxy-URL (`http`, `https`, `socks5`) oder Objekt; authentifizierte Proxys nutzen ein Loopback-Relay |
| `fingerprint` | keiner | Einstellungen für `seed`, OS, Zeitzone, Locale, Bildschirm, GPU, Speicher und Rauschen |
| `profile` | keiner | Benanntes persistentes Profil unter `~/.ombra/profiles/<slug>` (schließt sich mit `user_data_dir` gegenseitig aus) |
| `user_data_dir` | temporär | Expliziter Pfad zum Profilverzeichnis (schließt sich mit `profile` gegenseitig aus) |
| `args` | `[]` | Zusätzliche Chromium-Argumente (werden unverändert weitergereicht) |
| `binary_path` | aufgelöst | Expliziter Pfad zu einer Engine-Binärdatei |
| `version` | Env / Auto | Fixierte Engine-Version (z. B. `158.0.8127.37-3`), überschreibt `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Zeitlimit für Engine-Start und CDP-Verbindung (1000–600000 ms) |
| `humanize` | Engine-Standard | `False`, `True` oder `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | Env / Datei | Schlüssel für ältere lizenzierte Builds (bei aktuellen Builds nicht benötigt; wird niemals protokolliert) |
| `env` | `{}` | Zusätzliche Umgebungsvariablen für den Engine-Prozess |
| `download` | `True` | Automatischen Download einer fehlenden Engine-Binärdatei erlauben |

### Umgebungsvariablen

Rangfolge: **explizite Startoption → Umgebungsvariable → Profilmetadaten → Standardwert**.

| Variable | Standardwert | Beschreibung |
|---|---|---|
| `OMBRA_BINARY_PATH` | nicht gesetzt | Expliziter Pfad zu einer Engine-Binärdatei |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Verzeichnis für zwischengespeicherte Engines und benannte Profile |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Download-Quelle für die Engine; eine benutzerdefinierte URL aktiviert den Legacy-Mirror-Modus (`none`/`off` deaktiviert Downloads) |
| `OMBRA_VERSION` | neueste kompatible | Fixierte Engine-Version (z. B. `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Engine-Release-Kanal: `stable` (GitHub-Releases) oder `beta` (GitHub-Prereleases) |
| `OMBRA_AUTO_UPDATE` | `true` | Beim Start auf neuere Engine-Builds prüfen |
| `OMBRA_SKIP_CHECKSUM` | `false` | Nur für lokale Entwicklung: deaktiviert die SHA-256-Prüfung (protokolliert eine Warnung) |
| `OMBRA_LICENSE_KEY` | nicht gesetzt | Schlüssel für ältere lizenzierte Builds (wird niemals protokolliert) |
| `OMBRA_TIMEOUT_MS` | `30000` | Standard-Zeitlimit für den Start (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Protokollierungsgrad: `error`, `warn`, `info`, `debug` |

### Typisierte Fehler

Bei jedem Fehler beendet das SDK den gestarteten Engine-Prozess, gibt die Profilsperre frei und wirft eine Unterklasse von `OmbraError` mit stabilem `kind` und von Geheimnissen bereinigten `details`:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Die vollständige Fehlertaxonomie und Wiederholungsregeln sind im [SDK-Vertrag (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) dokumentiert.

## Plattformen, Integrationen und Container

### Unterstützte Plattformen und Laufzeitumgebungen

| Komponente | Unterstützung | Hinweise |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Autonome Engine-Builds über GitHub Releases; Ombra Desktop ist mit Developer ID signiert und notarisiert |
| **macOS x64 (Intel)** | — | Keine aktuelle Chromium-158-Version |
| **Linux x64** | ✅ | Autonome Engine-Builds über GitHub Releases; das Node.js-SDK erfordert `xz-utils` (`xz`) zum Entpacken von `.tar.xz` |
| **Windows x64** | ✅ | Autonome Engine-Builds über GitHub Releases und Installationsprogramm für Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` wird automatisch zusammen mit `ombrabrowser` installiert |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` oder Puppeteer `>=22` (Puppeteer 25+ erfordert Node.js `>=22.12`) |

### Integrationen für Frameworks und KI-Agenten

Ombra arbeitet mit jedem Automatisierungswerkzeug und KI-Agenten-Framework zusammen, das eine benutzerdefinierte Chromium-Binärdatei akzeptiert oder sich über CDP verbindet (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` und weitere):

```python
# Option 1: verifizierten Binärpfad und ausführbare Engine-Argumente für einen eigenen Runner auflösen
# Hinweis: build_launch_options() ist ein Dry-Run-Helfer — übergeben Sie explizit user_data_dir und seed
# (benannte Profile und authentifizierte Proxys erfordern Option 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Option 2: über das Ombra SDK starten und den lokalen CDP-Endpunkt an Ihr Framework übergeben
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Verbinden Sie Ihr Framework mit ws_url oder cdp_http — Fingerprint-Einstellungen und humanize
# laufen in der Engine und bleiben für jeden CDP-Client aktiv
```

### Betrieb in Docker und auf Linux-Servern

Beispiel-`Dockerfile`, das die Engine bereits beim Bauen des Images herunterlädt und verifiziert:

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

> **Container und Webserver:**
> - Wenn Ihr Container die Chromium-Sandbox nicht initialisieren kann, übergeben Sie `--no-sandbox` explizit per `args=["--no-sandbox"]` (das SDK fügt dieses Flag niemals eigenständig hinzu).
> - Um `headless=False` auf einem Server ohne Bildschirm auszuführen, nutzen Sie `Xvfb` (siehe [unten](#fehlerbehebung)).
> - Beim Betrieb unter `uvicorn` mit `uvloop` übergeben Sie `--loop asyncio`, um blockierende Subprozess-Pipes zu vermeiden.

## Fehlerbehebung

### Website blockiert den Headless-Modus

Einige Anti-Bot-Systeme prüfen Verhaltens- und Rendering-Unterschiede im Headless-Modus selbst bei vorhandenen C++-Patches. Starten Sie den Browser mit `headless=False` auf einem virtuellen Display via `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Starten Sie anschließend mit einem Residential-SOCKS5-/HTTP-Proxy, einem persistenten Profil, abgestimmter Zeitzone/Locale, `headless=False` und `humanize=True` (siehe das `launch_persistent_context()`-Beispiel am Anfang dieser README).

Bestehen Blockierungen unter Linux weiterhin, prüfen Sie [Schriftarten unter Linux einrichten](#schriftarten-unter-linux-einrichten).

### Website fordert bei jedem Besuch eine Überprüfung an

Der Aufruf von `launch()` ohne `profile` startet jedes Mal mit einem leeren temporären Verzeichnis und einem neuen `seed`, sodass die Website jeden Durchlauf als völlig neuen Besucher ohne Cookies behandelt. Wechseln Sie zu `profile="..."` oder `launch_persistent_context(...)`, damit Cookies, `localStorage` und `seed` zwischen den Läufen erhalten bleiben.

### `ProfileBusyError`

Ein benanntes Profil oder `user_data_dir` kann immer nur von einem Prozess gleichzeitig geöffnet sein. Weisen Sie jedem parallelen Worker einen eigenen Profilnamen zu (`profile=f"worker-{i}"`). Verwaiste Sperren abgestürzter Prozesse werden automatisch erkannt und bereinigt.

### Muss ich `playwright install chromium` ausführen?

Nein. Ombra verwendet seine eigene Engine-Binärdatei und nicht das Standard-Chromium von Playwright. Unter Linux benötigen Sie lediglich die Systembibliotheken und `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Engine aktualisieren, Kanäle wechseln und zurücksetzen

Aktualisieren Sie das SDK auf das neueste Release:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Testen Sie den `beta`-Kanal oder pinnen bzw. setzen Sie die Engine auf einen exakten Build zurück:

```python
# Exakten Build für einen bestimmten Start festlegen
browser = launch(version="158.0.8127.37-3")
```

```bash
# Den beta-Kanal testen (OMBRA_VERSION zurücksetzen — ein exakter -N-Pin ignoriert den Kanal)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Oder auf einen exakten Engine-Build festlegen / zurücksetzen
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Oder auf eine lokal kompilierte Binärdatei verweisen
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper blockiert einen lokalen Build

Offizielle Ombra-Releases für Apple-Silicon-macOS sind mit einem Apple-Developer-ID-Zertifikat signiert und notarisiert. Wenn Sie einen lokalen, unsignierten Entwickler-Build ausführen und macOS diesen unter Quarantäne stellt, entfernen Sie das Quarantäne-Attribut einmalig:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Auf einer Seite im synchronen Python warten

Im synchronen Playwright hält ein einzelnes langes `time.sleep(15)` nach `page.goto()` die Event-Loop von Playwright an, was Verifizierungsseiten zum Stocken bringen kann. Warten Sie stattdessen in kurzen Schritten mit einem leichtgewichtigen Kontextaufruf:

```python
import time

for _ in range(15):
    page.context.cookies()  # hält die Playwright-Verarbeitung aktiv, ohne das Seiten-DOM zu berühren
    time.sleep(1)
```

Verwenden Sie im asynchronen Python `await asyncio.sleep(...)` und in Node.js `await new Promise(r => setTimeout(r, ms))`. Vermeiden Sie außerdem häufige Aufrufe von `page.wait_for_timeout()` und unnötige `page.evaluate()`-Aufrufe vor Prüfungen, um keinen zusätzlichen CDP-Verkehr zu erzeugen.

## Sicherheit

- **Authentizität und Integrität der Engine.** Vor dem Entpacken prüft das SDK die Ed25519-Signatur des Release-Envelopes gegen einen hinterlegten öffentlichen Schlüssel und verifiziert den SHA-256-Hash sowohl des Archivs als auch der ausführbaren Datei.
- **CDP nur lokal.** Der Debug-Port bindet strikt an `127.0.0.1`. Geben Sie einen CDP-Port niemals ohne zusätzliche Authentifizierung in einem öffentlichen Netzwerk frei — CDP gewährt volle Kontrolle über den Browser.
- **Geheimnisisolierung.** Proxy-Zugangsdaten existieren ausschließlich im Arbeitsspeicher des lokalen Loopback-Relays und erscheinen niemals in Prozess-Befehlszeilen, Profilmetadaten, Protokollen oder Fehlerdetails.
- **Keine Telemetrie.** Das SDK sendet weder Analysedaten noch Absturzberichte oder versteckte Netzwerk-Pings.

Bitte melden Sie Sicherheitslücken vertraulich gemäß [SECURITY.md](../../SECURITY.md).

## Repository-Übersicht

```text
.
├── README.md                    # englische Haupt-README
├── translations/
│   ├── de/README.md             # diese Datei (Deutsch)
│   ├── ru/README.md             # russische Übersetzung
│   └── <locale>/README.md       # 19 weitere Lokalisierungen
├── desktop/                     # Ombra Desktop (Tauri: Rust-Katalog + Vue-Oberfläche)
├── docs/
│   ├── architecture.md          # Architektur, Vertrauensgrenzen, Lebenszyklus
│   ├── sdk-contract.md          # Startvertrag v0.1, Optionen, Fehler, Invarianten
│   ├── stealth-checkup.md       # Checkup-Methode (Englisch)
│   ├── stealth-checkup.ru.md    # Checkup-Methode (Russisch)
│   ├── versioning.md            # Versionierung von SDK, Engine und Clients
│   └── desktop/                 # Leitfäden zu lokalen Desktop-Profilen und Schlüsseln
├── spec/
│   └── schemas/                 # JSON-Schemas für Startoptionen und Binärdatei-Metadaten
├── sdks/
│   ├── manifest.json            # maschinenlesbare SDK-Registrierung
│   ├── README.md                # SDK-Struktur und Richtlinien für Beiträge
│   ├── python/                  # Python-SDK (veröffentlicht als ombrabrowser)
│   ├── node/                    # Node.js-/TypeScript-SDK (veröffentlicht als @ombralabs/sdk)
│   └── ...                      # Vertragsgerüste für weitere Sprachen (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # sprachübergreifende Testfälle für Startverhalten und Stealth-Invarianten
├── tools/check_repo.py          # Validator für Struktur, Schemas und Links (CI)
└── .github/workflows/ci.yml
```

Dieses Repository enthält den SDK-Vertrag, Schemas, Konformitätstests, Dokumentation und den Quellcode von Ombra Desktop. Die Patches für die Chromium-Engine werden in einem separaten Repository gepflegt; kompilierte Builds werden über [GitHub Releases](https://github.com/ombralabs/ombra/releases) veröffentlicht.

## FAQ

### Ist dies ein Playwright-Fork?

Nein. Das SDK verbindet den offiziellen Playwright- (oder Puppeteer-)Client über lokales CDP mit Ombra Chromium. Alle Typen, Lokatoren, Wartezeiten und Seitenobjekte bleiben Standard.

### Ist Ombra kostenlos und benötige ich einen Lizenzschlüssel?

Der SDK-Quellcode in diesem Repository ist unter der Apache License 2.0 als Open Source verfügbar. Aktuelle Engine-Builds sowie der lokale Profilmanager Ombra Desktop laufen kostenlos und autonom — ohne Konto, Lizenzschlüssel, Hardware-ID oder Begrenzung der Profilanzahl. `license_key` und `OMBRA_LICENSE_KEY` werden nur für ältere lizenzierte Builds benötigt.

### Muss ich Ombra Desktop installieren, um das SDK zu verwenden?

Nein. Das SDK startet die Engine direkt als Kindprozess und eignet sich damit ideal für Skripte, Container und CI. Ombra Desktop ist optional, wenn Sie einen lokalen Profilkatalog über eine grafische Oberfläche verwalten möchten.

### Wie unterscheidet sich Ombra von `playwright-stealth`?

`playwright-stealth` injiziert JavaScript oberhalb eines regulären Browsers in Webseiten, und moderne Detektoren erkennen häufig die Patches selbst. Ombra kompiliert seine Änderungen direkt in den Chromium-Quellcode, und das SDK injiziert keinerlei Skripte in Seiten.

### Kann ich meinen eigenen Proxy verwenden?

Ja. Übergeben Sie einen `http://`-, `https://`- oder `socks5://`-Proxy im Parameter `proxy`. Sind Zugangsdaten enthalten, betreibt das SDK ein lokales Loopback-Relay, damit diese niemals in den Prozessargumenten erscheinen. Beachten Sie, dass der eigene `context.request`- / `page.request`-Client von Playwright die Proxy-Einstellungen auf Browserebene umgehen kann — rufen Sie `fetch()` aus dem Seitenkontext auf, um sicherzustellen, dass der Datenverkehr über den Proxy läuft.

### Welche Playwright- und Puppeteer-Versionen werden unterstützt?

Das Python-SDK erfordert Playwright `>=1.60,<2.0` (wird automatisch zusammen mit `ombrabrowser` installiert). Das Node.js-SDK unterstützt `playwright-core@^1.60.0` oder `puppeteer-core >=22.0.0`. Einzelheiten zur Kompatibilität finden Sie im [Versionierungsleitfaden](../../docs/versioning.md).

### Garantiert Ombra das Bestehen jeder Bot-Prüfung?

Nein. Erkennungsverfahren entwickeln sich ständig weiter und hängen von Website, Region, IP-Reputation, Profilhistorie und Detektorversion ab. Nutzen Sie die [Stealth-Checkup-Methode](../../docs/stealth-checkup.md), um eine konkrete Konfiguration objektiv zu messen und nachzuverfolgen.

### Für welche Anwendungsfälle ist Ombra gedacht?

Ombra ist für autorisierte Automatisierung, QA-Tests, Monitoring, Forschung und die Verwaltung isolierter Arbeitsprofile konzipiert. Unbefugter Zugriff, Credential Stuffing und Missbrauch werden nicht unterstützt.

## Mitwirken

Richtlinien für Beiträge finden Sie in [CONTRIBUTING.md](../../CONTRIBUTING.md), Community-Standards in [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) und Hinweise zu den SDKs in [sdks/README.md](../../sdks/README.md).

- Aktualisieren Sie den [SDK-Vertrag](../../docs/sdk-contract.md) und die [Schemas](../../spec/schemas), bevor Sie eine neue Startoption hinzufügen.
- Aktualisieren Sie bei Änderungen am SDK-Verhalten die Implementierung, Tests und gemeinsamen Testfälle unter [conformance](../../conformance/README.md).
- Führen Sie vor dem Eröffnen eines Pull Requests `python3 tools/check_repo.py` aus, um Repository-Struktur und Links zu prüfen.

## Lizenz

Der SDK-Quellcode in diesem Repository steht unter der [Apache License 2.0](../../LICENSE). Die Lizenz gewährt keine Rechte an Ombra-Marken, der Ombra-Chromium-Engine oder Ombra Desktop — Marken- und Drittanbieterhinweise finden Sie in [NOTICE](../../NOTICE).

## Links

- 🌐 **Website** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Releases (Engine & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Änderungsprotokoll** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Fehler & Funktionswünsche** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organisation** — [Ombra Labs](https://github.com/ombralabs)
