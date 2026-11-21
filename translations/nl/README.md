<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Licentie"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Laatste commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Sterren"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="PyPI-downloads"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="npm-downloads"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Release"></a>
</p>

<p align="center">
<a href="#installatie"><strong>Installatie</strong></a> ·
<a href="#python-api">Python-API</a> ·
<a href="#api-voor-nodejs-en-typescript">Node.js-API</a> ·
<a href="#vermenselijkte-invoer">Vermenselijkte invoer</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Talen</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium met fingerprintbeheer op C++-broncodeniveau en native vermenselijkte invoer.</h3>

<table><tr><td>
Geen bundel startvlaggen en geen JavaScript-injectie boven op de pagina. Een echte Chromium-binary met fingerprintpatches gecompileerd in de C++-broncode en invoersimulatie die in het browserproces zelf draait. Verbind officiële Playwright of Puppeteer via lokale CDP — zonder wrapperobjecten en zonder paginacode te herschrijven.
</td></tr></table>

<br>

<p align="center">
Drop-in startvervanging voor Playwright en Puppeteer in Python en Node.js.<br>
Dezelfde API, dezelfde selectors en types — vervang alleen de import en de <code>launch()</code>-aanroep.
</p>

- **Chromium-patches op broncodeniveau** — canvas, WebGL, WebGPU, audio, lettertypen, GPU, scherm, CSS-mediaqueries, hardwarerapportage, WebRTC zonder STUN-lekken, TLS ClientHello, tijdzone, locale en verwijdering van automatiseringssignalen (`navigator.webdriver`, `Runtime.enable`, headless-markeringen).
- **Native vermenselijkte invoer in het browserproces (`humanize=True`)** — aanwijzertrajecten (`cursory-rs`), gerichte klikken met indruktijd, typritme met zelfcorrectie van typefouten en scrollfysica draaien binnen Chromium zelf. De SDK retourneert een gewone native `Browser` zonder proxywrappers.
- **Zelfstandige werking zonder sleutels of accounts** — actuele engine-builds (`158.0.8127.37-3` en nieuwer) en Ombra Desktop draaien lokaal zonder registratie, licentiesleutels, hardware-ID's of een licentieserver.
- **Automatische installatie en cryptografische binary-verificatie** — `pip install ombrabrowser` of `npm install @ombralabs/sdk`; bij de eerste start downloadt de SDK de build voor jouw platform en verifieert de Ed25519-handtekening en de SHA-256-checksum.
- **Persistente profielen en veilige proxy-relay** — profielen met een naam bewaren cookies, `localStorage`, IndexedDB en `seed` tussen sessies met vergrendeling tussen processen; geauthenticeerde proxy's (HTTP, HTTPS, SOCKS5) lopen via een lokale loopback-relay zodat inloggegevens nooit in procesargumenten verschijnen.
- **Offline profielbeheerder Ombra Desktop** — een native desktopapplicatie in deze repository ([`desktop/`](../../desktop/README.md)) met vooraf gebouwde installatieprogramma's voor macOS, Linux en Windows.

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

