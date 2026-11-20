# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

In Python en Node.js start `launch()` Ombra Chromium en krijg je een `Browser`-object van Playwright terug. Gebruik `launchPuppeteer()` voor Puppeteer in Node.js.

**[Installatie](#installatie)** · <a href="../../README.md">English</a>

<details>
<summary>Talen</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Fingerprint-aansturing in Chromium

Ombra regelt de browserfingerprint in Chromium zelf. Dat geldt voor canvas, WebGL, audio, lettertypen, het aantal logische processors, de afmetingen van pagina-elementen, GPU-identificatie, tijdzones en automatiseringssignalen. De engine gebruikt de TLS- en HTTP/2-stack van Chromium en verwerkt mensachtige invoer in het browserproces.

De SDK start de engine lokaal en maakt via het Chrome DevTools Protocol (CDP) verbinding met de automatiseringsclient. Je kunt de SDK in een script, een container of een CI-taak gebruiken zonder de desktopapp van Ombra te installeren.

## Status

De voorbeelden gebruiken de gepubliceerde alfapakketten voor Python en Node.js. Deze repository bevat ook het gedeelde startcontract en de basisstructuur voor acht SDK’s.

| Onderdeel | Status |
|---|---|
| [SDK-contract](../../docs/sdk-contract.md) | Concept `0.1.0` |
| Python-SDK | `0.1.3` alfa · [`ombrabrowser` op PyPI](https://pypi.org/project/ombrabrowser/) |
| Node.js-SDK | `0.1.0` alfa · [`@ombralabs/sdk` op npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Gedeelde schema’s](../../spec/schemas) | Startopties en metadata van het uitvoerbare enginebestand |
| [Conformiteitstests voor meerdere talen](../../conformance) | Gedeelde testgevallen voor beide SDK’s |
| [Stealth-checkup](../../docs/stealth-checkup.md) | Testcriteria en rapportsjabloon |

## Installatie

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Installeer voor Puppeteer `puppeteer-core` in plaats van `playwright-core`. Op de [pakketpagina op npm](https://www.npmjs.com/package/@ombralabs/sdk) staan de ondersteunde versies van Node.js en de clients.

De SDK controleert eerst het pad dat je in Python als `binary_path` of in Node.js als `binaryPath` meegeeft. Daarna kijkt de SDK achtereenvolgens naar `OMBRA_BINARY_PATH`, de enginemap van de desktopapp en de SDK-cache. Vindt de SDK geen engine, dan downloadt en controleert hij er een.

Met `download=False` in Python of `download: false` in Node.js schakel je downloads uit. Roep `ensure_binary()` in Python of `ensureBinary()` in Node.js aan om de engine klaar te zetten zonder een browser te openen.

## Snel aan de slag

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Open bij een profiel met een naam nieuwe pagina’s in de bestaande browsercontext. Zo gebruik je dezelfde cookies en opgeslagen sitegegevens. In dit voorbeeld stel je ook een proxy in.

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

Gebruik `launchPuppeteer()` om een `Browser`-object van Puppeteer te krijgen.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migratie zonder herschrijven

Als je een Python-script van Playwright wilt overzetten, installeer je `ombrabrowser` en wijzig je de import en de aanroep die de browser start. Paginamethoden, typen en selectors blijven van Playwright komen.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

In Node.js wijzig je hiervoor twee regels.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Hoe het werkt

```mermaid
flowchart LR
    Script["Jouw script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + CDP-brug"]
    Engine["Ombra Chromium<br/>gepatchte engine"]
    Client["Native automatiseringsclient"]
    Profile[("Profiel<br/>seed · cookies · extensies")]

    Script -->|launch()| SDK
    SDK -->|starten| Engine
    SDK -->|verbinden via CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` zoekt de engine of downloadt deze en verifieert het uitvoerbare bestand.
2. De SDK kiest de profielmap en de seed. Als de proxy authenticatie vereist, start de SDK een lokale relay.
3. De SDK start Chromium met het gekozen profiel, de startopties en een debugpoort op de loopbackinterface.
4. Zodra `DevToolsActivePort` beschikbaar is, verbindt de SDK Playwright of Puppeteer via CDP met Chromium en geeft hij het `Browser`-object van die client terug.
5. `browser.close()` stopt de engine en geeft de profielvergrendeling vrij.

Na het starten stuurt de client de opdrachten voor pagina’s rechtstreeks naar Chromium.

## SDK-matrix

| Runtime | Gepubliceerd pakket | Browserobject |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Deze repository heeft al mappen voor zes andere SDK’s. In het [SDK-manifest](../../sdks/manifest.json) staan de geplande pakketten en clients. De [SDK-handleiding](../../sdks/README.md) beschrijft de mapstructuur.

| Beoogde runtime | Gepland pakket | Client of retourtype |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Startopties

De optienamen volgen de Python-API en het SDK-contract. In Node.js schrijf je ze in camelCase, bijvoorbeeld `timeoutMs`, `userDataDir` en `binaryPath`.

| Optie | Standaard | Betekenis |
|---|---|---|
| `headless` | `true` | De engine zonder venster uitvoeren |
| `proxy` | geen | Proxy-URL of configuratieobject. Proxy’s met authenticatie gebruiken een lokale relay |
| `fingerprint` | geen | Seed en instellingen voor besturingssysteem, tijdzone, taal en regio, scherm en GPU |
| `profile` | geen | Profiel met een naam dat cookies, sitegegevens en de seed bewaart |
| `user_data_dir` | tijdelijk | Expliciete profielmap, niet te combineren met `profile` |
| `args` | `[]` | Extra engine-flags, ongewijzigd doorgegeven |
| `timeout_ms` | `30000` | Tijd in milliseconden om te starten en de CDP-verbinding op te zetten |
| `humanize` | standaard van de engine | `false`, `true` of een preset |
| `captcha` | `false` | De enginemodule met optionele limieten inschakelen |
| `binary_path` | automatisch bepaald | Een specifieke engine-binary gebruiken |
| `download` | `true` | Een ontbrekende engine-binary downloaden |

Het [SDK-contract](../../docs/sdk-contract.md) beschrijft alle startopties, de fouttypen en het gedrag van profielen.

## Beheer van de engine-binary

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

De SDK controleert vóór het starten de SHA-256-controlesom van de engine. Laat deze controle in productie ingeschakeld. `OMBRA_SKIP_CHECKSUM=1` is bedoeld voor lokale ontwikkelbuilds.

## Configuratie

| Variabele | Standaard | Betekenis |
|---|---|---|
| `OMBRA_BINARY_PATH` | niet ingesteld | Expliciete engine-binary |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Beheerde binaries en benoemde profielen |
| `OMBRA_DOWNLOAD_URL` | release-endpoint | Basis-URL voor het downloaden van binaries |
| `OMBRA_VERSION` | nieuwste compatibele versie | Te bepalen engineversie |
| `OMBRA_AUTO_UPDATE` | `true` | Bij het starten controleren op een nieuwere engine |
| `OMBRA_SKIP_CHECKSUM` | `false` | Alleen voor ontwikkeling |
| `OMBRA_LICENSE_KEY` | niet ingesteld | Wordt aan de engine doorgegeven |
| `OMBRA_TIMEOUT_MS` | `30000` | Standaardtime-out voor het starten, in milliseconden |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

De SDK gebruikt de eerste beschikbare waarde uit achtereenvolgens de startopties, omgevingsvariabelen, profielmetadata en standaardwaarden.

## Vergelijking

| Kenmerk | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright of Puppeteer |
| Patchniveau | geen | JavaScript op de pagina | configuratie-flags | enginebroncode |
| Fingerprint-seed | nee | nee | gedeeltelijk | per profiel |
| Gehumaniseerde invoer | nee | nee | nee | engine |
| Profielisolatie | browsercontext | browsercontext | nee | gebruikersgegevensmap |
| Migratie zonder herschrijven | — | importwijziging | herschrijven | importwijziging |

De resultaten van een detector hangen af van de site, het uitgaande IP-adres en het profiel. De [checkup](../../docs/stealth-checkup.md) beschrijft hoe je die resultaten meet.

## Stealth is een eigenschap van de engine

De engine past de fingerprintinstellingen toe. De SDK’s geven de seed van het profiel en de expliciete startopties aan de engine door.

| Laag | Waar Ombra het regelt |
|---|---|
| TLS en HTTP/2 | De netwerkstack van de Chromium-versie waarop de engine is gebouwd |
| Browseridentiteit | Enginepatches op broncodeniveau, aangestuurd door de seed van het profiel |
| Automatiseringsoppervlak | De engine bevat patches voor WebDriver-signalen. De SDK roept `Runtime.enable` niet aan |
| Invoer | Gehumaniseerde muis-, toetsenbord- en scrolinvoer in het browserproces |
| Netwerkcoherentie | Tijdzone en taal- en regio-instellingen op basis van de proxy |
| Toestand | Een aparte gebruikersgegevensmap per profiel |

### SDK-grenzen

- De CDP-debugpoort accepteert alleen lokale verbindingen via de loopbackinterface.
- De SDK schrijft geen inloggegevens van proxy’s, licentiesleutels of cookies naar de logs. Hij verstuurt geen telemetrie.
- Een bestaand profiel behoudt zijn seed, tenzij je uitdrukkelijk een nieuwe opgeeft.
- De SDK injecteert geen stealthscripts met `addScriptToEvaluateOnNewDocument` of `evaluateOnNewDocument` en wijzigt geen pagina-eigenschappen.
- Om te controleren of de browser klaar is, gebruikt de SDK het HTTP-eindpunt van CDP of `Browser.getVersion`. Hij roept hiervoor nooit `Runtime.enable` aan.
- De engine bepaalt de browseridentiteit. De SDK overschrijft de user-agent of andere identiteitsgegevens niet via Playwright of Puppeteer. Hij roept `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` en `setDeviceMetricsOverride` niet aan.
- De SDK voegt nooit uit zichzelf de vlaggen `--enable-automation`, `--disable-blink-features=AutomationControlled` of `--no-sandbox` toe.

## Stealth-checkup

Voer deze controles uit met de engine-build, de automatiseringsclient en het profiel die je wilt gebruiken.

| Laag | Voorbeelddoelen | Slaagcriteria |
|---|---|---|
| L0 Transport | TrackMe, lekcontroles voor IP/WebRTC | Alleen het uitgaande IP-adres is zichtbaar. JA4 en HTTP/2 komen overeen met de Chromium-build van de engine |
| L1 Identiteit | Lokale probe, Sannysoft, Intoli | Geen tegenstrijdigheden tussen UA, UA-CH, platform, GPU, lettertypen en scherm |
| L2 Fingerprint | CreepJS, FingerprintJS, BrowserScan | Geen aanwijzingen voor headless-gebruik of vervalste waarden. De fingerprint blijft stabiel bij het opnieuw laden |
| L3 Automatisering | rebrowser, brotector, botd | Geen CDP-, init-script- of WebDriver-lekken |
| L4 Gedrag | Invoergetrouwheid, humanize-sporen, Cloudflare-smoketest | Vertrouwde events, realistische volgorde, challenge wordt opgelost |
| L5 Stabiliteit | Seed, workers, iframes, cross-origin | Dezelfde seed levert bij elke start dezelfde persona op |

De testprocedure beschrijft de mogelijke statussen, het opsporen van fouten en het opstellen van een rapport. Lees de [Engelse](../../docs/stealth-checkup.md) of [Russische versie](../../docs/stealth-checkup.ru.md).

Leg bij elk resultaat de engine-build, de clientversie, de profielinstellingen, het uitgaande IP-adres van de proxy en de detectorversie vast. Zo kun je metingen herhalen en vergelijken.

## Repository-overzicht

```text
.
├── README.md                  # Engelse originele versie
├── translations/
│   └── <locale>/README.md
├── desktop/                   # offline profielbeheer
├── docs/
│   ├── desktop/               # documentatie van de profielbeheerder
│   ├── architecture.md        # componenten, startproces, grenzen
│   ├── sdk-contract.md        # startcontract v0 en SDK-gedrag
│   ├── stealth-checkup.md     # methode en runbook voor stealthvalidatie
│   ├── stealth-checkup.ru.md  # Russische vertaling
│   └── versioning.md          # compatibiliteit van SDK, engine en client
├── spec/
│   └── schemas/               # JSON Schema voor startopties en binary-info
├── sdks/
│   ├── manifest.json          # machineleesbaar SDK-register
│   ├── README.md              # opzet en regels voor bijdragen
│   ├── _template/             # basisstructuur voor een nieuwe taal
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # taalneutrale start- en stealthscenario's
├── tools/check_repo.py        # validatie van structuur en links (CI)
└── .github/workflows/ci.yml
```

Deze repository bevat de basisstructuur voor de SDK’s, het startcontract, de conformiteitstests en de offline profielbeheerder. De Chromium-engine en de volledige versie van Desktop 1.2.1 hebben elk een eigen repository. [Broncode en bouwinstructies voor Desktop](../../desktop/README.md) · [Documentatie van de profielbeheerder](../../docs/desktop/README.md)

## Het contract

- `launch(options)` start de engine en geeft het `Browser`-object van de client terug. Daarna communiceert de client rechtstreeks met Chromium via CDP.
- Vóór het starten controleert de SDK het platform en de SHA-256-controlesom van de engine. Als het uitvoerbare bestand ontbreekt en downloads zijn ingeschakeld, downloadt de SDK het.
- Profielen met een naam bewaren cookies, opgeslagen sitegegevens en de seed tussen browsersessies.
- Als het starten mislukt, ruimt de SDK het gestarte proces op en meldt hij een getypeerde fout. De aanroepende code bepaalt of er een nieuwe poging volgt.
- De SDK, de engine en de automatiseringsclient hebben elk hun eigen versiebereik. Vraag de engine-build op met `binary_info()` in Python of `binaryInfo()` in Node.js.

## Compatibiliteit

| Onderdeel | Ondersteund platform of versie |
|---|---|
| Engine | Door de SDK gekozen build, op te vragen met `binary_info()` of `binaryInfo()` |
| macOS | Apple Silicon en Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ met een ondersteunde versie van Playwright |
| Node.js | 20+ met een ondersteunde versie van Playwright of Puppeteer |

De SDK en de engine hebben elk hun eigen versienummers. Zijn de versies niet compatibel, dan noemt de SDK beide versies in een getypeerde fout.

## Bijdragen

De [bijdragehandleiding](../../CONTRIBUTING.md) beschrijft hoe de beoordeling van wijzigingen verloopt. Bouwinstructies staan in de [SDK-handleiding](../../sdks/README.md).

- Als je het gedrag van een SDK wijzigt, pas dan de betreffende implementatie aan en voeg een test of een gedeelde conformiteitstest toe.
- Kopieer voor een nieuwe taal het [SDK-sjabloon](../../sdks/_template), voeg de SDK toe aan het [manifest](../../sdks/manifest.json) en open een concept-pullrequest.
- Werk bij een nieuwe startoptie eerst het [SDK-contract](../../docs/sdk-contract.md) en de [schema’s](../../spec/schemas) bij.
- Wijzigingen aan de stealthfuncties van de engine horen in de repository van de engine. De SDK moet de checkup blijven doorstaan.
- Meld beveiligingsproblemen privé volgens het [beveiligingsbeleid](../../SECURITY.md).

## Veelgestelde vragen

### Is Ombra een fork van Playwright?

Nee. De SDK verbindt de officiële Playwright-client met Ombra Chromium. Je kunt de typen, hulpfuncties en paginaobjecten van Playwright blijven gebruiken.

### Heb ik de desktopapp van Ombra nodig?

De SDK start de engine rechtstreeks. Met de optionele desktopapp kun je profielen handmatig beheren.

### Waarin verschilt Ombra van playwright-stealth?

De fingerprintaanpassingen van Ombra worden in Chromium meegecompileerd. De SDK laat de scripts van de pagina met rust.

### Lost Ombra CAPTCHA’s op?

De engine heeft een optionele CAPTCHA-module. De ondersteuning hangt af van het soort taak, de engine-build en de beschikbare modellen. De SDK geeft de instellingen per start door en stelt de CDP-commando’s van de module beschikbaar.

### Kan ik mijn eigen proxy gebruiken?

Ja. Geef de proxy mee aan `launch()`. Als de proxy authenticatie vereist, houdt een lokale relay de inloggegevens uit de opdrachtregel van de engine.

### Welke versies van Playwright en Puppeteer worden ondersteund?

Elke SDK vermeldt de ondersteunde clientversies in het pakketmanifest. De clients zijn afzonderlijke afhankelijkheden. In de [handleiding voor versiebeheer](../../docs/versioning.md) staan de ondersteunde versiebereiken.

### Doorstaat Ombra elke botcontrole?

Het resultaat hangt af van de site, de regio, de reputatie van het uitgaande IP-adres, de detectorversie en de profielinstellingen. De [stealth-checkup](../../docs/stealth-checkup.md) beschrijft hoe je een specifieke configuratie test.

## Licentie

De SDK-bronnen in deze repository vallen onder de [Apache License 2.0](../../LICENSE). De licentie verleent geen rechten op de Ombra-engine, de naam Ombra of het logo. Zie [NOTICE](../../NOTICE) voor informatie over handelsmerken en vermeldingen van derden.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
