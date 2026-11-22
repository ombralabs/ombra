<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra?style=flat" alt="Licență"></a>
<a href="https://github.com/ombralabs/ombra/commits/main"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Ultimul commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra/stargazers"><img src="https://img.shields.io/github/stars/ombralabs/ombra?style=flat" alt="Stele"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Descărcări PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Descărcări npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Versiune"></a>
</p>

<p align="center">
<a href="#instalare"><strong>Instalare</strong></a> ·
<a href="#api-python">API Python</a> ·
<a href="#api-nodejs-și-typescript">API Node.js</a> ·
<a href="#intrare-umanizată">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Limbi</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium cu controale de amprentă la nivel de cod sursă C++ și intrare umanizată nativă.</h3>

<table><tr><td>
Nu este o colecție de flag-uri de lansare și nici o injecție JavaScript aplicată peste pagină. Este un binar Chromium real, cu patch-uri de amprentă compilate în codul sursă C++ și simulare a interacțiunii care rulează în interiorul procesului browserului. Conectează Playwright sau Puppeteer oficial prin CDP local — fără obiecte wrapper și fără a rescrie codul de automatizare a paginii.
</td></tr></table>

<br>

<p align="center">
Înlocuitor direct pentru lansare în Playwright și Puppeteer pentru Python și Node.js.<br>
Același API, aceiași selectori și tipuri — trebuie doar să schimbi importul și apelul <code>launch()</code>.
</p>

