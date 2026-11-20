# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

In Python e Node.js, `launch()` avvia Ombra Chromium e restituisce un oggetto `Browser` di Playwright. Per usare Puppeteer in Node.js, chiama `launchPuppeteer()`.

**[Installazione](#installazione)** · <a href="../../README.md">English</a>

<details>
<summary>Lingue</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Controlli del fingerprint in Chromium

Ombra implementa in Chromium i controlli sull'impronta digitale del browser. I controlli riguardano canvas, WebGL, audio, font, parallelismo hardware, posizione e dimensioni degli elementi, stringhe identificative della GPU, fusi orari e segnali di automazione. Il motore usa lo stack TLS e HTTP/2 di Chromium e gestisce l'input umanizzato nel processo del browser.

L'SDK avvia il motore in locale e collega il client di automazione tramite il Chrome DevTools Protocol (CDP). Puoi eseguirlo da uno script, in un container o in un job di integrazione continua senza installare l'app desktop di Ombra.

## Stato

Gli esempi usano i pacchetti per Python e Node.js pubblicati in versione alfa. Il repository contiene anche il contratto di avvio condiviso e la struttura iniziale di otto SDK.

| Componente | Stato |
|---|---|
| [Contratto dell'SDK](../../docs/sdk-contract.md) | Bozza `0.1.0` |
| SDK per Python | `0.1.3` alfa · [`ombrabrowser` su PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK per Node.js | `0.1.0` alfa · [`@ombralabs/sdk` su npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Schemi condivisi](../../spec/schemas) | Opzioni di avvio e metadati del binario del motore |
| [Verifica di conformità tra linguaggi](../../conformance) | Casi di test comuni ai due SDK |
| [Checkup stealth](../../docs/stealth-checkup.md) | Criteri di verifica e modello per il rapporto |

## Installazione

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Per Puppeteer, installa `puppeteer-core` al posto di `playwright-core`. La [pagina del pacchetto su npm](https://www.npmjs.com/package/@ombralabs/sdk) elenca le versioni supportate del client e di Node.js.

L'SDK cerca il motore prima nel percorso indicato con `binary_path` in Python o `binaryPath` in Node.js. Controlla poi, nell'ordine, `OMBRA_BINARY_PATH`, la directory del motore dell'app desktop e la cache dell'SDK. Se non trova il motore, lo scarica e verifica il binario.

Per disattivare i download, passa `download=False` in Python o `download: false` in Node.js. Per preparare il motore senza aprire il browser, chiama `ensure_binary()` in Python o `ensureBinary()` in Node.js.

## Avvio rapido

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Se usi un profilo con nome, apri le pagine nel suo contesto esistente per riutilizzare i cookie e i dati salvati dai siti. Questo esempio configura anche un proxy.

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

Per ottenere un oggetto `Browser` di Puppeteer, usa `launchPuppeteer()`.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migrazione senza riscritture

Per migrare uno script Python da Playwright, installa `ombrabrowser` e cambia l'import e la chiamata che avvia il browser. I metodi delle pagine, i tipi e i selettori restano quelli di Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

In Node.js la stessa modifica richiede due righe.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Come funziona

```mermaid
flowchart LR
    Script["Il tuo script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + bridge CDP"]
    Engine["Ombra Chromium<br/>motore con patch"]
    Client["Client di automazione nativo"]
    Profile[("Profilo<br/>seed · cookie · estensioni")]

    Script -->|launch()| SDK
    SDK -->|avvio| Engine
    SDK -->|connessione via CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` individua il motore o lo scarica, quindi verifica il binario.
2. L'SDK seleziona la directory e il seed del profilo. Se il proxy richiede l'autenticazione, avvia un relay locale.
3. Avvia Chromium con il profilo scelto, le opzioni di avvio e una porta di debug sull'interfaccia di loopback.
4. Quando `DevToolsActivePort` è pronto, collega Playwright o Puppeteer tramite CDP e restituisce l'oggetto `Browser` del client.
5. `browser.close()` arresta il motore e rilascia il blocco sul profilo.

Dopo l'avvio, il client invia i comandi per le pagine direttamente a Chromium.

## Matrice SDK

| Ambiente di esecuzione | Pacchetto pubblicato | Oggetto browser |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → `Browser` di Playwright |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → `Browser` di Playwright<br>`launchPuppeteer()` → `Browser` di Puppeteer |

Il repository contiene le directory di altri sei SDK. Il [manifest degli SDK](../../sdks/manifest.json) elenca i pacchetti e i client previsti. La [guida agli SDK](../../sdks/README.md) descrive la struttura delle directory.

| Ambiente di destinazione | Pacchetto previsto | Client o tipo restituito |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Opzioni di avvio

Le opzioni in tabella usano i nomi dell'API Python e del contratto dell'SDK. Gli equivalenti in Node.js seguono la notazione camelCase, ad esempio `timeoutMs`, `userDataDir` e `binaryPath`.

| Opzione | Valore predefinito | Funzione |
|---|---|---|
| `headless` | `true` | Esegue il motore senza finestra |
| `proxy` | nessuno | URL o oggetto di configurazione del proxy. I proxy con autenticazione usano un relay locale |
| `fingerprint` | nessuno | Seed e parametri per sistema operativo, fuso orario, impostazioni locali, schermo e GPU |
| `profile` | nessuno | Profilo con nome che conserva cookie, dati dei siti e seed |
| `user_data_dir` | temporanea | Directory esplicita del profilo, incompatibile con `profile` |
| `args` | `[]` | Argomenti aggiuntivi passati al motore senza modifiche |
| `timeout_ms` | `30000` | Tempo massimo in millisecondi per l'avvio e la connessione CDP |
| `humanize` | predefinito del motore | `false`, `true` o una configurazione preimpostata |
| `captcha` | `false` | Attiva il modulo del motore con limiti facoltativi |
| `binary_path` | ricerca automatica | Seleziona uno specifico binario del motore |
| `download` | `true` | Scarica il binario del motore se manca |

Il [contratto dell'SDK](../../docs/sdk-contract.md) elenca tutte le opzioni di avvio e descrive i tipi di errore e il comportamento dei profili.

## Gestione del binario

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

Prima dell'avvio l'SDK verifica il checksum SHA-256 del motore. In produzione mantieni attivo il controllo. `OMBRA_SKIP_CHECKSUM=1` è riservato alle build di sviluppo locali.

## Configurazione

| Variabile | Valore predefinito | Funzione |
|---|---|---|
| `OMBRA_BINARY_PATH` | non impostata | Percorso esplicito del binario del motore |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Directory dei binari gestiti e dei profili con nome |
| `OMBRA_DOWNLOAD_URL` | endpoint delle release | URL di base per il download dei binari |
| `OMBRA_VERSION` | ultima compatibile | Versione del motore da cercare |
| `OMBRA_AUTO_UPDATE` | `true` | Cerca una versione più recente del motore all'avvio |
| `OMBRA_SKIP_CHECKSUM` | `false` | Solo per lo sviluppo |
| `OMBRA_LICENSE_KEY` | non impostata | Chiave passata al motore |
| `OMBRA_TIMEOUT_MS` | `30000` | Tempo massimo di avvio in millisecondi |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

L'SDK usa il primo valore disponibile nelle opzioni di avvio, nelle variabili d'ambiente, nei metadati del profilo o nei valori predefiniti, in quest'ordine.

## Confronto

| Caratteristica | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright o Puppeteer |
| Livello di intervento | nessuno | JavaScript nella pagina | opzioni di configurazione | sorgenti del motore |
| Seed dell'impronta digitale | no | no | parziale | per profilo |
| Input umanizzato | no | no | no | motore |
| Isolamento dei profili | contesto del browser | contesto del browser | no | directory dei dati utente |
| Migrazione senza riscritture | — | cambio di import | riscrittura | cambio di import |

I risultati dei rilevatori dipendono dal sito, dall'IP di uscita e dal profilo. La [guida al checkup](../../docs/stealth-checkup.md) spiega come misurarli.

## Lo stealth è una proprietà del motore

È il motore ad applicare le impostazioni dell'impronta digitale. Gli SDK gli passano il seed del profilo e le opzioni che specifichi all'avvio.

| Livello | Come interviene Ombra |
|---|---|
| TLS e HTTP/2 | Stack di rete della versione di Chromium con cui è compilato il motore |
| Identità del browser | Modifiche ai sorgenti del motore basate sul seed del profilo |
| Segnali di automazione | Il motore gestisce i segnali di WebDriver. L'SDK non chiama `Runtime.enable` |
| Input | Movimenti del puntatore, digitazione e scorrimento umanizzati nel processo del browser |
| Coerenza di rete | Scelta del fuso orario e delle impostazioni locali in base al proxy |
| Stato | Una directory dei dati utente per ogni profilo |

### Limiti dell'SDK

- La porta di debug CDP accetta solo connessioni locali sull'interfaccia di loopback.
- L'SDK esclude dai log le credenziali del proxy, le chiavi di licenza e i cookie. Non invia dati di telemetria.
- Un profilo esistente conserva il proprio seed salvo che tu ne specifichi un altro.
- L'SDK non inietta mai script stealth con `addScriptToEvaluateOnNewDocument` o `evaluateOnNewDocument` e non modifica le proprietà delle pagine.
- Per verificare se il motore è pronto, l'SDK usa l'endpoint HTTP di CDP o `Browser.getVersion`. Non chiama mai `Runtime.enable` per questo controllo.
- L'identità del browser è fornita dal motore. L'SDK non modifica lo user agent né l'identità tramite Playwright o Puppeteer e non chiama `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` o `setDeviceMetricsOverride`.
- L'SDK non aggiunge mai di propria iniziativa `--enable-automation`, `--disable-blink-features=AutomationControlled` o `--no-sandbox`.

## Checkup stealth

Esegui questi controlli con la build del motore, il client di automazione e il profilo che intendi usare.

| Livello | Esempi di test | Criteri di superamento |
|---|---|---|
| L0 Trasporto | TrackMe, test sulle fughe di IP/WebRTC | È visibile solo l'IP di uscita. JA4 e HTTP/2 corrispondono alla build Chromium del motore |
| L1 Identità | Test locale, Sannysoft, Intoli | Nessuna contraddizione tra UA, UA-CH, piattaforma, GPU, font e schermo |
| L2 Impronta digitale | CreepJS, FingerprintJS, BrowserScan | Nessun indicatore di modalità headless o di dati falsati. L'impronta resta stabile ricaricando la pagina |
| L3 Automazione | rebrowser, brotector, botd | Nessuna traccia di CDP, script di inizializzazione o WebDriver |
| L4 Comportamento | Fedeltà dell'input, tracce di `humanize`, test di base con Cloudflare | Eventi attendibili in un ordine realistico e verifica superata |
| L5 Stabilità | Seed, worker, iframe, origini diverse | Lo stesso seed produce la stessa identità a ogni avvio |

La procedura spiega come interpretare gli esiti, diagnosticare i problemi e documentare i risultati. È disponibile in [inglese](../../docs/stealth-checkup.md) e in [russo](../../docs/stealth-checkup.ru.md).

Per poter riprodurre e confrontare i risultati, annota per ogni test la build del motore, la versione del client, le impostazioni del profilo, l'IP di uscita del proxy e la versione del rilevatore.

## Mappa del repository

```text
.
├── README.md                  # originale inglese
├── translations/
│   └── <locale>/README.md
├── desktop/                   # gestore di profili offline
├── docs/
│   ├── desktop/               # documentazione del gestore di profili
│   ├── architecture.md        # componenti, flusso di avvio, confini
│   ├── sdk-contract.md        # contratto di avvio v0 e comportamento dell'SDK
│   ├── stealth-checkup.md     # metodo e procedura del checkup stealth
│   ├── stealth-checkup.ru.md  # traduzione russa
│   └── versioning.md          # compatibilità di SDK, motore e client
├── spec/
│   └── schemas/               # JSON Schema per le opzioni di avvio e i dati del binario
├── sdks/
│   ├── manifest.json          # registro SDK leggibile dalle macchine
│   ├── README.md              # struttura e regole per contribuire
│   ├── _template/             # modello per aggiungere un linguaggio
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # casi di avvio e stealth indipendenti dal linguaggio
├── tools/check_repo.py        # validazione di struttura e link (CI)
└── .github/workflows/ci.yml
```

Questo repository contiene la struttura iniziale degli SDK, il contratto di avvio, i casi di conformità e il gestore di profili offline. Il motore Chromium e la versione completa di Desktop 1.2.1 hanno repository separati. [Sorgenti e istruzioni di compilazione di Desktop](../../desktop/README.md) · [Documentazione del gestore di profili](../../docs/desktop/README.md)

## Il contratto

- `launch(options)` avvia il motore e restituisce il `Browser` del client. Da quel momento il client comunica direttamente con Chromium tramite CDP.
- Prima dell'avvio l'SDK controlla la piattaforma e il checksum SHA-256 del motore. Se manca il binario e i download sono abilitati, lo scarica.
- Tra un avvio e l'altro i profili con nome conservano cookie, dati dei siti e seed.
- Se l'avvio fallisce, l'SDK termina il processo che ha avviato e genera un errore tipizzato. Il codice chiamante decide se riprovare.
- L'SDK, il motore e il client di automazione hanno intervalli di versioni indipendenti. Per conoscere la build del motore, usa `binary_info()` in Python o `binaryInfo()` in Node.js.

## Compatibilità

| Componente | Versioni o piattaforme supportate |
|---|---|
| Motore | Build selezionata dall'SDK, indicata da `binary_info()` o `binaryInfo()` |
| macOS | Apple Silicon e Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ con una versione supportata di Playwright |
| Node.js | 20+ con una versione supportata di Playwright o Puppeteer |

Le versioni dell'SDK e del motore sono indipendenti. In caso di incompatibilità, l'SDK riporta entrambe le versioni in un errore tipizzato.

## Come contribuire

La [guida per chi contribuisce](../../CONTRIBUTING.md) descrive il processo di revisione. Per le istruzioni di compilazione, consulta la [guida agli SDK](../../sdks/README.md).

- Se cambi il comportamento di un SDK, aggiorna l'implementazione interessata e aggiungi un test o un caso di conformità condiviso.
- Per aggiungere un linguaggio, copia il [modello di SDK](../../sdks/_template), registra il nuovo SDK nel [manifest](../../sdks/manifest.json) e apri una pull request in bozza.
- Per aggiungere un'opzione di avvio, aggiorna prima il [contratto dell'SDK](../../docs/sdk-contract.md) e gli [schemi](../../spec/schemas).
- Le modifiche allo stealth del motore vanno nel repository del motore. L'SDK deve continuare a superare il checkup.
- Segnala i problemi di sicurezza in privato seguendo la [politica di sicurezza](../../SECURITY.md).

## FAQ

### Ombra è un fork di Playwright?

No. L'SDK collega il client ufficiale di Playwright a Ombra Chromium. Puoi continuare a usare i tipi, le funzioni di supporto e i page object di Playwright.

### Serve l'app desktop di Ombra?

L'SDK avvia direttamente il motore. L'app desktop è facoltativa e permette di gestire i profili a mano.

### In cosa si differenzia Ombra da playwright-stealth?

Le modifiche all'impronta digitale di Ombra sono compilate in Chromium. L'SDK lascia intatti gli script delle pagine.

### Ombra risolve i CAPTCHA?

Il motore dispone di un modulo CAPTCHA facoltativo. Il supporto dipende dal tipo di attività, dalla build del motore e dai modelli disponibili. L'SDK passa le impostazioni di ogni avvio e dà accesso ai controlli CDP del modulo.

### Posso usare un mio proxy?

Sì. Passalo a `launch()`. Se il proxy richiede l'autenticazione, un relay locale evita che le credenziali compaiano nella riga di comando del motore.

### Quali versioni di Playwright e Puppeteer sono supportate?

Ogni SDK dichiara nel manifest del proprio pacchetto le versioni dei client supportate. I client si installano come dipendenze separate. Consulta gli intervalli supportati nella [guida alle versioni](../../docs/versioning.md).

### Ombra supera tutti i controlli anti-bot?

I risultati dipendono dal sito, dall'area geografica, dalla reputazione dell'IP di uscita, dalla versione del rilevatore e dalle impostazioni del profilo. La [guida al checkup stealth](../../docs/stealth-checkup.md) spiega come valutare una configurazione specifica.

## Licenza

Il codice sorgente degli SDK in questo repository è distribuito con [licenza Apache 2.0](../../LICENSE). La licenza non concede diritti sul motore Ombra, sul nome Ombra o sul logo. Per i marchi e le attribuzioni a terzi, consulta [NOTICE](../../NOTICE).

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
