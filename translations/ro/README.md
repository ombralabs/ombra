# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

În Python și Node.js, `launch()` pornește Ombra Chromium și returnează un obiect `Browser` din Playwright. Pentru Puppeteer în Node.js, folosiți `launchPuppeteer()`.

**[Instalare](#instalare)** · <a href="../../README.md">English</a>

<details>
<summary>Limbi</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Controlul amprentei în Chromium

Ombra controlează amprenta browserului direct în Chromium. Sunt vizate canvas, WebGL, sunetul, fonturile, numărul de procesoare logice, dimensiunile elementelor din pagină, identificatorii GPU, fusurile orare și semnalele de automatizare. Motorul folosește stiva TLS și HTTP/2 din Chromium și procesează în browser evenimentele care simulează gesturile utilizatorului.

SDK-ul pornește motorul local și conectează clientul de automatizare la acesta prin Chrome DevTools Protocol (CDP). Îl puteți folosi într-un script, într-un container sau într-o sarcină de integrare continuă fără a instala aplicația desktop Ombra.

## Status

Exemplele folosesc pachetele alfa publicate pentru Python și Node.js. Depozitul conține și contractul comun de lansare, precum și structura de bază pentru opt SDK-uri.

| Componentă | Stare |
|---|---|
| [Contractul SDK-urilor](../../docs/sdk-contract.md) | Versiune de lucru `0.1.0` |
| SDK pentru Python | `0.1.3` alfa · [`ombrabrowser` pe PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK pentru Node.js | `0.1.0` alfa · [`@ombralabs/sdk` pe npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Scheme comune](../../spec/schemas) | Opțiuni de lansare și metadate despre executabilul motorului |
| [Conformitate între limbaje](../../conformance) | Cazuri de testare comune celor două SDK-uri |
| [Verificare stealth](../../docs/stealth-checkup.md) | Criterii de testare și șablon de raport |

## Instalare

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Pentru Puppeteer, instalați `puppeteer-core` în loc de `playwright-core`. [Pagina pachetului pe npm](https://www.npmjs.com/package/@ombralabs/sdk) indică versiunile acceptate pentru clienți și pentru mediul de rulare.

SDK-ul verifică mai întâi calea indicată prin `binary_path` în Python sau `binaryPath` în Node.js. Apoi verifică, în ordine, `OMBRA_BINARY_PATH`, directorul motorului din aplicația desktop și memoria cache a SDK-ului. Dacă nu găsește motorul, îl descarcă și îl verifică.

Pentru a dezactiva descărcările, transmiteți `download=False` în Python sau `download: false` în Node.js. Pentru a pregăti motorul fără a deschide browserul, apelați `ensure_binary()` în Python sau `ensureBinary()` în Node.js.

## Pornire rapidă

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Dacă folosiți un profil cu nume, deschideți paginile în contextul existent al profilului pentru a reutiliza cookie-urile și datele stocate de site-uri. Exemplul configurează și un proxy.

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

Folosiți `launchPuppeteer()` pentru a obține un obiect `Browser` din Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migrare fără rescriere

Pentru a migra un script Python care folosește Playwright, instalați `ombrabrowser` și modificați importul și apelul care lansează browserul. Metodele paginilor, tipurile și selectorii rămân cei din Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

În Node.js, aceeași modificare se face în două linii.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Cum funcționează

```mermaid
flowchart LR
    Script["Scriptul dvs.<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + punte CDP"]
    Engine["Ombra Chromium<br/>motor cu patch-uri"]
    Client["Client nativ de automatizare"]
    Profile[("Profil<br/>seed · cookie-uri · extensii")]

    Script -->|launch()| SDK
    SDK -->|pornire| Engine
    SDK -->|conectare prin CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` găsește motorul sau îl descarcă, apoi verifică executabilul.
2. SDK-ul alege directorul profilului și valoarea de inițializare (seed). Dacă proxy-ul necesită autentificare, SDK-ul pornește un releu local.
3. SDK-ul lansează Chromium cu profilul ales, opțiunile de lansare și un port de depanare pe interfața de loopback.
4. Când `DevToolsActivePort` este disponibil, SDK-ul conectează Playwright sau Puppeteer prin CDP și returnează obiectul `Browser` al clientului.
5. `browser.close()` oprește motorul și eliberează blocarea profilului.

După lansare, clientul trimite comenzile pentru pagini direct către Chromium.

## Matricea SDK

| Mediu de rulare | Pachet publicat | Obiect browser |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Depozitul include directoare pentru alte șase SDK-uri. [Manifestul SDK-urilor](../../sdks/manifest.json) enumeră pachetele și clienții planificați. [Ghidul SDK-urilor](../../sdks/README.md) descrie structura directoarelor.

| Mediu de rulare vizat | Pachet planificat | Client sau tip returnat |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Opțiuni de lansare

Opțiunile urmează convențiile de denumire din API-ul Python și din contractul SDK-urilor. În Node.js, numele se scriu în camelCase, de exemplu `timeoutMs`, `userDataDir` și `binaryPath`.

| Opțiune | Implicit | Semnificație |
|---|---|---|
| `headless` | `true` | Rulează motorul fără fereastră |
| `proxy` | niciunul | URL-ul proxy-ului sau un obiect de configurare. Proxy-urile care necesită autentificare folosesc un releu local |
| `fingerprint` | niciunul | Seed și setări pentru sistemul de operare, fusul orar, limbă și regiune, ecran și GPU |
| `profile` | niciunul | Profil cu nume care păstrează cookie-urile, datele site-urilor și seed-ul |
| `user_data_dir` | temporar | Director de profil specificat explicit, incompatibil cu `profile` |
| `args` | `[]` | Flag-uri suplimentare pentru motor, transmise fără modificări |
| `timeout_ms` | `30000` | Timpul alocat lansării și stabilirii conexiunii CDP, în milisecunde |
| `humanize` | implicit în motor | `false`, `true` sau un preset |
| `binary_path` | determinat | Folosește un binar specific al motorului |
| `download` | `true` | Descarcă binarul motorului dacă lipsește |

[Contractul SDK-urilor](../../docs/sdk-contract.md) enumeră toate opțiunile de lansare și descrie tipurile de erori și comportamentul profilurilor.

## Gestionarea binarului

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

SDK-ul verifică suma de control SHA-256 a motorului înainte de lansare. Păstrați verificarea activată în producție. `OMBRA_SKIP_CHECKSUM=1` este destinat compilărilor locale de dezvoltare.

## Configurare

| Variabilă | Implicit | Semnificație |
|---|---|---|
| `OMBRA_BINARY_PATH` | nesetată | Binar explicit al motorului |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Binare gestionate și profiluri cu nume |
| `OMBRA_DOWNLOAD_URL` | endpointul versiunilor publicate | URL de bază pentru descărcarea binarelor |
| `OMBRA_VERSION` | ultima compatibilă | Versiunea motorului care trebuie determinată |
| `OMBRA_AUTO_UPDATE` | `true` | Verifică la lansare dacă există un motor mai nou |
| `OMBRA_SKIP_CHECKSUM` | `false` | Doar pentru dezvoltare |
| `OMBRA_LICENSE_KEY` | nesetată | Transmisă motorului |
| `OMBRA_TIMEOUT_MS` | `30000` | Timpul maxim implicit pentru lansare, în milisecunde |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

SDK-ul ia prima valoare disponibilă după ce verifică, în ordine, opțiunile de lansare, variabilele de mediu, metadatele profilului și valorile implicite.

## Comparație

| Caracteristică | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright sau Puppeteer |
| Nivel de patch | niciunul | JavaScript în pagină | flag-uri de configurare | codul sursă al motorului |
| Seed de amprentă | nu | nu | parțial | per profil |
| Input umanizat | nu | nu | nu | motor |
| Izolarea profilului | context de browser | context de browser | nu | director de date de utilizator |
| Migrare fără rescriere | — | schimbare de import | rescriere | schimbare de import |

Rezultatele unui detector depind de site, de adresa IP de ieșire și de profil. [Procedura de verificare](../../docs/stealth-checkup.md) descrie metoda de măsurare.

## Stealth-ul este o proprietate a motorului

Motorul aplică setările pentru amprenta browserului. SDK-urile îi transmit seed-ul profilului și opțiunile de lansare specificate explicit.

| Nivel | Unde intervine Ombra |
|---|---|
| TLS și HTTP/2 | Stiva de rețea din versiunea Chromium pe baza căreia este compilat motorul |
| Identitatea browserului | Patch-uri în codul sursă al motorului, determinate de seed-ul profilului |
| Suprafața de automatizare | Modificările din motor acoperă semnalele WebDriver. SDK-ul nu apelează `Runtime.enable` |
| Input | Input umanizat pentru pointer, tastatură și derulare, în interiorul procesului browserului |
| Coerența rețelei | Alegerea fusului orar și a setărilor regionale în funcție de proxy |
| Stare | Un director separat de date de utilizator pentru fiecare profil |

### Limitele SDK-ului

- Portul de depanare CDP acceptă numai conexiuni locale prin interfața de loopback.
- SDK-ul nu scrie în jurnale datele de autentificare pentru proxy, cheile de licență sau cookie-urile. Nu trimite date de telemetrie.
- Un profil existent își păstrează seed-ul dacă nu specificați explicit altul.
- SDK-ul nu injectează scripturi stealth cu `addScriptToEvaluateOnNewDocument` sau `evaluateOnNewDocument` și nu modifică proprietățile paginii.
- SDK-ul verifică dacă browserul este pregătit prin punctul de acces HTTP al CDP sau prin `Browser.getVersion`. Nu apelează niciodată `Runtime.enable` pentru această verificare.
- Motorul stabilește identitatea browserului. SDK-ul nu suprascrie șirul User-Agent sau alte atribute de identitate prin Playwright ori Puppeteer și nu apelează `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` sau `setDeviceMetricsOverride`.
- SDK-ul nu adaugă din proprie inițiativă opțiunile `--enable-automation`, `--disable-blink-features=AutomationControlled` sau `--no-sandbox`.

## Verificare stealth

Rulați aceste verificări pe compilarea motorului, clientul de automatizare și profilul pe care intenționați să le utilizați.

| Nivel | Exemple de ținte | Criterii de reușită |
|---|---|---|
| L0 Transport | TrackMe, verificări de scurgeri IP/WebRTC | Este vizibilă numai adresa IP de ieșire. JA4 și HTTP/2 corespund versiunii de Chromium din motor |
| L1 Identitate | Probă locală, Sannysoft, Intoli | Fără contradicții între UA, UA-CH, platformă, GPU, fonturi și ecran |
| L2 Amprentă | CreepJS, FingerprintJS, BrowserScan | Fără indicii de rulare în modul headless sau de valori falsificate. Amprenta rămâne stabilă la reîncărcare |
| L3 Automatizare | rebrowser, brotector, botd | Fără scurgeri prin CDP, prin scripturi de inițializare sau prin WebDriver |
| L4 Comportament | Fidelitatea inputului, urme de humanize, test rapid Cloudflare | Evenimente de încredere, ordine realistă, provocarea este rezolvată |
| L5 Stabilitate | Seed, workeri, iframe-uri, cross-origin | Același seed produce aceeași identitate la fiecare lansare |

Procedura de testare descrie stările posibile, diagnosticarea problemelor și întocmirea raportului. Este disponibilă în [engleză](../../docs/stealth-checkup.md) și în [rusă](../../docs/stealth-checkup.ru.md).

Pentru fiecare rezultat, notați versiunea compilării motorului, versiunea clientului, setările profilului, adresa IP de ieșire a proxy-ului și versiunea detectorului. Aceste date vă permit să reproduceți și să comparați testele.

## Harta depozitului

```text
.
├── README.md                  # originalul în engleză
├── translations/
│   └── <locale>/README.md
├── desktop/                   # manager de profiluri offline
├── docs/
│   ├── desktop/               # documentația managerului de profiluri
│   ├── architecture.md        # componente, flux de lansare, limite
│   ├── sdk-contract.md        # contractul de lansare v0 și comportamentul SDK-ului
│   ├── stealth-checkup.md     # metoda și runbook-ul de validare stealth
│   ├── stealth-checkup.ru.md  # traducere în rusă
│   └── versioning.md          # compatibilitatea SDK-ului, motorului și clientului
├── spec/
│   └── schemas/               # JSON Schema pentru opțiunile de lansare și informațiile despre binar
├── sdks/
│   ├── manifest.json          # registru de SDK-uri prelucrabil automat
│   ├── README.md              # structura și regulile de contribuție
│   ├── _template/             # structură de bază pentru un limbaj nou
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # cazuri de lansare și stealth independente de limbaj
├── tools/check_repo.py        # validarea structurii și a linkurilor (CI)
└── .github/workflows/ci.yml
```

Depozitul conține structurile de bază ale SDK-urilor, contractul de lansare, testele de conformitate și managerul de profiluri offline. Motorul Chromium și versiunea completă Desktop 1.2.1 au depozite separate. [Codul sursă și ghidul de compilare pentru Desktop](../../desktop/README.md) · [Documentația managerului de profiluri](../../docs/desktop/README.md)

## Contractul

- `launch(options)` pornește motorul și returnează obiectul `Browser` al clientului. Clientul comunică apoi direct cu Chromium prin CDP.
- Înainte de lansare, SDK-ul verifică platforma și suma de control SHA-256 a motorului. Dacă executabilul lipsește și descărcările sunt activate, SDK-ul îl descarcă.
- Între lansări, profilurile cu nume păstrează cookie-urile, datele stocate de site-uri și seed-ul profilului.
- Dacă lansarea eșuează, SDK-ul închide procesul pe care l-a pornit și semnalează o eroare cu un tip precis. Codul apelant decide dacă reîncearcă.
- SDK-ul, motorul și clientul de automatizare au intervale de versiuni separate. Pentru a afla versiunea motorului, folosiți `binary_info()` în Python sau `binaryInfo()` în Node.js.

## Compatibilitate

| Componentă | Platformă sau versiune acceptată |
|---|---|
| Motor | Versiunea aleasă de SDK, afișată de `binary_info()` sau `binaryInfo()` |
| macOS | Apple Silicon și Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ cu o versiune acceptată de Playwright |
| Node.js | 20+ cu o versiune acceptată de Playwright sau Puppeteer |

SDK-ul și motorul au numere de versiune independente. Dacă versiunile sunt incompatibile, SDK-ul le indică pe amândouă în mesajul unei erori cu un tip precis.

## Contribuții

[Ghidul pentru contribuții](../../CONTRIBUTING.md) descrie procesul de revizuire a modificărilor. Instrucțiunile de compilare se găsesc în [ghidul SDK-urilor](../../sdks/README.md).

- Dacă schimbați comportamentul unui SDK, actualizați implementarea afectată și adăugați un test sau un caz comun de conformitate.
- Pentru un limbaj nou, copiați [șablonul SDK](../../sdks/_template), înregistrați noul SDK în [manifest](../../sdks/manifest.json) și deschideți un pull request în stadiu de ciornă.
- Pentru o opțiune nouă de lansare, actualizați mai întâi [contractul SDK-urilor](../../docs/sdk-contract.md) și [schemele](../../spec/schemas).
- Modificările funcțiilor stealth ale motorului se fac în depozitul acestuia. SDK-ul trebuie să treacă în continuare verificările.
- Raportați problemele de securitate în privat, conform [politicii de securitate](../../SECURITY.md).

## Întrebări frecvente

### Este Ombra un fork al Playwright?

Nu. SDK-ul conectează clientul oficial Playwright la Ombra Chromium. Puteți folosi în continuare tipurile, funcțiile utilitare și obiectele de pagină din Playwright.

### Am nevoie de aplicația desktop Ombra?

SDK-ul pornește motorul direct. Aplicația desktop este opțională și vă permite să gestionați manual profilurile.

### Prin ce se deosebește Ombra de playwright-stealth?

Modificările pe care Ombra le aduce amprentei browserului sunt integrate în Chromium la compilare. SDK-ul nu modifică scripturile paginilor.

### Pot folosi propriul proxy?

Da. Transmiteți-l funcției `launch()`. Dacă proxy-ul necesită autentificare, un releu local împiedică afișarea datelor de autentificare în linia de comandă a motorului.

### Ce versiuni de Playwright și Puppeteer sunt acceptate?

Fiecare SDK indică versiunile de client acceptate în manifestul pachetului. Clienții sunt dependențe separate. Intervalele de versiuni sunt descrise în [ghidul de versionare](../../docs/versioning.md).

### Trece Ombra toate verificările antibot?

Rezultatele depind de site, regiune, reputația adresei IP de ieșire, versiunea detectorului și setările profilului. [Procedura de verificare stealth](../../docs/stealth-checkup.md) explică modul de evaluare a unei configurații concrete.

## Licență

Sursele SDK din acest depozit sunt licențiate conform [Apache License 2.0](../../LICENSE). Licența nu acordă drepturi asupra motorului Ombra, asupra numelui Ombra sau asupra logo-ului. Consultați [NOTICE](../../NOTICE) pentru mărci comerciale și atribuiri ale terților.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
