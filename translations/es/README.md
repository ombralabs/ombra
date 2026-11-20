# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

En Python y Node.js, `launch()` inicia Ombra Chromium y devuelve un objeto `Browser` de Playwright. Para usar Puppeteer en Node.js, llama a `launchPuppeteer()`.

**[Instalación](#instalación)** · <a href="../../README.md">English</a>

<details>
<summary>Idiomas</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](../pt/README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Controles de huella digital en Chromium

Ombra implementa los controles de huella digital en Chromium. Abarcan canvas, WebGL, audio, fuentes, concurrencia del hardware, dimensiones y posición de los elementos, cadenas de identificación de la GPU, zonas horarias y señales de automatización. El motor usa la pila TLS y HTTP/2 de Chromium y gestiona la entrada humanizada en el proceso del navegador.

El SDK inicia el motor en el equipo local y conecta el cliente de automatización mediante el protocolo Chrome DevTools (CDP). Puedes ejecutarlo desde un script, un contenedor o una tarea de integración continua sin instalar la aplicación de escritorio de Ombra.

## Estado

Los ejemplos usan las versiones alfa publicadas de los paquetes para Python y Node.js. Este repositorio también contiene el contrato de lanzamiento compartido y la estructura inicial de ocho SDK.

| Componente | Estado |
|---|---|
| [Contrato del SDK](../../docs/sdk-contract.md) | Borrador `0.1.0` |
| SDK de Python | `0.1.3` alfa · [`ombrabrowser` en PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK de Node.js | `0.1.0` alfa · [`@ombralabs/sdk` en npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Esquemas compartidos](../../spec/schemas) | Opciones de lanzamiento y metadatos del binario del motor |
| [Pruebas de conformidad entre lenguajes](../../conformance) | Casos de prueba comunes a ambos SDK |
| [Revisión de sigilo](../../docs/stealth-checkup.md) | Criterios de prueba y plantilla de informe |

## Instalación

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Para usar Puppeteer, instala `puppeteer-core` en lugar de `playwright-core`. En la [ficha del paquete en npm](https://www.npmjs.com/package/@ombralabs/sdk) figuran las versiones compatibles del cliente y de Node.js.

El SDK busca primero el motor en la ruta que indiques en `binary_path` en Python o en `binaryPath` en Node.js. Después consulta, por orden, `OMBRA_BINARY_PATH`, el directorio del motor de la aplicación de escritorio y la caché del SDK. Si no encuentra el motor, lo descarga y verifica el binario.

Para desactivar las descargas, pasa `download=False` en Python o `download: false` en Node.js. Para preparar el motor sin abrir el navegador, llama a `ensure_binary()` en Python o a `ensureBinary()` en Node.js.

## Inicio rápido

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Si usas un perfil con nombre, abre las páginas en el contexto existente del perfil para reutilizar las cookies y los datos que guardan los sitios. Este ejemplo también configura un proxy.

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

Para obtener un `Browser` de Puppeteer, usa `launchPuppeteer()`.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migración sin reescritura

Para migrar un script de Python que use Playwright, instala `ombrabrowser` y cambia la importación y la llamada que inicia el navegador. Los métodos de página, los tipos y los selectores siguen siendo los de Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

En Node.js, el cambio ocupa dos líneas.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Cómo funciona

```mermaid
flowchart LR
    Script["Tu script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + puente CDP"]
    Engine["Ombra Chromium<br/>motor con parches"]
    Client["Cliente de automatización nativo"]
    Profile[("Perfil<br/>semilla · cookies · extensiones")]

    Script -->|launch()| SDK
    SDK -->|iniciar| Engine
    SDK -->|conectar por CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` localiza el motor o lo descarga. A continuación verifica el binario.
2. El SDK selecciona el directorio y la semilla del perfil. Si el proxy requiere autenticación, inicia un relé local.
3. Inicia Chromium con el perfil seleccionado, las opciones de lanzamiento y un puerto de depuración en la interfaz de loopback.
4. Cuando `DevToolsActivePort` está listo, conecta Playwright o Puppeteer por CDP y devuelve el `Browser` del cliente.
5. `browser.close()` detiene el motor y libera el bloqueo del perfil.

Tras el lanzamiento, el cliente envía los comandos de página directamente a Chromium.

## Matriz de SDK

| Entorno de ejecución | Paquete publicado | Objeto de navegador |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → `Browser` de Playwright |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → `Browser` de Playwright<br>`launchPuppeteer()` → `Browser` de Puppeteer |

Otros seis SDK tienen un directorio en este repositorio. El [manifiesto de los SDK](../../sdks/manifest.json) enumera los paquetes y clientes previstos. La [guía de los SDK](../../sdks/README.md) explica cómo se organizan los directorios.

| Entorno previsto | Paquete previsto | Cliente o tipo de retorno |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Opciones de lanzamiento

Los nombres de las opciones son los de la API de Python y el contrato del SDK. En Node.js se escriben en camelCase, como `timeoutMs`, `userDataDir` y `binaryPath`.

| Opción | Valor predeterminado | Función |
|---|---|---|
| `headless` | `true` | Ejecuta el motor sin ventana |
| `proxy` | ninguno | URL u objeto de configuración del proxy. Los proxies con autenticación usan un relé local |
| `fingerprint` | ninguno | Semilla y ajustes de sistema operativo, zona horaria, configuración regional, pantalla y GPU |
| `profile` | ninguno | Perfil con nombre que conserva las cookies, el almacenamiento y la semilla |
| `user_data_dir` | temporal | Directorio de perfil explícito, incompatible con `profile` |
| `args` | `[]` | Argumentos adicionales que se pasan al motor sin modificar |
| `timeout_ms` | `30000` | Tiempo máximo en milisegundos para iniciar el motor y establecer la conexión CDP |
| `humanize` | valor predeterminado del motor | `false`, `true` o una configuración predefinida |
| `binary_path` | detección automática | Selecciona un binario concreto del motor |
| `download` | `true` | Descarga el binario del motor si falta |

El [contrato del SDK](../../docs/sdk-contract.md) enumera todas las opciones y describe los tipos de error y el comportamiento de los perfiles.

## Gestión del binario

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

El SDK verifica la suma de comprobación SHA-256 del motor antes del lanzamiento. Mantén esta comprobación activa en producción. `OMBRA_SKIP_CHECKSUM=1` se reserva para compilaciones locales de desarrollo.

## Configuración

| Variable | Valor predeterminado | Función |
|---|---|---|
| `OMBRA_BINARY_PATH` | sin definir | Ruta explícita al binario del motor |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Directorio de binarios gestionados y perfiles con nombre |
| `OMBRA_DOWNLOAD_URL` | servidor de versiones | URL base para descargar los binarios |
| `OMBRA_VERSION` | última compatible | Versión del motor que se busca |
| `OMBRA_AUTO_UPDATE` | `true` | Busca una versión más reciente del motor al iniciar |
| `OMBRA_SKIP_CHECKSUM` | `false` | Solo para desarrollo |
| `OMBRA_LICENSE_KEY` | sin definir | Clave que se pasa al motor |
| `OMBRA_TIMEOUT_MS` | `30000` | Tiempo máximo de lanzamiento en milisegundos |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

El SDK usa el primer valor que encuentra al consultar, por orden, las opciones de lanzamiento, las variables de entorno, los metadatos del perfil y los valores predeterminados.

## Comparativa

| Característica | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright o Puppeteer |
| Nivel de modificación | ninguno | JavaScript en la página | opciones de configuración | código fuente del motor |
| Semilla de huella digital | no | no | parcial | por perfil |
| Entrada humanizada | no | no | no | motor |
| Aislamiento de perfiles | contexto del navegador | contexto del navegador | no | directorio de datos de usuario |
| Migración sin reescritura | — | cambio de importación | reescritura | cambio de importación |

Los resultados de los detectores dependen del sitio, de la IP de salida y del perfil. La [guía de revisión](../../docs/stealth-checkup.md) explica cómo medirlos.

## El sigilo es una propiedad del motor

El motor aplica los ajustes de huella digital. Los SDK le pasan la semilla del perfil y las opciones que indiques al lanzarlo.

| Capa | Cómo la gestiona Ombra |
|---|---|
| TLS y HTTP/2 | Pila de red de la versión de Chromium usada para compilar el motor |
| Identidad del navegador | Parches en el código fuente del motor que usan la semilla del perfil |
| Señales de automatización | El motor gestiona las señales de WebDriver. El SDK no llama a `Runtime.enable` |
| Entrada | Movimientos de ratón, pulsaciones de teclas y desplazamiento humanizados en el proceso del navegador |
| Coherencia de red | Selección de la zona horaria y la configuración regional en función del proxy |
| Estado | Un directorio de datos de usuario por perfil |

### Límites del SDK

- El puerto de depuración CDP solo acepta conexiones locales a través de la interfaz de loopback.
- El SDK excluye de los registros las credenciales del proxy, las claves de licencia y las cookies. No envía telemetría.
- Un perfil existente conserva su semilla salvo que indiques otra expresamente.
- El SDK nunca inyecta scripts de sigilo con `addScriptToEvaluateOnNewDocument` o `evaluateOnNewDocument` ni modifica las propiedades de la página.
- Para comprobar si el motor está listo, el SDK consulta el punto de acceso HTTP de CDP o usa `Browser.getVersion`. Nunca llama a `Runtime.enable` para esta comprobación.
- El motor proporciona la identidad del navegador. El SDK no sustituye el agente de usuario ni la identidad mediante Playwright o Puppeteer. Tampoco llama a `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` o `setDeviceMetricsOverride`.
- El SDK nunca añade por su cuenta `--enable-automation`, `--disable-blink-features=AutomationControlled` o `--no-sandbox`.

## Revisión de sigilo

Ejecuta estas comprobaciones con la compilación del motor, el cliente de automatización y el perfil que vayas a usar.

| Capa | Ejemplos de pruebas | Criterios de aprobación |
|---|---|---|
| L0 Transporte | TrackMe, pruebas de fugas de IP/WebRTC | Solo se ve la IP de salida. JA4 y HTTP/2 coinciden con la compilación de Chromium del motor |
| L1 Identidad | Prueba local, Sannysoft, Intoli | No hay contradicciones entre UA, UA-CH, plataforma, GPU, fuentes y pantalla |
| L2 Huella digital | CreepJS, FingerprintJS, BrowserScan | Sin indicios de modo sin ventana ni de datos falseados. La huella se mantiene al recargar la página |
| L3 Automatización | rebrowser, brotector, botd | No se detectan rastros de CDP, scripts de inicialización ni WebDriver |
| L4 Comportamiento | Fidelidad de la entrada, trazas de `humanize`, prueba básica con Cloudflare | Eventos de confianza en un orden realista y verificación superada |
| L5 Estabilidad | Semilla, workers, iframes, distintos orígenes | La misma semilla genera la misma identidad en cada lanzamiento |

El procedimiento describe los estados de las pruebas, el diagnóstico de problemas y la presentación de resultados. Está disponible en [inglés](../../docs/stealth-checkup.md) y en [ruso](../../docs/stealth-checkup.ru.md).

Para poder reproducir y comparar los resultados, anota en cada prueba la compilación del motor, la versión del cliente, los ajustes del perfil, la IP de salida del proxy y la versión del detector.

## Mapa del repositorio

```text
.
├── README.md                  # original en inglés
├── translations/
│   └── <locale>/README.md
├── desktop/                   # gestor de perfiles sin conexión
├── docs/
│   ├── desktop/               # documentación del gestor de perfiles
│   ├── architecture.md        # componentes, flujo de lanzamiento y límites
│   ├── sdk-contract.md        # contrato de lanzamiento v0 y comportamiento del SDK
│   ├── stealth-checkup.md     # método y manual de validación de sigilo
│   ├── stealth-checkup.ru.md  # traducción al ruso
│   └── versioning.md          # compatibilidad de SDK, motor y cliente
├── spec/
│   └── schemas/               # JSON Schema para las opciones de lanzamiento y la información del binario
├── sdks/
│   ├── manifest.json          # registro de SDK legible por máquinas
│   ├── README.md              # estructura y reglas de contribución
│   ├── _template/             # plantilla para añadir un lenguaje
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # casos de lanzamiento y sigilo independientes del lenguaje
├── tools/check_repo.py        # validación de estructura y enlaces (CI)
└── .github/workflows/ci.yml
```

Este repositorio contiene la estructura inicial de los SDK, el contrato de lanzamiento, los casos de conformidad y el gestor de perfiles sin conexión. El motor Chromium y la versión completa de Desktop 1.2.1 tienen sus propios repositorios. [Código y guía de compilación de Desktop](../../desktop/README.md) · [Documentación del gestor de perfiles](../../docs/desktop/README.md)

## El contrato

- `launch(options)` inicia el motor y devuelve el `Browser` del cliente. A partir de ese momento, el cliente se comunica directamente con Chromium por CDP.
- Antes del lanzamiento, el SDK comprueba la plataforma y la suma SHA-256 del motor. Si falta el binario y las descargas están habilitadas, lo descarga.
- Los perfiles con nombre conservan las cookies, el almacenamiento de los sitios y la semilla entre lanzamientos.
- Si el lanzamiento falla, el SDK se encarga de terminar el proceso que inició y lanza un error tipado. El código que lo llamó decide si vuelve a intentarlo.
- El SDK, el motor y el cliente de automatización tienen rangos de versiones independientes. Para consultar la compilación del motor, usa `binary_info()` en Python o `binaryInfo()` en Node.js.

## Compatibilidad

| Componente | Versiones o plataformas compatibles |
|---|---|
| Motor | Compilación seleccionada por el SDK. Se consulta con `binary_info()` o `binaryInfo()` |
| macOS | Apple Silicon e Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ con una versión compatible de Playwright |
| Node.js | 20+ con una versión compatible de Playwright o Puppeteer |

El SDK y el motor tienen versiones independientes. Si son incompatibles, el SDK indica ambas versiones en un error tipado.

## Contribución

La [guía de contribución](../../CONTRIBUTING.md) explica el proceso de revisión. Encontrarás las instrucciones de compilación en la [guía de los SDK](../../sdks/README.md).

- Si cambias el comportamiento de un SDK, actualiza la implementación afectada y añade una prueba o un caso de conformidad compartido.
- Para crear un SDK en otro lenguaje, copia la [plantilla](../../sdks/_template), registra el SDK en el [manifiesto](../../sdks/manifest.json) y abre una solicitud de cambios en borrador.
- Para añadir una opción de lanzamiento, actualiza primero el [contrato del SDK](../../docs/sdk-contract.md) y los [esquemas](../../spec/schemas).
- Los cambios de sigilo del motor se hacen en su repositorio. El SDK debe seguir pasando la revisión de sigilo.
- Comunica los problemas de seguridad en privado siguiendo la [política de seguridad](../../SECURITY.md).

## Preguntas frecuentes

### ¿Es Ombra un fork de Playwright?

No. El SDK conecta el cliente oficial de Playwright a Ombra Chromium. Puedes seguir usando los tipos, las funciones auxiliares y los objetos de página de Playwright.

### ¿Necesito la aplicación de escritorio de Ombra?

El SDK inicia el motor directamente. La aplicación de escritorio es opcional y te permite gestionar los perfiles a mano.

### ¿En qué se diferencia Ombra de playwright-stealth?

Los cambios de huella digital de Ombra se compilan en Chromium. El SDK deja intactos los scripts de las páginas.

### ¿Puedo usar mi propio proxy?

Sí. Pásalo a `launch()`. Si el proxy requiere autenticación, un relé local evita que las credenciales aparezcan en la línea de comandos del motor.

### ¿Qué versiones de Playwright y Puppeteer son compatibles?

Cada SDK declara las versiones de cliente compatibles en el manifiesto de su paquete. Los clientes se instalan como dependencias independientes. Consulta los rangos admitidos en la [guía de versiones](../../docs/versioning.md).

### ¿Superará Ombra todas las comprobaciones de bots?

Los resultados dependen del sitio, la región, la reputación de la IP de salida, la versión del detector y los ajustes del perfil. La [guía de revisión de sigilo](../../docs/stealth-checkup.md) explica cómo medir los resultados de una configuración concreta.

## Licencia

El código fuente de los SDK de este repositorio se distribuye bajo la [licencia Apache 2.0](../../LICENSE). La licencia no concede derechos sobre el motor Ombra, el nombre Ombra ni el logotipo. Consulta [NOTICE](../../NOTICE) para conocer las marcas y las atribuciones a terceros.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
