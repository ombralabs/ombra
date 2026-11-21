<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Licencia"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Último commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Estrellas"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Descargas en PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Descargas en npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Versión"></a>
</p>

<p align="center">
<a href="#instalación"><strong>Instalación</strong></a> ·
<a href="#api-de-python">API de Python</a> ·
<a href="#api-de-nodejs-y-typescript">API de Node.js</a> ·
<a href="#entrada-humanizada">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Idiomas</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium con control de huella digital a nivel de código fuente C++ y entrada humanizada nativa.</h3>

<table><tr><td>
No es un conjunto de flags de lanzamiento ni una inyección de JavaScript sobre la página. Es un binario real de Chromium con parches de huella digital compilados en el código fuente C++ y simulación de entrada ejecutándose dentro del proceso del navegador. Conecta el cliente oficial de Playwright o Puppeteer por CDP local — sin objetos envoltorio y sin reescribir el código de las páginas.
</td></tr></table>

<br>

<p align="center">
Reemplazo directo de lanzamiento para Playwright y Puppeteer en Python y Node.js.<br>
La misma API, los mismos selectores y tipos — basta con cambiar el import y la llamada a <code>launch()</code>.
</p>

- **Parches de Chromium a nivel de código fuente** — canvas, WebGL, WebGPU, audio, fuentes, GPU, pantalla, media queries de CSS, informes de hardware, WebRTC sin fugas STUN, TLS ClientHello, zona horaria, configuración regional y eliminación de señales de automatización (`navigator.webdriver`, `Runtime.enable`, marcadores de modo headless).
- **Entrada humanizada nativa en el proceso del navegador (`humanize=True`)** — trayectorias del puntero (`cursory-rs`), clics dirigidos con duración de pulsación, cadencia de escritura con autocorrección de errores tipográficos y física de desplazamiento ejecutándose dentro de Chromium. El SDK devuelve un `Browser` nativo estándar sin envoltorios proxy.
- **Funcionamiento autónomo sin claves ni cuentas** — las compilaciones actuales del motor (`158.0.8127.37-3` y posteriores) y Ombra Desktop se ejecutan localmente sin registro, claves de licencia, identificadores de hardware ni servidor de licencias.
- **Instalación automática y verificación criptográfica del binario** — `pip install ombrabrowser` o `npm install @ombralabs/sdk`; en el primer lanzamiento, el SDK descarga la compilación para tu plataforma y verifica su firma Ed25519 y su suma de verificación SHA-256.
- **Perfiles persistentes y retransmisor de proxy seguro** — los perfiles con nombre conservan cookies, `localStorage`, IndexedDB y `seed` entre ejecuciones con bloqueo entre procesos; los proxies con autenticación (HTTP, HTTPS, SOCKS5) funcionan a través de un retransmisor local en loopback para que las credenciales nunca aparezcan en los argumentos del proceso.
- **Gestor de perfiles sin conexión Ombra Desktop** — una aplicación de escritorio nativa en este repositorio ([`desktop/`](../../desktop/README.md)) con instaladores precompilados para macOS, Linux y Windows.

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

