# <img src="assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

En Python comme avec Node.js, `launch()` démarre Ombra Chromium et renvoie un objet `Browser` de Playwright. Pour utiliser Puppeteer avec Node.js, appelez `launchPuppeteer()`.

**[Installation](#installation)** · <a href="README.md">English</a>

<details>
<summary>Langues</summary>

[English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · [Español](README.es.md) ·
[Français](README.fr.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) ·
[Português](README.pt.md) · [Română](README.ro.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) ·
[Tiếng Việt](README.vi.md) · [Bahasa Indonesia](README.id.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) ·
[日本語](README.ja.md) · [한국어](README.ko.md) · [ไทย](README.th.md) · [हिंदी](README.hi.md) ·
[Filipino](README.fil.md) · [ខ្មែរ](README.km.md)

</details>

## Contrôle des empreintes dans Chromium

Ombra gère l’empreinte du navigateur directement dans Chromium. Cela couvre le canvas, WebGL, l’audio, les polices, le nombre de processeurs logiques, les dimensions des éléments, les identifiants du GPU, les fuseaux horaires et les signaux d’automatisation. Le moteur utilise la pile TLS et HTTP/2 de Chromium et traite les entrées simulant les gestes d’un utilisateur dans le processus du navigateur.

Le SDK démarre le moteur en local et y connecte le client d’automatisation via le protocole Chrome DevTools (CDP). Vous pouvez l’utiliser dans un script, un conteneur ou une tâche d’intégration continue sans installer l’application de bureau Ombra.

## Statut

Les exemples utilisent les paquets alpha publiés pour Python et Node.js. Ce dépôt contient aussi le contrat de lancement commun et les squelettes de huit SDK.

| Composant | État |
|---|---|
| [Contrat des SDK](docs/sdk-contract.md) | Version de travail `0.1.0` |
| SDK Python | `0.1.3` alpha · [`ombrabrowser` sur PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK Node.js | `0.1.0` alpha · [`@ombralabs/sdk` sur npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Schémas communs](spec/schemas) | Options de lancement et métadonnées du binaire du moteur |
| [Conformité entre langages](conformance) | Cas de test communs aux deux SDK |
| [Audit de furtivité](docs/stealth-checkup.md) | Critères de test et modèle de rapport |

## Installation

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Pour Puppeteer, installez `puppeteer-core` à la place de `playwright-core`. La [fiche du paquet sur npm](https://www.npmjs.com/package/@ombralabs/sdk) indique les versions de Node.js et des clients prises en charge.

Le SDK vérifie d’abord le chemin fourni dans `binary_path` en Python ou `binaryPath` en Node.js. Il consulte ensuite, dans l’ordre, `OMBRA_BINARY_PATH`, le répertoire du moteur de l’application de bureau et le cache du SDK. S’il ne trouve pas de moteur, il en télécharge un et le vérifie.

Pour désactiver les téléchargements, passez `download=False` en Python ou `download: false` en Node.js. Pour préparer le moteur sans ouvrir de navigateur, appelez `ensure_binary()` en Python ou `ensureBinary()` en Node.js.

## Démarrage rapide

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Avec un profil nommé, ouvrez les pages dans son contexte existant pour retrouver les cookies et les données stockées par les sites. Cet exemple configure également un proxy.

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

Appelez `launchPuppeteer()` pour obtenir un objet `Browser` de Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migration sans réécriture

Pour migrer un script Python qui utilise Playwright, installez `ombrabrowser` et modifiez l’import et l’appel de lancement. Les méthodes des pages, les types et les sélecteurs restent ceux de Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

En Node.js, la même modification tient en deux lignes.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Fonctionnement

```mermaid
flowchart LR
    Script["Votre script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + pont CDP"]
    Engine["Ombra Chromium<br/>moteur modifié"]
    Client["Client d’automatisation natif"]
    Profile[("Profil<br/>graine · cookies · extensions")]

    Script -->|launch()| SDK
    SDK -->|lancement| Engine
    SDK -->|connexion via CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` recherche le moteur ou le télécharge, puis vérifie son binaire.
2. Le SDK choisit le répertoire du profil et sa graine. Si le proxy exige une authentification, le SDK démarre un relais local.
3. Il lance Chromium avec le profil choisi, les options de lancement et un port de débogage sur l’interface de bouclage.
4. Dès que `DevToolsActivePort` est prêt, le SDK connecte Playwright ou Puppeteer via CDP et renvoie l’objet `Browser` de ce client.
5. `browser.close()` arrête le moteur et libère le verrou du profil.

Après le lancement, le client envoie ses commandes de page directement à Chromium.

## Matrice des SDK

| Environnement d’exécution | Paquet publié | Objet navigateur |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → Playwright `Browser` |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → Playwright `Browser`<br>`launchPuppeteer()` → Puppeteer `Browser` |

Ce dépôt contient des répertoires pour six autres SDK. Le [manifeste des SDK](sdks/manifest.json) indique les paquets et les clients prévus. Le [guide des SDK](sdks/README.md) décrit l’organisation des répertoires.

| Environnement cible | Paquet prévu | Client ou type de retour |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Options de lancement

Les noms des options suivent l’API Python et le contrat des SDK. En Node.js, ils s’écrivent en camelCase, par exemple `timeoutMs`, `userDataDir` et `binaryPath`.

| Option | Valeur par défaut | Signification |
|---|---|---|
| `headless` | `true` | Exécuter le moteur sans fenêtre |
| `proxy` | aucun | URL du proxy ou objet de configuration. Les proxys avec authentification utilisent un relais local |
| `fingerprint` | aucune | Graine et paramètres du système, du fuseau horaire, de la langue et de la région, de l’écran et du GPU |
| `profile` | aucun | Profil nommé avec cookies, stockage et graine persistants |
| `user_data_dir` | temporaire | Répertoire de profil explicite, mutuellement exclusif avec `profile` |
| `args` | `[]` | Options supplémentaires transmises telles quelles au moteur |
| `timeout_ms` | `30000` | Délai de lancement et de connexion CDP, en millisecondes |
| `humanize` | valeur par défaut du moteur | `false`, `true` ou un préréglage |
| `captcha` | `false` | Activer le module du moteur avec des limites optionnelles |
| `binary_path` | déterminé | Utiliser un binaire de moteur spécifique |
| `download` | `true` | Télécharger un binaire de moteur manquant |

Le [contrat des SDK](docs/sdk-contract.md) répertorie toutes les options de lancement et décrit les types d’erreurs et le comportement des profils.

## Gestion du binaire

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

Le SDK vérifie la somme de contrôle SHA-256 du moteur avant le lancement. Gardez cette vérification activée en production. `OMBRA_SKIP_CHECKSUM=1` est réservé aux compilations locales de développement.

## Configuration

| Variable | Valeur par défaut | Signification |
|---|---|---|
| `OMBRA_BINARY_PATH` | non définie | Binaire de moteur explicite |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Binaires gérés et profils nommés |
| `OMBRA_DOWNLOAD_URL` | point de terminaison de publication | URL de base pour le téléchargement des binaires |
| `OMBRA_VERSION` | dernière version compatible | Version du moteur à déterminer |
| `OMBRA_AUTO_UPDATE` | `true` | Vérifier la présence d’un moteur plus récent au lancement |
| `OMBRA_SKIP_CHECKSUM` | `false` | Développement uniquement |
| `OMBRA_LICENSE_KEY` | non définie | Transmise au moteur |
| `OMBRA_TIMEOUT_MS` | `30000` | Délai de lancement par défaut, en millisecondes |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

Le SDK prend la première valeur disponible en consultant, dans l’ordre, les options de lancement, les variables d’environnement, les métadonnées du profil et les valeurs par défaut.

## Comparaison

| Fonctionnalité | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright ou Puppeteer |
| Niveau de modification | aucun | JavaScript dans la page | options de configuration | code source du moteur |
| Graine d’empreinte | aucune | aucune | partielle | par profil |
| Saisie humanisée | non | non | non | moteur |
| Isolation des profils | contexte du navigateur | contexte du navigateur | aucune | répertoire de données utilisateur |
| Migration sans réécriture | — | changement d’import | réécriture | changement d’import |

Les résultats des détecteurs dépendent du site, de l’adresse IP de sortie et du profil. L’[audit de furtivité](docs/stealth-checkup.md) décrit la méthode de mesure.

## La furtivité est une propriété du moteur

Le moteur applique les paramètres d’empreinte. Les SDK lui transmettent la graine du profil et les options de lancement explicites.

| Couche | Où Ombra l’applique |
|---|---|
| TLS et HTTP/2 | Pile réseau de la version de Chromium utilisée par le moteur |
| Identité du navigateur | Modifications du moteur au niveau du code source, pilotées par la graine du profil |
| Surface d’automatisation | Les correctifs du moteur couvrent les signaux WebDriver. Le SDK n’appelle pas `Runtime.enable`. |
| Saisie | Pointeur, clavier et défilement humanisés dans le processus du navigateur |
| Cohérence réseau | Choix du fuseau horaire et des paramètres régionaux en fonction du proxy |
| État | Un répertoire de données utilisateur distinct pour chaque profil |

### Limites du SDK

- Le port de débogage CDP accepte uniquement les connexions locales via l’interface de bouclage.
- Le SDK ne consigne ni les identifiants du proxy, ni les clés de licence, ni les cookies dans les journaux. Il n’envoie aucune donnée de télémétrie.
- Un profil existant conserve sa graine, sauf si vous en fournissez explicitement une nouvelle.
- Le SDK n’injecte pas de scripts de furtivité avec `addScriptToEvaluateOnNewDocument` ou `evaluateOnNewDocument` et ne modifie pas les propriétés des pages.
- Pour vérifier que le navigateur est prêt, le SDK utilise le point d’accès HTTP de CDP ou `Browser.getVersion`. Il n’appelle jamais `Runtime.enable` pour cette vérification.
- Le moteur fixe l’identité du navigateur. Le SDK ne redéfinit ni l’agent utilisateur ni les autres paramètres d’identité via Playwright ou Puppeteer. Il n’appelle pas `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ou `setDeviceMetricsOverride`.
- Le SDK n’ajoute jamais de lui-même les options `--enable-automation`, `--disable-blink-features=AutomationControlled` ou `--no-sandbox`.

## Audit de furtivité

Exécutez ces contrôles sur la compilation du moteur, le client d’automatisation et le profil que vous comptez utiliser.

| Couche | Cibles d’exemple | Critères de réussite |
|---|---|---|
| L0 Transport | TrackMe, contrôles de fuite d’IP/WebRTC | Seule l’IP de sortie est visible. JA4 et HTTP/2 correspondent à la version de Chromium du moteur |
| L1 Identité | Sonde locale, Sannysoft, Intoli | Aucune contradiction entre UA, UA-CH, plateforme, GPU, polices et écran |
| L2 Empreinte | CreepJS, FingerprintJS, BrowserScan | Aucun indice de mode headless ni de valeur falsifiée. L’empreinte reste stable au rechargement |
| L3 Automatisation | rebrowser, brotector, botd | Aucune fuite de CDP, de script d’initialisation ou de WebDriver |
| L4 Comportement | Fidélité de la saisie, traces d’humanisation, test de fumée Cloudflare | Événements de confiance, ordre réaliste, défi résolu |
| L5 Stabilité | Graine, workers, iframes, cross-origin | Une même graine produit la même persona d’un lancement à l’autre |

La procédure explique les états possibles, le diagnostic et la rédaction du rapport. Elle est disponible en [anglais](docs/stealth-checkup.md) et en [russe](docs/stealth-checkup.ru.md).

Consignez, pour chaque résultat, la compilation du moteur, la version du client, les paramètres du profil, l’adresse de sortie du proxy et la version du détecteur pour pouvoir reproduire et comparer les essais.

## Plan du dépôt

```text
.
├── README.md                  # original anglais
├── README.ru.md               # traduction russe
├── desktop/                   # gestionnaire de profils hors ligne
├── docs/
│   ├── desktop/               # documentation du gestionnaire de profils
│   ├── architecture.md        # composants, flux de lancement, limites
│   ├── sdk-contract.md        # contrat de lancement v0 et comportement du SDK
│   ├── stealth-checkup.md     # méthode de validation de la furtivité et guide opérationnel
│   ├── stealth-checkup.ru.md  # traduction russe
│   └── versioning.md          # compatibilité du SDK, du moteur et du client
├── spec/
│   └── schemas/               # JSON Schema pour les options de lancement et les informations sur le binaire
├── sdks/
│   ├── manifest.json          # registre des SDK lisible par machine
│   ├── README.md              # structure et règles de contribution
│   ├── _template/             # squelette pour un nouveau langage
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # cas de lancement et de furtivité indépendants du langage
├── tools/check_repo.py        # validation de la structure et des liens (CI)
└── .github/workflows/ci.yml
```

Ce dépôt contient les squelettes des SDK, le contrat de lancement, les cas de conformité et le gestionnaire de profils hors ligne. Le moteur Chromium et la version complète de Desktop 1.2.1 ont chacun leur propre dépôt. [Sources et compilation de Desktop](desktop/README.md) · [Documentation du gestionnaire de profils](docs/desktop/README.md)

## Le contrat

- `launch(options)` démarre le moteur et renvoie l’objet `Browser` du client. Le client communique ensuite directement avec Chromium via CDP.
- Avant le lancement, le SDK vérifie la plateforme et la somme de contrôle SHA-256 du moteur. Si le binaire manque et que les téléchargements sont activés, le SDK le télécharge.
- Les profils nommés conservent les cookies, les données des sites et leur graine d’un lancement à l’autre.
- En cas d’échec du lancement, le SDK met fin au processus qu’il a démarré et lève une erreur typée. Le code appelant décide s’il faut réessayer.
- Le SDK, le moteur et le client d’automatisation ont chacun leurs propres plages de versions. Pour connaître la version du moteur, appelez `binary_info()` en Python ou `binaryInfo()` en Node.js.

## Compatibilité

| Composant | Cible prise en charge |
|---|---|
| Moteur | Version sélectionnée par le SDK et indiquée par `binary_info()` ou `binaryInfo()` |
| macOS | Apple Silicon et Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ avec une version prise en charge de Playwright |
| Node.js | 20+ avec une version prise en charge de Playwright ou de Puppeteer |

Le SDK et le moteur sont versionnés indépendamment. Si leurs versions sont incompatibles, le SDK les indique toutes les deux dans une erreur typée.

## Contribution

Le [guide de contribution](CONTRIBUTING.md) décrit le processus de revue. Les instructions de compilation figurent dans le [guide des SDK](sdks/README.md).

- Pour modifier le comportement d’un SDK, adaptez l’implémentation concernée et ajoutez un test ou un cas de conformité commun.
- Pour ajouter un langage, copiez le [modèle de SDK](sdks/_template), inscrivez le nouveau SDK dans le [manifeste](sdks/manifest.json) et ouvrez une pull request en brouillon.
- Pour ajouter une option de lancement, mettez d’abord à jour le [contrat des SDK](docs/sdk-contract.md) et les [schémas](spec/schemas).
- Les modifications de furtivité qui relèvent du moteur se font dans son dépôt. Le SDK doit toujours réussir l’audit.
- Signalez les problèmes de sécurité en privé selon la [politique de sécurité](SECURITY.md).

## FAQ

### Ombra est-il un fork de Playwright ?

Non. Le SDK connecte le client officiel de Playwright à Ombra Chromium. Vous pouvez continuer à utiliser les types, les fonctions utilitaires et les objets de page de Playwright.

### Ai-je besoin de l’application de bureau Ombra ?

Le SDK lance le moteur directement. L’application de bureau, facultative, permet de gérer les profils manuellement.

### En quoi Ombra diffère-t-il de playwright-stealth ?

Les modifications d’empreinte d’Ombra sont intégrées à Chromium lors de la compilation. Le SDK laisse intacts les scripts des pages.

### Ombra résout-il les CAPTCHA ?

Le moteur dispose d’un module CAPTCHA facultatif. La prise en charge dépend du type de tâche, de la version du moteur et des modèles disponibles. Le SDK transmet les paramètres de chaque lancement et donne accès aux commandes CDP du module.

### Puis-je utiliser mon propre proxy ?

Oui. Passez-le à `launch()`. Si le proxy exige une authentification, un relais local empêche ses identifiants d’apparaître dans la ligne de commande du moteur.

### Quelles versions de Playwright et de Puppeteer sont prises en charge ?

Chaque SDK indique les versions des clients prises en charge dans le manifeste de son paquet. Les clients sont des dépendances distinctes. Le [guide de gestion des versions](docs/versioning.md) précise les plages de versions compatibles.

### Ombra passe-t-il tous les contrôles antibots ?

Les résultats dépendent du site, de la région, de la réputation de l’IP de sortie, de la version du détecteur et des paramètres du profil. L’[audit de furtivité](docs/stealth-checkup.md) explique comment évaluer une configuration donnée.

## Licence

Les sources des SDK de ce dépôt sont sous [Apache License 2.0](LICENSE). La licence n’accorde aucun droit sur le moteur Ombra, le nom Ombra ni le logo. Consultez [NOTICE](NOTICE) pour les marques et les attributions de tiers.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
