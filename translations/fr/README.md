<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Licence"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Dernier commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Étoiles"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Téléchargements PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Téléchargements npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Version"></a>
</p>

<p align="center">
<a href="#installation"><strong>Installation</strong></a> ·
<a href="#api-python">API Python</a> ·
<a href="#api-nodejs-et-typescript">API Node.js</a> ·
<a href="#saisie-humanisée">Humanisation</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Langues</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium avec contrôle d'empreinte compilé dans le code source C++ et saisie humanisée native.</h3>

<table><tr><td>
Ni un assemblage d'options de lancement, ni une injection JavaScript par-dessus la page. Un véritable binaire Chromium dont les correctifs d'empreinte sont compilés dans le code source C++ et dont la simulation de saisie s'exécute dans le processus navigateur. Connectez Playwright ou Puppeteer officiel via CDP local — sans objets wrapper et sans réécrire le code de vos pages.
</td></tr></table>

<br>

<p align="center">
Remplacement direct du lancement pour Playwright et Puppeteer en Python et Node.js.<br>
Même API, mêmes sélecteurs et mêmes types — remplacez simplement l'import et l'appel à <code>launch()</code>.
</p>

- **Correctifs Chromium au niveau du code source** — canvas, WebGL, WebGPU, audio, polices, GPU, écran, media queries CSS, caractéristiques matérielles, WebRTC sans fuite STUN, TLS ClientHello, fuseau horaire, locale et suppression des signaux d'automatisation (`navigator.webdriver`, `Runtime.enable`, marqueurs headless).
- **Saisie humanisée native dans le processus navigateur (`humanize=True`)** — trajectoires de pointeur (`cursory-rs`), clics ciblés avec durée de maintien, cadence de frappe avec autocorrection des fautes de frappe et physique de défilement s'exécutent dans Chromium. Le SDK retourne un `Browser` natif standard sans surcouche proxy.
- **Fonctionnement autonome sans clé ni compte** — les builds actuels du moteur (`158.0.8127.37-2` et ultérieurs) et Ombra Desktop s'exécutent localement sans inscription, clé de licence, identifiant matériel ni serveur de licences.
- **Installation automatique et vérification cryptographique du binaire** — `pip install ombrabrowser` ou `npm install @ombralabs/sdk` ; au premier lancement, le SDK télécharge le build correspondant à votre plateforme et vérifie sa signature Ed25519 ainsi que sa somme de contrôle SHA-256.
- **Profils persistants et relais proxy sécurisé** — les profils nommés conservent les cookies, `localStorage`, IndexedDB et le `seed` d'une exécution à l'autre avec verrouillage inter-processus ; les proxys authentifiés (HTTP, HTTPS, SOCKS5) passent par un relais local de bouclage (loopback) afin que les identifiants n'apparaissent jamais dans les arguments du processus.
- **Gestionnaire de profils hors ligne Ombra Desktop** — une application de bureau native incluse dans ce dépôt ([`desktop/`](../../desktop/README.md)) avec des installateurs précompilés pour macOS, Linux et Windows.

**Python (Playwright) :**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

**Node.js / TypeScript (Playwright) :**

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