Puppeteer también es compatible mediante `import { launch } from "@ombralabs/sdk/puppeteer"` o `launchPuppeteer()` ([detalles](#puppeteer)).

**Para sitios con protección antibot**, combina un proxy residencial, un perfil persistente y ajustes de entorno coherentes:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # se prefiere una IP residencial frente a una de centro de datos
    fingerprint={"timezone": "auto", "locale": "auto"},  # ajusta la zona horaria y la configuración regional a la salida del proxy
    headless=False,                                      # algunos sitios detectan diferencias en modo headless
    humanize=True,                                       # simulación nativa de ratón, teclado y desplazamiento
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

Consulta [Solución de problemas](#solución-de-problemas) para incidencias habituales en Linux, contenedores y objetivos protegidos.

## Instalación

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opcional: autodetección de zona horaria y configuración regional desde la salida del proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Con Playwright (1.60.0+, no hace falta descargar el Chromium estándar)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# O con Puppeteer
npm install @ombralabs/sdk puppeteer-core

# Opcional: lector de base de datos GeoIP sin conexión para timezone: "auto" y locale: "auto"
npm install mmdb-lib
```

---

Al iniciar, el SDK resuelve el motor en orden estricto: `binary_path` (`binaryPath` en Node.js), `OMBRA_BINARY_PATH`, el directorio de motores de Ombra Desktop y la caché del SDK (`~/.ombra/engines`). Si no se encuentra un motor compatible, el SDK descarga una compilación desde el canal de lanzamientos firmado, verifica su firma Ed25519 y su suma de verificación SHA-256, y la guarda en caché localmente. No es necesario ejecutar `playwright install chromium`.

Para desactivar las descargas automáticas, pasa `download=False` (`download: false` en Node.js). Para descargar y verificar el motor con antelación (por ejemplo, durante la construcción de un contenedor), llama a `ensure_binary()` (`ensureBinary()`) o utiliza el comando `install` de la CLI.

> **Lanzamiento autónomo:** las compilaciones actuales del motor (`158.0.8127.37-3` y posteriores) son gratuitas y no requieren cuenta ni clave de licencia. `OMBRA_LICENSE_KEY` y el comando `login` siguen disponibles únicamente por compatibilidad con compilaciones antiguas con licencia.

**Migrar desde Playwright** solo requiere dos líneas — todas las operaciones de página, localizadores y esperas permanecen igual:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # el resto de tu código funciona sin cambios
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ Dale una **estrella** al repositorio si te resulta útil y activa **[Watch releases](https://github.com/ombralabs/ombra/subscription)** para recibir avisos sobre nuevas compilaciones del motor, el SDK y Ombra Desktop.

---

## Estado actual y lanzamientos

Cada componente del ecosistema sigue el contrato de lanzamiento compartido y se versiona de forma independiente.

| Componente | Estado / versión | Ubicación |
|---|---|---|
| **Contrato del SDK** | Borrador `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK de Python** | Alpha `0.1.3` | [`ombrabrowser` en PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK de Node.js / TypeScript** | Alpha `0.1.0` | [`@ombralabs/sdk` en npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Motor Ombra Chromium** | Chromium `158.0.8127.37` | `158.0.8127.37-3` · macOS ARM64 / Linux x64 / Windows x64 |
| **Ombra Desktop** | `desktop-v1.2.2` | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) |
| **Navegador independiente** | `v158.0.8127.37-3` | [GitHub Releases](https://github.com/ombralabs/ombra/releases/tag/v158.0.8127.37-3) |
| **Esquemas y conformidad** | JSON Schema + casos compartidos | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Método de comprobación de sigilo** | 6 capas (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Incluido en los lanzamientos actuales:

- **Parches a nivel de código fuente** — derivación de huella digital coherente a partir de `seed`, alineación de WebGL / WebGPU y extensiones, tablas de fuentes realistas por sistema operativo, perfil nativo de TLS ClientHello (`chrome-<major>`), supresión de fugas de pila de `Runtime.enable` y `UtilityScript`, y protección contra fugas de IP local en WebRTC.
- **Dominio CDP `Ombra` a nivel de navegador** — control en vivo de la entrada humanizada (`getHumanizeState`, `setHumanize`) en Python y Node.js sin reiniciar el navegador.
- **Simulación nativa de entrada en el proceso del navegador** — planificador de puntero `cursory-rs`, perfiles de desplazamiento para rueda y trackpad, cadencia de escritura con autocorrección de errores tipográficos y pegado seguro de textos largos mediante un portapapeles aislado.
- **Compilaciones autónomas sin clave** — las compilaciones actuales del motor (`158.0.8127.37-3`) y Ombra Desktop `1.2.2` se ejecutan completamente en local sin cuentas, claves ni telemetría.
- **Fijación de versión del motor (`version`)** — fija una compilación exacta mediante `launch(version="158.0.8127.37-3")`, `OMBRA_VERSION` o el comando `install --version` de la CLI.
- **Retransmisor de proxy unificado** — proxies autenticados HTTP, HTTPS y SOCKS5 sin exponer credenciales en la línea de comandos de Chromium, los registros ni los metadatos del perfil.
- **Perfiles persistentes con nombre** — almacenan `seed`, cookies, `localStorage` e IndexedDB en `~/.ombra/profiles/<slug>` con bloqueo entre procesos (`ProfileBusyError`).
- **Verificaciones criptográficas de la cadena de suministro** — comprobación de firma Ed25519 en los sobres de lanzamiento y verificación SHA-256 de los archivos antes de extraerlos.

Consulta [CHANGELOG.md](../../CHANGELOG.md) para ver el historial completo de lanzamientos.

## Por qué Ombra

- **Los parches de configuración y JS se rompen con facilidad.** Herramientas como `playwright-stealth`, `puppeteer-extra` y `undetected-chromedriver` inyectan JavaScript en las páginas o modifican flags de lanzamiento. Las actualizaciones de Chrome los rompen con frecuencia y los detectores modernos identifican los propios parches (`Function.prototype.toString`, anomalías de prototipos, `addScriptToEvaluateOnNewDocument`).
- **Los cambios se compilan en el código fuente de Chromium.** Las huellas digitales se generan a nivel de C++ y se aplican de forma coherente en el marco principal, los workers y los iframes. El SDK no inyecta scripts en las páginas ni aplica sobrescrituras `Emulation.*`.
- **La simulación de entrada vive en el proceso del navegador, no encima de Playwright.** Como las trayectorias del ratón, las pulsaciones de teclas y el desplazamiento se gestionan dentro del propio Chromium, el SDK no envuelve los objetos de Playwright ni Puppeteer — todos los localizadores, frames y librerías de terceros siguen funcionando con normalidad.
- **Arquitectura local sin servicios adicionales.** Sin demonio de plano de control en segundo plano ni saltos de red entre tu script y el navegador: un único proceso de motor, CDP local en loopback en `127.0.0.1` y sin límites en la cantidad de perfiles ni en la concurrencia.

## Ombra Desktop

**Un gestor de perfiles local y sin conexión con interfaz gráfica.** Su código fuente reside directamente en este repositorio ([`desktop/`](../../desktop/README.md)) y está desarrollado con Tauri (Rust + Vue).

- **Totalmente sin conexión y local** — el catálogo de perfiles vive en una base de datos SQLite local en tu equipo con una clave de cifrado local; no requiere cuenta, servicio en la nube ni acceso a red.
- **Gestión estructurada de perfiles** — crea perfiles, busca por nombre, nota o número, edita descripciones y organiza entradas mediante grupos, etiquetas, rótulos y marcadores en el catálogo de Rust.
- **Papelera segura** — mover un perfil a la Papelera mantiene sus archivos en disco para poder restaurarlo más adelante.
- **Sin límites por perfil** — sin planes por cantidad de perfiles ni cuotas en la nube: todos los datos siguen siendo tuyos.
- **Instaladores precompilados** — macOS Apple Silicon (`.dmg`, firmado con Apple Developer ID y notarizado), Linux (`.deb` y `.rpm`) y Windows x64 (`setup.exe`).
- **Catálogos aislados** — define `OMBRA_DESKTOP_DATA_DIR` para trabajar con un catálogo de pruebas independiente o una copia de seguridad.

[Descargar `desktop-v1.2.2` →](https://github.com/ombralabs/ombra/releases/tag/desktop-v1.2.2) · [README de Desktop](../../desktop/README.md) · [Guía de perfiles y claves locales](../../docs/desktop/README.md)

## Verificación de huella digital y comprobación de sigilo

En lugar de hacer promesas genéricas de «100 % indetectable», Ombra se apoya en un procedimiento de verificación repetible bajo condiciones registradas. Los resultados reales en cualquier sitio siempre dependen de la reputación de la IP de salida, la región, el historial del perfil, la versión del detector y la configuración de lanzamiento.

### Superficies gestionadas por el motor y el SDK

| Superficie / señal | Playwright estándar | Ombra | Implementación |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Parche del motor en C++ |
| `window.chrome` | ausente en headless | objeto completo | Coincide con Chrome normal |
| `navigator.plugins` | `0` en headless | conjunto coherente de plugins | A nivel de motor |
| User-Agent y Client Hints | `HeadlessChrome`, marca inconsistente | `Google Chrome` + `Sec-CH-UA*` alineados | Parche `010-user-agent-and-webdriver` |
| Artefactos CDP (`Runtime.enable`, `UtilityScript`) | marcados por detectores | suprimidos por el motor; el SDK nunca llama a `Runtime.enable` | Parche `110-runtime-enable` + invariante `SI-02` |
| Fuga de IP en WebRTC | expone la IP local/del host | informa la IP de salida sin enviar STUN reales | Parche `100-webrtc-leak` (`--webrtc-ip`) |
| TLS y HTTP/2 | depende de la configuración | pila de red de Chromium + perfil ClientHello `chrome-<major>` | Parche `210-tls-network-persona` |
| WebGL y WebGPU | renderizador por software / GPU incoherente | límites y tablas de extensiones WebGL/WebGPU unificados | Parches `070`, `071`, `075`, `955` |
| Fuentes, configuración regional y zona horaria | valores del host, divergencias en `Intl` | tablas de fuentes, configuración regional ICU y zona horaria coherentes | Parches `040`, `090`, `092`, `230` |
| Simulación de entrada | teletransporte del cursor, `fill()` instantáneo | curvas `cursory-rs`, ritmo de escritura, física de desplazamiento | Parche `135-ombra-humanize` en el proceso del navegador |
| Estabilidad de la huella digital | cambia o filtra datos del host | determinista por `seed` entre reinicios y frames | Parches `001`, `002` + perfil persistente |

### Seis capas de la comprobación

Antes de publicar o desplegar una configuración, ejecuta las seis capas de comprobación con la compilación exacta del motor, el cliente de automatización y el proxy que vayas a utilizar:

| Capa | Objetivos de ejemplo | Criterios de aprobación |
|---|---|---|
| **L0 Transporte** | TrackMe, páginas de fuga de IP/WebRTC, eco de cabeceras | Solo es visible la IP de salida del proxy; JA4 y HTTP/2 coinciden con la compilación de Chromium; sin credenciales de proxy en argv |
| **L1 Identidad** | Sonda local, Sannysoft, Intoli, comprobación UA-CH | Sin contradicciones entre UA, Client Hints, plataforma, GPU, fuentes, pantalla y configuración regional |
| **L2 Huella digital** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Sin marcadores de headless ni de `lie`; la huella digital permanece estable entre recargas |
| **L3 Automatización** | rebrowser, brotector, botd, auditoría de comandos CDP | Sin fugas de `Runtime.enable`, scripts de inicio, bindings ni `navigator.webdriver` |
| **L4 Comportamiento** | Sonda de fidelidad de entrada, trazas de humanize, prueba rápida de desafíos en vivo | Eventos con `isTrusted: true`, orden y tiempos naturales, curvas del puntero y desplazamiento realistas |
| **L5 Estabilidad** | Lanzamientos repetidos, workers, iframes de mismo origen y origen cruzado, paridad entre SDKs | La misma `seed` reproduce una huella digital idéntica en todos los contextos |

Procedimiento completo, estados (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), lista de comprobación de señales y plantilla de informe: [Inglés (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) y [Ruso (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Comparativa

| Característica | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API de automatización | Playwright | Playwright | Selenium | **Playwright y Puppeteer** |
| Nivel de parcheo | Ninguno | Inyección JS en la página | Flags de configuración | **Código fuente C++ (Chromium)** |
| `seed` de huella digital coherente | No | No | Parcial | **Sí, por perfil y eTLD+1** |
| Simulación de entrada (`humanize`) | No | No | No | **Integrada en el proceso del navegador** |
| Supresión de `Runtime.enable` / fugas CDP | No | No | Parcial | **Parche del motor + invariantes del SDK** |
| Proxies autenticados sin fugas en CLI | No | No | Limitado | **Retransmisor local en loopback** |
| Aislamiento de perfiles | Contexto de navegador | Contexto de navegador | No | **Directorio de perfil + bloqueo de archivo** |
| Gestor de perfiles sin conexión (GUI) | No | No | No | **Ombra Desktop (macOS, Linux, Windows)** |
| Migración desde Playwright | — | Cambio de import | Reescritura de código | **Cambio de import y `launch()`** |

## Cómo funciona

```mermaid
flowchart LR
    Script["Tu script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + puente CDP"]
    Relay["Retransmisor local de proxy<br/>cuando requiere autenticación"]
    Engine["Ombra Chromium<br/>motor parcheado en C++"]
    Client["Cliente nativo<br/>Playwright · Puppeteer"]
    Profile[("Perfil<br/>seed · cookies · almacenamiento")]

    Script -->|"launch()"| SDK
    SDK -->|"verificar + iniciar"| Engine
    SDK -.->|"autenticación de proxy"| Relay
    Relay -.-> Engine
    SDK -->|"conectar por CDP"| Client
    Script -->|"API de página"| Client
    Client -->|"CDP en loopback"| Engine
    Engine --> Profile
```

1. **`launch()` localiza o descarga el motor** y verifica su firma Ed25519 y su suma de verificación SHA-256.
2. **Se preparan el perfil y la `seed`.** Un perfil con nombre adquiere un bloqueo entre procesos; si el proxy requiere credenciales, el SDK inicia un retransmisor en memoria sobre loopback.
3. **Se inicia Ombra Chromium** con el perfil seleccionado, las opciones de huella digital y un puerto local de depuración (`--remote-debugging-port=0`).
4. **Se conecta el cliente oficial.** En cuanto aparece `DevToolsActivePort`, el SDK conecta Playwright (con `no_defaults=True`) o Puppeteer a través de `127.0.0.1` y devuelve el objeto `Browser` nativo.
5. **Cierre limpio.** `browser.close()` envía `Browser.close`, finaliza el árbol de procesos del motor, detiene el retransmisor y libera el bloqueo del perfil.

Tras el lanzamiento, el SDK sale de la ruta de datos: todos los comandos de página viajan directamente desde Playwright o Puppeteer hacia Chromium.

### Límites del SDK e invariantes de sigilo

El [contrato del SDK v0.1 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) impone invariantes estrictas en todos los SDK oficiales:

- **Sin scripts de sigilo en las páginas.** El SDK nunca llama a `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` ni parchea propiedades del DOM.
- **Sin `Runtime.enable`.** Las comprobaciones de disponibilidad usan únicamente el endpoint HTTP local de CDP o `Browser.getVersion`; el SDK nunca habilita `Runtime`, `Debugger` ni `Log`.
- **Sin sobrescrituras `Emulation.*`.** El SDK nunca llama a `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ni `setDeviceMetricsOverride`: la identidad del navegador proviene del motor.
- **Sin flags prohibidos por defecto.** El SDK nunca inyecta por su cuenta `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` ni `--user-agent`.
- **Solo CDP en loopback.** El puerto de depuración siempre se enlaza a `127.0.0.1`; pasar un `--remote-debugging-address` que no sea loopback se rechaza.
- **Sin telemetría ni filtración de secretos.** Las credenciales de proxy, claves y cookies se ocultan de los registros y mensajes de error.

## API de Python

### `launch()`

```python
from ombrabrowser import launch

# Lanzamiento básico (modo headless por defecto)
browser = launch()

# Ventana del navegador con interfaz gráfica
browser = launch(headless=False)

# Proxy HTTP o SOCKS5 (credenciales gestionadas mediante retransmisor local en loopback)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Objeto de proxy con lista de exclusiones
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

# Controles de huella digital (seed, SO, zona horaria/locale automáticos desde el proxy, pantalla, GPU)
# Para timezone="auto" / locale="auto", instala: pip install "ombrabrowser[geoip]"
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

# Simulación nativa de ratón, teclado y desplazamiento
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Fija una compilación exacta del motor y pasa flags adicionales de Chromium
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Devuelve un `playwright.sync_api.Browser` estándar. Todos los métodos de Playwright funcionan con normalidad (`new_page()`, `new_context()`, `close()`, etc.). Las páginas nuevas usan `no_viewport=True` por defecto para no sobrescribir las dimensiones de ventana del perfil.

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

### `launch_context()` y `launch_context_async()`

Utilidad simplificada que inicia el navegador y devuelve directamente un `BrowserContext` (cerrar el contexto también finaliza el proceso del motor). Los argumentos con nombre adicionales se reenvían a `browser.new_context()` — como `storage_state`, `permissions` o `extra_http_headers`:

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

Equivalente asíncrono: `await launch_context_async(...)`.

### `launch_persistent_context()` y `launch_persistent_context_async()`

Inicia el navegador con un perfil persistente y devuelve su `BrowserContext` predeterminado. Las cookies, `localStorage`, IndexedDB, caché y la `seed` de huella digital se conservan entre sesiones.

- Pasar `profile="pricing-eu"` crea el perfil en `~/.ombra/profiles/pricing-eu` con metadatos en `.ombra/profile.json` y un archivo de bloqueo.
- Pasar `user_data_dir="./my-profile"` (o un argumento posicional de ruta) utiliza ese directorio explícito.
- Iniciar el mismo perfil de forma concurrente desde otro proceso lanza `ProfileBusyError` en lugar de corromper los datos del perfil.

```python
from ombrabrowser import launch_persistent_context

# Mediante perfil con nombre (almacenado en ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # las cookies, el almacenamiento y la seed se conservan

# Mediante ruta explícita (por ejemplo, para cargar extensiones de Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Equivalente asíncrono: `await launch_persistent_context_async(...)`.

### Funciones de utilidad y diagnóstico (Python)

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

# Inspecciona el binario del motor resuelto
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Descarga y verifica el motor sin iniciar el navegador
ensure_binary(version="158.0.8127.37-3")

# Elimina los binarios del motor gestionados por el SDK (los perfiles en ~/.ombra/profiles no se tocan)
clear_cache()

# Inspecciona el comando de lanzamiento resuelto sin iniciar Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Lee metadatos en tiempo de ejecución (puerto CDP, ws_url, seed, pid) y verifica el estado del proceso
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # descarga y verifica el motor (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # instala una compilación específica del motor
ombrabrowser info                                # diagnóstico del entorno, binario y dependencias (alias: doctor)
ombrabrowser info --quick --json                 # informe rápido legible por máquina sin ejecutar el binario
ombrabrowser info --proxy socks5://user:pass@host:1080  # prueba la resolución de IP de salida, zona horaria y configuración regional a través del proxy
ombrabrowser update                              # comprueba el canal de lanzamientos y actualiza el motor en caché
ombrabrowser clear-cache                         # limpia los binarios del motor en caché (se conservan los perfiles)
ombrabrowser login                               # guarda la clave de licencia en ~/.ombra/license.key (solo para compilaciones antiguas)
ombrabrowser logout                              # elimina la clave de licencia guardada
```

Los mismos comandos están disponibles mediante `python -m ombrabrowser <command>`.

## API de Node.js y TypeScript

`@ombralabs/sdk` ofrece compilaciones duales ESM + CommonJS con definiciones completas de TypeScript (`.d.ts`). Tanto Playwright como Puppeteer se ejecutan sobre el mismo motor subyacente.

### Playwright (predeterminado)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Lanzamiento básico con proxy, huella digital y simulación de entrada
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

// Lanzamiento simplificado: navegador + contexto en una sola llamada
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Perfil persistente: las cookies, localStorage y seed se conservan entre ejecuciones
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Cada fragmento anterior es independiente. Para migrar un lanzador de Playwright existente, también puedes sustituir el import por `import * as chromium from "@ombralabs/sdk"` y conservar `await chromium.launch(...)`.

### Puppeteer

Usa `launchPuppeteer()` desde `@ombralabs/sdk` o importa desde `@ombralabs/sdk/puppeteer`:

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

> **Nota sobre Puppeteer:** Puppeteer envía más tráfico CDP por defecto que Playwright usando `connectOverCDP({ noDefaults: true })`. Para sitios con comprobaciones estrictas de CDP, se recomienda Playwright.

### Utilidades y CLI (Node.js)

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

## Entrada humanizada

En Ombra, la simulación de entrada (`humanize`) está compilada **nativamente en el proceso del navegador Chromium** (impulsada por `cursory-rs` y el planificador de entrada del motor) en lugar de implementarse como un envoltorio JS alrededor del cliente de automatización. Esto implica:

- Todas las acciones estándar de Playwright y Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) pasan por una única cola de entrada por pestaña dentro del navegador.
- Los parámetros de comportamiento se derivan de forma determinista a partir de la `seed` del perfil (`--fingerprint-humanize-seed`).
- El SDK nunca envuelve `Page` ni `Browser` en clases proxy: los tipos nativos y el comportamiento del cliente permanecen intactos.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**Qué cambia con `humanize=True`:**

| Acción | Sin `humanize` | Con `humanize=True` |
|---|---|---|
| Movimiento del ratón | Teletransporte instantáneo | Curvas `cursory-rs` con aceleración, pausas y ligero sobreimpulso |
| Clics y arrastres | Pulsación instantánea | Punto de apunte dentro del objetivo, pausa previa al clic y duración de pulsación |
| Entrada de texto | Asignación instantánea del valor | Escritura carácter a carácter con cadencia y distribución de teclado configuradas, errores tipográficos ocasionales y autocorrección; los textos muy largos se pegan mediante un portapapeles aislado sin tocar el portapapeles del sistema |
| Desplazamiento | Salto único | Serie de eventos de rueda/trackpad siguiendo perfiles de desaceleración medidos |
| Intervalos de inactividad | Cursor estático | En el perfil preestablecido `careful`, sutil deriva del cursor en reposo entre acciones |

**Perfiles preestablecidos** — `default` (ritmo normal), `careful` (más lento y pausado, con micromovimientos en reposo) y `fast` (ritmo más rápido). Pasa `humanize=False` (`humanize: false`) para desactivar explícitamente la simulación de entrada.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Puedes activar o desactivar el modo o cambiar de perfil preestablecido en tiempo de ejecución sin reiniciar el navegador mediante el dominio CDP `Ombra`:

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

## Gestión de huellas digitales y perfiles

El motor deriva una configuración coherente del navegador a partir de una única `seed`. Cuando se omite `seed`:

| Escenario | Comportamiento |
|---|---|
| **`launch()` sin perfil** | El SDK genera una `seed` aleatoria para la sesión y crea un directorio temporal que se elimina tras `close()`. |
| **`profile="name"` o `user_data_dir="./dir"`** | La `seed` se guarda en `.ombra/profile.json` y se reutiliza en cada lanzamiento: los sitios ven a un visitante recurrente con el mismo dispositivo y las mismas cookies. |
| **`fingerprint={"seed": N, ...}`** | Huella digital determinista a partir de la `seed` explícita; los campos adicionales sobrescriben ajustes individuales manteniendo la coherencia del resto. |

El ruido de canvas/audio se calcula por `eTLD+1` (estable en el mismo sitio, imposible de correlacionar entre sitios distintos). El ruido de píxeles para canvas 2D y WebGL `readPixels` está desactivado por defecto para evitar activar detectores de «Canvas Tampering / Masking», y puede habilitarse explícitamente mediante `--fingerprint-pixel-noise`.

> **Consejo:** cuando vuelvas a visitar el mismo sitio, usa un perfil persistente (`profile="name"` o `launch_persistent_context()`) en lugar de pasar una `seed` fija a un `launch()` efímero; así las cookies, la caché y `localStorage` se mantienen coherentes junto con la huella digital.

### Campos del objeto `fingerprint`

Los nombres de campo siguientes siguen la convención de Python (`snake_case`); Node.js acepta tanto `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) como `snake_case`:

| Campo | Tipo | Descripción |
|---|---|---|
| `seed` | `int` (`>= 0`) | Semilla del generador que determina la configuración global de la huella digital |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | Sistema operativo objetivo (`navigator.platform`, UA, grupos de GPU y fuentes) |
| `os_version` | `string` | Indicio de versión del SO para Client Hints |
| `timezone` | Zona IANA o `"auto"` | Zona horaria (p. ej., `"Europe/Berlin"`). `"auto"` resuelve la zona desde la salida del proxy mediante GeoIP |
| `locale` | BCP-47 o `"auto"` | Configuración regional (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` la resuelve desde la salida del proxy |
| `screen` | `{"width", "height"}` o `"auto"` | Dimensiones de pantalla y área de trabajo teniendo en cuenta la barra de tareas / barra de menús del SO objetivo |
| `gpu` | `{"vendor", "renderer"}` o `"auto"` | Cadenas explícitas de WebGL `UNMASKED_VENDOR` / `UNMASKED_RENDERER` |
| `hardware_concurrency` | `int` o `"auto"` | Valor informado de `navigator.hardwareConcurrency` |
| `device_memory` | `int` o `"auto"` | Valor informado de `navigator.deviceMemory` (en GB) |
| `noise` | `bool` | Activa/desactiva el ruido de huella digital (`False` pasa `--disable-fingerprint-noise`) |

> Mantén `seed` como fuente principal de los parámetros de huella digital: sobrescribir valores individuales sin mantenerlos alineados (por ejemplo, combinar un SO con una GPU incompatible) puede introducir contradicciones visibles para los detectores.

### Flags adicionales del motor (`args`)

Flags compatibles con el motor que el SDK no establece automáticamente (pásalos mediante `args=[...]`):

| Flag | Propósito |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Marca del navegador en `Sec-CH-UA` (el SDK usa `chrome` por defecto) |
| `--fingerprint-tls-profile=chrome-<major>` | Perfil TLS ClientHello acorde con la versión principal de Chrome especificada (configurado automáticamente por el SDK según la versión del motor) |
| `--webrtc-ip=<ip>` | Sustituye la dirección IP en candidatos ICE de WebRTC sin enviar tráfico STUN real |
| `--fingerprint-location=<lat,lon>` | Coordenadas informadas por `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Cuota de almacenamiento informada por `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Número de puntos táctiles (`navigator.maxTouchPoints` y media queries de puntero) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Densidad de píxeles de pantalla (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Profundidad de color de pantalla |
| `--disable-gpu-fingerprint` | Expone la GPU real del host (cadenas WebGL/WebGPU, límites y extensiones) |
| `--disable-gpu-string-spoof` | Expone las cadenas reales de GPU manteniendo el resto de ajustes del perfil |
| `--disable-fingerprint-noise` | Desactiva el ruido de canvas/WebGL/audio manteniendo activos los parámetros de identidad |
| `--fingerprint-pixel-noise` | Activa el ruido de píxeles idempotente opcional para canvas 2D y `readPixels` |
| `--profile-label=<text>` | Etiqueta del perfil mostrada en la barra de direcciones del navegador (solo UI; invisible para las páginas web) |

### Configuración de fuentes en Linux

Los servidores y contenedores Linux mínimos suelen carecer de fuentes de emojis y CJK, lo que provoca que el renderizado oculto de texto y emojis en canvas genere hashes inusuales.

**1. Capa base (emojis y CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Fuentes de Windows para perfiles de Windows (`os="windows"`):**
Al ejecutar una configuración de Windows en Linux, instalar fuentes reales desde `C:\Windows\Fonts\` (incluyendo `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) mejora notablemente la coherencia de la enumeración de fuentes:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Fuentes de macOS para perfiles de macOS (`os="macos"`):**
De forma similar, al usar `os="macos"` en Linux, copia las fuentes desde `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` y `/Library/Fonts/` en `~/.local/share/fonts/mac/` y ejecuta `fc-cache -f`.

En un `Dockerfile`, coloca las fuentes en el directorio del sistema `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Opciones de lanzamiento, configuración y errores

### Opciones de `launch()`

Los nombres de opción siguen la API de Python y el [contrato del SDK](../../docs/sdk-contract.md); Node.js usa equivalentes en `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) y también acepta alias en `snake_case`. Las opciones desconocidas se rechazan con `InvalidOptionError`.

| Opción | Valor por defecto | Descripción |
|---|---|---|
| `headless` | `true` | Ejecutar sin ventana (`--headless=new`) |
| `proxy` | ninguno | URL de proxy (`http`, `https`, `socks5`) u objeto; los proxies autenticados usan un retransmisor en loopback |
| `fingerprint` | ninguno | Ajustes de `seed`, SO, zona horaria, configuración regional, pantalla, GPU, memoria y ruido |
| `profile` | ninguno | Perfil persistente con nombre en `~/.ombra/profiles/<slug>` (mutuamente excluyente con `user_data_dir`) |
| `user_data_dir` | temporal | Ruta explícita del directorio de perfil (mutuamente excluyente con `profile`) |
| `args` | `[]` | Argumentos adicionales de Chromium (se pasan sin modificar) |
| `binary_path` | resuelto | Ruta explícita al ejecutable del motor |
| `version` | entorno / auto | Fijación de versión del motor (por ejemplo, `158.0.8127.37-3`), sobrescribe `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Tiempo límite para iniciar el motor y conectar por CDP (1000–600000 ms) |
| `humanize` | valor del motor | `False`, `True` o `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | entorno / archivo | Clave para compilaciones antiguas con licencia (no necesaria en `158.0.8127.37-3+`; nunca se registra) |
| `env` | `{}` | Variables de entorno adicionales para el proceso del motor |
| `download` | `True` | Permitir la descarga automática si falta el binario del motor |

### Variables de entorno

Orden de prioridad: **opción explícita de lanzamiento → variable de entorno → metadatos del perfil → valor por defecto**.

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `OMBRA_BINARY_PATH` | sin definir | Ruta explícita a un binario del motor |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Directorio para motores en caché y perfiles con nombre |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | URL base / réplica para descargas del motor (`none`/`off` desactiva descargas) |
| `OMBRA_VERSION` | última compatible | Versión fijada del motor (por ejemplo, `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Canal de lanzamientos del motor: `stable` o `beta` |
| `OMBRA_AUTO_UPDATE` | `true` | Comprobar al iniciar si existen compilaciones más recientes del motor |
| `OMBRA_SKIP_CHECKSUM` | `false` | Solo desarrollo local: desactiva la verificación SHA-256 (registra una advertencia) |
| `OMBRA_LICENSE_KEY` | sin definir | Clave para compilaciones antiguas con licencia (nunca se registra) |
| `OMBRA_TIMEOUT_MS` | `30000` | Tiempo límite predeterminado de lanzamiento (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Nivel de detalle de registros: `error`, `warn`, `info`, `debug` |

### Errores tipados

Ante cualquier fallo, el SDK finaliza el proceso del motor iniciado, libera el bloqueo del perfil y lanza una subclase de `OmbraError` con un campo `kind` estable y un campo `details` con los secretos ocultados:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

La taxonomía completa de errores y las reglas de reintento están documentadas en el [contrato del SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Plataformas, integraciones y contenedores

### Plataformas y entornos de ejecución compatibles

| Componente | Soporte | Notas |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Compilación autónoma `158.0.8127.37-3`; Ombra Desktop está firmado con Developer ID y notarizado |
| **macOS x64 (Intel)** | — | Sin versión actual de Chromium 158 |
| **Linux x64** | ✅ | Compilación autónoma `158.0.8127.37-3`; requiere `xz-utils` (`xz`) para extraer `.tar.xz` |
| **Windows x64** | ✅ | Compilación autónoma `158.0.8127.37-3` e instalador de Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` se instala automáticamente con `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` o Puppeteer `>=22` (Puppeteer 25+ requiere Node.js `>=22.12`) |

### Integraciones con frameworks y agentes de IA

Ombra funciona con cualquier herramienta de automatización o framework de agentes de IA que acepte un binario personalizado de Chromium o se conecte por CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain`, entre otros):

```python
# Opción 1: resuelve la ruta verificada del binario y los argumentos del motor para tu propio ejecutor
from ombrabrowser import build_launch_options

cmd = build_launch_options(profile="agent-1", humanize=True)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opción 2: inicia a través de Ombra SDK y entrega el endpoint CDP local a tu framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Conecta tu framework a ws_url o cdp_http: los ajustes de huella digital y humanize
# se ejecutan dentro del motor y permanecen activos para cualquier cliente CDP
```

### Ejecución en Docker y servidores Linux

Ejemplo de `Dockerfile` que predescarga y verifica el motor durante la construcción de la imagen:

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

> **Contenedores y servidores web:**
> - Si tu contenedor no puede inicializar el sandbox de Chromium, pasa `--no-sandbox` explícitamente mediante `args=["--no-sandbox"]` (el SDK nunca añade este flag por su cuenta).
> - Para ejecutar con `headless=False` en un servidor sin entorno gráfico, usa `Xvfb` (consulta [más abajo](#solución-de-problemas)).
> - Al ejecutar bajo `uvicorn` con `uvloop`, pasa `--loop asyncio` para evitar bloqueos en las tuberías de subprocesos.

## Solución de problemas

### El sitio bloquea el modo headless

Algunos sistemas antibot comprueban diferencias de comportamiento y renderizado en modo headless incluso con parches en C++. Ejecuta con `headless=False` en una pantalla virtual usando `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Después inicia con un proxy residencial SOCKS5/HTTP, un perfil persistente, zona horaria y configuración regional concordantes, `headless=False` y `humanize=True`:

```python
context = launch_persistent_context(
    profile="site-eu",
    proxy="socks5://user:pass@residential-proxy:1080",
    fingerprint={"timezone": "auto", "locale": "auto"},
    headless=False,
    humanize=True,
)
```

Si los bloqueos persisten en Linux, revisa [Configuración de fuentes en Linux](#configuración-de-fuentes-en-linux).

### El sitio presenta desafíos en cada visita

Llamar a `launch()` sin `profile` arranca cada vez desde un directorio temporal vacío y una `seed` nueva, por lo que el sitio trata cada ejecución como un visitante completamente nuevo sin cookies. Cambia a `profile="..."` o `launch_persistent_context(...)` para que las cookies, `localStorage` y `seed` persistan entre ejecuciones.

### `ProfileBusyError`

Un perfil con nombre o un `user_data_dir` solo puede estar abierto en un proceso a la vez. Asigna un nombre de perfil distinto a cada trabajador en paralelo (`profile=f"worker-{i}"`). Los bloqueos obsoletos dejados por procesos cerrados inesperadamente se detectan y limpian de forma automática.

### ¿Necesito ejecutar `playwright install chromium`?

No. Ombra ejecuta su propio binario del motor y no utiliza el Chromium estándar de Playwright. En Linux solo necesitas las librerías del sistema y `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Actualizar, cambiar de canal y revertir el motor

Actualiza el SDK a la última versión:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Prueba el canal `beta` o fija/revierte a una compilación exacta del motor:

```python
# Fija una compilación exacta para un lanzamiento concreto
browser = launch(version="158.0.8127.37-3")
```

```bash
# O configúralo mediante variables de entorno / CLI
export OMBRA_VERSION=158.0.8127.37-3
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser install --version 158.0.8127.37-3

# O apunta a un binario compilado localmente
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: Gatekeeper bloquea una compilación local

Los lanzamientos oficiales de Ombra para macOS Apple Silicon están firmados con un certificado de Apple Developer ID y notarizados. Si ejecutas una compilación local de desarrollo sin firmar y macOS la pone en cuarentena, limpia una vez el atributo de cuarentena:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Esperar en una página en Python síncrono

En Playwright síncrono, una única llamada prolongada `time.sleep(15)` tras `page.goto()` detiene el bucle de eventos de Playwright, lo que puede estancar páginas de verificación. Espera en intervalos cortos con una llamada ligera al contexto en su lugar:

```python
import time

for _ in range(15):
    page.context.cookies()  # mantiene activo el procesamiento de Playwright sin tocar el DOM de la página
    time.sleep(1)
```

En Python asíncrono usa `await asyncio.sleep(...)`; en Node.js usa `await new Promise(r => setTimeout(r, ms))`. Evita también llamadas frecuentes a `page.wait_for_timeout()` y llamadas innecesarias a `page.evaluate()` antes de las comprobaciones para no generar tráfico CDP adicional.

## Seguridad

- **Autenticidad e integridad del motor.** Antes de la extracción, el SDK verifica la firma Ed25519 del sobre de lanzamiento frente a una clave pública fijada y comprueba el resumen SHA-256 tanto del archivo comprimido como del ejecutable.
- **CDP únicamente local.** El puerto de depuración se enlaza estrictamente a `127.0.0.1`. Nunca expongas un puerto CDP a una red pública sin autenticación adicional: CDP otorga control total sobre el navegador.
- **Aislamiento de secretos.** Las credenciales de proxy existen únicamente en la memoria del retransmisor local en loopback y nunca aparecen en la línea de comandos del proceso, metadatos del perfil, registros ni detalles de errores.
- **Sin telemetría.** El SDK no envía analíticas, informes de fallos ni peticiones ocultas por red.

Informa de problemas de seguridad de forma privada siguiendo [SECURITY.md](../../SECURITY.md).

## Mapa del repositorio

```text
.
├── README.md                    # README raíz en inglés (English)
├── translations/
│   ├── es/README.md             # este archivo (Español)
│   ├── ru/README.md             # traducción al ruso
│   └── <locale>/README.md       # 19 localizaciones adicionales
├── desktop/                     # Ombra Desktop (Tauri: catálogo en Rust + interfaz en Vue)
├── docs/
│   ├── architecture.md          # arquitectura, límites de confianza, ciclo de vida
│   ├── sdk-contract.md          # contrato de lanzamiento v0.1, opciones, errores, invariantes
│   ├── stealth-checkup.md       # método de comprobación (inglés)
│   ├── stealth-checkup.ru.md    # método de comprobación (ruso)
│   ├── versioning.md            # versionado del SDK, motor y clientes
│   └── desktop/                 # guías de perfiles locales y claves de Desktop
├── spec/
│   └── schemas/                 # esquemas JSON Schema para opciones de lanzamiento y metadatos del binario
├── sdks/
│   ├── manifest.json            # registro de SDK legible por máquina
│   ├── README.md                # estructura de los SDK y reglas de contribución
│   ├── python/                  # SDK de Python (publicado como ombrabrowser)
│   ├── node/                    # SDK de Node.js / TypeScript (publicado como @ombralabs/sdk)
│   └── ...                      # esqueletos de contrato para otros lenguajes (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # casos compartidos entre lenguajes de lanzamiento e invariantes de sigilo
├── tools/check_repo.py          # validador de estructura, esquemas y enlaces (CI)
└── .github/workflows/ci.yml
```

Este repositorio aloja el contrato del SDK, los esquemas, los casos de conformidad, la documentación y el código fuente de Ombra Desktop. Los parches del motor Chromium se mantienen en un repositorio independiente, y las compilaciones finales se publican mediante el canal de descargas y en [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## Preguntas frecuentes

### ¿Es esto un fork de Playwright?

No. El SDK conecta el cliente oficial de Playwright (o Puppeteer) a Ombra Chromium a través de CDP local. Todos los tipos, localizadores, esperas y objetos de página siguen siendo los estándar.

### ¿Ombra es gratuito y necesito una clave de licencia?

El código fuente del SDK en este repositorio es de código abierto bajo la licencia Apache License 2.0. Las compilaciones actuales del motor (`158.0.8127.37-3` y posteriores) y el gestor local de perfiles Ombra Desktop (`desktop-v1.2.2`) funcionan de forma gratuita y autónoma, sin cuenta, clave de licencia, identificador de hardware ni límite en la cantidad de perfiles. `license_key` y `OMBRA_LICENSE_KEY` solo se necesitan para compilaciones antiguas con licencia.

### ¿Necesito instalar Ombra Desktop para usar el SDK?

No. El SDK lanza el motor directamente como un proceso hijo, lo que lo hace adecuado para scripts, contenedores y CI. Ombra Desktop es opcional si deseas administrar un catálogo local de perfiles mediante una interfaz gráfica.

### ¿En qué se diferencia Ombra de `playwright-stealth`?

`playwright-stealth` inyecta JavaScript en las páginas sobre un navegador normal, y los detectores modernos suelen identificar los propios parches. Ombra compila sus modificaciones directamente en el código fuente de Chromium, y el SDK no inyecta scripts en las páginas.

### ¿Puedo usar mi propio proxy?

Sí. Pasa un proxy `http://`, `https://` o `socks5://` en `proxy`. Cuando hay credenciales presentes, el SDK inicia un retransmisor local en loopback para que nunca aparezcan en los argumentos del proceso. Ten en cuenta que el cliente propio `context.request` / `page.request` de Playwright puede eludir los ajustes de proxy a nivel de navegador: para garantizar que el tráfico pase por el proxy, ejecuta `fetch()` desde el contexto de la página.

### ¿Qué versiones de Playwright y Puppeteer son compatibles?

El SDK de Python requiere Playwright `>=1.60,<2.0` (instalado automáticamente junto con `ombrabrowser`). El SDK de Node.js admite `playwright-core@^1.60.0` o `puppeteer-core >=22.0.0`. Consulta la [guía de versionado](../../docs/versioning.md) para conocer las reglas de compatibilidad.

### ¿Garantiza Ombra superar todas las comprobaciones antibot?

No. La detección es un objetivo en constante cambio que depende del sitio, la región, la reputación de la IP, el historial del perfil y la versión del detector. Usa el [método de comprobación de sigilo](../../docs/stealth-checkup.md) para medir y seguir una configuración específica de manera objetiva.

### ¿Para qué casos de uso está diseñado Ombra?

Ombra está diseñado para automatización autorizada, pruebas de QA, monitorización, investigación y gestión de perfiles de trabajo aislados. No se admite el acceso no autorizado, el relleno de credenciales (credential stuffing) ni el abuso.

## Cómo contribuir

Las directrices de contribución están en [CONTRIBUTING.md](../../CONTRIBUTING.md), las normas de la comunidad en [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) y las instrucciones para SDK en [sdks/README.md](../../sdks/README.md).

- Actualiza el [contrato del SDK](../../docs/sdk-contract.md) y los [esquemas](../../spec/schemas) antes de añadir una nueva opción de lanzamiento.
- Al modificar el comportamiento de un SDK, actualiza la implementación, las pruebas y los casos compartidos en [conformance](../../conformance/README.md).
- Ejecuta `python3 tools/check_repo.py` antes de abrir un pull request para validar la estructura del repositorio y los enlaces.

## Licencia

El código fuente del SDK en este repositorio se distribuye bajo la licencia [Apache License 2.0](../../LICENSE). Esta licencia no otorga derechos sobre las marcas comerciales de Ombra, el motor Ombra Chromium ni Ombra Desktop; consulta [NOTICE](../../NOTICE) para ver los términos de marcas registradas y de terceros.

## Enlaces

- 🌐 **Sitio web** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Lanzamientos (motor y Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Registro de cambios** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Errores y solicitudes de funciones** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organización** — [Ombra Labs](https://github.com/ombralabs)