Puppeteer wordt ook ondersteund via `import { launch } from "@ombralabs/sdk/puppeteer"` of `launchPuppeteer()` ([details](#puppeteer)).

**Voor sites met antibotbescherming** combineer je een residentiële proxy, een persistent profiel en onderling samenhangende omgevingsinstellingen:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # residentieel IP heeft de voorkeur boven datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # stem tijdzone en locale af op de proxy-exit
    headless=False,                                      # sommige sites detecteren verschillen in headless-modus
    humanize=True,                                       # native simulatie van muis, toetsenbord en scrollen
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

Zie [Probleemoplossing](#probleemoplossing) voor veelvoorkomende problemen op Linux, in containers en op beveiligde doelsites.

## Installatie

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Optioneel: tijdzone en locale automatisch detecteren vanaf de proxy-exit (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Met Playwright (1.60.0+, geen download van standaard Chromium nodig)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Of met Puppeteer
npm install @ombralabs/sdk puppeteer-core

# Optioneel: offline GeoIP-databaselezer voor timezone: "auto" en locale: "auto"
npm install mmdb-lib
```

---

Bij het starten zoekt de SDK de engine in strikte volgorde: `binary_path` (`binaryPath` in Node.js), `OMBRA_BINARY_PATH`, de enginemap van Ombra Desktop en de SDK-cache (`~/.ombra/engines`). Als er geen compatibele engine wordt gevonden, downloadt de SDK een build vanaf het ondertekende releasekanaal, verifieert de Ed25519-handtekening en de SHA-256-checksum, en slaat deze lokaal in de cache op. Het uitvoeren van `playwright install chromium` is niet nodig.

Om automatisch downloaden uit te schakelen geef je `download=False` (`download: false` in Node.js) mee. Om de engine vooraf te downloaden en te verifiëren (bijvoorbeeld tijdens het bouwen van een container) roep je `ensure_binary()` (`ensureBinary()`) aan of gebruik je de CLI-opdracht `install`.

> **Zelfstandig starten:** actuele engine-builds (`158.0.8127.37-3` en nieuwer) zijn gratis en vereisen geen account of licentiesleutel. `OMBRA_LICENSE_KEY` en de opdracht `login` blijven alleen beschikbaar voor compatibiliteit met oudere gelicentieerde builds.

**Migreren vanaf Playwright** kost twee regels — alle pagina-operaties, locators en wachttijden blijven ongewijzigd:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # de rest van je code blijft ongewijzigd werken
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Geef de repository een ster** als je het project nuttig vindt en gebruik **[Watch releases](https://github.com/ombralabs/ombra/subscription)** om meldingen te ontvangen over nieuwe builds van de engine, de SDK en Ombra Desktop.

---

## Huidige status en releases

Elk onderdeel in het ecosysteem volgt het gedeelde startcontract en wordt onafhankelijk geversioneerd.

| Onderdeel | Status / versie | Locatie |
|---|---|---|
| **SDK-contract** | Concept `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **Python-SDK** | Alfa `0.1.3` | [`ombrabrowser` op PyPI](https://pypi.org/project/ombrabrowser/) |
| **Node.js- / TypeScript-SDK** | Alfa `0.1.0` | [`@ombralabs/sdk` op npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Ombra Chromium-engine** | Chromium `158.0.8127.37` | `158.0.8127.37-3` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Losstaande browser** | `v158.0.8127.37-3` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-3) |
| **Schema's en conformiteit** | JSON Schema + gedeelde testcases | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Stealth-checkupmethode** | 6 lagen (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Inbegrepen in de huidige releases:

- **Patches op broncodeniveau** — seed-coherente afleiding van fingerprints, uitlijning van WebGL / WebGPU en extensies, realistische lettertypetabellen per besturingssysteem, native TLS ClientHello-profiel (`chrome-<major>`), onderdrukking van `Runtime.enable`- en `UtilityScript`-stacklekken, en bescherming tegen WebRTC-lekken van het host-IP.
- **`Ombra` CDP-domein op browserniveau** — directe besturing van vermenselijkte invoer (`getHumanizeState`, `setHumanize`) in Python en Node.js zonder de browser opnieuw te starten.
- **Native invoersimulatie in het browserproces** — aanwijzerplanner `cursory-rs`, scrollprofielen voor muiswiel en trackpad, typritme met zelfcorrectie van typefouten en veilig plakken van lange tekst via een geïsoleerd klembord.
- **Zelfstandige builds zonder sleutels** — actuele engine-builds (`158.0.8127.37-3`) en Ombra Desktop `1.2.2` draaien volledig lokaal zonder accounts, sleutels of telemetrie.
- **Vastzetten van de engineversie (`version`)** — zet een exacte build vast via `launch(version="158.0.8127.37-3")`, `OMBRA_VERSION` of via de CLI-opdracht `install --version`.
- **Geünificeerde proxy-relay** — geauthenticeerde HTTP-, HTTPS- en SOCKS5-proxy's zonder inloggegevens bloot te stellen op de opdrachtregel van Chromium, in logbestanden of in profielmetadata.
- **Persistente profielen met naam** — sla `seed`, cookies, `localStorage` en IndexedDB op onder `~/.ombra/profiles/<slug>` met vergrendeling tussen processen (`ProfileBusyError`).
- **Cryptografische supply-chaincontroles** — verificatie van Ed25519-handtekeningen van release-enveloppen en SHA-256-verificatie van archieven vóór het uitpakken.

Zie [CHANGELOG.md](../../CHANGELOG.md) voor de volledige releasegeschiedenis.

## Waarom Ombra

- **Patches op configuratie- en JS-niveau gaan snel stuk.** Tools zoals `playwright-stealth`, `puppeteer-extra` en `undetected-chromedriver` injecteren JavaScript in pagina's of passen startvlaggen aan. Chrome-updates maken ze regelmatig stuk, en moderne detectoren herkennen de patches zelf (`Function.prototype.toString`, prototype-anomalieën, `addScriptToEvaluateOnNewDocument`).
- **Wijzigingen worden gecompileerd in de broncode van Chromium.** Fingerprints worden op C++-niveau gegenereerd en consistent toegepast op het hoofdframe, workers en iframes. De SDK injecteert geen scripts in pagina's en voert geen `Emulation.*`-overschrijvingen uit.
- **Invoersimulatie leeft in het browserproces, niet boven op Playwright.** Omdat muisbanen, toetsaanslagen en scrollen in Chromium zelf worden afgehandeld, verpakt de SDK geen Playwright- of Puppeteer-objecten — elke locator, elk frame en elke bibliotheek van derden blijft normaal werken.
- **Lokale architectuur zonder extra services.** Geen achtergronddaemon als control plane en geen netwerksprong tussen jouw script en de browser: één engineproces, lokale loopback-CDP op `127.0.0.1` en geen limieten op het aantal profielen of gelijktijdigheid.

## Ombra Desktop

**Een lokale offline profielbeheerder met een grafische interface (GUI).** De broncode staat direct in deze repository ([`desktop/`](../../desktop/README.md)) en is gebouwd met Tauri (Rust + Vue).

- **Volledig offline en lokaal** — de profielcatalogus staat in een lokale SQLite-database op jouw machine met een lokale encryptiesleutel; geen account, cloudservice of netwerktoegang vereist.
- **Gestructureerd profielbeheer** — maak profielen aan, zoek op naam, notitie of nummer, bewerk beschrijvingen en organiseer items met groepen, tags, labels en bladwijzers in de Rust-catalogus.
- **Veilige Prullenbak** — wanneer je een profiel naar de Prullenbak verplaatst, blijven de bestanden op schijf bewaard zodat je het later kunt herstellen.
- **Geen limieten per profiel** — geen staffels per profiel of cloudquota: alle gegevens blijven van jou.
- **Vooraf gebouwde installatieprogramma's** — macOS Apple Silicon (`.dmg`, ondertekend met Apple Developer ID en genotariseerd), Linux (`.deb` en `.rpm`) en Windows x64 (`setup.exe`).
- **Geïsoleerde catalogi** — stel `OMBRA_DESKTOP_DATA_DIR` in om met een aparte testcatalogus of een reservekopie te werken.

[Download `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [Desktop README](../../desktop/README.md) · [Handleiding voor profielen en lokale sleutels](../../docs/desktop/README.md)

## Fingerprintverificatie en stealth-checkup

In plaats van algemene beloften over "100% ondetecteerbaar" te doen, vertrouwt Ombra op een herhaalbare verificatieprocedure onder vastgelegde omstandigheden. Praktijkresultaten op elke site hangen altijd af van de reputatie van het exit-IP, de regio, de profielgeschiedenis, de versie van de detector en de startconfiguratie.

### Oppervlakken afgehandeld door de engine en SDK

| Oppervlak / signaal | Standaard Playwright | Ombra | Implementatie |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | C++-enginepatch |
| `window.chrome` | ontbreekt in headless | volledig object | Komt overeen met reguliere Chrome |
| `navigator.plugins` | `0` in headless | coherente pluginset | Op engineniveau |
| User-Agent en Client Hints | `HeadlessChrome`, merkmismatch | `Google Chrome` + uitgelijnde `Sec-CH-UA*` | Patch `010-user-agent-and-webdriver` |
| CDP-artefacten (`Runtime.enable`, `UtilityScript`) | gemarkeerd door detectoren | onderdrukt door engine; SDK roept nooit `Runtime.enable` aan | Patch `110-runtime-enable` + invariant `SI-02` |
| WebRTC-IP-lek | legt lokaal/host-IP bloot | rapporteert exit-IP zonder echte STUN-verzoeken te versturen | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS en HTTP/2 | afhankelijk van opzet | Chromium-netwerkstack + `chrome-<major>` ClientHello-profiel | Patch `210-tls-network-persona` |
| WebGL en WebGPU | softwarerenderer / GPU-mismatch | geünificeerde WebGL/WebGPU-limieten en extensietabellen | Patches `070`, `071`, `075`, `955` |
| Lettertypen, locale en tijdzone | hostwaarden, `Intl`-afwijking | coherente lettertypetabellen, ICU-locale en tijdzone | Patches `040`, `090`, `092`, `230` |
| Invoersimulatie | cursorteleportatie, directe `fill()` | `cursory-rs`-curven, typritme, scrollfysica | Patch `135-ombra-humanize` in het browserproces |
| Fingerprintstabiliteit | verandert of lekt hostgegevens | deterministisch per `seed` over herstarts en frames heen | Patches `001`, `002` + persistent profiel |

### Zes lagen van de checkup

Voer vóór het uitbrengen of uitrollen van een configuratie alle zes checkuplagen uit met exact de engine-build, automatiseringsclient en proxy die je wilt gaan gebruiken:

| Laag | Voorbeelddoelen | Slagingscriteria |
|---|---|---|
| **L0 Transport** | TrackMe, IP/WebRTC-lekpagina's, header-echo | Alleen het proxy-exit-IP is zichtbaar; JA4 en HTTP/2 komen overeen met de Chromium-build; geen proxy-inloggegevens in argv |
| **L1 Identiteit** | Lokale probe, Sannysoft, Intoli, UA-CH-controle | Geen tegenstrijdigheden tussen UA, Client Hints, platform, GPU, lettertypen, scherm en locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Geen headless- of `lie`-markeringen; fingerprint blijft stabiel bij herladen |
| **L3 Automatisering** | rebrowser, brotector, botd, audit van CDP-opdrachten | Geen lekken van `Runtime.enable`, init-scripts, bindings of `navigator.webdriver` |
| **L4 Gedrag** | Probe voor invoernauwkeurigheid, humanize-traces, live uitdagingstest | `isTrusted: true`-events, natuurlijke volgorde en timing, realistische aanwijzercurven en scrollgedrag |
| **L5 Stabiliteit** | Herhaalde starts, workers, same/cross-origin iframes, pariteit tussen SDK's | Dezelfde `seed` reproduceert een identieke fingerprint in alle contexten |

Volledige procedure, statussen (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), signaalchecklist en rapportagesjabloon: [Engels (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) en [Russisch (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Vergelijking

| Functie | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| Automatiserings-API | Playwright | Playwright | Selenium | **Playwright en Puppeteer** |
| Patchniveau | Geen | JS-injectie in de pagina | Configuratievlaggen | **C++-broncode (Chromium)** |
| Coherente fingerprint-`seed` | Nee | Nee | Gedeeltelijk | **Ja, per profiel en eTLD+1** |
| Invoersimulatie (`humanize`) | Nee | Nee | Nee | **Ingebouwd in het browserproces** |
| Onderdrukking van `Runtime.enable` / CDP-lekken | Nee | Nee | Gedeeltelijk | **Enginepatch + SDK-invarianten** |
| Geauthenticeerde proxy's zonder CLI-lekken | Nee | Nee | Beperkt | **Lokale loopback-relay** |
| Profielisolatie | Browsercontext | Browsercontext | Nee | **Profielmap + bestandsvergrendeling** |
| Offline profielbeheerder (GUI) | Nee | Nee | Nee | **Ombra Desktop (macOS, Linux, Windows)** |
| Migratie vanaf Playwright | — | Importwijziging | Code herschrijven | **Import en `launch()` vervangen** |

## Hoe het werkt

```mermaid
flowchart LR
    Script["Jouw script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP-brug"]
    Relay["Lokale proxy-relay<br/>indien authenticatie vereist is"]
    Engine["Ombra Chromium<br/>in C++ gepatchte engine"]
    Client["Native client<br/>Playwright · Puppeteer"]
    Profile[("Profiel<br/>seed · cookies · opslag")]

    Script -->|"launch()"| SDK
    SDK -->|"verifiëren + starten"| Engine
    SDK -.->|"proxy-authenticatie"| Relay
    Relay -.-> Engine
    SDK -->|"verbinden via CDP"| Client
    Script -->|"pagina-API"| Client
    Client -->|"loopback-CDP"| Engine
    Engine --> Profile
```

1. **`launch()` zoekt of downloadt de engine** en verifieert de Ed25519-handtekening en de SHA-256-checksum.
2. **Profiel en `seed` worden voorbereid.** Een profiel met naam verkrijgt een vergrendeling tussen processen; als de proxy inloggegevens vereist, start de SDK een lokale loopback-relay in het geheugen.
3. **Ombra Chromium start** met het geselecteerde profiel, de fingerprintopties en een lokale debugpoort (`--remote-debugging-port=0`).
4. **De officiële client maakt verbinding.** Zodra `DevToolsActivePort` verschijnt, koppelt de SDK Playwright (met `no_defaults=True`) of Puppeteer via `127.0.0.1` en retourneert het native `Browser`-object.
5. **Netjes afsluiten.** `browser.close()` stuurt `Browser.close`, beëindigt de procesboom van de engine, stopt de relay en geeft de profielvergrendeling vrij.

Na het starten verlaat de SDK het gegevenspad: alle pagina-opdrachten gaan rechtstreeks van Playwright of Puppeteer naar Chromium.

### Grenzen van de SDK en stealth-invarianten

Het [v0.1 SDK-contract (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) legt strikte invarianten op aan elke officiële SDK:

- **Geen stealth-scripts op pagina's.** De SDK roept nooit `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` aan en patcht geen DOM-eigenschappen.
- **Geen `Runtime.enable`.** Gereedheidscontroles gebruiken alleen het lokale CDP HTTP-endpoint of `Browser.getVersion`; de SDK schakelt nooit `Runtime`, `Debugger` of `Log` in.
- **Geen `Emulation.*`-overschrijvingen.** De SDK roept nooit `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` of `setDeviceMetricsOverride` aan — de browseridentiteit komt uit de engine.
- **Standaard geen verboden vlaggen.** De SDK voegt uit zichzelf nooit `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` of `--user-agent` toe.
- **Uitsluitend loopback-CDP.** De debugpoort bindt altijd aan `127.0.0.1`; het meegeven van een niet-loopback `--remote-debugging-address` wordt geweigerd.
- **Geen telemetrie en geen lekken van geheimen.** Proxy-inloggegevens, sleutels en cookies worden weggelakt uit logbestanden en foutmeldingen.

## Python-API

### `launch()`

```python
from ombrabrowser import launch

# Basisstart (standaard headless)
browser = launch()

# Zichtbaar browservenster (headed)
browser = launch(headless=False)

# HTTP- of SOCKS5-proxy (inloggegevens afgehandeld via lokale loopback-relay)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Proxy-object met bypass-lijst
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

# Fingerprintinstellingen (seed, OS, automatische tijdzone/locale via proxy, scherm, GPU)
# Voor timezone="auto" / locale="auto", installeer: pip install "ombrabrowser[geoip]"
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

# Native simulatie van muis, toetsenbord en scrollen
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Zet een exacte engine-build vast en geef extra Chromium-vlaggen mee
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Retourneert een standaard `playwright.sync_api.Browser`. Alle Playwright-methoden werken normaal (`new_page()`, `new_context()`, `close()`, enz.). Nieuwe pagina's gebruiken standaard `no_viewport=True` zodat de vensterafmetingen van het profiel niet worden overschreven.

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

### `launch_context()` en `launch_context_async()`

Hulpfunctie die de browser start en direct een `BrowserContext` retourneert (het sluiten van de context beëindigt ook het engineproces). Extra sleutelwoordargumenten worden doorgestuurd naar `browser.new_context()` — zoals `storage_state`, `permissions` of `extra_http_headers`:

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

Asynchrone tegenhanger: `await launch_context_async(...)`.

### `launch_persistent_context()` en `launch_persistent_context_async()`

Start de browser met een persistent profiel en retourneert de standaard `BrowserContext`. Cookies, `localStorage`, IndexedDB, cache en de fingerprint-`seed` blijven behouden tussen sessies.

- Het meegeven van `profile="pricing-eu"` maakt het profiel aan onder `~/.ombra/profiles/pricing-eu` met metadata in `.ombra/profile.json` en een vergrendelingsbestand.
- Het meegeven van `user_data_dir="./my-profile"` (of een positioneel padargument) gebruikt die expliciete map.
- Het gelijktijdig starten van hetzelfde profiel vanuit een ander proces werpt `ProfileBusyError` in plaats van profielgegevens te beschadigen.

```python
from ombrabrowser import launch_persistent_context

# Via een profiel met naam (opgeslagen in ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookies, opslag en seed blijven bewaard

# Via een expliciet pad (bijvoorbeeld om Chrome-extensies te laden)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Asynchrone tegenhanger: `await launch_persistent_context_async(...)`.

### Hulpfuncties en diagnostiek (Python)

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

# Inspecteer de gevonden engine-binary
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Download en verifieer de engine zonder een browser te starten
ensure_binary(version="158.0.8127.37-3")

# Verwijder door de SDK beheerde engine-binaries (profielen onder ~/.ombra/profiles blijven ongemoeid)
clear_cache()

# Inspecteer het samengestelde startcommando zonder Chromium te starten
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Lees runtime-metadata uit (CDP-poort, ws_url, seed, pid) en controleer de gezondheid van het proces
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # download en verifieer de engine (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # installeer een specifieke engine-build
ombrabrowser info                                # diagnostiek van omgeving, binary en afhankelijkheden (alias: doctor)
ombrabrowser info --quick --json                 # snel machineleesbaar rapport zonder de binary te starten
ombrabrowser info --proxy socks5://user:pass@host:1080  # test detectie van exit-IP, tijdzone en locale via proxy
ombrabrowser update                              # controleer het releasekanaal en werk de gecachete engine bij
ombrabrowser clear-cache                         # wis gecachete engine-binaries (profielen blijven behouden)
ombrabrowser login                               # sla licentiesleutel op in ~/.ombra/license.key (alleen oudere builds)
ombrabrowser logout                              # verwijder opgeslagen licentiesleutel
```

Dezelfde opdrachten zijn beschikbaar via `python -m ombrabrowser <command>`.

## API voor Node.js en TypeScript

`@ombralabs/sdk` levert duale ESM + CommonJS-builds met volledige TypeScript-definities (`.d.ts`). Zowel Playwright als Puppeteer draaien onder de motorkap op dezelfde engine.

### Playwright (standaard)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Basisstart met proxy, fingerprint en invoersimulatie
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

// Handige start: browser + context in één aanroep
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Persistent profiel — cookies, localStorage en seed blijven behouden tussen sessies
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Elk fragment hierboven staat op zichzelf. Om een bestaande Playwright-starter te migreren kun je de import ook vervangen door `import * as chromium from "@ombralabs/sdk"` en `await chromium.launch(...)` behouden.

### Puppeteer

Gebruik `launchPuppeteer()` uit `@ombralabs/sdk` of importeer uit `@ombralabs/sdk/puppeteer`:

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

> **Opmerking over Puppeteer:** Puppeteer verstuurt standaard meer CDP-verkeer dan Playwright met `connectOverCDP({ noDefaults: true })`. Voor sites met strenge CDP-controles wordt Playwright aanbevolen.

### Hulpfuncties en CLI (Node.js)

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

## Vermenselijkte invoer

In Ombra wordt invoersimulatie (`humanize`) **native gecompileerd in het Chromium-browserproces** (aangedreven door `cursory-rs` en de invoerplanner van de engine) in plaats van geïmplementeerd te zijn als een JS-wrapper rond de automatiseringsclient. Dit betekent:

- Elke standaardactie van Playwright en Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) verloopt via één invoerwachtrij per tabblad in de browser.
- Gedragsparameters worden deterministisch afgeleid uit de `seed` van het profiel (`--fingerprint-humanize-seed`).
- De SDK verpakt `Page` of `Browser` nooit in proxyklassen — native types en clientgedrag blijven intact.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Wat verandert er met `humanize=True`:**

| Actie | Zonder `humanize` | Met `humanize=True` |
|---|---|---|
| Muisbeweging | Directe teleportatie | `cursory-rs`-curven met versnelling, pauzes en lichte doorschietbeweging |
| Klikken en slepen | Direct indrukken | Richtpunt binnen het doel, pauze vóór de klik en indruktijd |
| Tekstinvoer | Waarde direct instellen | Typen per teken met ingesteld ritme en toetsenbordindeling, incidentele typefouten en zelfcorrectie; zeer lange tekst wordt geplakt via een geïsoleerd klembord zonder het systeemklembord aan te raken |
| Scrollen | Enkele sprong | Reeks muiswiel-/trackpadevents volgens gemeten vertragingsprofielen |
| Rustintervallen | Statische cursor | In de preset `careful` subtiele cursorbewegingen in rust tussen acties |

**Presets** — `default` (normaal tempo), `careful` (langzamer, weloverwogen, met microbewegingen in rust) en `fast` (hoger tempo). Geef `humanize=False` (`humanize: false`) mee om invoersimulatie expliciet uit te schakelen.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Je kunt de modus tijdens runtime in- of uitschakelen of van preset wisselen zonder de browser opnieuw te starten via het `Ombra` CDP-domein:

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

## Beheer van fingerprints en profielen

De engine leidt een samenhangende browserconfiguratie af uit één enkele `seed`. Wanneer `seed` wordt weggelaten:

| Scenario | Gedrag |
|---|---|
| **`launch()` zonder profiel** | De SDK genereert een willekeurige `seed` voor de sessie en maakt een tijdelijke map aan die na `close()` wordt verwijderd. |
| **`profile="name"` of `user_data_dir="./dir"`** | De `seed` wordt opgeslagen in `.ombra/profile.json` en bij elke start hergebruikt — sites zien een terugkerende bezoeker met hetzelfde apparaat en dezelfde cookies. |
| **`fingerprint={"seed": N, ...}`** | Deterministische fingerprint op basis van de expliciete `seed`; aanvullende velden overschrijven afzonderlijke instellingen terwijl de rest coherent blijft. |

Canvas- en audioruis worden gesleuteld per `eTLD+1` (stabiel op dezelfde site, niet koppelbaar tussen verschillende sites). Pixelruis voor 2D-canvas en WebGL `readPixels` is standaard uitgeschakeld om detectoren voor "Canvas Tampering / Masking" niet te activeren, en kan expliciet worden ingeschakeld via `--fingerprint-pixel-noise`.

> **Tip:** gebruik bij herhaalde bezoeken aan dezelfde site een persistent profiel (`profile="name"` of `launch_persistent_context()`) in plaats van een vaste `seed` mee te geven aan een tijdelijke `launch()` — zo blijven cookies, cache en `localStorage` consistent naast de fingerprint.

### Velden van het `fingerprint`-object

De onderstaande veldnamen volgen Python (`snake_case`); Node.js accepteert zowel `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) als `snake_case`:

| Veld | Type | Beschrijving |
|---|---|---|
| `seed` | `int` (`>= 0`) | Generator-seed die de algehele fingerprintconfiguratie bepaalt |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Doel-OS (`navigator.platform`, UA, GPU- en lettertypepools) |
| `os_version` | `string` | Hint voor de OS-versie ten behoeve van Client Hints |
| `timezone` | IANA-zone of `"auto"` | Tijdzone (bijv. `"Europe/Berlin"`). `"auto"` bepaalt de zone vanaf de proxy-exit via GeoIP |
| `locale` | BCP-47 of `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` bepaalt de locale vanaf de proxy-exit |
| `screen` | `{"width", "height"}` of `"auto"` | Scherm- en werkgebiedafmetingen rekening houdend met de taakbalk / menubalk van het doel-OS |
| `gpu` | `{"vendor", "renderer"}` of `"auto"` | Expliciete WebGL-strings `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` of `"auto"` | Gerapporteerde `navigator.hardwareConcurrency` |
| `device_memory` | `int` of `"auto"` | Gerapporteerde `navigator.deviceMemory` (in GB) |
| `noise` | `bool` | Fingerprintruis in-/uitschakelen (`False` geeft `--disable-fingerprint-noise` mee) |

> Houd `seed` aan als primaire bron van fingerprintparameters: het overschrijven van losse waarden zonder ze op elkaar af te stemmen (zoals het combineren van een OS met een incompatibele GPU) kan tegenstrijdigheden voor detectoren veroorzaken.

### Aanvullende enginevlaggen (`args`)

Vlaggen die door de engine worden ondersteund maar niet automatisch door de SDK worden ingesteld (meegeven via `args=[...]`):

| Vlag | Doel |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Browsermerk in `Sec-CH-UA` (de SDK gebruikt standaard `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | TLS ClientHello-profiel dat overeenkomt met de opgegeven hoofdversie van Chrome (automatisch door de SDK ingesteld op basis van de engineversie) |
| `--webrtc-ip=<ip>` | Vervangend IP-adres in WebRTC ICE-kandidaten zonder echt STUN-verkeer te versturen |
| `--fingerprint-location=<lat,lon>` | Coördinaten die door `navigator.geolocation` worden gerapporteerd |
| `--fingerprint-storage-quota=<MB>` | Opslagquotum dat door `navigator.storage.estimate()` wordt gerapporteerd |
| `--fingerprint-max-touch-points=<N>` | Aantal aanraakpunten (`navigator.maxTouchPoints` en pointer-mediaqueries) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Pixeldichtheid van het scherm (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Kleurdiepte van het scherm |
| `--disable-gpu-fingerprint` | Geef de echte GPU van de host door (WebGL/WebGPU-strings, limieten en extensies) |
| `--disable-gpu-string-spoof` | Geef echte GPU-strings door terwijl andere profielinstellingen behouden blijven |
| `--disable-fingerprint-noise` | Schakel canvas-/WebGL-/audioruis uit terwijl identiteitsparameters actief blijven |
| `--fingerprint-pixel-noise` | Schakel opt-in idempotente pixelruis in voor 2D-canvas en `readPixels` |
| `--profile-label=<text>` | Profiellabel weergegeven in de adresbalk van de browser (alleen UI; onzichtbaar voor webpagina's) |

### Lettertypen instellen op Linux

Minimale Linux-servers en containers missen vaak emoji- en CJK-lettertypen, waardoor verborgen canvastekst en emoji-rendering ongebruikelijke hashes opleveren.

**1. Basislaag (emoji en CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Windows-lettertypen voor Windows-profielen (`os="windows"`):**
Wanneer je een Windows-configuratie op Linux uitvoert, verbetert het installeren van echte lettertypen uit `C:\Windows\Fonts\` (waaronder `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) de samenhang bij lettertype-enumeratie aanzienlijk:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. macOS-lettertypen voor macOS-profielen (`os="macos"`):**
Kopieer op dezelfde manier bij gebruik van `os="macos"` op Linux de lettertypen uit `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` en `/Library/Fonts/` naar `~/.local/share/fonts/mac/` en voer `fc-cache -f` uit.

Plaats lettertypen in een `Dockerfile` in de systeemmap `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Startopties, configuratie en fouten

### Opties van `launch()`

Optienamen volgen de Python-API en het [SDK-contract](../../docs/sdk-contract.md); Node.js gebruikt `camelCase`-equivalenten (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) en accepteert ook `snake_case`-aliassen. Onbekende opties worden geweigerd met `InvalidOptionError`.

| Optie | Standaard | Beschrijving |
|---|---|---|
| `headless` | `true` | Uitvoeren zonder venster (`--headless=new`) |
| `proxy` | geen | Proxy-URL (`http`, `https`, `socks5`) of object; geauthenticeerde proxy's gebruiken een loopback-relay |
| `fingerprint` | geen | Instellingen voor `seed`, OS, tijdzone, locale, scherm, GPU, geheugen en ruis |
| `profile` | geen | Persistent profiel met naam onder `~/.ombra/profiles/<slug>` (sluit elkaar uit met `user_data_dir`) |
| `user_data_dir` | tijdelijk | Expliciet pad naar een profielmap (sluit elkaar uit met `profile`) |
| `args` | `[]` | Extra Chromium-argumenten (ongewijzigd doorgegeven) |
| `binary_path` | automatisch bepaald | Expliciet pad naar een uitvoerbaar enginebestand |
| `version` | env / auto | Vastgezette engineversie (bijvoorbeeld `158.0.8127.37-3`), overschrijft `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Deadline voor het starten van de engine en de CDP-verbinding (1000–600000 ms) |
| `humanize` | standaard van engine | `False`, `True` of `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / bestand | Sleutel voor oudere gelicentieerde builds (niet nodig op `158.0.8127.37-3+`; wordt nooit gelogd) |
| `env` | `{}` | Extra omgevingsvariabelen voor het engineproces |
| `download` | `True` | Automatisch downloaden van een ontbrekende engine-binary toestaan |

### Omgevingsvariabelen

Voorrangsvolgorde: **expliciete startoptie → omgevingsvariabele → profielmetadata → standaardwaarde**.

| Variabele | Standaard | Beschrijving |
|---|---|---|
| `OMBRA_BINARY_PATH` | niet ingesteld | Expliciet pad naar een engine-binary |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Map voor gecachete engines en profielen met naam |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Basis-URL / mirror voor enginedownloads (`none`/`off` schakelt downloads uit) |
| `OMBRA_VERSION` | nieuwste compatibele | Vastgezette engineversie (bijvoorbeeld `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Releasekanaal van de engine: `stable` of `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Bij het starten controleren op nieuwere engine-builds |
| `OMBRA_SKIP_CHECKSUM` | `false` | Alleen voor lokale ontwikkeling: schakelt SHA-256-verificatie uit (logt een waarschuwing) |
| `OMBRA_LICENSE_KEY` | niet ingesteld | Sleutel voor oudere gelicentieerde builds (wordt nooit gelogd) |
| `OMBRA_TIMEOUT_MS` | `30000` | Standaard starttime-out (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Uitgebreidheid van logboek: `error`, `warn`, `info`, `debug` |

### Getypte fouten

Bij elke fout beëindigt de SDK het gestarte engineproces, geeft de profielvergrendeling vrij en werpt een subklasse van `OmbraError` met een stabiele `kind` en `details` waaruit geheimen zijn weggelakt:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

De volledige foutentaxonomie en regels voor opnieuw proberen zijn gedocumenteerd in het [SDK-contract (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Platformen, integraties en containers

### Ondersteunde platformen en runtimes

| Onderdeel | Ondersteuning | Opmerkingen |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Zelfstandige build `158.0.8127.37-3`; Ombra Desktop is ondertekend met Developer ID en genotariseerd |
| **macOS x64 (Intel)** | — | Geen huidige Chromium 158-release |
| **Linux x64** | ✅ | Zelfstandige build `158.0.8127.37-3`; vereist `xz-utils` (`xz`) om `.tar.xz` uit te pakken |
| **Windows x64** | ✅ | Zelfstandige build `158.0.8127.37-3` en installatieprogramma voor Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` wordt automatisch geïnstalleerd met `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` of Puppeteer `>=22` (Puppeteer 25+ vereist Node.js `>=22.12`) |

### Integraties met frameworks en AI-agents

Ombra werkt met elke automatiseringstool en elk AI-agentframework dat een aangepaste Chromium-binary accepteert of via CDP verbindt (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` en andere):

```python
# Optie 1: haal het geverifieerde pad naar de binary en de engine-argumenten op voor je eigen runner
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Optie 2: start via de Ombra SDK en geef het lokale CDP-endpoint door aan je framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Verbind je framework met ws_url of cdp_http — fingerprintinstellingen en humanize
# draaien in de engine en blijven actief voor elke CDP-client
```

### Uitvoeren in Docker en op Linux-servers

Voorbeeld van een `Dockerfile` die de engine vooraf downloadt en verifieert tijdens het bouwen van de image:

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

> **Containers en webservers:**
> - Als jouw container de Chromium-sandbox niet kan initialiseren, geef dan expliciet `--no-sandbox` mee via `args=["--no-sandbox"]` (de SDK voegt deze vlag nooit uit zichzelf toe).
> - Gebruik `Xvfb` om met `headless=False` te draaien op een server zonder beeldscherm (zie [hieronder](#probleemoplossing)).
> - Geef bij het uitvoeren onder `uvicorn` met `uvloop` de optie `--loop asyncio` mee om vastlopers op subprocess-pipes te voorkomen.

## Probleemoplossing

### Site blokkeert de headless-modus

Sommige antibotsystemen controleren gedrags- en renderingverschillen in de headless-modus, zelfs met C++-patches. Draai met `headless=False` op een virtueel scherm via `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Start vervolgens met een residentiële SOCKS5/HTTP-proxy, een persistent profiel, afgestemde tijdzone/locale, `headless=False` en `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Als de blokkades op Linux aanhouden, raadpleeg dan [Lettertypen instellen op Linux](#lettertypen-instellen-op-linux).

### Site vraagt bij elk bezoek opnieuw om verificatie

Wanneer je `launch()` aanroept zonder `profile`, start de browser elke keer met een lege tijdelijke map en een nieuwe `seed`, waardoor de site elke sessie behandelt als een gloednieuwe bezoeker zonder cookies. Stap over op `profile="..."` of `launch_persistent_context(...)` zodat cookies, `localStorage` en `seed` tussen sessies bewaard blijven.

### `ProfileBusyError`

Een profiel met naam of `user_data_dir` kan maar door één proces tegelijk geopend zijn. Wijs aan elke parallelle worker een eigen profielnaam toe (`profile=f"worker-{i}"`). Verouderde vergrendelingen die zijn achtergebleven na gecrashte processen worden automatisch gedetecteerd en opgeruimd.

### Moet ik `playwright install chromium` uitvoeren?

Nee. Ombra draait zijn eigen engine-binary en gebruikt niet de standaard Chromium van Playwright. Op Linux heb je alleen systeembibliotheken en `xz-utils` nodig:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Updaten, wisselen van kanaal en terugdraaien van de engine

Werk de SDK bij naar de nieuwste release:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Test het `beta`-kanaal of zet een exacte engine-build vast / draai deze terug:

```python
# Zet een exacte build vast voor een specifieke start
browser = launch(version="158.0.8127.37-3")
```

```bash
# Of configureer via omgevingsvariabelen / CLI
export OMBRA_VERSION=158.0.8127.37-3
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-3

# Of verwijs naar een lokaal gebouwde binary
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper blokkeert een lokale build

Officiële Ombra-releases voor Apple Silicon macOS zijn ondertekend met een Apple Developer ID-certificaat en genotariseerd. Als je een lokale, niet-ondertekende ontwikkelaarsbuild draait en macOS deze in quarantaine plaatst, verwijder je het quarantaineattribuut eenmalig:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Wachten op een pagina in synchrone Python

In synchrone Playwright pauzeert één lange `time.sleep(15)` na `page.goto()` de eventloop van Playwright, waardoor verificatiepagina's kunnen blijven hangen. Wacht in plaats daarvan in korte stappen met een lichte contextaanroep:

```python
import time

for _ in range(15):
    page.context.cookies()  # houdt Playwright actief zonder de DOM van de pagina aan te raken
    time.sleep(1)
```

Gebruik in asynchrone Python `await asyncio.sleep(...)`; gebruik in Node.js `await new Promise(r => setTimeout(r, ms))`. Vermijd ook frequente `page.wait_for_timeout()`- en onnodige `page.evaluate()`-aanroepen vóór controles, zodat je geen extra CDP-verkeer genereert.

## Beveiliging

- **Authenticiteit en integriteit van de engine.** Vóór het uitpakken verifieert de SDK de Ed25519-handtekening van de release-envelop tegen een vastgezette publieke sleutel en controleert de SHA-256-digest van zowel het archief als het uitvoerbare bestand.
- **Uitsluitend lokale CDP.** De debugpoort bindt strikt aan `127.0.0.1`. Stel een CDP-poort nooit bloot aan een openbaar netwerk zonder extra authenticatie — CDP geeft volledige controle over de browser.
- **Isolatie van geheimen.** Proxy-inloggegevens bestaan alleen in het geheugen van de lokale loopback-relay en verschijnen nooit in procesopdrachtregels, profielmetadata, logbestanden of foutdetails.
- **Geen telemetrie.** De SDK verstuurt geen analyses, crashrapporten of verborgen netwerkpings.

Meld beveiligingsproblemen vertrouwelijk volgens [SECURITY.md](../../SECURITY.md).

## Overzicht van de repository

```text
.
├── README.md                    # Engelse hoofd-README
├── translations/
│   ├── nl/README.md             # dit bestand (Nederlands)
│   ├── ru/README.md             # Russische vertaling
│   └── <locale>/README.md       # 19 aanvullende lokalisaties
├── desktop/                     # Ombra Desktop (Tauri: Rust-catalogus + Vue-UI)
├── docs/
│   ├── architecture.md          # architectuur, vertrouwensgrenzen, levenscyclus
│   ├── sdk-contract.md          # v0.1 startcontract, opties, fouten, invarianten
│   ├── stealth-checkup.md       # checkupmethode (Engels)
│   ├── stealth-checkup.ru.md    # checkupmethode (Russisch)
│   ├── versioning.md            # versionering van SDK, engine en client
│   └── desktop/                 # handleidingen voor lokale Desktop-profielen en sleutels
├── spec/
│   └── schemas/                 # JSON-schema's voor startopties en binary-metadata
├── sdks/
│   ├── manifest.json            # machineleesbaar SDK-register
│   ├── README.md                # SDK-structuur en regels voor bijdragen
│   ├── python/                  # Python-SDK (gepubliceerd als ombrabrowser)
│   ├── node/                    # Node.js- / TypeScript-SDK (gepubliceerd als @ombralabs/sdk)
│   └── ...                      # contract-scaffolds voor andere talen (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # taaloverschrijdende start- en stealth-invariantcases
├── tools/check_repo.py          # validator voor structuur, schema's en links (CI)
└── .github/workflows/ci.yml
```

Deze repository bevat het SDK-contract, schema's, conformiteitscases, documentatie en de broncode van Ombra Desktop. Patches voor de Chromium-engine worden in een aparte repository onderhouden; gecompileerde builds worden gepubliceerd via het downloadkanaal en [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## Veelgestelde vragen

### Is dit een fork van Playwright?

Nee. De SDK verbindt de officiële Playwright- (of Puppeteer-)client via lokale CDP met Ombra Chromium. Alle types, locators, wachttijden en paginaobjecten blijven standaard.

### Is Ombra gratis en heb ik een licentiesleutel nodig?

De broncode van de SDK in deze repository is open source onder de Apache License 2.0. Actuele engine-builds (`158.0.8127.37-3` en nieuwer) en de lokale profielbeheerder Ombra Desktop (`desktop-v1.2.2`) draaien gratis en zelfstandig — zonder account, licentiesleutel, hardware-ID of limiet op het aantal profielen. `license_key` en `OMBRA_LICENSE_KEY` zijn alleen nodig voor oudere gelicentieerde builds.

### Moet ik Ombra Desktop installeren om de SDK te gebruiken?

Nee. De SDK start de engine rechtstreeks als kindproces, waardoor deze geschikt is voor scripts, containers en CI. Ombra Desktop is optioneel wanneer je een lokale profielcatalogus via een GUI wilt beheren.

### Waarin verschilt Ombra van `playwright-stealth`?

`playwright-stealth` injecteert JavaScript in pagina's boven op een reguliere browser, en moderne detectoren herkennen vaak de patches zelf. Ombra compileert zijn aanpassingen in de broncode van Chromium en de SDK injecteert geen scripts in pagina's.

### Kan ik mijn eigen proxy gebruiken?

Ja. Geef een `http://`-, `https://`- of `socks5://`-proxy mee in `proxy`. Wanneer er inloggegevens aanwezig zijn, draait de SDK een lokale loopback-relay zodat ze nooit in procesargumenten verschijnen. Let op dat de eigen `context.request`- / `page.request`-client van Playwright de proxy-instellingen op browserniveau kan omzeilen — voer `fetch()` uit vanuit de paginacontext om te garanderen dat het verkeer via de proxy loopt.

### Welke versies van Playwright en Puppeteer worden ondersteund?

De Python-SDK vereist Playwright `>=1.60,<2.0` (automatisch geïnstalleerd met `ombrabrowser`). De Node.js-SDK ondersteunt `playwright-core@^1.60.0` of `puppeteer-core >=22.0.0`. Zie de [versioneringshandleiding](../../docs/versioning.md) voor compatibiliteitsregels.

### Garandeert Ombra dat elke botcontrole wordt gepasseerd?

Nee. Detectie is een bewegend doel dat afhangt van de site, regio, IP-reputatie, profielgeschiedenis en versie van de detector. Gebruik de [stealth-checkupmethode](../../docs/stealth-checkup.md) om een specifieke configuratie objectief te meten en te volgen.

### Voor welke toepassingen is Ombra gebouwd?

Ombra is gebouwd voor geautoriseerde automatisering, QA-testen, monitoring, onderzoek en het beheren van geïsoleerde werkprofielen. Ongeautoriseerde toegang, credential stuffing en misbruik worden niet ondersteund.

## Bijdragen

Richtlijnen voor bijdragen staan in [CONTRIBUTING.md](../../CONTRIBUTING.md), gedragsregels voor de community in [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) en SDK-instructies in [sdks/README.md](../../sdks/README.md).

- Werk het [SDK-contract](../../docs/sdk-contract.md) en de [schema's](../../spec/schemas) bij voordat je een nieuwe startoptie toevoegt.
- Werk bij wijzigingen in het SDK-gedrag ook de implementatie, tests en gedeelde cases in [conformance](../../conformance/README.md) bij.
- Voer `python3 tools/check_repo.py` uit voordat je een pull request opent om de repositorystructuur en links te valideren.

## Licentie

De SDK-broncode in deze repository is gelicentieerd onder de [Apache License 2.0](../../LICENSE). De licentie verleent geen rechten op handelsmerken van Ombra, de Ombra Chromium-engine of Ombra Desktop — zie [NOTICE](../../NOTICE) voor handelsmerkvoorwaarden en voorwaarden van derden.

## Links

- 🌐 **Website** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Releases (engine & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Changelog** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Bugs & functieverzoeken** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organisatie** — [Ombra Labs](https://github.com/ombralabs)
