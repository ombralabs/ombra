<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra?style=flat" alt="Licenza"></a>
<a href="https://github.com/ombralabs/ombra/commits/main"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Ultimo commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra/stargazers"><img src="https://img.shields.io/github/stars/ombralabs/ombra?style=flat" alt="Stelle"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Download PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Download npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Rilascio"></a>
</p>

<p align="center">
<a href="#installazione"><strong>Installazione</strong></a> ·
<a href="#api-python">API Python</a> ·
<a href="#api-nodejs-e-typescript">API Node.js</a> ·
<a href="#input-umanizzato">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Lingue</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium con controlli del fingerprint a livello di sorgente C++ e input umanizzato nativo.</h3>

<table><tr><td>
Non è un insieme di flag di avvio né un'iniezione di JavaScript sopra la pagina. È un vero binario Chromium con patch del fingerprint compilate nel codice sorgente C++ e simulazione dell'input eseguita all'interno del processo del browser. Collega Playwright o Puppeteer ufficiali via CDP locale — nessun oggetto wrapper e nessuna riscrittura del codice della pagina.
</td></tr></table>

<br>

<p align="center">
Sostituzione diretta dell'avvio per Playwright e Puppeteer in Python e Node.js.<br>
Stessa API, stessi selettori e tipi — basta sostituire l'import e la chiamata <code>launch()</code>.
</p>

- **Patch di Chromium a livello di codice sorgente** — canvas, WebGL, WebGPU, audio, font, GPU, schermo, media query CSS, reportistica hardware, WebRTC senza leak STUN, TLS ClientHello, fuso orario, locale e rimozione dei segnali di automazione (`navigator.webdriver`, `Runtime.enable`, indicatori headless).
- **Input umanizzato nativo nel processo del browser (`humanize=True`)** — traiettorie del puntatore (`cursory-rs`), clic mirati con durata di pressione, cadenza di digitazione con autocorrezione degli errori di battitura e fisica dello scorrimento sono eseguiti dentro Chromium. L'SDK restituisce un normale `Browser` nativo senza wrapper proxy.
- **Funzionamento autonomo senza chiavi o account** — le build attuali del motore e Ombra Desktop girano in locale senza registrazione, chiavi di licenza, ID hardware o server di licenze.
- **Installazione automatica e verifica crittografica del binario** — `pip install ombrabrowser` o `npm install @ombralabs/sdk`; al primo avvio, l'SDK scarica una build compatibile da [GitHub Releases](https://github.com/ombralabs/ombra/releases) e ne verifica la firma Ed25519 e il checksum SHA-256.
- **Profili persistenti e relay proxy sicuro** — i profili con nome mantengono cookie, `localStorage`, IndexedDB e `seed` tra un'esecuzione e l'altra con blocco tra processi; i proxy autenticati (HTTP, HTTPS, SOCKS5) passano attraverso un relay loopback locale così le credenziali non compaiono mai negli argomenti del processo.
- **Gestore di profili offline Ombra Desktop** — un'applicazione desktop nativa in un repository separato ([`ombralabs/manager`](https://github.com/ombralabs/manager), `GPL-3.0-only`) con installer precompilati per macOS, Linux e Windows.

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