- **Patch-uri Chromium la nivel de cod sursă** — canvas, WebGL, WebGPU, audio, fonturi, GPU, ecran, interogări media CSS, raportare hardware, WebRTC fără scurgeri STUN, TLS ClientHello, fus orar, localizare și eliminarea semnalelor de automatizare (`navigator.webdriver`, `Runtime.enable`, markeri headless).
- **Intrare umanizată nativă în procesul browserului (`humanize=True`)** — traiectoriile cursorului (`cursory-rs`), clicurile țintite cu durată de apăsare, ritmul de tastare cu autocorectarea greșelilor și fizica derulării rulează în interiorul Chromium. SDK-ul returnează un obiect `Browser` nativ, simplu, fără wrapper-e proxy.
- **Funcționare autonomă fără chei sau conturi** — build-urile actuale ale motorului și Ombra Desktop rulează local fără înregistrare, chei de licență, ID-uri hardware sau un server de licențiere.
- **Instalare automată și verificare criptografică a binarului** — `pip install ombrabrowser` sau `npm install @ombralabs/sdk`; la prima lansare, SDK-ul descarcă un build compatibil de pe [GitHub Releases](https://github.com/ombralabs/ombra/releases) și îi verifică semnătura Ed25519 și suma de control SHA-256.
- **Profiluri persistente și releu proxy sigur** — profilurile cu nume păstrează cookie-urile, `localStorage`, IndexedDB și `seed` între rulări cu blocare inter-proces; proxy-urile autentificate (HTTP, HTTPS, SOCKS5) trec printr-un releu loopback local, astfel încât datele de autentificare nu apar niciodată în argumentele procesului.
- **Manager de profiluri offline Ombra Desktop** — o aplicație desktop nativă din acest depozit ([`desktop/`](../../desktop/README.md)) cu pachete de instalare precompilate pentru macOS, Linux și Windows.

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

Puppeteer este de asemenea suportat prin `import { launch } from "@ombralabs/sdk/puppeteer"` sau `launchPuppeteer()` ([detalii](#puppeteer)).

**Pentru site-urile cu protecție anti-bot**, combină un proxy rezidențial, un profil persistent și setări de mediu coerente:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # IP-ul rezidențial este preferat față de cel de datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # potrivește fusul orar și localizarea cu ieșirea proxy-ului
    headless=False,                                      # unele site-uri detectează diferențele modului headless
    humanize=True,                                       # simulare nativă pentru mouse, tastatură și derulare
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

Consultă secțiunea [Depanare](#depanare) pentru problemele frecvente pe Linux, în containere și pe ținte protejate.

## Instalare

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opțional: detectare automată a fusului orar și localizării din ieșirea proxy-ului (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Cu Playwright (1.60.0+, nu este necesară descărcarea Chromium standard)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Sau cu Puppeteer (Puppeteer 25+ necesită Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Opțional: cititor offline de baze de date GeoIP pentru timezone: "auto" și locale: "auto"
npm install mmdb-lib
```

---

La lansare, SDK-ul localizează motorul într-o ordine strictă: `binary_path` (`binaryPath` în Node.js), `OMBRA_BINARY_PATH`, directorul de motoare Ombra Desktop și cache-ul SDK (`~/.ombra/engines`). Dacă nu este găsit niciun motor compatibil, SDK-ul descarcă un build de pe [GitHub Releases](https://github.com/ombralabs/ombra/releases), îi verifică semnătura Ed25519 și suma de control SHA-256 și îl stochează local în cache. Rularea `playwright install chromium` nu este necesară.

Pentru a dezactiva descărcările automate, pasează `download=False` (`download: false` în Node.js). Pentru a descărca și verifica motorul în avans (de exemplu în timpul construirii unui container), apelează `ensure_binary()` (`ensureBinary()`) sau folosește comanda CLI `install`.

> **Lansare autonomă:** build-urile actuale ale motorului sunt gratuite și nu necesită cont sau cheie de licență. `OMBRA_LICENSE_KEY` și comanda `login` rămân disponibile doar pentru compatibilitatea cu build-uri mai vechi cu licență.

**Migrarea de la Playwright** necesită două linii — toate operațiile pe pagină, locatorii și așteptările rămân neschimbate:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # restul codului tău funcționează neschimbat
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ Acordă o **Stea (Star)** depozitului dacă îți este util și folosește **[Watch releases](https://github.com/ombralabs/ombra/subscription)** pentru a primi notificări despre noile build-uri ale motorului, SDK-ului și Ombra Desktop.

---

## Stare actuală și versiuni

Fiecare componentă din ecosistem respectă contractul comun de lansare și este versionată independent.

| Componentă | Stare / versiune | Locație |
|---|---|---|
| **Contract SDK** | Draft `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK Python** | Alpha `0.2.0` | [`ombrabrowser` pe PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK Node.js / TypeScript** | Alpha `0.2.0` | [`@ombralabs/sdk` pe npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Motor Ombra Chromium** | Interval SDK `>=151.0.7922.108,<159` | Descărcat automat de SDK de pe [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Manager de profiluri offline | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Browser independent** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Scheme și conformitate** | JSON Schema + cazuri comune | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../AGENTS.md#sdk-conformance-and-stealth-invariants) |
| **Metodă de audit stealth** | 6 straturi (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Consultă [CHANGELOG.md](../../CHANGELOG.md) pentru istoricul complet al versiunilor.

## De ce Ombra

- **Patch-urile la nivel de configurare și JavaScript cedează ușor.** Instrumente precum `playwright-stealth`, `puppeteer-extra` și `undetected-chromedriver` injectează JavaScript în pagini sau ajustează flag-uri de lansare. Actualizările Chrome le strică frecvent, iar detectorii moderni identifică chiar patch-urile în sine (`Function.prototype.toString`, anomalii de prototip, `addScriptToEvaluateOnNewDocument`).
- **Modificările sunt compilate în codul sursă Chromium.** Amprentele sunt generate la nivel de C++ și aplicate consecvent în cadrul principal, în workeri și în iframe-uri. SDK-ul nu injectează scripturi în pagini și nu aplică suprascrieri `Emulation.*`.
- **Simularea intrării rulează în procesul browserului, nu peste Playwright.** Deoarece traiectoriile mouse-ului, apăsările de taste și derularea sunt gestionate chiar în Chromium, SDK-ul nu încapsulează obiectele Playwright sau Puppeteer — toți locatorii, cadrele și bibliotecile terțe continuă să funcționeze normal.
- **Arhitectură locală fără servicii suplimentare.** Niciun daemon de control în fundal și niciun salt de rețea între scriptul tău și browser: un singur proces al motorului, CDP local pe loopback la `127.0.0.1` și nicio limită privind numărul de profiluri sau concurența.

## Ombra Desktop

**Un manager de profiluri local, offline, cu interfață grafică (GUI).** Codul său sursă se află direct în acest depozit ([`desktop/`](../../desktop/README.md)) și este construit cu Tauri (Rust + Vue).

- **Complet offline și local** — catalogul de profiluri stă într-o bază de date SQLite locală pe mașina ta, cu o cheie de criptare locală; nu necesită cont, serviciu cloud sau acces la rețea.
- **Gestionare structurată a profilurilor** — creează profiluri, caută după nume, notă sau număr, editează descrieri și organizează intrările cu grupuri, etichete, marcaje și semne de carte în catalogul Rust.
- **Coș de gunoi sigur** — mutarea unui profil în Coșul de gunoi păstrează fișierele acestuia pe disc, astfel încât îl poți restaura ulterior.
- **Fără limite per profil** — fără planuri tarifare pe număr de profiluri sau cote în cloud: toate datele rămân ale tale.
- **Instalatoare precompilate** — macOS Apple Silicon (`.dmg`, semnat cu Apple Developer ID și notarizat), Linux (`.deb` și `.rpm`) și Windows x64 (`setup.exe`).
- **Cataloage izolate** — setează `OMBRA_DESKTOP_DATA_DIR` pentru a lucra cu un catalog separat de test sau o copie de siguranță.

[Descarcă cea mai recentă versiune →](https://github.com/ombralabs/ombra/releases) · [README Desktop](../../desktop/README.md) · [Ghid pentru profiluri și chei locale](../../docs/desktop/README.md)

## Verificarea amprentei și auditul de stealth

În loc să facă promisiuni absolute de tipul „100% nedetectabil”, Ombra se bazează pe o procedură de verificare repetabilă, în condiții înregistrate. Rezultatele reale pe orice site depind întotdeauna de reputația IP-ului de ieșire, regiune, istoricul profilului, versiunea detectorului și configurația de lansare.

### Suprafețe gestionate de motor și SDK

| Suprafață / semnal | Playwright standard | Ombra | Implementare |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Patch C++ în motor |
| `window.chrome` | lipsește în headless | obiect complet | Corespunde cu Chrome obișnuit |
| `navigator.plugins` | `0` în headless | set coerent de pluginuri | La nivel de motor |
| User-Agent și Client Hints | `HeadlessChrome`, neconcordanță de brand | `Google Chrome` + `Sec-CH-UA*` aliniat | Patch `010-user-agent-and-webdriver` |
| Artefacte CDP (`Runtime.enable`, `UtilityScript`) | semnalate de detectori | suprimate de motor; SDK-ul nu apelează niciodată `Runtime.enable` | Patch `110-runtime-enable` + invariant `SI-01` |
| Scurgere IP WebRTC | expune IP-ul local/gazdă | raportează IP-ul de ieșire fără a trimite pachete STUN reale | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS și HTTP/2 | depinde de configurare | stiva de rețea Chromium + profil ClientHello `chrome-<major>` | Patch `210-tls-network-persona` |
| WebGL și WebGPU | randare software / neconcordanță GPU | limite WebGL/WebGPU și tabele de extensii unificate | Patch-uri `070`, `071`, `075`, `955` |
| Fonturi, localizare și fus orar | valori ale gazdei, deviații `Intl` | tabele coerente de fonturi, localizare ICU și fus orar | Patch-uri `040`, `090`, `092`, `230` |
| Simulare a intrării | teleportare cursor, `fill()` instantaneu | curbe `cursory-rs`, ritm de tastare, fizică de derulare | Patch `135-ombra-humanize` în procesul browserului |
| Stabilitatea amprentei | se schimbă sau expune gazda | deterministă per `seed` între reporniri și cadre | Patch-uri `001`, `002` + profil persistent |

### Cele șase straturi ale verificării

Înainte de a lansa sau implementa o configurație, rulează toate cele șase straturi de verificare folosind exact build-ul motorului, clientul de automatizare și proxy-ul pe care intenționezi să le utilizezi:

| Strat | Exemple de ținte | Criterii de promovare |
|---|---|---|
| **L0 Transport** | TrackMe, pagini de verificare a scurgerilor IP/WebRTC, echo de antete | Este vizibil doar IP-ul de ieșire al proxy-ului; JA4 și HTTP/2 corespund build-ului Chromium; fără credențiale proxy în argv |
| **L1 Identitate** | Sondă locală, Sannysoft, Intoli, verificare UA-CH | Nicio contradicție între UA, Client Hints, platformă, GPU, fonturi, ecran și localizare |
| **L2 Amprentă** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Fără markeri headless sau `lie`; amprenta rămâne stabilă la reîncărcări |
| **L3 Automatizare** | rebrowser, brotector, botd, audit de comenzi CDP | Fără scurgeri de `Runtime.enable`, init-script, binding sau `navigator.webdriver` |
| **L4 Comportament** | Sondă de fidelitate a intrării, urme humanize, test smoke live de verificare | Evenimente `isTrusted: true`, ordine și temporizare naturale, curbe realiste ale cursorului și derulare naturală |
| **L5 Stabilitate** | Lansări repetate, workeri, iframe-uri same/cross-origin, paritate între SDK-uri | Același `seed` reproduce o amprentă identică în toate contextele |

Procedura completă, statusurile (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), lista de verificare a semnalelor și șablonul de raport: [Engleză (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) și [Rusă (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Comparație

| Funcționalitate | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API de automatizare | Playwright | Playwright | Selenium | **Playwright și Puppeteer** |
| Nivelul patch-urilor | Niciunul | Injecție JS în pagină | Flag-uri de configurare | **Cod sursă C++ (Chromium)** |
| `seed` coerent al amprentei | Nu | Nu | Parțial | **Da, per profil și eTLD+1** |
| Simulare a intrării (`humanize`) | Nu | Nu | Nu | **Integrată în procesul browserului** |
| Suprimarea scurgerilor `Runtime.enable` / CDP | Nu | Nu | Parțial | **Patch în motor + invarianți SDK** |
| Proxy-uri autentificate fără scurgeri în CLI | Nu | Nu | Limitat | **Releu loopback local** |
| Izolarea profilurilor | Context de browser | Context de browser | Nu | **Director de profil + blocare pe fișier** |
| Manager de profiluri offline (GUI) | Nu | Nu | Nu | **Ombra Desktop (macOS, Linux, Windows)** |
| Migrare de la Playwright | — | Schimbarea importului | Rescrierea codului | **Înlocuirea importului și a `launch()`** |

## Cum funcționează

```mermaid
flowchart LR
    Script["Scriptul tău<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + punte CDP"]
    Relay["Releu proxy local<br/>când este necesară autentificarea"]
    Engine["Ombra Chromium<br/>motor cu patch-uri C++"]
    Client["Client nativ<br/>Playwright · Puppeteer"]
    Profile[("Profil<br/>seed · cookie-uri · stocare")]

    Script -->|"launch()"| SDK
    SDK -->|"verificare + pornire"| Engine
    SDK -.->|"autentificare proxy"| Relay
    Relay -.-> Engine
    SDK -->|"conectare prin CDP"| Client
    Script -->|"API de pagină"| Client
    Client -->|"CDP loopback"| Engine
    Engine --> Profile
```

1. **`launch()` localizează sau descarcă motorul** și îi verifică semnătura Ed25519 și suma de control SHA-256.
2. **Sunt pregătite profilul și `seed`-ul.** Un profil cu nume obține o blocare inter-proces; dacă proxy-ul necesită autentificare, SDK-ul pornește un releu loopback în memorie.
3. **Pornește Ombra Chromium** cu profilul selectat, opțiunile de amprentă și un port local de depanare (`--remote-debugging-port=0`).
4. **Se conectează clientul oficial.** De îndată ce apare `DevToolsActivePort`, SDK-ul atașează Playwright (cu `no_defaults=True`) sau Puppeteer pe `127.0.0.1` și returnează obiectul nativ `Browser`.
5. **Închidere curată.** `browser.close()` trimite `Browser.close`, încheie arborele de procese al motorului, oprește releul și eliberează blocarea profilului.

După lansare, SDK-ul iese din calea datelor: toate comenzile pe pagină circulă direct între Playwright sau Puppeteer și Chromium.

### Limitele SDK și invarianții de stealth

[Contractul SDK v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) impune invarianți stricți fiecărui SDK oficial:

- **Niciun script de stealth pe pagini.** SDK-ul nu apelează niciodată `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` și nu modifică proprietăți DOM.
- **Fără `Runtime.enable`.** Verificările de pregătire folosesc doar endpoint-ul HTTP CDP local sau `Browser.getVersion`; SDK-ul nu activează niciodată `Runtime`, `Debugger` sau `Log`.
- **Fără suprascrieri `Emulation.*`.** SDK-ul nu apelează niciodată `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` sau `setDeviceMetricsOverride` — identitatea browserului provine din motor.
- **Fără flag-uri interzise în mod implicit.** SDK-ul nu injectează niciodată din proprie inițiativă `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` sau `--user-agent`.
- **Doar CDP pe loopback.** Portul de depanare se leagă întotdeauna la `127.0.0.1`; pasarea unei adrese `--remote-debugging-address` care nu este loopback este respinsă.
- **Fără telemetrie și fără scurgeri de secrete.** Credențialele proxy, cheile și cookie-urile sunt eliminate din jurnale și din mesajele de eroare.

## API Python

### `launch()`

```python
from ombrabrowser import launch

# Lansare de bază (headless în mod implicit)
browser = launch()

# Fereastră vizibilă de browser (headed)
browser = launch(headless=False)

# Proxy HTTP sau SOCKS5 (credențialele sunt gestionate printr-un releu loopback local)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Obiect proxy cu listă de ocolire (bypass)
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

# Controale de amprentă (seed, OS, fus orar/localizare automată din proxy, ecran, GPU)
# Pentru timezone="auto" / locale="auto", instalează: pip install "ombrabrowser[geoip]"
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

# Simulare nativă pentru mouse, tastatură și derulare
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Fixează un build exact al motorului și pasează flag-uri Chromium suplimentare
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Returnează un `playwright.sync_api.Browser` standard. Toate metodele Playwright funcționează normal (`new_page()`, `new_context()`, `close()` etc.). Paginile noi folosesc implicit `no_viewport=True`, astfel încât dimensiunile ferestrei profilului să nu fie suprascrise.

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

### `launch_context()` și `launch_context_async()`

Funcție auxiliară convenabilă care lansează browserul și returnează direct un `BrowserContext` (închiderea contextului oprește și procesul motorului). Argumentele suplimentare cu nume sunt transmise către `browser.new_context()` — de exemplu `storage_state`, `permissions` sau `extra_http_headers`:

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

Echivalentul asincron: `await launch_context_async(...)`.

### `launch_persistent_context()` și `launch_persistent_context_async()`

Lansează browserul cu un profil persistent și returnează `BrowserContext`-ul său implicit. Cookie-urile, `localStorage`, IndexedDB, cache-ul și `seed`-ul amprentei persistă între sesiuni.

- Pasarea `profile="pricing-eu"` creează profilul în `~/.ombra/profiles/pricing-eu` cu metadate în `.ombra/profile.json` și un fișier de blocare.
- Pasarea `user_data_dir="./my-profile"` (sau a unui argument pozițional de cale) utilizează acel director explicit.
- Lansarea aceluiași profil simultan dintr-un alt proces ridică `ProfileBusyError` în loc să corupă datele profilului.

```python
from ombrabrowser import launch_persistent_context

# După profil cu nume (stocat în ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookie-urile, stocarea și seed-ul sunt păstrate

# După cale explicită (de exemplu, pentru a încărca extensii Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Echivalentul asincron: `await launch_persistent_context_async(...)`.

### Funcții utilitare și diagnosticare (Python)

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

# Inspectează binarul motorului rezolvat
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Descarcă și verifică motorul fără a lansa un browser
ensure_binary(version="158.0.8127.37-3")

# Elimină binarele motorului gestionate de SDK (profilurile din ~/.ombra/profiles rămân intacte)
clear_cache()

# Previzualizare dry-run a comenzii de lansare rezolvate fără a porni Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Citește metadatele de execuție (port CDP, ws_url, seed, pid) și verifică starea procesului
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # descarcă și verifică motorul (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # instalează un build specific al motorului
ombrabrowser info                                # diagnosticare mediu, binar și dependențe (alias: doctor)
ombrabrowser info --quick --json                 # raport rapid în format JSON fără a porni binarul
ombrabrowser info --proxy socks5://user:pass@host:1080  # testează IP-ul de ieșire, fusul orar și localizarea prin proxy
ombrabrowser update                              # verifică GitHub Releases și actualizează motorul din cache
ombrabrowser clear-cache                         # șterge binarele motorului din cache (profilurile sunt păstrate)
ombrabrowser login                               # salvează cheia de licență în ~/.ombra/license.key (doar build-uri vechi)
ombrabrowser logout                              # șterge cheia de licență salvată
```

Aceleași comenzi sunt disponibile și prin `python -m ombrabrowser <command>`.

## API Node.js și TypeScript

`@ombralabs/sdk` oferă build-uri duale ESM + CommonJS cu definiții TypeScript complete (`.d.ts`). Atât Playwright, cât și Puppeteer rulează pe același motor dedesubt.

### Playwright (implicit)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Lansare de bază cu proxy, amprentă și simulare a intrării
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

// Lansare convenabilă: browser + context într-un singur apel
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Profil persistent — cookie-urile, localStorage și seed-ul persistă între rulări
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Fiecare fragment de cod de mai sus este independent. Pentru a migra un cod existent de lansare Playwright, poți de asemenea să înlocuiești importul cu `import * as chromium from "@ombralabs/sdk"` și să păstrezi `await chromium.launch(...)`.

### Puppeteer

Folosește `launchPuppeteer()` din `@ombralabs/sdk` sau importă din `@ombralabs/sdk/puppeteer`:

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

> **Notă despre Puppeteer:** Puppeteer trimite mai mult trafic CDP implicit decât Playwright folosit cu `connectOverCDP({ noDefaults: true })`. Pentru site-urile cu verificări CDP stricte, este recomandat Playwright.

### Utilitare și CLI (Node.js)

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

## Intrare umanizată

În Ombra, simularea intrării (`humanize`) este compilată **nativ în procesul browserului Chromium** (alimentată de `cursory-rs` și planificatorul de intrare al motorului), în loc să fie implementată ca un wrapper JavaScript în jurul clientului de automatizare. Aceasta înseamnă:

- Fiecare acțiune standard Playwright și Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) trece printr-o singură coadă de intrare per filă, în interiorul browserului.
- Parametrii comportamentali sunt derivați determinist din `seed`-ul profilului (`--fingerprint-humanize-seed`).
- SDK-ul nu încapsulează niciodată `Page` sau `Browser` în clase proxy — tipurile native și comportamentul clientului rămân intacte.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Ce se schimbă cu `humanize=True`:**

| Acțiune | Fără `humanize` | Cu `humanize=True` |
|---|---|---|
| Mișcarea mouse-ului | Teleportare instantanee | Curbe `cursory-rs` cu accelerare, pauze și ușoară depășire a țintei |
| Clicuri și trageri | Apăsare instantanee | Punct de țintire în interiorul elementului, pauză înainte de clic și durată de menținere |
| Introducere de text | Setare instantanee a valorii | Tastare caracter cu caracter conform ritmului și aranjamentului de tastatură configurate, greșeli ocazionale cu autocorectare; textele foarte lungi sunt lipite printr-un clipboard izolat fără a atinge clipboard-ul sistemului |
| Derulare | Salt unic | Serie de evenimente de rotiță/trackpad care urmează profiluri măsurate de decelerare |
| Intervale de inactivitate | Cursor static | În presetarea `careful`, derivă subtilă a cursorului în repaus între acțiuni |

**Presetări** — `default` (ritm normal), `careful` (mai lent, deliberat, cu micro-mișcări în repaus) și `fast` (ritm mai rapid). Pasează `humanize=False` (`humanize: false`) pentru a dezactiva explicit simularea intrării.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Poți comuta modul sau schimba presetările în timpul execuției fără a reporni browserul, prin domeniul CDP `Ombra`:

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

## Gestionarea amprentei și a profilurilor

Motorul derivă o configurație coerentă a browserului dintr-un singur `seed`. Când `seed` este omis:

| Scenariu | Comportament |
|---|---|
| **`launch()` fără profil** | SDK-ul generează un `seed` aleatoriu pentru sesiune și creează un director temporar care este șters după `close()`. |
| **`profile="name"` sau `user_data_dir="./dir"`** | `seed`-ul este salvat în `.ombra/profile.json` și reutilizat la fiecare lansare — site-urile văd un vizitator care revine cu același dispozitiv și aceleași cookie-uri. |
| **`fingerprint={"seed": N, ...}`** | Amprentă deterministă din `seed`-ul explicit; câmpurile suplimentare suprascriu setări individuale păstrând restul coerent. |

Zgomotul canvas/audio are cheie per `eTLD+1` (stabil pe același site, necorelabil între site-uri diferite). Zgomotul la nivel de pixel pentru canvas 2D și WebGL `readPixels` este dezactivat implicit pentru a evita declanșarea detectorilor de tip „Canvas Tampering / Masking” și poate fi activat explicit prin `--fingerprint-pixel-noise`.

> **Sfat:** când revii pe același site, folosește un profil persistent (`profile="name"` sau `launch_persistent_context()`) în loc să pasezi un `seed` fix către un `launch()` efemer — astfel, cookie-urile, cache-ul și `localStorage` rămân consecvente împreună cu amprenta.

### Câmpurile obiectului `fingerprint`

Numele câmpurilor de mai jos respectă convenția Python (`snake_case`); Node.js acceptă atât `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`), cât și `snake_case`:

| Câmp | Tip | Descriere |
|---|---|---|
| `seed` | `int` (`>= 0`) | Valoarea seed a generatorului care determină configurația generală a amprentei |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Sistemul de operare țintă (`navigator.platform`, UA, seturile de GPU și fonturi) |
| `os_version` | `string` | Indiciu de versiune a sistemului de operare pentru Client Hints |
| `timezone` | zonă IANA sau `"auto"` | Fus orar (de ex. `"Europe/Berlin"`). `"auto"` rezolvă zona din ieșirea proxy-ului prin GeoIP |
| `locale` | BCP-47 sau `"auto"` | Localizare (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` rezolvă localizarea din ieșirea proxy-ului |
| `screen` | `{"width", "height"}` sau `"auto"` | Dimensiunile ecranului și ale zonei de lucru, ținând cont de bara de activități / bara de meniu a sistemului de operare țintă |
| `gpu` | `{"vendor", "renderer"}` sau `"auto"` | Șiruri explicite WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` sau `"auto"` | Valoarea raportată de `navigator.hardwareConcurrency` |
| `device_memory` | `int` sau `"auto"` | Valoarea raportată de `navigator.deviceMemory` (în GB) |
| `noise` | `bool` | Activează/dezactivează zgomotul de amprentă (`False` pasează `--disable-fingerprint-noise`) |

> Păstrează `seed` ca sursă principală pentru parametrii amprentei: suprascrierea valorilor individuale fără a le menține aliniate (cum ar fi asocierea unui sistem de operare cu un GPU incompatibil) poate introduce contradicții vizibile pentru detectori.

### Flag-uri suplimentare ale motorului (`args`)

Flag-uri suplimentare ale motorului (setează sau suprascrie prin `args=[...]`):

| Flag | Scop |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Brandul browserului în `Sec-CH-UA` (SDK-ul folosește implicit `chrome`) |
| `--fingerprint-tls-profile=chrome-<major>` | Profil TLS ClientHello corespunzător versiunii majore Chrome specificate (setat automat de SDK din versiunea motorului) |
| `--webrtc-ip=<ip>` | Adresa IP de substituție în candidații ICE WebRTC fără a trimite trafic STUN real |
| `--fingerprint-location=<lat,lon>` | Coordonatele raportate de `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Cota de stocare raportată de `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Numărul de puncte tactile (`navigator.maxTouchPoints` și interogări media pointer) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Densitatea de pixeli a afișajului (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Adâncimea de culoare a ecranului |
| `--disable-gpu-fingerprint` | Transmite GPU-ul real al gazdei (șiruri, limite și extensii WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | Transmite șirurile GPU reale păstrând celelalte setări ale profilului |
| `--disable-fingerprint-noise` | Dezactivează zgomotul canvas/WebGL/audio păstrând activi parametrii de identitate (setat și de `fingerprint={"noise": False}`) |
| `--fingerprint-pixel-noise` | Activează explicit zgomotul idempotent la nivel de pixel pentru canvas 2D și `readPixels` |
| `--profile-label=<text>` | Eticheta profilului afișată în bara de adrese a browserului (doar UI; setată automat din `profile`, pasează prin `args` doar când `profile` nu este setat) |

### Configurarea fonturilor pe Linux

Serverele și containerele Linux minimale nu dispun adesea de fonturi emoji și CJK, ceea ce face ca randarea ascunsă a textului și a emoji-urilor pe canvas să producă hash-uri neobișnuite.

**1. Stratul de bază (emoji și CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Fonturi Windows pentru profiluri Windows (`os="windows"`):**
Când rulezi o configurație Windows pe Linux, instalarea fonturilor reale din `C:\Windows\Fonts\` (inclusiv `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) îmbunătățește semnificativ coerența enumerării fonturilor:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Fonturi macOS pentru profiluri macOS (`os="macos"`):**
În mod similar, când folosești `os="macos"` pe Linux, copiază fonturile din `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` și `/Library/Fonts/` în `~/.local/share/fonts/mac/` și rulează `fc-cache -f`.

Într-un `Dockerfile`, plasează fonturile în directorul de sistem `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Opțiuni de lansare, configurare și erori

### Opțiunile `launch()`

Numele opțiunilor urmează API-ul Python și [contractul SDK](../../docs/sdk-contract.md); Node.js folosește echivalentele `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) și acceptă de asemenea alias-uri `snake_case`. Opțiunile necunoscute sunt respinse cu `InvalidOptionError`.

| Opțiune | Implicit | Descriere |
|---|---|---|
| `headless` | `true` | Rulează fără fereastră (`--headless=new`) |
| `proxy` | niciunul | URL proxy (`http`, `https`, `socks5`) sau obiect; proxy-urile autentificate folosesc un releu loopback |
| `fingerprint` | niciunul | Setări pentru `seed`, sistem de operare, fus orar, localizare, ecran, GPU, memorie și zgomot |
| `profile` | niciunul | Profil persistent cu nume în `~/.ombra/profiles/<slug>` (se exclude reciproc cu `user_data_dir`) |
| `user_data_dir` | temporar | Cale explicită către directorul profilului (se exclude reciproc cu `profile`) |
| `args` | `[]` | Argumente Chromium suplimentare (transmise nemodificate) |
| `binary_path` | rezolvat | Cale explicită către un executabil al motorului |
| `version` | mediu / auto | Fixarea versiunii motorului (de exemplu, `158.0.8127.37-3`), suprascrie `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Termen limită pentru pornirea motorului și conexiunea CDP (1000–600000 ms) |
| `humanize` | implicitul motorului | `False`, `True` sau `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | mediu / fișier | Cheie pentru build-urile vechi cu licență (nu este necesară pentru build-urile actuale; nu este niciodată înregistrată în jurnale) |
| `env` | `{}` | Variabile de mediu suplimentare pentru procesul motorului |
| `download` | `True` | Permite descărcarea automată a unui binar de motor lipsă |

### Variabile de mediu

Ordinea de prioritate: **opțiune explicită de lansare → variabilă de mediu → metadate de profil → valoare implicită**.

| Variabilă | Implicit | Descriere |
|---|---|---|
| `OMBRA_BINARY_PATH` | nesetată | Cale explicită către un binar al motorului |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Directorul pentru motoarele din cache și profilurile cu nume |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Sursa de descărcare a motorului; un URL personalizat activează modul oglindă vechi (`none`/`off` dezactivează descărcările) |
| `OMBRA_VERSION` | cea mai recentă compatibilă | Versiune fixată a motorului (de exemplu, `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Canalul de lansare al motorului: `stable` (versiuni GitHub) sau `beta` (versiuni preliminare GitHub) |
| `OMBRA_AUTO_UPDATE` | `true` | Verifică existența unor build-uri mai noi ale motorului la lansare |
| `OMBRA_SKIP_CHECKSUM` | `false` | Doar pentru dezvoltare locală: dezactivează verificarea SHA-256 (afișează un avertisment în jurnal) |
| `OMBRA_LICENSE_KEY` | nesetată | Cheie pentru build-urile vechi cu licență (nu este niciodată înregistrată în jurnale) |
| `OMBRA_TIMEOUT_MS` | `30000` | Timeout implicit de lansare (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Nivelul de detaliere al jurnalelor: `error`, `warn`, `info`, `debug` |

### Erori tipizate

La orice eșec, SDK-ul oprește procesul motorului pornit, eliberează blocarea profilului și ridică o subclasă `OmbraError` care conține un `kind` stabil și câmpul `details` curățat de secrete:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

Taxonomia completă a erorilor și regulile de reîncercare sunt documentate în [contractul SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Platforme, integrări și containere

### Platforme și medii de execuție suportate

| Componentă | Suport | Note |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Build-uri autonome ale motorului prin GitHub Releases; Ombra Desktop este semnat cu Developer ID și notarizat |
| **macOS x64 (Intel)** | — | Nu există o versiune curentă de Chromium 158 |
| **Linux x64** | ✅ | Build-uri autonome ale motorului prin GitHub Releases; SDK-ul Node.js necesită `xz-utils` (`xz`) pentru a extrage `.tar.xz` |
| **Windows x64** | ✅ | Build-uri autonome ale motorului prin GitHub Releases și instalator Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` este instalat automat împreună cu `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` sau Puppeteer `>=22` (Puppeteer 25+ necesită Node.js `>=22.12`) |

### Integrări cu framework-uri și agenți AI

Ombra funcționează cu orice instrument de automatizare sau framework de agenți AI care acceptă un binar Chromium personalizat sau se conectează prin CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` și altele):

```python
# Opțiunea 1: rezolvă calea binarului verificat și argumentele rulabile ale motorului pentru propriul tău runner
# Notă: build_launch_options() este un helper dry-run — pasează explicit user_data_dir și seed
# (profilurile cu nume și proxy-urile autentificate necesită Opțiunea 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opțiunea 2: lansează prin Ombra SDK și transmite endpoint-ul CDP local framework-ului tău
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Conectează framework-ul la ws_url sau cdp_http — setările de amprentă și humanize
# rulează în interiorul motorului și rămân active pentru orice client CDP
```

### Rularea în Docker și pe servere Linux

Exemplu de `Dockerfile` care descarcă și verifică motorul din timp, la construirea imaginii:

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

> **Containere și servere web:**
> - Dacă containerul tău nu poate inițializa sandbox-ul Chromium, pasează explicit `--no-sandbox` prin `args=["--no-sandbox"]` (SDK-ul nu adaugă niciodată acest flag din proprie inițiativă).
> - Pentru a rula cu `headless=False` pe un server fără ecran, folosește `Xvfb` (vezi [mai jos](#depanare)).
> - Când rulezi sub `uvicorn` cu `uvloop`, pasează `--loop asyncio` pentru a evita blocările pe pipe-urile subproceselor.

## Depanare

### Site-ul blochează modul headless

Unele sisteme anti-bot verifică diferențele comportamentale și de randare din modul headless chiar și cu patch-uri C++. Rulează cu `headless=False` pe un afișaj virtual folosind `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Apoi lansează cu un proxy rezidențial SOCKS5/HTTP, un profil persistent, fus orar și localizare aliniate, `headless=False` și `humanize=True` (vezi exemplul `launch_persistent_context()` de la începutul acestui README).

Dacă blocările continuă pe Linux, verifică secțiunea [Configurarea fonturilor pe Linux](#configurarea-fonturilor-pe-linux).

### Site-ul solicită verificare la fiecare vizită

Apelarea `launch()` fără `profile` pornește de fiecare dată dintr-un director temporar gol și cu un `seed` nou, astfel încât site-ul tratează fiecare rulare ca pe un vizitator complet nou, fără cookie-uri. Treci la `profile="..."` sau `launch_persistent_context(...)` pentru ca cookie-urile, `localStorage` și `seed`-ul să se păstreze între rulări.

### `ProfileBusyError`

Un profil cu nume sau un `user_data_dir` poate fi deschis doar într-un singur proces la un moment dat. Atribuie un nume de profil distinct fiecărui worker paralel (`profile=f"worker-{i}"`). Blocările învechite lăsate în urmă de procesele blocate brusc sunt detectate și curățate automat.

### Este necesar să rulez `playwright install chromium`?

Nu. Ombra rulează propriul binar al motorului și nu folosește Chromium-ul standard al Playwright. Pe Linux ai nevoie doar de bibliotecile de sistem și `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Actualizarea, schimbarea canalului și revenirea la o versiune anterioară a motorului

Actualizează SDK-ul la cea mai recentă versiune:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Testează canalul `beta` sau fixează / revino la un build exact al motorului:

```python
# Fixează un build exact pentru o lansare specifică
browser = launch(version="158.0.8127.37-3")
```

```bash
# Testează canalul beta (dezactivează OMBRA_VERSION — o fixare exactă -N ignoră canalul)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Sau fixează / revino la un build exact al motorului
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Sau indică un binar compilat local
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper blochează o compilare locală

Versiunile oficiale Ombra pentru macOS Apple Silicon sunt semnate cu un certificat Apple Developer ID și notarizate. Dacă rulezi o compilare locală de dezvoltare nesemnată și macOS o plasează în carantină, șterge o singură dată atributul de carantină:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Așteptarea pe o pagină în Python sincron

În Playwright sincron, un singur apel lung `time.sleep(15)` după `page.goto()` oprește bucla de evenimente a Playwright, ceea ce poate bloca paginile de verificare. Așteaptă în intervale scurte cu un apel ușor de context în schimb:

```python
import time

for _ in range(15):
    page.context.cookies()  # menține procesarea Playwright fără a atinge DOM-ul paginii
    time.sleep(1)
```

În Python asincron folosește `await asyncio.sleep(...)`; în Node.js folosește `await new Promise(r => setTimeout(r, ms))`. De asemenea, evită apelurile frecvente `page.wait_for_timeout()` și apelurile `page.evaluate()` inutile înainte de verificări, pentru a nu genera trafic CDP suplimentar.

## Securitate

- **Autenticitatea și integritatea motorului.** Înainte de extragere, SDK-ul verifică semnătura Ed25519 a plicului de lansare față de o cheie publică fixată și verifică amprenta SHA-256 atât pentru arhivă, cât și pentru executabil.
- **CDP strict local.** Portul de depanare se leagă strict la `127.0.0.1`. Nu expune niciodată un port CDP într-o rețea publică fără autentificare suplimentară — CDP oferă control deplin asupra browserului.
- **Izolarea secretelor.** Credențialele proxy există doar în memoria releului loopback local și nu apar niciodată în liniile de comandă ale proceselor, în metadatele profilului, în jurnale sau în detaliile erorilor.
- **Fără telemetrie.** SDK-ul nu trimite date de analiză, rapoarte de eroare sau ping-uri ascunse în rețea.

Raportează problemele de securitate în mod privat conform [SECURITY.md](../../SECURITY.md).

## Harta depozitului

```text
.
├── README.md                    # README principal (English)
├── translations/
│   ├── ro/README.md             # acest fișier (Română)
│   └── <locale>/README.md       # încă 20 de localizări
├── desktop/                     # Ombra Desktop (Tauri: catalog Rust + UI Vue)
├── docs/
│   ├── architecture.md          # arhitectură, limite de încredere, ciclu de viață
│   ├── sdk-contract.md          # contract de lansare v0.2, opțiuni, erori, invarianți
│   ├── stealth-checkup.md       # metodă de verificare (English)
│   ├── stealth-checkup.ru.md    # metodă de verificare (Русский)
│   ├── versioning.md            # versionarea SDK-ului, motorului și clienților
│   └── desktop/                 # ghiduri Desktop pentru profiluri și chei locale
├── spec/
│   └── schemas/                 # JSON Schema pentru opțiuni de lansare și metadate binare
├── sdks/
│   ├── manifest.json            # registru SDK prelucrabil automat
│   ├── README.md                # structura SDK-urilor și reguli de contribuție
│   ├── python/                  # SDK Python (publicat ca ombrabrowser)
│   ├── node/                    # SDK Node.js / TypeScript (publicat ca @ombralabs/sdk)
│   └── ...                      # schelete de contract pentru alte limbaje (Go, Rust, C#, Java, PHP, Ruby)
├── tools/check_repo.py          # validator de structură, scheme și linkuri (CI)
└── .github/workflows/ci.yml
```

Acest depozit găzduiește contractul SDK, schemele, cazurile de conformitate, documentația și codul sursă Ombra Desktop. Patch-urile motorului Chromium sunt întreținute într-un depozit separat, iar build-urile compilate sunt publicate pe [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## Întrebări frecvente

### Este acesta un fork de Playwright?

Nu. SDK-ul conectează clientul oficial Playwright (sau Puppeteer) la Ombra Chromium prin CDP local. Toate tipurile, locatorii, așteptările și obiectele de pagină rămân standard.

### Este Ombra gratuit și am nevoie de o cheie de licență?

Codul sursă al SDK-ului din acest depozit este open source sub licența Apache License 2.0. Build-urile actuale ale motorului și managerul local de profiluri Ombra Desktop rulează gratuit și autonom — fără cont, cheie de licență, ID hardware sau limită a numărului de profiluri. `license_key` și `OMBRA_LICENSE_KEY` sunt necesare doar pentru build-urile vechi cu licență.

### Trebuie să instalez Ombra Desktop pentru a folosi SDK-ul?

Nu. SDK-ul pornește motorul direct ca proces copil, ceea ce îl face potrivit pentru scripturi, containere și CI. Ombra Desktop este opțional dacă dorești să gestionezi un catalog local de profiluri printr-o interfață grafică.

### Prin ce se diferențiază Ombra de `playwright-stealth`?

`playwright-stealth` injectează JavaScript în pagini peste un browser obișnuit, iar detectorii moderni identifică frecvent chiar patch-urile în sine. Ombra își compilează modificările în codul sursă Chromium, iar SDK-ul nu injectează scripturi în pagini.

### Pot folosi propriul meu proxy?

Da. Pasează un proxy `http://`, `https://` sau `socks5://` în `proxy`. Când sunt prezente credențiale, SDK-ul rulează un releu loopback local, astfel încât acestea nu apar niciodată în argumentele procesului. Reține că propriul client `context.request` / `page.request` al Playwright poate ocoli setările proxy de la nivelul browserului — pentru a garanta că traficul trece prin proxy, execută `fetch()` din contextul paginii.

### Ce versiuni de Playwright și Puppeteer sunt suportate?

SDK-ul Python necesită Playwright `>=1.60,<2.0` (instalat automat împreună cu `ombrabrowser`). SDK-ul Node.js suportă `playwright-core@^1.60.0` sau `puppeteer-core >=22.0.0`. Consultă [ghidul de versionare](../../docs/versioning.md) pentru regulile de compatibilitate.

### Garantează Ombra trecerea tuturor verificărilor anti-bot?

Nu. Detecția este o țintă în continuă mișcare care depinde de site, regiune, reputația IP-ului, istoricul profilului și versiunea detectorului. Folosește [metoda de verificare stealth](../../docs/stealth-checkup.md) pentru a măsura și urmări obiectiv o configurație specifică.

### Pentru ce cazuri de utilizare este construit Ombra?

Ombra este construit pentru automatizare autorizată, testare QA, monitorizare, cercetare și gestionarea profilurilor de lucru izolate. Accesul neautorizat, credential stuffing-ul și abuzul nu sunt suportate.

## Contribuții

Ghidul de contribuție se află în [CONTRIBUTING.md](../../CONTRIBUTING.md), standardele comunității în [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md), iar instrucțiunile pentru SDK în [sdks/README.md](../../sdks/README.md).

- Actualizează [contractul SDK](../../docs/sdk-contract.md) și [schemele](../../spec/schemas) înainte de a adăuga o nouă opțiune de lansare.
- Când modifici comportamentul SDK-ului, actualizează implementarea, testele și cazurile comune din [conformance](../../AGENTS.md#sdk-conformance-and-stealth-invariants).
- Rulează `python3 tools/check_repo.py` înainte de a deschide un pull request pentru a valida structura depozitului și linkurile.

## Licență

Codul sursă al SDK-ului din acest depozit este licențiat sub [Apache License 2.0](../../LICENSE). Licența nu acordă drepturi asupra mărcilor comerciale Ombra, motorului Ombra Chromium sau Ombra Desktop — consultă [NOTICE](../../NOTICE) pentru termenii privind mărcile comerciale și terții.

## Linkuri

- 🌐 **Site web** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Versiuni (motor & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Jurnal de modificări** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Bug-uri și cereri de funcționalități** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organizație** — [Ombra Labs](https://github.com/ombralabs)