Puppeteer est également pris en charge via `import { launch } from "@ombralabs/sdk/puppeteer"` ou `launchPuppeteer()` ([détails](#puppeteer)).

**Pour les sites dotés d'une protection anti-bot**, combinez un proxy résidentiel, un profil persistant et des paramètres d'environnement cohérents :

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # une IP résidentielle est préférable à celle d'un datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # aligne le fuseau horaire et la locale sur la sortie du proxy
    headless=False,                                      # certains sites détectent les différences du mode headless
    humanize=True,                                       # simulation native de la souris, du clavier et du défilement
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

Consultez la section [Dépannage](#dépannage) pour les problèmes courants sous Linux, dans les conteneurs et sur les cibles protégées.

## Installation

**Python (3.10+) :**

```bash
python -m pip install ombrabrowser

# Optionnel : détection automatique du fuseau horaire et de la locale depuis l'IP de sortie du proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+) :**

```bash
# Avec Playwright (1.60.0+, aucun téléchargement du Chromium standard nécessaire)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Ou avec Puppeteer
npm install @ombralabs/sdk puppeteer-core

# Optionnel : lecteur de base GeoIP hors ligne pour timezone: "auto" et locale: "auto"
npm install mmdb-lib
```

---

Au lancement, le SDK recherche le moteur dans un ordre strict : `binary_path` (`binaryPath` en Node.js), `OMBRA_BINARY_PATH`, le répertoire du moteur d'Ombra Desktop, puis le cache du SDK (`~/.ombra/engines`). Si aucun moteur compatible n'est trouvé, le SDK télécharge un build depuis le canal de publication signé, vérifie sa signature Ed25519 et sa somme de contrôle SHA-256, puis le met en cache localement. Il n'est pas nécessaire d'exécuter `playwright install chromium`.

Pour désactiver le téléchargement automatique, passez `download=False` (`download: false` en Node.js). Pour télécharger et vérifier le moteur à l'avance (par exemple lors de la construction d'un conteneur), appelez `ensure_binary()` (`ensureBinary()`) ou utilisez la commande CLI `install`.

> **Lancement autonome :** les builds actuels du moteur (`158.0.8127.37-2` et ultérieurs) sont gratuits et ne nécessitent ni compte ni clé de licence. `OMBRA_LICENSE_KEY` et la commande `login` restent disponibles uniquement par compatibilité avec les anciens builds sous licence.

**La migration depuis Playwright** tient en deux lignes — toutes les opérations sur les pages, les localisateurs et les attentes restent inchangés :

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # le reste de votre code fonctionne sans modification
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Ajoutez une étoile (Star)** au dépôt si vous le trouvez utile, et **[suivez les versions (Watch releases)](https://github.com/ombralabs/ombra/subscription)** pour être informé des nouveaux builds du moteur, du SDK et d'Ombra Desktop.

---

## État actuel et versions

Chaque composant de l'écosystème suit le contrat de lancement commun et dispose de son propre cycle de versions.

| Composant | Statut / version | Emplacement |
|---|---|---|
| **Contrat SDK** | Brouillon `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK Python** | Alpha `0.1.3` | [`ombrabrowser` sur PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK Node.js / TypeScript** | Alpha `0.1.0` | [`@ombralabs/sdk` sur npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Moteur Ombra Chromium** | Chromium `158.0.8127.37` | `158.0.8127.37-2` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Navigateur autonome** | `v158.0.8127.37-2` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-2) |
| **Schémas et conformité** | JSON Schema + cas communs | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Méthode d'audit de furtivité** | 6 couches (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Inclus dans les versions actuelles :

- **Correctifs au niveau du code source** — dérivation cohérente de l'empreinte à partir du `seed`, alignement WebGL / WebGPU et des extensions, tables de polices réalistes par OS, profil TLS ClientHello natif (`chrome-<major>`), suppression des fuites `Runtime.enable` et de pile `UtilityScript`, et protection contre les fuites d'IP hôte WebRTC.
- **Domaine CDP `Ombra` au niveau du navigateur** — contrôle à chaud de la saisie humanisée (`getHumanizeState`, `setHumanize`) en Python et en Node.js sans redémarrer le navigateur.
- **Simulation de saisie native dans le processus navigateur** — planificateur de pointeur `cursory-rs`, profils de défilement molette et pavé tactile, cadence de frappe avec autocorrection des fautes de frappe et collage sécurisé de textes longs via un presse-papiers isolé.
- **Builds autonomes sans clé** — les builds actuels du moteur (`158.0.8127.37-2`) et Ombra Desktop `1.2.2` fonctionnent entièrement en local sans compte, sans clé et sans télémétrie.
- **Épinglage de la version du moteur (`version`)** — figez un build précis via `launch(version="158.0.8127.37-2")`, `OMBRA_VERSION` ou la commande CLI `install --version`.
- **Relais proxy unifié** — proxys authentifiés HTTP, HTTPS et SOCKS5 sans exposer les identifiants dans la ligne de commande Chromium, les journaux ni les métadonnées de profil.
- **Profils nommés persistants** — stockage du `seed`, des cookies, de `localStorage` et d'IndexedDB dans `~/.ombra/profiles/<slug>` avec verrouillage inter-processus (`ProfileBusyError`).
- **Vérifications cryptographiques de la chaîne logistique** — contrôle de la signature Ed25519 des enveloppes de publication et vérification SHA-256 des archives avant extraction.

Consultez [CHANGELOG.md](../../CHANGELOG.md) pour l'historique complet des versions.

## Pourquoi Ombra

- **Les correctifs par configuration ou injection JS cassent facilement.** Des outils comme `playwright-stealth`, `puppeteer-extra` et `undetected-chromedriver` injectent du JavaScript dans les pages ou ajustent des drapeaux de lancement. Les mises à jour de Chrome les cassent régulièrement et les détecteurs modernes repèrent les correctifs eux-mêmes (`Function.prototype.toString`, anomalies de prototypes, `addScriptToEvaluateOnNewDocument`).
- **Les modifications sont compilées dans le code source de Chromium.** Les empreintes sont générées au niveau C++ et appliquées de façon uniforme dans le cadre principal, les workers et les iframes. Le SDK n'injecte aucun script dans les pages et n'effectue aucune surcharge `Emulation.*`.
- **La simulation de saisie vit dans le processus navigateur, pas au-dessus de Playwright.** Comme les trajectoires de souris, les frappes clavier et le défilement sont traités dans Chromium lui-même, le SDK n'encapsule pas les objets Playwright ou Puppeteer — chaque localisateur, frame et bibliothèque tierce continue de fonctionner normalement.
- **Architecture locale sans services supplémentaires.** Aucun démon de contrôle en arrière-plan ni saut réseau entre votre script et le navigateur : un seul processus moteur, un CDP local sur `127.0.0.1` et aucune limite sur le nombre de profils ou la concurrence.

## Ombra Desktop

**Un gestionnaire local de profils hors ligne doté d'une interface graphique.** Son code source se trouve directement dans ce dépôt ([`desktop/`](../../desktop/README.md)) et repose sur Tauri (Rust + Vue).

- **Entièrement hors ligne et local** — le catalogue de profils réside dans une base SQLite locale sur votre machine avec une clé de chiffrement locale ; aucun compte, service cloud ni accès réseau n'est requis.
- **Gestion structurée des profils** — créez des profils, recherchez par nom, note ou numéro, modifiez les descriptions et organisez vos entrées grâce aux groupes, tags, étiquettes et favoris dans le catalogue Rust.
- **Corbeille sécurisée** — déplacer un profil dans la Corbeille conserve ses fichiers sur le disque pour vous permettre de le restaurer ultérieurement.
- **Aucune limite de profils** — pas de paliers par profil ni de quotas cloud : toutes les données restent sous votre contrôle.
- **Installateurs précompilés** — macOS Apple Silicon (`.dmg`, signé avec Apple Developer ID et notarisé), Linux (`.deb` et `.rpm`) et Windows x64 (`setup.exe`).
- **Catalogues isolés** — définissez `OMBRA_DESKTOP_DATA_DIR` pour travailler sur un catalogue de test distinct ou sur une copie de sauvegarde.

[Télécharger `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [README Desktop](../../desktop/README.md) · [Guide des profils et clés locales](../../docs/desktop/README.md)

## Vérification de l'empreinte et audit de furtivité

Plutôt que des promesses génériques d'« indétectabilité à 100 % », Ombra s'appuie sur une procédure de vérification reproductible dans des conditions consignées. Les résultats réels sur un site donné dépendent toujours de la réputation de l'IP de sortie, de la région, de l'historique du profil, de la version du détecteur et de la configuration de lancement.

### Surfaces gérées par le moteur et le SDK

| Surface / signal | Playwright standard | Ombra | Implémentation |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Correctif moteur C++ |
| `window.chrome` | absent en headless | objet complet | Identique à Chrome standard |
| `navigator.plugins` | `0` en headless | jeu de plugins cohérent | Niveau moteur |
| User-Agent et Client Hints | `HeadlessChrome`, incohérence de marque | `Google Chrome` + en-têtes `Sec-CH-UA*` alignés | Correctif `010-user-agent-and-webdriver` |
| Artefacts CDP (`Runtime.enable`, `UtilityScript`) | signalés par les détecteurs | supprimés par le moteur ; le SDK n'appelle jamais `Runtime.enable` | Correctif `110-runtime-enable` + invariant `SI-02` |
| Fuite IP WebRTC | expose l'IP locale/hôte | annonce l'IP de sortie sans envoyer de vrai trafic STUN | Correctif `100-webrtc-leak` (`--webrtc-ip`) |
| TLS et HTTP/2 | dépend de la configuration | pile réseau Chromium + profil ClientHello `chrome-<major>` | Correctif `210-tls-network-persona` |
| WebGL et WebGPU | moteur de rendu logiciel / incohérence GPU | limites et tables d'extensions WebGL/WebGPU unifiées | Correctifs `070`, `071`, `075`, `955` |
| Polices, locale et fuseau horaire | valeurs de l'hôte, dérive `Intl` | tables de polices cohérentes, locale ICU et fuseau horaire | Correctifs `040`, `090`, `092`, `230` |
| Simulation de saisie | téléportation du curseur, `fill()` instantané | courbes `cursory-rs`, rythme de frappe, physique de défilement | Correctif `135-ombra-humanize` dans le processus navigateur |
| Stabilité de l'empreinte | change ou laisse fuiter l'hôte | déterministe selon le `seed` entre redémarrages et frames | Correctifs `001`, `002` + profil persistant |

### Les six couches de l'audit

Avant de publier ou de déployer une configuration, exécutez les six couches d'audit avec le build exact du moteur, le client d'automatisation et le proxy que vous comptez utiliser :

| Couche | Exemples de cibles | Critères de réussite |
|---|---|---|
| **L0 Transport** | TrackMe, pages de fuite IP/WebRTC, écho d'en-têtes | Seule l'IP de sortie du proxy est visible ; JA4 et HTTP/2 correspondent au build Chromium ; aucun identifiant proxy dans argv |
| **L1 Identité** | Sonde locale, Sannysoft, Intoli, contrôle UA-CH | Aucune contradiction entre UA, Client Hints, plateforme, GPU, polices, écran et locale |
| **L2 Empreinte** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Aucun marqueur headless ni `lie` ; l'empreinte reste stable entre rechargements |
| **L3 Automatisation** | rebrowser, brotector, botd, audit des commandes CDP | Aucune fuite `Runtime.enable`, init-script, binding ni `navigator.webdriver` |
| **L4 Comportement** | Sonde de fidélité de saisie, traces humanize, test de fumée sur défi réel | Événements `isTrusted: true`, ordre et temporisations naturels, courbes de pointeur et défilement réalistes |
| **L5 Stabilité** | Lancements répétés, workers, iframes même origine / cross-origin, parité inter-SDK | Un même `seed` reproduit une empreinte identique dans tous les contextes |

Procédure complète, statuts (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), liste de contrôle des signaux et modèle de rapport : [anglais (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) et [russe (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Comparaison

| Fonctionnalité | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API d'automatisation | Playwright | Playwright | Selenium | **Playwright et Puppeteer** |
| Niveau des correctifs | Aucun | Injection JS dans la page | Options de configuration | **Code source C++ (Chromium)** |
| `seed` d'empreinte cohérent | Non | Non | Partiel | **Oui, par profil et eTLD+1** |
| Simulation de saisie (`humanize`) | Non | Non | Non | **Intégrée au processus navigateur** |
| Suppression des fuites `Runtime.enable` / CDP | Non | Non | Partiel | **Correctif moteur + invariants SDK** |
| Proxys authentifiés sans fuite CLI | Non | Non | Limité | **Relais local de bouclage (loopback)** |
| Isolation des profils | Contexte navigateur | Contexte navigateur | Non | **Répertoire de profil + verrou fichier** |
| Gestionnaire de profils hors ligne (GUI) | Non | Non | Non | **Ombra Desktop (macOS, Linux, Windows)** |
| Migration depuis Playwright | — | Changement d'import | Réécriture du code | **Remplacement de l'import et de `launch()`** |

## Fonctionnement

```mermaid
flowchart LR
    Script["Votre script<br/>Playwright · Puppeteer"]
    SDK["SDK Ombra<br/>launch() + pont CDP"]
    Relay["Relais proxy local<br/>si authentification requise"]
    Engine["Ombra Chromium<br/>moteur patché en C++"]
    Client["Client natif<br/>Playwright · Puppeteer"]
    Profile[("Profil<br/>seed · cookies · stockage")]

    Script -->|"launch()"| SDK
    SDK -->|"vérifier + lancer"| Engine
    SDK -.->|"auth proxy"| Relay
    Relay -.-> Engine
    SDK -->|"connexion via CDP"| Client
    Script -->|"API page"| Client
    Client -->|"CDP loopback"| Engine
    Engine --> Profile
```

1. **`launch()` localise ou télécharge le moteur** et vérifie sa signature Ed25519 ainsi que sa somme de contrôle SHA-256.
2. **Le profil et le `seed` sont préparés.** Un profil nommé acquiert un verrou inter-processus ; si le proxy nécessite des identifiants, le SDK démarre un relais local de bouclage en mémoire.
3. **Ombra Chromium démarre** avec le profil choisi, les options d'empreinte et un port de débogage local (`--remote-debugging-port=0`).
4. **Le client officiel se connecte.** Dès l'apparition de `DevToolsActivePort`, le SDK rattache Playwright (avec `no_defaults=True`) ou Puppeteer sur `127.0.0.1` et retourne l'objet `Browser` natif.
5. **Arrêt propre.** `browser.close()` envoie `Browser.close`, termine l'arborescence de processus du moteur, arrête le relais et libère le verrou du profil.

Une fois lancé, le SDK quitte le chemin de données : toutes les commandes de page transitent directement entre Playwright ou Puppeteer et Chromium.

### Limites du SDK et invariants de furtivité

Le [contrat SDK v0.1 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) impose des invariants stricts à chaque SDK officiel :

- **Aucun script furtif dans les pages.** Le SDK n'appelle jamais `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` et ne modifie jamais les propriétés DOM.
- **Aucun `Runtime.enable`.** Les contrôles de disponibilité utilisent uniquement le point de terminaison HTTP CDP local ou `Browser.getVersion` ; le SDK n'active jamais `Runtime`, `Debugger` ni `Log`.
- **Aucune surcharge `Emulation.*`.** Le SDK n'appelle jamais `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ni `setDeviceMetricsOverride` — l'identité du navigateur provient du moteur.
- **Aucun drapeau interdit par défaut.** Le SDK n'injecte jamais `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` ni `--user-agent` de sa propre initiative.
- **CDP loopback uniquement.** Le port de débogage se lie toujours à `127.0.0.1` ; passer une adresse `--remote-debugging-address` hors loopback est rejeté.
- **Aucune télémétrie ni fuite de secrets.** Les identifiants proxy, clés et cookies sont masqués dans les journaux et les messages d'erreur.

## API Python

### `launch()`

```python
from ombrabrowser import launch

# Lancement basique (headless par défaut)
browser = launch()

# Fenêtre de navigateur visible (avec interface graphique)
browser = launch(headless=False)

# Proxy HTTP ou SOCKS5 (identifiants gérés via le relais local loopback)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Objet proxy avec liste d'exclusion (bypass)
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

# Contrôles d'empreinte (seed, OS, fuseau horaire/locale auto depuis le proxy, écran, GPU)
# Pour timezone="auto" / locale="auto", installez : pip install "ombrabrowser[geoip]"
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

# Simulation native de la souris, du clavier et du défilement
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Figer un build précis du moteur et passer des drapeaux Chromium supplémentaires
browser = launch(
    version="158.0.8127.37-2",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Retourne un `playwright.sync_api.Browser` standard. Toutes les méthodes Playwright fonctionnent normalement (`new_page()`, `new_context()`, `close()`, etc.). Les nouvelles pages utilisent par défaut `no_viewport=True` afin de ne pas écraser les dimensions de fenêtre du profil.

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

### `launch_context()` et `launch_context_async()`

Fonction utilitaire qui lance le navigateur et retourne directement un `BrowserContext` (la fermeture du contexte met également fin au processus du moteur). Les arguments nommés supplémentaires sont transmis à `browser.new_context()` — par exemple `storage_state`, `permissions` ou `extra_http_headers` :

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

Équivalent asynchrone : `await launch_context_async(...)`.

### `launch_persistent_context()` et `launch_persistent_context_async()`

Lance le navigateur avec un profil persistant et retourne son `BrowserContext` par défaut. Les cookies, `localStorage`, IndexedDB, le cache et le `seed` d'empreinte persistent d'une session à l'autre.

- Passer `profile="pricing-eu"` crée le profil dans `~/.ombra/profiles/pricing-eu` avec les métadonnées dans `.ombra/profile.json` et un fichier de verrou.
- Passer `user_data_dir="./my-profile"` (ou un argument positionnel de chemin) utilise ce répertoire explicite.
- Lancer le même profil simultanément depuis un autre processus lève `ProfileBusyError` au lieu de corrompre les données du profil.

```python
from ombrabrowser import launch_persistent_context

# Par profil nommé (stocké dans ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # les cookies, le stockage et le seed sont conservés

# Par chemin explicite (par exemple pour charger des extensions Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Équivalent asynchrone : `await launch_persistent_context_async(...)`.

### Fonctions utilitaires et diagnostics (Python)

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

# Inspecter le binaire du moteur résolu
print(binary_info())
# {'version': '158.0.8127.37-2', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Télécharger et vérifier le moteur sans lancer de navigateur
ensure_binary(version="158.0.8127.37-2")

# Supprimer les binaires du moteur gérés par le SDK (les profils dans ~/.ombra/profiles sont conservés)
clear_cache()

# Inspecter la commande de lancement résolue sans démarrer Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Lire les métadonnées d'exécution (port CDP, ws_url, seed, pid) et vérifier l'état du processus
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # télécharger et vérifier le moteur (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-2  # installer un build précis du moteur
ombrabrowser info                                # diagnostics d'environnement, de binaire et de dépendances (alias : doctor)
ombrabrowser info --quick --json                 # rapport rapide exploitable par machine sans lancer le binaire
ombrabrowser info --proxy socks5://user:pass@host:1080  # tester la résolution de l'IP de sortie, du fuseau horaire et de la locale via proxy
ombrabrowser update                              # vérifier le canal de publication et mettre à jour le moteur en cache
ombrabrowser clear-cache                         # vider le cache des binaires du moteur (profils préservés)
ombrabrowser login                               # enregistrer une clé de licence dans ~/.ombra/license.key (anciens builds uniquement)
ombrabrowser logout                              # supprimer la clé de licence enregistrée
```

Les mêmes commandes sont accessibles via `python -m ombrabrowser <command>`.

## API Node.js et TypeScript

`@ombralabs/sdk` fournit un double build ESM + CommonJS accompagné des définitions TypeScript complètes (`.d.ts`). Playwright et Puppeteer reposent tous deux sur le même moteur sous-jacent.

### Playwright (par défaut)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Lancement basique avec proxy, empreinte et simulation de saisie
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

// Lancement simplifié : navigateur + contexte en un seul appel
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Profil persistant — cookies, localStorage et seed conservés entre les exécutions
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Chaque extrait ci-dessus est autonome. Pour migrer un lanceur Playwright existant, vous pouvez aussi remplacer l'import par `import * as chromium from "@ombralabs/sdk"` et conserver `await chromium.launch(...)`.

### Puppeteer

Utilisez `launchPuppeteer()` depuis `@ombralabs/sdk` ou importez depuis `@ombralabs/sdk/puppeteer` :

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

> **Remarque sur Puppeteer :** Puppeteer envoie par défaut davantage de trafic CDP que Playwright avec `connectOverCDP({ noDefaults: true })`. Pour les sites effectuant des contrôles CDP stricts, Playwright est recommandé.

### Utilitaires et CLI (Node.js)

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

## Saisie humanisée

Dans Ombra, la simulation de saisie (`humanize`) est compilée **nativement dans le processus navigateur Chromium** (propulsée par `cursory-rs` et l'ordonnanceur de saisie du moteur) plutôt qu'implémentée sous forme de wrapper JS autour du client d'automatisation. Cela signifie que :

- Chaque action standard Playwright et Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) passe par une file de saisie unique par onglet au sein du navigateur.
- Les paramètres comportementaux sont dérivés de manière déterministe depuis le `seed` du profil (`--fingerprint-humanize-seed`).
- Le SDK n'encapsule jamais `Page` ni `Browser` dans des classes proxy — les types natifs et le comportement du client restent intacts.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Ce qui change avec `humanize=True` :**

| Action | Sans `humanize` | Avec `humanize=True` |
|---|---|---|
| Déplacement de souris | Téléportation instantanée | Courbes `cursory-rs` avec accélération, pauses et léger dépassement |
| Clics et glisser-déposer | Pression instantanée | Point de visée dans la cible, pause avant le clic et durée de maintien |
| Saisie de texte | Affectation instantanée de la valeur | Frappe caractère par caractère selon une cadence et une disposition clavier configurées, fautes de frappe occasionnelles et autocorrection ; les textes très longs sont collés via un presse-papiers isolé sans toucher au presse-papiers système |
| Défilement | Saut unique | Série d'événements molette/pavé tactile suivant des profils de décélération mesurés |
| Intervalles d'inactivité | Curseur immobile | Avec le préréglage `careful`, subtile dérive du curseur entre les actions |

**Préréglages** — `default` (rythme normal), `careful` (plus lent, posé, avec micro-mouvements à l'arrêt) et `fast` (rythme plus rapide). Passez `humanize=False` (`humanize: false`) pour désactiver explicitement la simulation de saisie.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Vous pouvez activer/désactiver le mode ou changer de préréglage à chaud sans redémarrer le navigateur via le domaine CDP `Ombra` :

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

## Gestion des empreintes et des profils

Le moteur dérive une configuration de navigateur cohérente à partir d'un unique `seed`. Lorsque `seed` est omis :

| Scénario | Comportement |
|---|---|
| **`launch()` sans profil** | Le SDK génère un `seed` aléatoire pour la session et crée un répertoire temporaire supprimé après `close()`. |
| **`profile="name"` ou `user_data_dir="./dir"`** | Le `seed` est enregistré dans `.ombra/profile.json` et réutilisé à chaque lancement — les sites reconnaissent un visiteur récurrent avec le même appareil et les mêmes cookies. |
| **`fingerprint={"seed": N, ...}`** | Empreinte déterministe à partir du `seed` explicite ; les champs supplémentaires surchargent des paramètres précis tout en préservant la cohérence du reste. |

Le bruit canvas/audio est dérivé par `eTLD+1` (stable sur un même site, impossible à corréler d'un site à l'autre). Le bruit de pixels pour le canvas 2D et WebGL `readPixels` est désactivé par défaut afin d'éviter de déclencher les détecteurs de « Canvas Tampering / Masking », et peut être activé explicitement via `--fingerprint-pixel-noise`.

> **Astuce :** lorsque vous revisitez un même site, utilisez un profil persistant (`profile="name"` ou `launch_persistent_context()`) plutôt que de passer un `seed` fixe à un `launch()` éphémère — ainsi, les cookies, le cache et `localStorage` restent cohérents avec l'empreinte.

### Champs de l'objet `fingerprint`

Les noms de champs ci-dessous suivent la convention Python (`snake_case`) ; Node.js accepte à la fois `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) et `snake_case` :

| Champ | Type | Description |
|---|---|---|
| `seed` | `int` (`>= 0`) | Graine du générateur déterminant la configuration globale de l'empreinte |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | OS cible (`navigator.platform`, UA, jeux de GPU et de polices) |
| `os_version` | `string` | Indication de version d'OS pour les Client Hints |
| `timezone` | zone IANA ou `"auto"` | Fuseau horaire (p. ex. `"Europe/Berlin"`). `"auto"` résout le fuseau depuis la sortie proxy via GeoIP |
| `locale` | BCP-47 ou `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` résout la locale depuis la sortie proxy |
| `screen` | `{"width", "height"}` ou `"auto"` | Dimensions d'écran et de zone de travail tenant compte de la barre des tâches / barre de menus de l'OS cible |
| `gpu` | `{"vendor", "renderer"}` ou `"auto"` | Chaînes WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` explicites |
| `hardware_concurrency` | `int` ou `"auto"` | Valeur annoncée par `navigator.hardwareConcurrency` |
| `device_memory` | `int` ou `"auto"` | Valeur annoncée par `navigator.deviceMemory` (en Go) |
| `noise` | `bool` | Active/désactive le bruit d'empreinte (`False` transmet `--disable-fingerprint-noise`) |

> Gardez `seed` comme source principale des paramètres d'empreinte : surcharger des valeurs isolées sans maintenir leur cohérence (comme associer un OS à un GPU incompatible) peut introduire des contradictions repérables par les détecteurs.

### Indicateurs supplémentaires du moteur (`args`)

Drapeaux pris en charge par le moteur que le SDK ne définit pas automatiquement (à passer via `args=[...]`) :

| Drapeau | Rôle |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Marque du navigateur dans `Sec-CH-UA` (le SDK utilise `chrome` par défaut) |
| `--fingerprint-tls-profile=chrome-<major>` | Profil TLS ClientHello correspondant à la version majeure de Chrome indiquée (défini automatiquement par le SDK selon la version du moteur) |
| `--webrtc-ip=<ip>` | Adresse IP de substitution dans les candidats ICE WebRTC sans envoyer de vrai trafic STUN |
| `--fingerprint-location=<lat,lon>` | Coordonnées renvoyées par `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Quota de stockage renvoyé par `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Nombre de points tactiles (`navigator.maxTouchPoints` et media queries de pointeur) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Densité de pixels de l'écran (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Profondeur de couleur de l'écran |
| `--disable-gpu-fingerprint` | Expose directement le vrai GPU de l'hôte (chaînes WebGL/WebGPU, limites et extensions) |
| `--disable-gpu-string-spoof` | Expose les vraies chaînes GPU tout en conservant les autres paramètres du profil |
| `--disable-fingerprint-noise` | Désactive le bruit canvas/WebGL/audio tout en gardant les paramètres d'identité actifs |
| `--fingerprint-pixel-noise` | Active sur demande le bruit de pixels idempotent pour le canvas 2D et `readPixels` |
| `--profile-label=<text>` | Étiquette de profil affichée dans la barre d'adresse du navigateur (UI uniquement ; invisible pour les pages web) |

### Configuration des polices sous Linux

Les serveurs Linux minimaux et les conteneurs manquent souvent de polices emoji et CJK, ce qui produit des empreintes inhabituelles lors du rendu de texte et d'emojis dans des canvas cachés.

**1. Couche de base (emoji et CJK) :**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Polices Windows pour les profils Windows (`os="windows"`) :**
Lors de l'exécution d'une configuration Windows sous Linux, installer les véritables polices de `C:\Windows\Fonts\` (notamment `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) améliore sensiblement la cohérence de l'énumération des polices :

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Polices macOS pour les profils macOS (`os="macos"`) :**
De la même manière, avec `os="macos"` sous Linux, copiez les polices depuis `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` et `/Library/Fonts/` dans `~/.local/share/fonts/mac/` puis exécutez `fc-cache -f`.

Dans un `Dockerfile`, placez les polices dans le répertoire système `/usr/local/share/fonts/` :

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Options de lancement, configuration et erreurs

### Options de `launch()`

Les noms d'options suivent l'API Python et le [contrat SDK](../../docs/sdk-contract.md) ; Node.js utilise les équivalents `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) et accepte aussi les alias `snake_case`. Les options inconnues sont rejetées avec `InvalidOptionError`.

| Option | Par défaut | Description |
|---|---|---|
| `headless` | `true` | Exécution sans fenêtre (`--headless=new`) |
| `proxy` | aucun | URL proxy (`http`, `https`, `socks5`) ou objet ; les proxys authentifiés utilisent un relais loopback |
| `fingerprint` | aucun | Paramètres pour `seed`, OS, fuseau horaire, locale, écran, GPU, mémoire et bruit |
| `profile` | aucun | Profil persistant nommé dans `~/.ombra/profiles/<slug>` (mutuellement exclusif avec `user_data_dir`) |
| `user_data_dir` | temporaire | Chemin explicite vers le répertoire de profil (mutuellement exclusif avec `profile`) |
| `args` | `[]` | Arguments Chromium supplémentaires (transmis tels quels) |
| `binary_path` | résolu | Chemin explicite vers un exécutable du moteur |
| `version` | env / auto | Épinglage de version du moteur (par exemple `158.0.8127.37-2`), prioritaire sur `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Délai maximal pour le démarrage du moteur et la connexion CDP (1000–600000 ms) |
| `humanize` | défaut moteur | `False`, `True` ou `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / fichier | Clé pour les anciens builds sous licence (inutile sur `158.0.8127.37-2+` ; jamais journalisée) |
| `env` | `{}` | Variables d'environnement supplémentaires pour le processus du moteur |
| `download` | `True` | Autorise le téléchargement automatique d'un binaire moteur manquant |

### Variables d'environnement

Ordre de priorité : **option de lancement explicite → variable d'environnement → métadonnées du profil → valeur par défaut**.

| Variable | Par défaut | Description |
|---|---|---|
| `OMBRA_BINARY_PATH` | non définie | Chemin explicite vers un binaire du moteur |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Répertoire des moteurs en cache et des profils nommés |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | URL de base / miroir pour télécharger le moteur (`none`/`off` désactive le téléchargement) |
| `OMBRA_VERSION` | dernière compatible | Version épinglée du moteur (par exemple `158.0.8127.37-2`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Canal de publication du moteur : `stable` ou `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Vérifie la présence de builds plus récents du moteur au lancement |
| `OMBRA_SKIP_CHECKSUM` | `false` | Développement local uniquement : désactive la vérification SHA-256 (émet un avertissement dans les journaux) |
| `OMBRA_LICENSE_KEY` | non définie | Clé pour les anciens builds sous licence (jamais journalisée) |
| `OMBRA_TIMEOUT_MS` | `30000` | Délai d'attente par défaut au lancement (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Verbosité des journaux : `error`, `warn`, `info`, `debug` |

### Erreurs typées

En cas d'échec, le SDK termine le processus du moteur lancé, libère le verrou du profil et lève une sous-classe d'`OmbraError` portant un `kind` stable et des `details` expurgés de tout secret :

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

La taxonomie complète des erreurs et les règles de nouvelle tentative sont documentées dans le [contrat SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Plateformes, intégrations et conteneurs

### Plateformes et environnements d'exécution pris en charge

| Composant | Prise en charge | Notes |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Build autonome `158.0.8127.37-2` ; Ombra Desktop est signé Developer ID et notarisé |
| **macOS x64 (Intel)** | — | Aucune version actuelle de Chromium 158 |
| **Linux x64** | ✅ | Build autonome `158.0.8127.37-2` ; nécessite `xz-utils` (`xz`) pour extraire `.tar.xz` |
| **Windows x64** | ✅ | Build autonome `158.0.8127.37-2` et installateur Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` est installé automatiquement avec `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` ou Puppeteer `>=22` (Puppeteer 25+ nécessite Node.js `>=22.12`) |

### Intégrations avec les frameworks et agents IA

Ombra fonctionne avec tout outil d'automatisation ou framework d'agents IA qui accepte un binaire Chromium personnalisé ou se connecte via CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` et autres) :

```python
# Option 1 : résoudre le chemin du binaire vérifié et les arguments du moteur pour votre propre lanceur
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Option 2 : lancer via le SDK Ombra et transmettre le point de terminaison CDP local à votre framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Connectez votre framework à ws_url ou cdp_http — les paramètres d'empreinte et humanize
# s'exécutent dans le moteur et restent actifs pour tout client CDP
```

### Exécution dans Docker et sur des serveurs Linux

Exemple de `Dockerfile` qui pré-télécharge et vérifie le moteur lors de la construction de l'image :

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

> **Conteneurs et serveurs web :**
> - Si votre conteneur ne peut pas initialiser le bac à sable Chromium, passez explicitement `--no-sandbox` via `args=["--no-sandbox"]` (le SDK n'ajoute jamais ce drapeau de lui-même).
> - Pour exécuter avec `headless=False` sur un serveur sans écran, utilisez `Xvfb` (voir [ci-dessous](#dépannage)).
> - Sous `uvicorn` avec `uvloop`, passez `--loop asyncio` afin d'éviter les blocages de tubes (pipes) de sous-processus.

## Dépannage

### Un site bloque le mode headless

Certains systèmes anti-bot vérifient les différences de comportement et de rendu propres au mode headless, même avec des correctifs C++. Exécutez alors avec `headless=False` sur un affichage virtuel via `Xvfb` :

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Lancez ensuite avec un proxy résidentiel SOCKS5/HTTP, un profil persistant, un fuseau horaire et une locale assortis, `headless=False` et `humanize=True` :

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Si les blocages persistent sous Linux, vérifiez [Configuration des polices sous Linux](#configuration-des-polices-sous-linux).

### Un site déclenche une vérification à chaque visite

Appeler `launch()` sans `profile` démarre à chaque fois depuis un répertoire temporaire vide et un nouveau `seed`, si bien que le site considère chaque exécution comme un visiteur tout neuf sans cookies. Passez à `profile="..."` ou `launch_persistent_context(...)` pour que les cookies, `localStorage` et le `seed` soient conservés d'une exécution à l'autre.

### `ProfileBusyError`

Un profil nommé ou un `user_data_dir` ne peut être ouvert que dans un seul processus à la fois. Attribuez un nom de profil distinct à chaque worker parallèle (`profile=f"worker-{i}"`). Les verrous obsolètes laissés par des processus ayant planté sont détectés et nettoyés automatiquement.

### Faut-il exécuter `playwright install chromium` ?

Non. Ombra utilise son propre binaire moteur et ne fait pas appel au Chromium standard de Playwright. Sous Linux, seules les bibliothèques système et `xz-utils` sont nécessaires :

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Mise à jour, changement de canal et retour à une version antérieure du moteur

Mettez à jour le SDK vers la dernière version :

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Testez le canal `beta` ou figez / revenez à un build précis du moteur :

```python
# Figer un build précis pour un lancement donné
browser = launch(version="158.0.8127.37-2")
```

```bash
# Ou configurer via les variables d'environnement / la CLI
export OMBRA_VERSION=158.0.8127.37-2
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-2

# Ou pointer vers un binaire compilé localement
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS : Gatekeeper bloque un build local

Les versions officielles d'Ombra pour macOS Apple Silicon sont signées avec un certificat Apple Developer ID et notarisées. Si vous exécutez un build développeur local non signé et que macOS le met en quarantaine, supprimez une fois l'attribut de quarantaine :

```bash
xattr -cr ~/.ombra/engines/*/Chromium.app
```

### Attendre sur une page en Python synchrone

Avec Playwright synchrone, un seul long `time.sleep(15)` après `page.goto()` met en pause la boucle d'événements de Playwright, ce qui peut bloquer les pages de vérification. Attendez plutôt par courts intervalles avec un appel léger sur le contexte :

```python
import time

for _ in range(15):
    page.context.cookies()  # maintient le traitement Playwright actif sans toucher au DOM de la page
    time.sleep(1)
```

En Python asynchrone, utilisez `await asyncio.sleep(...)` ; en Node.js, utilisez `await new Promise(r => setTimeout(r, ms))`. Évitez également les appels fréquents à `page.wait_for_timeout()` et les `page.evaluate()` superflus avant les vérifications afin de ne pas générer de trafic CDP supplémentaire.

## Sécurité

- **Authenticité et intégrité du moteur.** Avant extraction, le SDK vérifie la signature Ed25519 de l'enveloppe de publication par rapport à une clé publique épinglée et contrôle le condensat SHA-256 de l'archive comme de l'exécutable.
- **CDP strictement local.** Le port de débogage se lie uniquement à `127.0.0.1`. N'exposez jamais un port CDP sur un réseau public sans authentification supplémentaire — CDP donne un contrôle total sur le navigateur.
- **Isolation des secrets.** Les identifiants proxy ne résident qu'en mémoire dans le relais local de bouclage et n'apparaissent jamais dans les lignes de commande des processus, les métadonnées de profil, les journaux ni les détails d'erreurs.
- **Aucune télémétrie.** Le SDK n'envoie ni statistiques d'utilisation, ni rapports de plantage, ni requêtes réseau cachées.

Signalez les vulnérabilités en privé conformément à [SECURITY.md](../../SECURITY.md).

## Carte du dépôt

```text
.
├── README.md                    # README racine (anglais)
├── translations/
│   ├── fr/README.md             # ce fichier (Français)
│   ├── ru/README.md             # traduction russe
│   └── <locale>/README.md       # 19 autres localisations
├── desktop/                     # Ombra Desktop (Tauri : catalogue Rust + interface Vue)
├── docs/
│   ├── architecture.md          # architecture, frontières de confiance, cycle de vie
│   ├── sdk-contract.md          # contrat de lancement v0.1, options, erreurs, invariants
│   ├── stealth-checkup.md       # méthode d'audit (anglais)
│   ├── stealth-checkup.ru.md    # méthode d'audit (russe)
│   ├── versioning.md            # gestion des versions du SDK, du moteur et des clients
│   └── desktop/                 # guides Desktop sur les profils et clés locales
├── spec/
│   └── schemas/                 # schémas JSON pour les options de lancement et métadonnées binaires
├── sdks/
│   ├── manifest.json            # registre SDK lisible par machine
│   ├── README.md                # organisation des SDK et règles de contribution
│   ├── python/                  # SDK Python (publié sous le nom ombrabrowser)
│   ├── node/                    # SDK Node.js / TypeScript (publié sous le nom @ombralabs/sdk)
│   └── ...                      # squelettes de contrat pour d'autres langages (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # cas multi-langages de lancement et d'invariants de furtivité
├── tools/check_repo.py          # validateur de structure, schémas et liens (CI)
└── .github/workflows/ci.yml
```

Ce dépôt héberge le contrat SDK, les schémas, les cas de conformité, la documentation et le code source d'Ombra Desktop. Les correctifs du moteur Chromium sont maintenus dans un dépôt distinct, avec des builds compilés publiés via le canal de téléchargement et [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### Est-ce un fork de Playwright ?

Non. Le SDK connecte le client Playwright (ou Puppeteer) officiel à Ombra Chromium via CDP local. Tous les types, localisateurs, attentes et objets de page restent standards.

### Ombra est-il gratuit et ai-je besoin d'une clé de licence ?

Le code source des SDK dans ce dépôt est open source sous licence Apache 2.0. Les builds actuels du moteur (`158.0.8127.37-2` et ultérieurs) ainsi que le gestionnaire de profils local Ombra Desktop (`desktop-v1.2.2`) fonctionnent gratuitement et de manière autonome — sans compte, sans clé de licence, sans identifiant matériel et sans limite du nombre de profils. `license_key` et `OMBRA_LICENSE_KEY` ne sont nécessaires que pour les anciens builds sous licence.

### Dois-je installer Ombra Desktop pour utiliser le SDK ?

Non. Le SDK lance directement le moteur en tant que processus enfant, ce qui convient parfaitement aux scripts, conteneurs et pipelines CI. Ombra Desktop est optionnel si vous souhaitez gérer un catalogue local de profils via une interface graphique.

### Quelle est la différence entre Ombra et `playwright-stealth` ?

`playwright-stealth` injecte du JavaScript dans les pages par-dessus un navigateur standard, et les détecteurs modernes identifient fréquemment les correctifs eux-mêmes. Ombra compile ses modifications dans le code source de Chromium, et le SDK n'injecte aucun script dans les pages.

### Puis-je utiliser mon propre proxy ?

Oui. Passez un proxy `http://`, `https://` ou `socks5://` dans `proxy`. Lorsque des identifiants sont présents, le SDK démarre un relais local de bouclage afin qu'ils n'apparaissent jamais dans les arguments du processus. Notez que le client propre de Playwright `context.request` / `page.request` peut contourner les paramètres proxy au niveau navigateur — pour garantir que le trafic passe par le proxy, effectuez `fetch()` depuis le contexte de la page.

### Quelles versions de Playwright et Puppeteer sont prises en charge ?

Le SDK Python requiert Playwright `>=1.60,<2.0` (installé automatiquement avec `ombrabrowser`). Le SDK Node.js prend en charge `playwright-core@^1.60.0` ou `puppeteer-core >=22.0.0`. Consultez le [guide de gestion des versions](../../docs/versioning.md) pour les règles de compatibilité.

### Ombra garantit-il de passer tous les contrôles anti-bot ?

Non. La détection évolue en permanence et dépend du site, de la région, de la réputation de l'IP, de l'historique du profil et de la version du détecteur. Utilisez la [méthode d'audit de furtivité](../../docs/stealth-checkup.md) pour mesurer et suivre objectivement une configuration donnée.

### Pour quels cas d'usage Ombra est-il conçu ?

Ombra est conçu pour l'automatisation autorisée, les tests QA, la supervision, la recherche et la gestion de profils de travail isolés. Les accès non autorisés, le bourrage d'identifiants (credential stuffing) et les usages abusifs ne sont pas pris en charge.

## Contribuer

Les règles de contribution se trouvent dans [CONTRIBUTING.md](../../CONTRIBUTING.md), les normes de la communauté dans [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) et les instructions relatives aux SDK dans [sdks/README.md](../../sdks/README.md).

- Mettez à jour le [contrat SDK](../../docs/sdk-contract.md) et les [schémas](../../spec/schemas) avant d'ajouter une nouvelle option de lancement.
- Lorsque vous modifiez le comportement d'un SDK, mettez à jour l'implémentation, les tests et les cas communs dans [conformance](../../conformance/README.md).
- Exécutez `python3 tools/check_repo.py` avant d'ouvrir une pull request afin de valider la structure du dépôt et les liens.

## Licence

Le code source des SDK contenu dans ce dépôt est publié sous licence [Apache License 2.0](../../LICENSE). Cette licence ne confère aucun droit sur les marques Ombra, le moteur Ombra Chromium ni Ombra Desktop — consultez [NOTICE](../../NOTICE) pour les conditions relatives aux marques et aux composants tiers.

## Liens

- 🌐 **Site web** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Versions (moteur & Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Journal des modifications** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Bogues et demandes de fonctionnalités** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organisation** — [Ombra Labs](https://github.com/ombralabs)