Anche Puppeteer è supportato tramite `import { launch } from "@ombralabs/sdk/puppeteer"` o `launchPuppeteer()` ([dettagli](#puppeteer)).

**Per i siti con protezione anti-bot**, combina un proxy residenziale, un profilo persistente e impostazioni d'ambiente coerenti:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # un IP residenziale è preferibile a uno da datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # allinea fuso orario e locale all'uscita del proxy
    headless=False,                                      # alcuni siti rilevano differenze in modalità headless
    humanize=True,                                       # simulazione nativa di mouse, tastiera e scorrimento
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

Consulta [Risoluzione dei problemi](#risoluzione-dei-problemi) per i problemi comuni su Linux, nei container e sui target protetti.

## Installazione

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opzionale: rilevamento automatico di fuso orario e locale dall'uscita del proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Con Playwright (1.60.0+, non è necessario scaricare il Chromium standard)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Oppure con Puppeteer (Puppeteer 25+ richiede Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Opzionale: lettore di database GeoIP offline per timezone: "auto" e locale: "auto"
npm install mmdb-lib
```

---

All'avvio, l'SDK risolve il motore in ordine rigoroso: `binary_path` (`binaryPath` in Node.js), `OMBRA_BINARY_PATH`, la directory del motore di Ombra Desktop e la cache dell'SDK (`~/.ombra/engines`). Se non viene trovato alcun motore compatibile, l'SDK scarica una build da [GitHub Releases](https://github.com/ombralabs/ombra/releases), ne verifica la firma Ed25519 e il checksum SHA-256, e la salva nella cache locale. Non è necessario eseguire `playwright install chromium`.

Per disabilitare il download automatico, passa `download=False` (`download: false` in Node.js). Per scaricare e verificare il motore in anticipo (ad esempio durante la build di un container), chiama `ensure_binary()` (`ensureBinary()`) oppure usa il comando CLI `install`.

> **Avvio autonomo:** le build attuali del motore sono gratuite e non richiedono alcun account né chiave di licenza. `OMBRA_LICENSE_KEY` e il comando `login` restano disponibili solo per compatibilità con build precedenti con licenza.

**Migrare da Playwright** richiede due righe — tutte le operazioni sulla pagina, i locator e le attese rimangono invariati:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # il resto del tuo codice funziona invariato
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Metti una stella (Star)** al repository se lo trovi utile e attiva **[Watch releases](https://github.com/ombralabs/ombra/subscription)** per ricevere notifiche sulle nuove build del motore, dell'SDK e di Ombra Desktop.

---

## Stato attuale e release

Ogni componente dell'ecosistema segue il contratto di avvio condiviso ed è versionato in modo indipendente.

| Componente | Stato / versione | Posizione |
|---|---|---|
| **Contratto SDK** | Bozza `0.2.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK Python** | Alpha `0.2.0` | [`ombrabrowser` su PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK Node.js / TypeScript** | Alpha `0.2.0` | [`@ombralabs/sdk` su npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Motore Ombra Chromium** | Intervallo SDK `>=151.0.7922.108,<159` | Scaricato automaticamente dall'SDK da [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Gestore di profili offline | [`ombralabs/manager`](https://github.com/ombralabs/manager) · [GitHub Releases](https://github.com/ombralabs/manager/releases) |
| **Browser standalone** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Schemi e conformità** | JSON Schema + casi condivisi | [`spec/schemas`](../../AGENTS.md#sdk-launch-options-and-binary-info-schemas) · [`conformance`](../../AGENTS.md#sdk-conformance-and-stealth-invariants) |
| **Metodo di checkup stealth** | 6 livelli (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Consulta [CHANGELOG.md](../../CHANGELOG.md) per la cronologia completa delle release.

## Perché Ombra

- **Le patch a livello di configurazione e in JS si rompono facilmente.** Strumenti come `playwright-stealth`, `puppeteer-extra` e `undetected-chromedriver` iniettano JavaScript nelle pagine o modificano i flag di avvio. Gli aggiornamenti di Chrome li compromettono regolarmente e i sistemi di rilevamento moderni individuano le patch stesse (`Function.prototype.toString`, anomalie dei prototipi, `addScriptToEvaluateOnNewDocument`).
- **Le modifiche sono compilate nel codice sorgente di Chromium.** I fingerprint vengono generati a livello C++ e applicati in modo coerente su frame principale, worker e iframe. L'SDK non inietta alcuno script nelle pagine e non esegue override `Emulation.*`.
- **La simulazione dell'input vive nel processo del browser, non sopra Playwright.** Poiché traiettorie del mouse, battute da tastiera e scorrimento sono gestiti direttamente dentro Chromium, l'SDK non incapsula gli oggetti di Playwright o Puppeteer — ogni locator, frame e libreria di terze parti continua a funzionare normalmente.
- **Architettura locale senza servizi aggiuntivi.** Nessun demone di control-plane in background e nessun hop di rete tra il tuo script e il browser: un solo processo motore, CDP loopback locale su `127.0.0.1` e nessun limite sul numero di profili o sulla concorrenza.

## Ombra Desktop

**Un gestore di profili locale e offline con interfaccia grafica.** Il suo codice sorgente si trova in un repository separato ([`ombralabs/manager`](https://github.com/ombralabs/manager), con licenza `GPL-3.0-only`) ed è realizzato con Tauri (Rust + Vue).

- **Completamente offline e locale** — il catalogo dei profili risiede in un database SQLite locale sulla tua macchina con una chiave di cifratura locale; non è richiesto alcun account, servizio cloud o accesso di rete.
- **Gestione strutturata dei profili** — crea profili, cerca per nome, nota o numero, modifica le descrizioni e organizza le voci con gruppi, tag, etichette e segnalibri nel catalogo Rust.
- **Cestino sicuro** — spostare un profilo nel Cestino mantiene i suoi file su disco così da poterlo ripristinare in seguito.
- **Nessun limite per profilo** — nessun piano basato sul numero di profili né quote cloud: tutti i dati restano tuoi.
- **Installer precompilati** — macOS Apple Silicon (`.dmg`, firmato con Apple Developer ID e notarizzato), Linux (`.deb` e `.rpm`) e Windows x64 (`setup.exe`).
- **Cataloghi isolati** — imposta `OMBRA_DESKTOP_DATA_DIR` per lavorare con un catalogo di test separato o una copia di backup.

[Scarica l'ultima release →](https://github.com/ombralabs/manager/releases) · [README di Desktop](https://github.com/ombralabs/manager/blob/main/README.md) · [Guida ai profili e alle chiavi locali](https://github.com/ombralabs/manager/blob/main/docs/README.md)

## Verifica del fingerprint e checkup stealth

Invece di fare promesse generiche di «non rilevabilità al 100%», Ombra si affida a una procedura di verifica ripetibile in condizioni documentate. I risultati reali su qualsiasi sito dipendono sempre dalla reputazione dell'IP di uscita, dalla regione, dalla cronologia del profilo, dalla versione del sistema di rilevamento e dalla configurazione di avvio.

### Superfici gestite dal motore e dall'SDK

| Superficie / segnale | Playwright standard | Ombra | Implementazione |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Patch C++ del motore |
| `window.chrome` | assente in headless | oggetto completo | Corrisponde a Chrome standard |
| `navigator.plugins` | `0` in headless | set coerente di plugin | A livello di motore |
| User-Agent e Client Hints | `HeadlessChrome`, discrepanza del brand | `Google Chrome` + `Sec-CH-UA*` allineati | Patch `010-user-agent-and-webdriver` |
| Artefatti CDP (`Runtime.enable`, `UtilityScript`) | segnalati dai rilevatori | soppressi dal motore; l'SDK non chiama mai `Runtime.enable` | Patch `110-runtime-enable` + invariante `SI-01` |
| Leak IP WebRTC | espone l'IP locale/host | segnala l'IP di uscita senza inviare STUN reali | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS e HTTP/2 | dipende dalla configurazione | stack di rete Chromium + profilo ClientHello `chrome-<major>` | Patch `210-tls-network-persona` |
| WebGL e WebGPU | renderer software / discrepanza GPU | limiti e tabelle di estensioni WebGL/WebGPU unificati | Patch `070`, `071`, `075`, `955` |
| Font, locale e fuso orario | valori dell'host, deriva di `Intl` | tabelle di font coerenti, locale ICU e fuso orario | Patch `040`, `090`, `092`, `230` |
| Simulazione dell'input | teletrasporto del cursore, `fill()` istantaneo | curve `cursory-rs`, ritmo di digitazione, fisica di scorrimento | Patch `135-ombra-humanize` nel processo del browser |
| Stabilità del fingerprint | cambia o espone l'host | deterministico per `seed` tra riavvii e frame | Patch `001`, `002` + profilo persistente |

### I sei livelli del checkup

Prima di rilasciare o distribuire una configurazione, esegui tutti e sei i livelli del checkup utilizzando esattamente la build del motore, il client di automazione e il proxy che intendi adoperare:

| Livello | Target di esempio | Criteri di superamento |
|---|---|---|
| **L0 Trasporto** | TrackMe, pagine di test leak IP/WebRTC, echo degli header | È visibile solo l'IP di uscita del proxy; JA4 e HTTP/2 corrispondono alla build di Chromium; nessuna credenziale proxy in argv |
| **L1 Identità** | Sonda locale, Sannysoft, Intoli, verifica UA-CH | Nessuna contraddizione tra UA, Client Hints, piattaforma, GPU, font, schermo e locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Nessun indicatore headless o `lie`; il fingerprint resta stabile tra i ricaricamenti |
| **L3 Automazione** | rebrowser, brotector, botd, audit dei comandi CDP | Nessun leak di `Runtime.enable`, init-script, binding o `navigator.webdriver` |
| **L4 Comportamento** | Sonda di fedeltà dell'input, tracce humanize, smoke test su verifiche reali | Eventi `isTrusted: true`, ordine e tempistiche naturali, curve del puntatore e scorrimento realistici |
| **L5 Stabilità** | Avvii ripetuti, worker, iframe same/cross-origin, parità tra SDK | Lo stesso `seed` riproduce un fingerprint identico in tutti i contesti |

Procedura completa, stati (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), checklist dei segnali e modello di report: [inglese (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) e [russo (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Confronto

| Funzionalità | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API di automazione | Playwright | Playwright | Selenium | **Playwright e Puppeteer** |
| Livello delle patch | Nessuno | Iniezione JS nella pagina | Flag di configurazione | **Codice sorgente C++ (Chromium)** |
| `seed` coerente del fingerprint | No | No | Parziale | **Sì, per profilo ed eTLD+1** |
| Simulazione dell'input (`humanize`) | No | No | No | **Integrata nel processo del browser** |
| Soppressione di `Runtime.enable` / leak CDP | No | No | Parziale | **Patch del motore + invarianti SDK** |
| Proxy autenticati senza leak da CLI | No | No | Limitato | **Relay loopback locale** |
| Isolamento dei profili | Contesto del browser | Contesto del browser | No | **Directory del profilo + lock su file** |
| Gestore di profili offline (GUI) | No | No | No | **Ombra Desktop (macOS, Linux, Windows)** |
| Migrazione da Playwright | — | Cambio di import | Riscrittura del codice | **Sostituzione di import e `launch()`** |

## Come funziona

```mermaid
flowchart LR
    Script["Il tuo script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + bridge CDP"]
    Relay["Relay proxy locale<br/>quando è richiesta l'autenticazione"]
    Engine["Ombra Chromium<br/>Motore con patch C++"]
    Client["Client nativo<br/>Playwright · Puppeteer"]
    Profile[("Profilo<br/>seed · cookie · storage")]

    Script -->|"launch()"| SDK
    SDK -->|"verifica + avvia"| Engine
    SDK -.->|"auth proxy"| Relay
    Relay -.-> Engine
    SDK -->|"connessione via CDP"| Client
    Script -->|"API della pagina"| Client
    Client -->|"CDP loopback"| Engine
    Engine --> Profile
```

1. **`launch()` individua o scarica il motore** e ne verifica la firma Ed25519 e il checksum SHA-256.
2. **Vengono preparati il profilo e il `seed`.** Un profilo con nome acquisisce un blocco tra processi; se il proxy richiede credenziali, l'SDK avvia un relay loopback in memoria.
3. **Ombra Chromium si avvia** con il profilo selezionato, le opzioni del fingerprint e una porta di debug locale (`--remote-debugging-port=0`).
4. **Il client ufficiale si connette.** Non appena appare `DevToolsActivePort`, l'SDK collega Playwright (con `no_defaults=True`) o Puppeteer su `127.0.0.1` e restituisce l'oggetto `Browser` nativo.
5. **Chiusura pulita.** `browser.close()` invia `Browser.close`, termina l'albero dei processi del motore, arresta il relay e rilascia il blocco del profilo.

Dopo l'avvio, l'SDK esce dal percorso dei dati: tutti i comandi sulla pagina viaggiano direttamente da Playwright o Puppeteer verso Chromium.

### Confini dell'SDK e invarianti stealth

Il [contratto SDK v0.2 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) impone invarianti rigorosi a ogni SDK ufficiale:

- **Nessuno script stealth nelle pagine.** L'SDK non chiama mai `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` e non modifica mai le proprietà del DOM.
- **Nessun `Runtime.enable`.** I controlli di disponibilità usano solo l'endpoint HTTP CDP locale o `Browser.getVersion`; l'SDK non abilita mai `Runtime`, `Debugger` o `Log`.
- **Nessun override `Emulation.*`.** L'SDK non chiama mai `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` o `setDeviceMetricsOverride` — l'identità del browser proviene dal motore.
- **Nessun flag vietato per impostazione predefinita.** L'SDK non inserisce mai autonomamente `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` o `--user-agent`.
- **Solo CDP loopback.** La porta di debug si lega sempre a `127.0.0.1`; passare un `--remote-debugging-address` non loopback viene rifiutato.
- **Nessuna telemetria e nessun leak di segreti.** Credenziali proxy, chiavi e cookie vengono oscurati nei log e nei messaggi di errore.

## API Python

### `launch()`

```python
from ombrabrowser import launch

# Avvio base (headless per impostazione predefinita)
browser = launch()

# Finestra del browser visibile (headed)
browser = launch(headless=False)

# Proxy HTTP o SOCKS5 (credenziali gestite tramite relay loopback locale)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Oggetto proxy con lista di esclusione (bypass)
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

# Controlli del fingerprint (seed, OS, fuso orario/locale automatici dal proxy, schermo, GPU)
# Per timezone="auto" / locale="auto", installa: pip install "ombrabrowser[geoip]"
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

# Simulazione nativa di mouse, tastiera e scorrimento
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Blocca una build esatta del motore e passa flag Chromium aggiuntivi
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Restituisce un `playwright.sync_api.Browser` standard. Tutti i metodi di Playwright funzionano normalmente (`new_page()`, `new_context()`, `close()`, ecc.). Le nuove pagine usano per impostazione predefinita `no_viewport=True` così le dimensioni della finestra del profilo non vengono sovrascritte.

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

### `launch_context()` e `launch_context_async()`

Helper di comodità che avvia il browser e restituisce direttamente un `BrowserContext` (chiudere il contesto termina anche il processo del motore). Gli argomenti nominati aggiuntivi vengono inoltrati a `browser.new_context()` — ad esempio `storage_state`, `permissions` o `extra_http_headers`:

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

Controparte asincrona: `await launch_context_async(...)`.

### `launch_persistent_context()` e `launch_persistent_context_async()`

Avvia il browser con un profilo persistente e restituisce il suo `BrowserContext` predefinito. Cookie, `localStorage`, IndexedDB, cache e il `seed` del fingerprint persistono tra le sessioni.

- Passare `profile="pricing-eu"` crea il profilo in `~/.ombra/profiles/pricing-eu` con i metadati in `.ombra/profile.json` e un file di lock.
- Passare `user_data_dir="./my-profile"` (o un percorso come argomento posizionale) utilizza quella directory esplicita.
- Avviare lo stesso profilo contemporaneamente da un altro processo solleva `ProfileBusyError` invece di corrompere i dati del profilo.

```python
from ombrabrowser import launch_persistent_context

# Tramite profilo con nome (salvato in ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookie, storage e seed vengono salvati

# Tramite percorso esplicito (ad esempio per caricare estensioni Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Controparte asincrona: `await launch_persistent_context_async(...)`.

### Funzioni di utilità e diagnostica (Python)

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

# Ispeziona il binario del motore risolto
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Scarica e verifica il motore senza avviare un browser
ensure_binary(version="158.0.8127.37-3")

# Rimuove i binari del motore gestiti dall'SDK (i profili in ~/.ombra/profiles restano intatti)
clear_cache()

# Anteprima dry-run del comando di avvio risolto senza avviare Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Legge i metadati di esecuzione (porta CDP, ws_url, seed, pid) e verifica lo stato del processo
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # scarica e verifica il motore (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # installa una build specifica del motore
ombrabrowser info                                # diagnostica di ambiente, binario e dipendenze (alias: doctor)
ombrabrowser info --quick --json                 # report rapido leggibile da macchina senza avviare il binario
ombrabrowser info --proxy socks5://user:pass@host:1080  # testa la risoluzione di IP di uscita, fuso orario e locale via proxy
ombrabrowser update                              # controlla GitHub Releases e aggiorna il motore nella cache
ombrabrowser clear-cache                         # svuota i binari del motore nella cache (profili preservati)
ombrabrowser login                               # salva la chiave di licenza in ~/.ombra/license.key (solo build legacy)
ombrabrowser logout                              # rimuove la chiave di licenza salvata
```

Gli stessi comandi sono disponibili tramite `python -m ombrabrowser <command>`.

## API Node.js e TypeScript

`@ombralabs/sdk` distribuisce build duali ESM + CommonJS con definizioni TypeScript complete (`.d.ts`). Sia Playwright sia Puppeteer girano sullo stesso motore sottostante.

### Playwright (predefinito)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Avvio base con proxy, fingerprint e simulazione dell'input
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

// Avvio rapido: browser + contesto in un'unica chiamata
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Profilo persistente — cookie, localStorage e seed persistono tra gli avvii
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Ogni snippet qui sopra è autonomo. Per migrare un launcher Playwright esistente, puoi anche sostituire l'import con `import * as chromium from "@ombralabs/sdk"` e mantenere `await chromium.launch(...)`.

### Puppeteer

Usa `launchPuppeteer()` da `@ombralabs/sdk` oppure importa da `@ombralabs/sdk/puppeteer`:

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

> **Nota su Puppeteer:** Puppeteer invia più traffico CDP predefinito rispetto a Playwright con `connectOverCDP({ noDefaults: true })`. Per i siti con controlli CDP rigorosi, è consigliato Playwright.

### Utilità e CLI (Node.js)

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

## Input umanizzato

In Ombra, la simulazione dell'input (`humanize`) è compilata **nativamente nel processo del browser Chromium** (basata su `cursory-rs` e sullo scheduler di input del motore) invece di essere implementata come wrapper JS attorno al client di automazione. Questo significa:

- Ogni azione standard di Playwright e Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) passa attraverso un'unica coda di input per scheda all'interno del browser.
- I parametri comportamentali vengono derivati in modo deterministico dal `seed` del profilo (`--fingerprint-humanize-seed`).
- L'SDK non incapsula mai `Page` o `Browser` in classi proxy — i tipi nativi e il comportamento del client restano intatti.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Cosa cambia con `humanize=True`:**

| Azione | Senza `humanize` | Con `humanize=True` |
|---|---|---|
| Movimento del mouse | Teletrasporto istantaneo | Curve `cursory-rs` con accelerazione, pause e leggero overshoot |
| Clic e trascinamenti | Pressione istantanea | Punto di mira all'interno del target, pausa pre-clic e durata di pressione |
| Inserimento testo | Impostazione istantanea del valore | Digitazione carattere per carattere con cadenza e layout tastiera configurati, errori di battitura occasionali e autocorrezione; i testi molto lunghi vengono incollati tramite appunti isolati senza toccare gli appunti di sistema |
| Scorrimento | Salto singolo | Serie di eventi rotella/trackpad che seguono profili di decelerazione misurati |
| Intervalli di inattività | Cursore statico | Nel preset `careful`, leggera deriva del cursore in inattività tra un'azione e l'altra |

**Preset** — `default` (ritmo normale), `careful` (più lento e ponderato, con micro-movimenti in inattività) e `fast` (ritmo più rapido). Passa `humanize=False` (`humanize: false`) per disabilitare esplicitamente la simulazione dell'input.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Puoi attivare/disattivare la modalità o cambiare preset a runtime senza riavviare il browser tramite il dominio CDP `Ombra`:

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

## Gestione del fingerprint e dei profili

Il motore deriva una configurazione coerente del browser a partire da un singolo `seed`. Quando `seed` viene omesso:

| Scenario | Comportamento |
|---|---|
| **`launch()` senza profilo** | L'SDK genera un `seed` casuale per la sessione e crea una directory temporanea che viene rimossa dopo `close()`. |
| **`profile="name"` o `user_data_dir="./dir"`** | Il `seed` viene salvato in `.ombra/profile.json` e riutilizzato a ogni avvio — i siti vedono un visitatore abituale con lo stesso dispositivo e gli stessi cookie. |
| **`fingerprint={"seed": N, ...}`** | Fingerprint deterministico dal `seed` esplicito; campi aggiuntivi sovrascrivono singole impostazioni mantenendo coerente il resto. |

Il rumore canvas/audio è legato per chiave a `eTLD+1` (stabile sullo stesso sito, non collegabile tra siti diversi). Il rumore sui pixel per canvas 2D e WebGL `readPixels` è disabilitato per impostazione predefinita per evitare di attivare rilevatori di «Canvas Tampering / Masking», e può essere abilitato esplicitamente tramite `--fingerprint-pixel-noise`.

> **Consiglio:** quando torni sullo stesso sito, usa un profilo persistente (`profile="name"` o `launch_persistent_context()`) invece di passare un `seed` fisso a un `launch()` effimero — in questo modo cookie, cache e `localStorage` rimangono coerenti insieme al fingerprint.

### Campi dell'oggetto `fingerprint`

I nomi dei campi sotto seguono Python (`snake_case`); Node.js accetta sia `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) sia `snake_case`:

| Campo | Tipo | Descrizione |
|---|---|---|
| `seed` | `int` (`>= 0`) | Seed del generatore che determina la configurazione complessiva del fingerprint |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Sistema operativo target (`navigator.platform`, UA, pool di GPU e font) |
| `os_version` | `string` | Indicazione della versione del sistema operativo per i Client Hints |
| `timezone` | zona IANA o `"auto"` | Fuso orario (es. `"Europe/Berlin"`). `"auto"` risolve la zona dall'uscita del proxy tramite GeoIP |
| `locale` | BCP-47 o `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` risolve il locale dall'uscita del proxy |
| `screen` | `{"width", "height"}` o `"auto"` | Dimensioni dello schermo e dell'area di lavoro tenendo conto della barra delle applicazioni / barra dei menu del sistema operativo target |
| `gpu` | `{"vendor", "renderer"}` o `"auto"` | Stringhe esplicite WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` o `"auto"` | Valore riportato per `navigator.hardwareConcurrency` |
| `device_memory` | `int` o `"auto"` | Valore riportato per `navigator.deviceMemory` (in GB) |
| `noise` | `bool` | Abilita/disabilita il rumore del fingerprint (`False` passa `--disable-fingerprint-noise`) |

> Mantieni `seed` come fonte primaria dei parametri del fingerprint: sovrascrivere singoli valori senza tenerli allineati (come abbinare un sistema operativo a una GPU incompatibile) può introdurre contraddizioni per i rilevatori.

### Flag aggiuntivi del motore (`args`)

Flag aggiuntivi del motore (da impostare o sovrascrivere tramite `args=[...]`):

| Flag | Scopo |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Brand del browser in `Sec-CH-UA` (l'SDK usa `chrome` per impostazione predefinita) |
| `--fingerprint-tls-profile=chrome-<major>` | Profilo TLS ClientHello corrispondente alla versione major di Chrome specificata (impostato automaticamente dall'SDK in base alla versione del motore) |
| `--webrtc-ip=<ip>` | Indirizzo IP sostitutivo nei candidati ICE di WebRTC senza inviare traffico STUN reale |
| `--fingerprint-location=<lat,lon>` | Coordinate riportate da `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Quota di archiviazione riportata da `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Numero di punti di tocco (`navigator.maxTouchPoints` e media query del puntatore) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Densità di pixel dello schermo (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Profondità di colore dello schermo |
| `--disable-gpu-fingerprint` | Trasmette la GPU reale dell'host (stringhe WebGL/WebGPU, limiti ed estensioni) |
| `--disable-gpu-string-spoof` | Trasmette le stringhe reali della GPU mantenendo attive le altre impostazioni del profilo |
| `--disable-fingerprint-noise` | Disabilita il rumore canvas/WebGL/audio mantenendo attivi i parametri di identità (impostato anche da `fingerprint={"noise": False}`) |
| `--fingerprint-pixel-noise` | Abilita il rumore idempotente opzionale sui pixel per canvas 2D e `readPixels` |
| `--profile-label=<text>` | Etichetta del profilo mostrata nella barra degli indirizzi del browser (solo UI; impostata automaticamente da `profile`, passala tramite `args` solo quando `profile` non è impostato) |

### Configurazione dei font su Linux

I server Linux minimali e i container spesso sono privi di font emoji e CJK, causando hash anomali nel rendering nascosto di testo ed emoji su canvas.

**1. Livello base (emoji e CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Font Windows per i profili Windows (`os="windows"`):**
Quando esegui una configurazione Windows su Linux, installare i font reali da `C:\Windows\Fonts\` (inclusi `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) migliora sensibilmente la coerenza dell'enumerazione dei font:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Font macOS per i profili macOS (`os="macos"`):**
Analogamente, quando usi `os="macos"` su Linux, copia i font da `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` e `/Library/Fonts/` in `~/.local/share/fonts/mac/` ed esegui `fc-cache -f`.

In un `Dockerfile`, posiziona i font nella directory di sistema `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Opzioni di avvio, configurazione ed errori

### Opzioni di `launch()`

I nomi delle opzioni seguono l'API Python e il [contratto SDK](../../docs/sdk-contract.md); Node.js usa gli equivalenti `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) e accetta anche gli alias `snake_case`. Le opzioni sconosciute vengono rifiutate con `InvalidOptionError`.

| Opzione | Predefinito | Descrizione |
|---|---|---|
| `headless` | `true` | Esegue senza finestra (`--headless=new`) |
| `proxy` | nessuno | URL proxy (`http`, `https`, `socks5`) o oggetto; i proxy autenticati usano un relay loopback |
| `fingerprint` | nessuno | Impostazioni per `seed`, OS, fuso orario, locale, schermo, GPU, memoria e rumore |
| `profile` | nessuno | Profilo persistente con nome in `~/.ombra/profiles/<slug>` (mutualmente esclusivo con `user_data_dir`) |
| `user_data_dir` | temporanea | Percorso esplicito della directory del profilo (mutualmente esclusivo con `profile`) |
| `args` | `[]` | Argomenti Chromium aggiuntivi (passati inalterati) |
| `binary_path` | risolto | Percorso esplicito verso un eseguibile del motore |
| `version` | env / auto | Versione del motore bloccata (ad esempio `158.0.8127.37-3`), prevale su `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Limite di tempo per l'avvio del motore e la connessione CDP (1000–600000 ms) |
| `humanize` | predefinito del motore | `False`, `True` oppure `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / file | Chiave per build legacy con licenza (non necessaria sulle build attuali; mai registrata nei log) |
| `env` | `{}` | Variabili d'ambiente aggiuntive per il processo del motore |
| `download` | `True` | Consente il download automatico di un binario del motore mancante |

### Variabili d'ambiente

Ordine di precedenza: **opzione di avvio esplicita → variabile d'ambiente → metadati del profilo → predefinito**.

| Variabile | Predefinito | Descrizione |
|---|---|---|
| `OMBRA_BINARY_PATH` | non impostata | Percorso esplicito verso un binario del motore |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Directory per i motori nella cache e i profili con nome |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Sorgente di download del motore; un URL personalizzato abilita la modalità mirror legacy (`none`/`off` disabilita i download) |
| `OMBRA_VERSION` | ultima compatibile | Versione del motore bloccata (ad esempio `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Canale di rilascio del motore: `stable` (release GitHub) o `beta` (prerelease GitHub) |
| `OMBRA_AUTO_UPDATE` | `true` | Verifica la presenza di build più recenti del motore all'avvio |
| `OMBRA_SKIP_CHECKSUM` | `false` | Solo sviluppo locale: disabilita la verifica SHA-256 (emette un avviso nei log) |
| `OMBRA_LICENSE_KEY` | non impostata | Chiave per build legacy con licenza (mai registrata nei log) |
| `OMBRA_TIMEOUT_MS` | `30000` | Timeout di avvio predefinito (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Verbosità dei log: `error`, `warn`, `info`, `debug` |

### Errori tipizzati

In caso di errore, l'SDK termina il processo del motore avviato, rilascia il blocco del profilo e solleva una sottoclasse di `OmbraError` dotata di un `kind` stabile e di `details` con i segreti oscurati:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

La tassonomia completa degli errori e le regole di ripetizione sono documentate nel [contratto SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Piattaforme, integrazioni e container

### Piattaforme e runtime supportati

| Componente | Supporto | Note |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Build autonome del motore tramite GitHub Releases; Ombra Desktop è firmato con Developer ID e notarizzato |
| **macOS x64 (Intel)** | — | Nessuna versione attuale di Chromium 158 |
| **Linux x64** | ✅ | Build autonome del motore tramite GitHub Releases; l'SDK Node.js richiede `xz-utils` (`xz`) per estrarre `.tar.xz` |
| **Windows x64** | ✅ | Build autonome del motore tramite GitHub Releases e installer di Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` viene installato automaticamente con `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` o Puppeteer `>=22` (Puppeteer 25+ richiede Node.js `>=22.12`) |

### Integrazioni con framework e agenti AI

Ombra funziona con qualsiasi strumento di automazione o framework di agenti AI che accetti un binario Chromium personalizzato o si colleghi tramite CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` e altri):

```python
# Opzione 1: risolvi il percorso del binario verificato e gli argomenti eseguibili del motore per il tuo runner
# Nota: build_launch_options() è un helper dry-run — passa user_data_dir e seed espliciti
# (i profili con nome e i proxy autenticati richiedono l'Opzione 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opzione 2: avvia tramite Ombra SDK e passa l'endpoint CDP locale al tuo framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Collega il tuo framework a ws_url o cdp_http — le impostazioni del fingerprint e humanize
# girano dentro il motore e restano attivi per qualsiasi client CDP
```

### Esecuzione in Docker e su server Linux

Esempio di `Dockerfile` che pre-scarica e verifica il motore al momento della build dell'immagine:

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

> **Container e server web:**
> - Se il tuo container non riesce a inizializzare la sandbox di Chromium, passa `--no-sandbox` esplicitamente tramite `args=["--no-sandbox"]` (l'SDK non aggiunge mai questo flag autonomamente).
> - Per eseguire con `headless=False` su un server senza display, usa `Xvfb` (vedi [sotto](#risoluzione-dei-problemi)).
> - Quando esegui sotto `uvicorn` con `uvloop`, passa `--loop asyncio` per evitare blocchi sulle pipe dei sottoprocessi.

## Risoluzione dei problemi

### Il sito blocca la modalità headless

Alcuni sistemi anti-bot verificano differenze comportamentali e di rendering in modalità headless anche in presenza di patch C++. Esegui con `headless=False` su un display virtuale utilizzando `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Quindi avvia con un proxy residenziale SOCKS5/HTTP, un profilo persistente, fuso orario/locale allineati, `headless=False` e `humanize=True` (vedi l'esempio di `launch_persistent_context()` all'inizio di questo README).

Se i blocchi continuano su Linux, controlla [Configurazione dei font su Linux](#configurazione-dei-font-su-linux).

### Il sito richiede una verifica a ogni visita

Chiamare `launch()` senza `profile` parte ogni volta da una directory temporanea vuota e da un nuovo `seed`, quindi il sito considera ogni esecuzione come un visitatore completamente nuovo senza cookie. Passa a `profile="..."` oppure a `launch_persistent_context(...)` così che cookie, `localStorage` e `seed` vengano mantenuti tra un'esecuzione e l'altra.

### `ProfileBusyError`

Un profilo con nome o una `user_data_dir` possono essere aperti in un solo processo alla volta. Assegna un nome di profilo distinto a ciascun worker parallelo (`profile=f"worker-{i}"`). I lock obsoleti lasciati da processi terminati in modo anomalo vengono rilevati e ripuliti automaticamente.

### È necessario eseguire `playwright install chromium`?

No. Ombra esegue il proprio binario del motore e non utilizza il Chromium standard di Playwright. Su Linux servono soltanto le librerie di sistema e `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Aggiornamento, cambio di canale e rollback del motore

Aggiorna l'SDK all'ultima release:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Prova il canale `beta` oppure blocca o ripristina una build esatta del motore:

```python
# Blocca una build esatta per uno specifico avvio
browser = launch(version="158.0.8127.37-3")
```

```bash
# Prova il canale beta (rimuovi OMBRA_VERSION — un blocco esatto con suffisso -N ignora il canale)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Oppure blocca / ripristina una build esatta del motore
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Oppure punta a un binario compilato localmente
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper blocca una build locale

Le release ufficiali di Ombra per macOS Apple Silicon sono firmate con un certificato Apple Developer ID e notarizzate. Se esegui una build di sviluppo locale non firmata e macOS la mette in quarantena, rimuovi una volta l'attributo di quarantena:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Attendere su una pagina in Python sincrono

In Playwright sincrono, un singolo `time.sleep(15)` prolungato dopo `page.goto()` mette in pausa il ciclo degli eventi di Playwright, il che può bloccare le pagine di verifica. Attendi invece a brevi intervalli con una chiamata leggera sul contesto:

```python
import time

for _ in range(15):
    page.context.cookies()  # mantiene attivo Playwright senza toccare il DOM della pagina
    time.sleep(1)
```

In Python asincrono usa `await asyncio.sleep(...)`; in Node.js usa `await new Promise(r => setTimeout(r, ms))`. Evita inoltre chiamate frequenti a `page.wait_for_timeout()` e chiamate superflue a `page.evaluate()` prima dei controlli per non generare traffico CDP aggiuntivo.

## Sicurezza

- **Autenticità e integrità del motore.** Prima dell'estrazione, l'SDK verifica la firma Ed25519 del pacchetto di rilascio rispetto a una chiave pubblica fissata e controlla il digest SHA-256 sia dell'archivio sia dell'eseguibile.
- **CDP esclusivamente locale.** La porta di debug si lega rigorosamente a `127.0.0.1`. Non esporre mai una porta CDP su una rete pubblica senza autenticazione aggiuntiva — CDP garantisce il controllo completo sul browser.
- **Isolamento dei segreti.** Le credenziali del proxy vivono solo nella memoria del relay loopback locale e non compaiono mai nelle righe di comando dei processi, nei metadati dei profili, nei log o nei dettagli degli errori.
- **Nessuna telemetria.** L'SDK non invia dati analitici, report di crash o ping di rete nascosti.

Segnala i problemi di sicurezza in privato seguendo [SECURITY.md](../../SECURITY.md).

## Mappa del repository

```text
.
├── README.md                    # README principale (English)
├── translations/
│   ├── it/README.md             # questo file (Italiano)
│   └── <locale>/README.md       # altre 20 localizzazioni
├── docs/
│   ├── architecture.md          # architettura, confini di fiducia, ciclo di vita
│   ├── sdk-contract.md          # contratto di avvio v0.2, opzioni, errori, invarianti
│   ├── stealth-checkup.md       # metodo di checkup (inglese)
│   ├── stealth-checkup.ru.md    # metodo di checkup (russo)
│   └── versioning.md            # versionamento di SDK, motore e client
├── sdks/
│   ├── manifest.json            # registro SDK leggibile da macchina
│   ├── README.md                # struttura degli SDK e regole di contribuzione
│   ├── python/                  # SDK Python (pubblicato come ombrabrowser)
│   ├── node/                    # SDK Node.js / TypeScript (pubblicato come @ombralabs/sdk)
│   └── ...                      # scaffold del contratto per altri linguaggi (Go, Rust, C#, Java, PHP, Ruby)
├── tools/check_repo.py          # validatore di struttura, schemi e link (CI)
└── .github/workflows/ci.yml
```

Questo repository ospita il contratto SDK, gli schemi, i casi di conformità e la documentazione. Ombra Desktop si trova in [`ombralabs/manager`](https://github.com/ombralabs/manager) (`GPL-3.0-only`). Le patch del motore Chromium sono mantenute in un repository separato, con build compilate pubblicate tramite [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### È un fork di Playwright?

No. L'SDK collega il client ufficiale di Playwright (o Puppeteer) a Ombra Chromium via CDP locale. Tutti i tipi, i locator, le attese e gli oggetti pagina rimangono standard.

### Ombra è gratuito e serve una chiave di licenza?

Il codice sorgente dell'SDK in questo repository è open source sotto licenza Apache License 2.0. Le build attuali del motore e il gestore di profili locale Ombra Desktop funzionano gratuitamente e in modo autonomo — senza account, chiave di licenza, ID hardware o limiti sul numero di profili. `license_key` e `OMBRA_LICENSE_KEY` servono solo per le build legacy con licenza.

### Devo installare Ombra Desktop per usare l'SDK?

No. L'SDK avvia il motore direttamente come processo figlio, rendendolo adatto a script, container e CI. Ombra Desktop è opzionale se desideri gestire un catalogo di profili locale tramite interfaccia grafica.

### In cosa differisce Ombra da `playwright-stealth`?

`playwright-stealth` inietta JavaScript nelle pagine sopra un browser normale, e i sistemi di rilevamento moderni identificano frequentemente le patch stesse. Ombra compila le proprie modifiche nel codice sorgente di Chromium e l'SDK non inietta alcuno script nelle pagine.

### Posso usare il mio proxy?

Sì. Passa un proxy `http://`, `https://` o `socks5://` in `proxy`. Quando sono presenti credenziali, l'SDK esegue un relay loopback locale così da non farle mai apparire negli argomenti del processo. Nota che il client `context.request` / `page.request` interno di Playwright può aggirare le impostazioni proxy a livello di browser — per garantire che il traffico passi attraverso il proxy, esegui `fetch()` dal contesto della pagina.

### Quali versioni di Playwright e Puppeteer sono supportate?

L'SDK Python richiede Playwright `>=1.60,<2.0` (installato automaticamente con `ombrabrowser`). L'SDK Node.js supporta `playwright-core@^1.60.0` o `puppeteer-core >=22.0.0`. Consulta la [guida al versionamento](../../docs/versioning.md) per le regole di compatibilità.

### Ombra garantisce il superamento di ogni controllo anti-bot?

No. Il rilevamento è un bersaglio in continuo movimento che dipende dal sito, dalla regione, dalla reputazione dell'IP, dalla cronologia del profilo e dalla versione del sistema di rilevamento. Usa il [metodo di checkup stealth](../../docs/stealth-checkup.md) per misurare e monitorare oggettivamente una configurazione specifica.

### Per quali casi d'uso è progettato Ombra?

Ombra è progettato per automazione autorizzata, test QA, monitoraggio, ricerca e gestione di profili di lavoro isolati. Accessi non autorizzati, credential stuffing e abusi non sono supportati.

## Contribuire

Le linee guida per contribuire si trovano in [CONTRIBUTING.md](../../CONTRIBUTING.md), gli standard della community in [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) e le istruzioni per gli SDK in [sdks/README.md](../../sdks/README.md).

- Aggiorna il [contratto SDK](../../docs/sdk-contract.md) e gli [schemi](../../AGENTS.md#sdk-launch-options-and-binary-info-schemas) prima di aggiungere una nuova opzione di avvio.
- Quando modifichi il comportamento dell'SDK, aggiorna implementazione, test e casi condivisi in [conformance](../../AGENTS.md#sdk-conformance-and-stealth-invariants).
- Esegui `python3 tools/check_repo.py` prima di aprire una pull request per validare struttura del repository e link.

## Licenza

Il codice sorgente dell'SDK in questo repository è distribuito con licenza [Apache License 2.0](../../LICENSE). Ombra Desktop è sviluppato separatamente in [`ombralabs/manager`](https://github.com/ombralabs/manager) sotto `GPL-3.0-only`. La Apache License 2.0 non concede diritti sui marchi Ombra o sul motore Ombra Chromium — consulta [NOTICE](../../NOTICE) per i termini sui marchi e sui componenti di terze parti.

## Link

- 🌐 **Sito web** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Release (motore e Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Changelog** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Bug e richieste di funzionalità** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organizzazione** — [Ombra Labs](https://github.com/ombralabs)
