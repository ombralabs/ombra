<p align="center">
<img src="../../assets/logo.svg" width="72" height="72" alt="Ombra">
</p>

<h1 align="center">Ombra</h1>

<p align="center">
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pypi/v/ombrabrowser?label=PyPI" alt="PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/v/@ombralabs/sdk?label=npm" alt="npm"></a>
<a href="../../LICENSE"><img src="https://img.shields.io/github/license/ombralabs/ombra" alt="Licença"></a>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/last-commit/ombralabs/ombra" alt="Último commit"></a>
<br>
<a href="https://github.com/ombralabs/ombra"><img src="https://img.shields.io/github/stars/ombralabs/ombra" alt="Estrelas"></a>
<a href="https://pypi.org/project/ombrabrowser/"><img src="https://img.shields.io/pepy/dt/ombrabrowser?label=pypi&logo=pypi&logoColor=white" alt="Downloads no PyPI"></a>
<a href="https://www.npmjs.com/package/@ombralabs/sdk"><img src="https://img.shields.io/npm/dt/@ombralabs/sdk?label=npm&logo=npm&logoColor=white" alt="Downloads no npm"></a>
<a href="https://github.com/ombralabs/ombra/releases"><img src="https://img.shields.io/github/v/release/ombralabs/ombra?label=release" alt="Lançamento"></a>
</p>

<p align="center">
<a href="#instalação"><strong>Instalação</strong></a> ·
<a href="#api-python">API Python</a> ·
<a href="#api-nodejs-e-typescript">API Node.js</a> ·
<a href="#entrada-humanizada">Humanize</a> ·
<a href="#ombra-desktop">Ombra Desktop</a> ·
<a href="../../README.md">English</a>
</p>

<details>
<summary>Idiomas</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

<br>

<h3 align="center">Chromium com controles de fingerprint no nível do código-fonte C++ e entrada humanizada nativa.</h3>

<table><tr><td>
Não é um conjunto de flags de inicialização nem injeção de JavaScript sobre a página. É um binário real do Chromium com patches de fingerprint compilados diretamente no código-fonte C++ e simulação de entrada executada dentro do processo do navegador. Conecte o Playwright ou Puppeteer oficial via CDP local — sem objetos wrapper e sem reescrever o código das páginas.
</td></tr></table>

<br>

<p align="center">
Substituto direto de inicialização para Playwright e Puppeteer em Python e Node.js.<br>
Mesma API, mesmos seletores e tipos — basta trocar o import e a chamada <code>launch()</code>.
</p>

- **Patches de Chromium no nível do código-fonte** — canvas, WebGL, WebGPU, áudio, fontes, GPU, tela, media queries CSS, relato de hardware, WebRTC sem vazamentos STUN, TLS ClientHello, fuso horário, locale e remoção de sinais de automação (`navigator.webdriver`, `Runtime.enable`, marcadores headless).
- **Entrada humanizada nativa no processo do navegador (`humanize=True`)** — trajetórias de ponteiro (`cursory-rs`), cliques mirados com duração de pressionamento, cadência de digitação com autocorreção de erros e física de rolagem executados dentro do Chromium. O SDK retorna um `Browser` nativo comum, sem wrappers de proxy.
- **Operação autônoma sem chaves nem contas** — os builds atuais do motor e o Ombra Desktop funcionam localmente sem cadastro, chaves de licença, IDs de hardware ou servidor de licenciamento.
- **Instalação automática e verificação criptográfica de binários** — `pip install ombrabrowser` ou `npm install @ombralabs/sdk`; na primeira inicialização, o SDK baixa um build compatível do [GitHub Releases](https://github.com/ombralabs/ombra/releases) e verifica sua assinatura Ed25519 e o checksum SHA-256.
- **Perfis persistentes e relay de proxy seguro** — perfis nomeados mantêm cookies, `localStorage`, IndexedDB e `seed` entre execuções com bloqueio entre processos; proxies autenticados (HTTP, HTTPS, SOCKS5) passam por um relay de loopback local para que as credenciais nunca apareçam nos argumentos do processo.
- **Gerenciador de perfis offline Ombra Desktop** — um aplicativo desktop nativo neste repositório ([`desktop/`](../../desktop/README.md)) com instaladores pré-compilados para macOS, Linux e Windows.

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

O Puppeteer também é compatível via `import { launch } from "@ombralabs/sdk/puppeteer"` ou `launchPuppeteer()` ([detalhes](#puppeteer)).

**Para sites com proteção anti-bot**, combine um proxy residencial, um perfil persistente e configurações de ambiente coerentes:

```python
from ombrabrowser import launch_persistent_context

context = launch_persistent_context(
    profile="pricing-eu",
    proxy="socks5://user:pass@residential-proxy:1080",  # IP residencial é preferível a datacenter
    fingerprint={"timezone": "auto", "locale": "auto"},  # alinhar fuso horário e locale à saída do proxy
    headless=False,                                      # alguns sites detectam diferenças no modo headless
    humanize=True,                                       # simulação nativa de mouse, teclado e rolagem
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

Consulte [Solução de problemas](#solução-de-problemas) para problemas comuns no Linux, em contêineres e em alvos protegidos.

## Instalação

**Python (3.10+):**

```bash
python -m pip install ombrabrowser

# Opcional: detectar automaticamente fuso horário e locale pela saída do proxy (timezone="auto", locale="auto")
python -m pip install "ombrabrowser[geoip]"
```

**Node.js / TypeScript (20+):**

```bash
# Com Playwright (1.60.0+, sem necessidade de baixar o Chromium padrão)
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Ou com Puppeteer (Puppeteer 25+ requer Node.js 22.12+)
npm install @ombralabs/sdk puppeteer-core

# Opcional: leitor offline de banco GeoIP para timezone: "auto" e locale: "auto"
npm install mmdb-lib
```

---

Na inicialização, o SDK resolve o motor em ordem estrita: `binary_path` (`binaryPath` no Node.js), `OMBRA_BINARY_PATH`, o diretório de motores do Ombra Desktop e o cache do SDK (`~/.ombra/engines`). Se nenhum motor compatível for encontrado, o SDK baixa um build do [GitHub Releases](https://github.com/ombralabs/ombra/releases), verifica sua assinatura Ed25519 e o checksum SHA-256 e o armazena em cache localmente. Não é necessário executar `playwright install chromium`.

Para desativar downloads automáticos, passe `download=False` (`download: false` no Node.js). Para baixar e verificar o motor antecipadamente (por exemplo, durante o build de um contêiner), chame `ensure_binary()` (`ensureBinary()`) ou use o comando `install` da CLI.

> **Inicialização autônoma:** os builds atuais do motor são gratuitos e não exigem conta nem chave de licença. `OMBRA_LICENSE_KEY` e o comando `login` permanecem disponíveis apenas por compatibilidade com builds licenciados mais antigos.

**Migrar do Playwright** leva duas linhas — todas as operações de página, locators e esperas permanecem inalterados:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # o restante do seu código continua funcionando sem alterações
```

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

> ⭐ **Dê uma estrela** ao repositório se ele for útil para você e **[acompanhe os lançamentos](https://github.com/ombralabs/ombra/subscription)** para receber notificações sobre novos builds do motor, do SDK e do Ombra Desktop.

---

## Status atual e lançamentos

Cada componente do ecossistema segue o contrato de inicialização compartilhado e é versionado de forma independente.

| Componente | Status / versão | Localização |
|---|---|---|
| **Contrato do SDK** | Rascunho `0.1.0` | [`docs/sdk-contract.md`](../../docs/sdk-contract.md) |
| **SDK Python** | Alpha `0.1.3` | [`ombrabrowser` no PyPI](https://pypi.org/project/ombrabrowser/) |
| **SDK Node.js / TypeScript** | Alpha `0.1.0` | [`@ombralabs/sdk` no npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| **Motor Ombra Chromium** | Faixa do SDK `>=151.0.7922.108,<159` | Baixado automaticamente pelo SDK do [GitHub Releases](https://github.com/ombralabs/ombra/releases) (macOS ARM64 / Linux x64 / Windows x64) |
| **Ombra Desktop** | Gerenciador de perfis offline | [`desktop/`](../../desktop/README.md) · [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Navegador standalone** | Chromium `158.0.8127.37` | [GitHub Releases](https://github.com/ombralabs/ombra/releases) |
| **Schemas e conformidade** | JSON Schema + casos compartilhados | [`spec/schemas`](../../spec/schemas) · [`conformance`](../../conformance/README.md) |
| **Método de checkup de stealth** | 6 camadas (`L0`–`L5`) | [`docs/stealth-checkup.md`](../../docs/stealth-checkup.md) |

Consulte [CHANGELOG.md](../../CHANGELOG.md) para o histórico completo de lançamentos.

## Por que Ombra

- **Patches em nível de configuração e JS quebram facilmente.** Ferramentas como `playwright-stealth`, `puppeteer-extra` e `undetected-chromedriver` injetam JavaScript nas páginas ou ajustam flags de inicialização. Atualizações do Chrome costumam quebrá-las com frequência, e detectores modernos identificam os próprios patches (`Function.prototype.toString`, anomalias de protótipos, `addScriptToEvaluateOnNewDocument`).
- **As alterações são compiladas no código-fonte do Chromium.** Os fingerprints são gerados no nível de C++ e aplicados de forma consistente no frame principal, em workers e em iframes. O SDK não injeta scripts nas páginas e não faz sobrescritas `Emulation.*`.
- **A simulação de entrada vive no processo do navegador, não por cima do Playwright.** Como trajetórias do mouse, pressionamentos de tecla e rolagem são tratados dentro do próprio Chromium, o SDK não envolve objetos do Playwright ou Puppeteer — todos os locators, frames e bibliotecas de terceiros continuam funcionando normalmente.
- **Arquitetura local sem serviços extras.** Sem daemon de plano de controle em segundo plano e sem salto de rede entre o seu script e o navegador: um único processo do motor, CDP em loopback local em `127.0.0.1` e sem limites de quantidade de perfis ou concorrência.

## Ombra Desktop

**Um gerenciador de perfis local e offline com interface gráfica.** Seu código-fonte está diretamente neste repositório ([`desktop/`](../../desktop/README.md)) e é construído com Tauri (Rust + Vue).

- **Completamente offline e local** — o catálogo de perfis fica em um banco SQLite local na sua máquina com chave de criptografia local; sem necessidade de conta, serviço em nuvem ou acesso à rede.
- **Gerenciamento estruturado de perfis** — crie perfis, pesquise por nome, nota ou número, edite descrições e organize registros com grupos, tags, rótulos e favoritos no catálogo em Rust.
- **Lixeira segura** — mover um perfil para a Lixeira mantém seus arquivos em disco para que você possa restaurá-lo depois.
- **Sem limites por perfil** — sem planos por perfil nem cotas em nuvem: todos os dados continuam sendo seus.
- **Instaladores pré-compilados** — macOS Apple Silicon (`.dmg`, assinado com Apple Developer ID e notarizado), Linux (`.deb` e `.rpm`) e Windows x64 (`setup.exe`).
- **Catálogos isolados** — defina `OMBRA_DESKTOP_DATA_DIR` para trabalhar com um catálogo de testes separado ou uma cópia de backup.

[Baixar a versão mais recente →](https://github.com/ombralabs/ombra/releases) · [README do Desktop](../../desktop/README.md) · [Guia de perfis e chaves locais](../../docs/desktop/README.md)

## Verificação de fingerprint e checkup de stealth

Em vez de fazer promessas genéricas de "100% indetectável", o Ombra adota um procedimento de verificação reproduzível sob condições registradas. Os resultados reais em qualquer site sempre dependem da reputação do IP de saída, região, histórico do perfil, versão do detector e configuração de inicialização.

### Superfícies tratadas pelo motor e pelo SDK

| Superfície / sinal | Playwright padrão | Ombra | Implementação |
|---|---|---|---|
| `navigator.webdriver` | `true` | `false` | Patch C++ no motor |
| `window.chrome` | ausente no headless | objeto completo | Corresponde ao Chrome regular |
| `navigator.plugins` | `0` no headless | conjunto coerente de plugins | Nível do motor |
| User-Agent e Client Hints | `HeadlessChrome`, divergência de marca | `Google Chrome` + `Sec-CH-UA*` alinhados | Patch `010-user-agent-and-webdriver` |
| Artefatos CDP (`Runtime.enable`, `UtilityScript`) | sinalizados por detectores | suprimidos pelo motor; o SDK nunca chama `Runtime.enable` | Patch `110-runtime-enable` + invariante `SI-01` |
| Vazamento de IP via WebRTC | expõe o IP local/do host | informa o IP de saída sem enviar STUN real | Patch `100-webrtc-leak` (`--webrtc-ip`) |
| TLS e HTTP/2 | depende da configuração | pilha de rede do Chromium + perfil ClientHello `chrome-<major>` | Patch `210-tls-network-persona` |
| WebGL e WebGPU | renderizador por software / divergência de GPU | limites e tabelas de extensões WebGL/WebGPU unificados | Patches `070`, `071`, `075`, `955` |
| Fontes, locale e fuso horário | valores do host, desvio de `Intl` | tabelas coerentes de fontes, locale ICU e fuso horário | Patches `040`, `090`, `092`, `230` |
| Simulação de entrada | teletransporte do cursor, `fill()` instantâneo | curvas `cursory-rs`, ritmo de digitação, física de rolagem | Patch `135-ombra-humanize` no processo do navegador |
| Estabilidade do fingerprint | muda ou vaza dados do host | determinístico por `seed` entre reinicializações e frames | Patches `001`, `002` + perfil persistente |

### Seis camadas do checkup

Antes de lançar ou colocar uma configuração em produção, execute todas as seis camadas do checkup exatamente com o build do motor, o cliente de automação e o proxy que você pretende usar:

| Camada | Exemplos de alvos | Critérios de aprovação |
|---|---|---|
| **L0 Transporte** | TrackMe, páginas de vazamento IP/WebRTC, eco de cabeçalhos | Apenas o IP de saída do proxy é visível; JA4 e HTTP/2 correspondem ao build do Chromium; nenhuma credencial de proxy em argv |
| **L1 Identidade** | Sonda local, Sannysoft, Intoli, verificação de UA-CH | Sem contradições entre UA, Client Hints, plataforma, GPU, fontes, tela e locale |
| **L2 Fingerprint** | CreepJS, FingerprintJS, BrowserScan, Pixelscan | Sem marcadores headless ou `lie`; o fingerprint permanece estável entre recarregamentos |
| **L3 Automação** | rebrowser, brotector, botd, auditoria de comandos CDP | Sem vazamentos de `Runtime.enable`, init-script, binding ou `navigator.webdriver` |
| **L4 Comportamento** | Sonda de fidelidade de entrada, rastros de humanize, teste rápido de desafios ao vivo | Eventos com `isTrusted: true`, ordenação e temporização naturais, curvas de ponteiro e rolagem realistas |
| **L5 Estabilidade** | Inicializações repetidas, workers, iframes de mesma origem/origem cruzada, paridade entre SDKs | O mesmo `seed` reproduz um fingerprint idêntico em todos os contextos |

Procedimento completo, status (`PASS` / `DEGRADED` / `FAIL` / `UNREACHABLE`), lista de verificação de sinais e modelo de relatório: [Inglês (`docs/stealth-checkup.md`)](../../docs/stealth-checkup.md) e [Russo (`docs/stealth-checkup.ru.md`)](../../docs/stealth-checkup.ru.md).

## Comparação

| Recurso | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API de automação | Playwright | Playwright | Selenium | **Playwright e Puppeteer** |
| Nível do patch | Nenhum | Injeção de JS na página | Flags de configuração | **Código-fonte C++ (Chromium)** |
| `seed` de fingerprint coerente | Não | Não | Parcial | **Sim, por perfil e eTLD+1** |
| Simulação de entrada (`humanize`) | Não | Não | Não | **Integrada ao processo do navegador** |
| Supressão de vazamento `Runtime.enable` / CDP | Não | Não | Parcial | **Patch no motor + invariantes do SDK** |
| Proxies autenticados sem vazamentos na CLI | Não | Não | Limitado | **Relay de loopback local** |
| Isolamento de perfil | Contexto do navegador | Contexto do navegador | Não | **Diretório de perfil + bloqueio de arquivo** |
| Gerenciador de perfis offline (GUI) | Não | Não | Não | **Ombra Desktop (macOS, Linux, Windows)** |
| Migração do Playwright | — | Troca de import | Reescrita de código | **Troca de import e `launch()`** |

## Como funciona

```mermaid
flowchart LR
    Script["Seu script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + ponte CDP"]
    Relay["Relay de proxy local<br/>quando há autenticação"]
    Engine["Ombra Chromium<br/>motor com patches em C++"]
    Client["Cliente nativo<br/>Playwright · Puppeteer"]
    Profile[("Perfil<br/>seed · cookies · armazenamento")]

    Script -->|"launch()"| SDK
    SDK -->|"verificar + iniciar"| Engine
    SDK -.->|"autenticação do proxy"| Relay
    Relay -.-> Engine
    SDK -->|"conectar via CDP"| Client
    Script -->|"API da página"| Client
    Client -->|"CDP loopback"| Engine
    Engine --> Profile
```

1. **`launch()` localiza ou baixa o motor** e verifica sua assinatura Ed25519 e o checksum SHA-256.
2. **O perfil e o `seed` são preparados.** Um perfil nomeado adquire um bloqueio entre processos; se o proxy exigir credenciais, o SDK inicia um relay de loopback em memória.
3. **O Ombra Chromium é iniciado** com o perfil selecionado, as opções de fingerprint e uma porta local de depuração (`--remote-debugging-port=0`).
4. **O cliente oficial se conecta.** Assim que `DevToolsActivePort` aparece, o SDK conecta o Playwright (com `no_defaults=True`) ou o Puppeteer via `127.0.0.1` e retorna o objeto `Browser` nativo.
5. **Encerramento limpo.** `browser.close()` envia `Browser.close`, encerra a árvore de processos do motor, interrompe o relay e libera o bloqueio do perfil.

Após a inicialização, o SDK sai do caminho de dados: todos os comandos de página trafegam diretamente do Playwright ou Puppeteer para o Chromium.

### Limites do SDK e invariantes de stealth

O [contrato do SDK v0.1 (`docs/sdk-contract.md`)](../../docs/sdk-contract.md) impõe invariantes rigorosos a todos os SDKs oficiais:

- **Sem scripts de stealth nas páginas.** O SDK nunca chama `Page.addScriptToEvaluateOnNewDocument` / `evaluateOnNewDocument` e nunca altera propriedades do DOM.
- **Sem `Runtime.enable`.** As verificações de prontidão usam apenas o endpoint HTTP local do CDP ou `Browser.getVersion`; o SDK nunca habilita `Runtime`, `Debugger` ou `Log`.
- **Sem sobrescritas `Emulation.*`.** O SDK nunca chama `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` nem `setDeviceMetricsOverride` — a identidade do navegador vem do motor.
- **Sem flags proibidas por padrão.** O SDK nunca injeta por conta própria `--enable-automation`, `--disable-blink-features=AutomationControlled`, `--no-sandbox` ou `--user-agent`.
- **CDP apenas em loopback.** A porta de depuração sempre se vincula a `127.0.0.1`; passar um `--remote-debugging-address` fora do loopback é rejeitado.
- **Sem telemetria e sem vazamento de segredos.** Credenciais de proxy, chaves e cookies são mascarados nos logs e nas mensagens de erro.

## API Python

### `launch()`

```python
from ombrabrowser import launch

# Inicialização básica (headless por padrão)
browser = launch()

# Janela visível do navegador
browser = launch(headless=False)

# Proxy HTTP ou SOCKS5 (credenciais tratadas via relay de loopback local)
browser = launch(proxy="http://user:pass@proxy:8080")
browser = launch(proxy="socks5://user:pass@proxy:1080")

# Objeto de proxy com lista de exceções (bypass)
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

# Controles de fingerprint (seed, SO, fuso horário/locale automáticos via proxy, tela, GPU)
# Para timezone="auto" / locale="auto", instale: pip install "ombrabrowser[geoip]"
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

# Simulação nativa de mouse, teclado e rolagem
browser = launch(humanize=True)
browser = launch(humanize={"preset": "careful"})

# Fixar um build exato do motor e passar flags extras do Chromium
browser = launch(
    version="158.0.8127.37-3",
    args=["--webrtc-ip=203.0.113.10"],
)
```

Retorna um `playwright.sync_api.Browser` padrão. Todos os métodos do Playwright funcionam normalmente (`new_page()`, `new_context()`, `close()`, etc.). Novas páginas usam `no_viewport=True` por padrão para não sobrescrever as dimensões da janela do perfil.

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

Atalho prático que inicia o navegador e retorna um `BrowserContext` diretamente (fechar o contexto também encerra o processo do motor). Argumentos nomeados extras são encaminhados para `browser.new_context()` — como `storage_state`, `permissions` ou `extra_http_headers`:

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

Equivalente assíncrono: `await launch_context_async(...)`.

### `launch_persistent_context()` e `launch_persistent_context_async()`

Inicia o navegador com um perfil persistente e retorna seu `BrowserContext` padrão. Cookies, `localStorage`, IndexedDB, cache e o `seed` do fingerprint persistem entre sessões.

- Passar `profile="pricing-eu"` cria o perfil em `~/.ombra/profiles/pricing-eu` com metadados em `.ombra/profile.json` e um arquivo de bloqueio.
- Passar `user_data_dir="./my-profile"` (ou um caminho como argumento posicional) usa esse diretório explícito.
- Iniciar o mesmo perfil simultaneamente em outro processo lança `ProfileBusyError` em vez de corromper os dados do perfil.

```python
from ombrabrowser import launch_persistent_context

# Por perfil nomeado (armazenado em ~/.ombra/profiles/)
ctx = launch_persistent_context(profile="pricing-eu", headless=False)
page = ctx.new_page()
page.goto("https://example.com")
ctx.close()  # cookies, armazenamento e seed são persistidos

# Por caminho explícito (por exemplo, para carregar extensões do Chrome)
ctx = launch_persistent_context(
    "./my-profile",
    headless=False,
    args=[
        "--disable-extensions-except=./my-extension",
        "--load-extension=./my-extension",
    ],
)
```

Equivalente assíncrono: `await launch_persistent_context_async(...)`.

### Funções utilitárias e diagnóstico (Python)

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

# Inspecionar o binário do motor resolvido
print(binary_info())
# {'version': '158.0.8127.37-3', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

# Baixar e verificar o motor sem iniciar um navegador
ensure_binary(version="158.0.8127.37-3")

# Remover binários do motor gerenciados pelo SDK (perfis em ~/.ombra/profiles permanecem intactos)
clear_cache()

# Prévia dry-run do comando de inicialização resolvido sem iniciar o Chromium
cmd = build_launch_options(profile="pricing-eu", humanize=True)

# Ler metadados de execução (porta CDP, ws_url, seed, pid) e verificar a saúde do processo
browser = launch()
print(last_launch_info(browser))
check_engine_health(browser)
browser.close()
```

### CLI (Python)

```bash
ombrabrowser install                             # baixar e verificar o motor (Ed25519 + SHA-256)
ombrabrowser install --version 158.0.8127.37-3  # instalar um build específico do motor
ombrabrowser info                                # diagnóstico de ambiente, binário e dependências (alias: doctor)
ombrabrowser info --quick --json                 # relatório rápido legível por máquina sem iniciar o binário
ombrabrowser info --proxy socks5://user:pass@host:1080  # testar resolução de IP de saída, fuso horário e locale via proxy
ombrabrowser update                              # verificar o GitHub Releases e atualizar o motor em cache
ombrabrowser clear-cache                         # limpar binários do motor em cache (perfis preservados)
ombrabrowser login                               # salvar chave de licença em ~/.ombra/license.key (apenas builds legados)
ombrabrowser logout                              # remover chave de licença salva
```

Os mesmos comandos estão disponíveis via `python -m ombrabrowser <command>`.

## API Node.js e TypeScript

`@ombralabs/sdk` oferece builds duais ESM + CommonJS com definições TypeScript completas (`.d.ts`). Tanto o Playwright quanto o Puppeteer executam sobre o mesmo motor por baixo dos panos.

### Playwright (padrão)

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

// Inicialização básica com proxy, fingerprint e simulação de entrada
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

// Inicialização prática: navegador + contexto em uma única chamada
const context = await launchContext({
  proxy: "socks5://user:pass@residential-proxy:1080",
  fingerprint: { timezone: "auto", locale: "auto" },
  headless: false,
  humanize: true,
  contextOptions: { storageState: "state.json" },
});
const page = await context.newPage();

// Perfil persistente — cookies, localStorage e seed persistem entre execuções
const persistentCtx = await launchPersistentContext({
  userDataDir: "./chrome-profile",
  headless: false,
  humanize: true,
});
```

> Cada trecho acima é independente. Para migrar um inicializador Playwright existente, você também pode substituir o import por `import * as chromium from "@ombralabs/sdk"` e manter `await chromium.launch(...)`.

### Puppeteer

Use `launchPuppeteer()` de `@ombralabs/sdk` ou importe de `@ombralabs/sdk/puppeteer`:

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

> **Nota sobre o Puppeteer:** o Puppeteer envia mais tráfego CDP padrão do que o Playwright usando `connectOverCDP({ noDefaults: true })`. Para sites com verificações rigorosas de CDP, o Playwright é recomendado.

### Utilitários e CLI (Node.js)

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

No Ombra, a simulação de entrada (`humanize`) é compilada **nativamente no processo do navegador Chromium** (com base no `cursory-rs` e no agendador de entrada do motor), em vez de ser implementada como um wrapper JS em torno do cliente de automação. Isso significa:

- Todas as ações padrão do Playwright e do Puppeteer (`page.click()`, `page.fill()`, `page.type()`, `page.mouse.*`, `page.keyboard.*`, `locator.*`, `ElementHandle.*`) passam por uma única fila de entrada por aba dentro do navegador.
- Os parâmetros comportamentais são derivados de forma determinística do `seed` do perfil (`--fingerprint-humanize-seed`).
- O SDK nunca envolve `Page` ou `Browser` em classes proxy — os tipos nativos e o comportamento do cliente permanecem intactos.

```python
browser = launch(humanize=True)
page = browser.new_page()
page.goto("https://example.com")
page.locator("#email").fill("user@example.com")
page.locator("button[type=submit]").click()
```

**O que muda com `humanize=True`:**

| Ação | Sem `humanize` | Com `humanize=True` |
|---|---|---|
| Movimento do mouse | Teletransporte instantâneo | Curvas `cursory-rs` com aceleração, pausas e leve ultrapassagem |
| Cliques e arrastes | Pressionamento instantâneo | Ponto de mira dentro do alvo, pausa antes do clique e duração do pressionamento |
| Entrada de texto | Definição instantânea do valor | Digitação caractere por caractere com cadência e layout de teclado configurados, erros ocasionais e autocorreção; textos muito longos são colados por uma área de transferência isolada sem tocar na área de transferência do sistema |
| Rolagem | Salto único | Série de eventos de roda do mouse/trackpad seguindo perfis medidos de desaceleração |
| Intervalos ociosos | Cursor estático | No preset `careful`, deriva sutil do cursor ocioso entre ações |

**Presets** — `default` (ritmo normal), `careful` (mais lento, deliberado, com micromovimentos ociosos) e `fast` (ritmo mais rápido). Passe `humanize=False` (`humanize: false`) para desativar explicitamente a simulação de entrada.

```python
browser = launch(humanize={"preset": "careful"})
```

```ts
const browser = await launch({ humanize: { preset: "careful" } });
```

Você pode alternar o modo ou trocar presets em tempo de execução sem reiniciar o navegador por meio do domínio CDP `Ombra`:

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

## Gerenciamento de fingerprint e perfis

O motor deriva uma configuração coerente de navegador a partir de um único `seed`. Quando `seed` é omitido:

| Cenário | Comportamento |
|---|---|
| **`launch()` sem perfil** | O SDK gera um `seed` aleatório para a sessão e cria um diretório temporário que é removido após `close()`. |
| **`profile="name"` ou `user_data_dir="./dir"`** | O `seed` é salvo em `.ombra/profile.json` e reutilizado em cada inicialização — os sites veem um visitante recorrente com o mesmo dispositivo e os mesmos cookies. |
| **`fingerprint={"seed": N, ...}`** | Fingerprint determinístico a partir do `seed` explícito; campos adicionais sobrescrevem configurações individuais mantendo o restante coerente. |

O ruído de canvas/áudio usa chave por `eTLD+1` (estável no mesmo site, não correlacionável entre sites diferentes). O ruído de pixels para canvas 2D e `readPixels` do WebGL vem desativado por padrão para evitar acionar detectores de "Canvas Tampering / Masking" e pode ser ativado explicitamente via `--fingerprint-pixel-noise`.

> **Dica:** ao revisitar o mesmo site, use um perfil persistente (`profile="name"` ou `launch_persistent_context()`) em vez de passar um `seed` fixo para um `launch()` efêmero — assim cookies, cache e `localStorage` permanecem consistentes junto com o fingerprint.

### Campos do objeto `fingerprint`

Os nomes de campo abaixo seguem o Python (`snake_case`); o Node.js aceita tanto `camelCase` (`osVersion`, `hardwareConcurrency`, `deviceMemory`) quanto `snake_case`:

| Campo | Tipo | Descrição |
|---|---|---|
| `seed` | `int` (`>= 0`) | Semente do gerador que determina a configuração geral do fingerprint |
| `os` | `"macos"` \| `"windows"` \| `"linux"` | SO alvo (`navigator.platform`, UA, pools de GPU e fontes) |
| `os_version` | `string` | Dica de versão do SO para Client Hints |
| `timezone` | zona IANA ou `"auto"` | Fuso horário (ex.: `"Europe/Berlin"`). `"auto"` resolve a zona pela saída do proxy via GeoIP |
| `locale` | BCP-47 ou `"auto"` | Locale (`Accept-Language`, `navigator.languages`, ICU `Intl`). `"auto"` resolve o locale pela saída do proxy |
| `screen` | `{"width", "height"}` ou `"auto"` | Dimensões da tela e da área útil levando em conta a barra de tarefas / barra de menus do SO alvo |
| `gpu` | `{"vendor", "renderer"}` ou `"auto"` | Strings explícitas `UNMASKED_VENDOR` / `UNMASKED_RENDERER` do WebGL |
| `hardware_concurrency` | `int` ou `"auto"` | Valor relatado em `navigator.hardwareConcurrency` |
| `device_memory` | `int` ou `"auto"` | Valor relatado em `navigator.deviceMemory` (em GB) |
| `noise` | `bool` | Ativa/desativa o ruído de fingerprint (`False` passa `--disable-fingerprint-noise`) |

> Mantenha `seed` como fonte principal dos parâmetros de fingerprint: sobrescrever valores individuais sem mantê-los alinhados (como combinar um SO com uma GPU incompatível) pode introduzir contradições para os detectores.

### Flags adicionais do motor (`args`)

Flags adicionais do motor (defina ou sobrescreva via `args=[...]`):

| Flag | Finalidade |
|---|---|
| `--fingerprint-brand=chrome\|edge\|opera\|vivaldi` | Marca do navegador em `Sec-CH-UA` (o SDK usa `chrome` por padrão) |
| `--fingerprint-tls-profile=chrome-<major>` | Perfil TLS ClientHello correspondente à versão principal especificada do Chrome (definido automaticamente pelo SDK a partir da versão do motor) |
| `--webrtc-ip=<ip>` | Substitui o endereço IP nos candidatos ICE do WebRTC sem enviar tráfego STUN real |
| `--fingerprint-location=<lat,lon>` | Coordenadas relatadas por `navigator.geolocation` |
| `--fingerprint-storage-quota=<MB>` | Cota de armazenamento relatada por `navigator.storage.estimate()` |
| `--fingerprint-max-touch-points=<N>` | Quantidade de pontos de toque (`navigator.maxTouchPoints` e media queries de ponteiro) |
| `--fingerprint-device-pixel-ratio=<ratio>` | Densidade de pixels da tela (`window.devicePixelRatio`) |
| `--fingerprint-color-depth=<bits>` | Profundidade de cor da tela |
| `--disable-gpu-fingerprint` | Repassa a GPU real do host (strings, limites e extensões WebGL/WebGPU) |
| `--disable-gpu-string-spoof` | Repassa as strings reais da GPU mantendo as demais configurações do perfil |
| `--disable-fingerprint-noise` | Desativa ruído de canvas/WebGL/áudio mantendo ativos os parâmetros de identidade (também definido por `fingerprint={"noise": False}`) |
| `--fingerprint-pixel-noise` | Ativa opcionalmente o ruído idempotente de pixels para canvas 2D e `readPixels` |
| `--profile-label=<text>` | Rótulo do perfil exibido na barra de endereços do navegador (apenas UI; definido automaticamente a partir de `profile`, passe via `args` apenas quando `profile` não estiver definido) |

### Configuração de fontes no Linux

Servidores Linux mínimos e contêineres costumam não ter fontes de emoji e CJK, fazendo com que a renderização oculta de texto em canvas e emojis gere hashes incomuns.

**1. Camada básica (emoji e CJK):**

```bash
sudo apt-get update && sudo apt-get install -y \
    fonts-noto-color-emoji fonts-freefont-ttf fonts-unifont \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-tlwg-loma-otf
```

**2. Fontes do Windows para perfis Windows (`os="windows"`):**
Ao executar uma configuração Windows no Linux, instalar fontes reais de `C:\Windows\Fonts\` (incluindo `Segoe UI`, `Calibri`, `Consolas`, `Courier New`, `Arial`, `Times New Roman`, `MS UI Gothic`) melhora significativamente a coerência da enumeração de fontes:

```bash
mkdir -p ~/.local/share/fonts/windows
cp -r /path/to/windows/Fonts/. ~/.local/share/fonts/windows/
fc-cache -f
```

**3. Fontes do macOS para perfis macOS (`os="macos"`):**
Da mesma forma, ao usar `os="macos"` no Linux, copie as fontes de `/System/Library/Fonts/`, `/System/Library/Fonts/Supplemental/` e `/Library/Fonts/` para `~/.local/share/fonts/mac/` e execute `fc-cache -f`.

Em um `Dockerfile`, coloque as fontes no diretório do sistema `/usr/local/share/fonts/`:

```dockerfile
COPY windows-fonts/ /usr/local/share/fonts/windows/
RUN fc-cache -f
```

## Opções de inicialização, configuração e erros

### Opções de `launch()`

Os nomes das opções seguem a API Python e o [contrato do SDK](../../docs/sdk-contract.md); o Node.js usa equivalentes em `camelCase` (`timeoutMs`, `userDataDir`, `binaryPath`, `licenseKey`) e também aceita aliases em `snake_case`. Opções desconhecidas são rejeitadas com `InvalidOptionError`.

| Opção | Padrão | Descrição |
|---|---|---|
| `headless` | `true` | Executar sem janela (`--headless=new`) |
| `proxy` | nenhum | URL de proxy (`http`, `https`, `socks5`) ou objeto; proxies autenticados usam relay de loopback |
| `fingerprint` | nenhum | Configurações de `seed`, SO, fuso horário, locale, tela, GPU, memória e ruído |
| `profile` | nenhum | Perfil persistente nomeado em `~/.ombra/profiles/<slug>` (mutuamente exclusivo com `user_data_dir`) |
| `user_data_dir` | temporário | Caminho explícito do diretório de perfil (mutuamente exclusivo com `profile`) |
| `args` | `[]` | Argumentos extras do Chromium (repassados sem alterações) |
| `binary_path` | resolvido | Caminho explícito para um executável do motor |
| `version` | env / auto | Fixação da versão do motor (por exemplo, `158.0.8127.37-3`), sobrescreve `OMBRA_VERSION` |
| `timeout_ms` | `30000` | Prazo para inicialização do motor e conexão CDP (1000–600000 ms) |
| `humanize` | padrão do motor | `False`, `True` ou `{"preset": "default" \| "careful" \| "fast"}` |
| `license_key` | env / arquivo | Chave para builds licenciados legados (desnecessária nos builds atuais; nunca registrada em log) |
| `env` | `{}` | Variáveis de ambiente extras para o processo do motor |
| `download` | `True` | Permite o download automático de um binário do motor ausente |

### Variáveis de ambiente

Ordem de precedência: **opção explícita de inicialização → variável de ambiente → metadados do perfil → padrão**.

| Variável | Padrão | Descrição |
|---|---|---|
| `OMBRA_BINARY_PATH` | não definida | Caminho explícito para um binário do motor |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Diretório para motores em cache e perfis nomeados |
| `OMBRA_DOWNLOAD_URL` | `https://api.github.com/repos/ombralabs/ombra/releases` | Origem de download do motor; uma URL personalizada ativa o modo de espelho legado (`none`/`off` desativa downloads) |
| `OMBRA_VERSION` | mais recente compatível | Versão fixada do motor (por exemplo, `158.0.8127.37-3`) |
| `OMBRA_RELEASE_CHANNEL` | `stable` | Canal de lançamentos do motor: `stable` (releases do GitHub) ou `beta` (prereleases do GitHub) |
| `OMBRA_AUTO_UPDATE` | `true` | Verifica builds mais novos do motor na inicialização |
| `OMBRA_SKIP_CHECKSUM` | `false` | Apenas desenvolvimento local: desativa a verificação SHA-256 (registra um aviso) |
| `OMBRA_LICENSE_KEY` | não definida | Chave para builds licenciados legados (nunca registrada em log) |
| `OMBRA_TIMEOUT_MS` | `30000` | Tempo limite padrão de inicialização (ms) |
| `OMBRA_LOG_LEVEL` | `warn` | Verbosidade dos logs: `error`, `warn`, `info`, `debug` |

### Erros tipados

Em qualquer falha, o SDK encerra o processo do motor iniciado, libera o bloqueio do perfil e lança uma subclasse de `OmbraError` com um `kind` estável e `details` com segredos mascarados:

`InvalidOptionError` · `BinaryNotFoundError` · `DownloadFailedError` · `ChecksumMismatchError` · `UnsupportedPlatformError` · `UnsupportedEngineError` · `ProxyError` · `ProfileBusyError` · `LaunchTimeoutError` · `CDPConnectError` · `EngineExitedError` · `EngineCrashedError` · `LicenseError`

A taxonomia completa de erros e as regras de nova tentativa estão documentadas no [contrato do SDK (`docs/sdk-contract.md`)](../../docs/sdk-contract.md).

## Plataformas, integrações e contêineres

### Plataformas e runtimes compatíveis

| Componente | Suporte | Observações |
|---|---|---|
| **macOS ARM64 (Apple Silicon)** | ✅ | Builds autônomos do motor via GitHub Releases; o Ombra Desktop é assinado com Developer ID e notarizado |
| **macOS x64 (Intel)** | — | Sem versão atual do Chromium 158 |
| **Linux x64** | ✅ | Builds autônomos do motor via GitHub Releases; o SDK Node.js requer `xz-utils` (`xz`) para extrair `.tar.xz` |
| **Windows x64** | ✅ | Builds autônomos do motor via GitHub Releases e instalador do Ombra Desktop |
| **Python** | `3.10+` | Playwright `>=1.60,<2.0` é instalado automaticamente com `ombrabrowser` |
| **Node.js** | `20+` | Playwright `>=1.60,<2.0` ou Puppeteer `>=22` (Puppeteer 25+ requer Node.js `>=22.12`) |

### Integrações com frameworks e agentes de IA

O Ombra funciona com qualquer ferramenta de automação ou framework de agentes de IA que aceite um binário personalizado do Chromium ou se conecte via CDP (`browser-use`, `Crawl4AI`, `Crawlee`, `Scrapling`, `Stagehand`, `LangChain` e outros):

```python
# Opção 1: resolver o caminho do binário verificado e os argumentos executáveis do motor para o seu próprio executor
# Observação: build_launch_options() é um auxiliar dry-run — passe user_data_dir e seed explicitamente
# (perfis nomeados e proxies autenticados exigem a Opção 2).
from ombrabrowser import build_launch_options

cmd = build_launch_options(
    user_data_dir="./agent-1",
    fingerprint={"seed": 20261116},
    humanize=True,
)
binary_path = cmd["binary_path"]
engine_args = cmd["args"]

# Opção 2: iniciar via Ombra SDK e entregar o endpoint CDP local ao seu framework
from ombrabrowser import launch_async, last_launch_info

browser = await launch_async(profile="agent-1", humanize=True)
info = last_launch_info(browser)
ws_url = info["ws_url"]             # ws://127.0.0.1:<port>/devtools/browser/...
cdp_http = f"http://127.0.0.1:{info['cdp_port']}"
# Conecte seu framework a ws_url ou cdp_http — as configurações de fingerprint e humanize
# rodam dentro do motor e permanecem ativas para qualquer cliente CDP
```

### Execução em Docker e servidores Linux

Exemplo de `Dockerfile` que pré-baixa e verifica o motor durante a construção da imagem:

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

> **Contêineres e servidores web:**
> - Se o seu contêiner não conseguir inicializar o sandbox do Chromium, passe `--no-sandbox` explicitamente via `args=["--no-sandbox"]` (o SDK nunca adiciona essa flag por conta própria).
> - Para executar com `headless=False` em um servidor sem interface gráfica, use `Xvfb` (veja [abaixo](#solução-de-problemas)).
> - Ao executar sob `uvicorn` com `uvloop`, passe `--loop asyncio` para evitar travamentos nos pipes de subprocessos.

## Solução de problemas

### O site bloqueia o modo headless

Alguns sistemas anti-bot verificam diferenças comportamentais e de renderização no modo headless mesmo com patches em C++. Execute com `headless=False` em um display virtual usando `Xvfb`:

```bash
sudo apt-get install -y xvfb
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

Em seguida, inicie com um proxy residencial SOCKS5/HTTP, um perfil persistente, fuso horário/locale compatíveis, `headless=False` e `humanize=True` (veja o exemplo de `launch_persistent_context()` no início deste README).

Se os bloqueios continuarem no Linux, verifique [Configuração de fontes no Linux](#configuração-de-fontes-no-linux).

### O site exibe verificação em toda visita

Chamar `launch()` sem `profile` começa sempre com um diretório temporário vazio e um novo `seed`, fazendo com que o site trate cada execução como um visitante totalmente novo sem cookies. Troque para `profile="..."` ou `launch_persistent_context(...)` para que cookies, `localStorage` e `seed` sejam mantidos entre execuções.

### `ProfileBusyError`

Um perfil nomeado ou `user_data_dir` só pode ficar aberto em um processo por vez. Atribua um nome de perfil distinto para cada worker paralelo (`profile=f"worker-{i}"`). Bloqueios obsoletos deixados por processos encerrados inesperadamente são detectados e limpos automaticamente.

### Preciso executar `playwright install chromium`?

Não. O Ombra executa seu próprio binário do motor e não usa o Chromium padrão do Playwright. No Linux, você precisa apenas das bibliotecas do sistema e do `xz-utils`:

```bash
sudo apt-get install -y xz-utils
playwright install-deps chromium
```

### Atualização, troca de canal e rollback do motor

Atualize o SDK para a versão mais recente:

```bash
python -m pip install -U ombrabrowser
npm install @ombralabs/sdk@latest
```

Teste o canal `beta` ou fixe/reverta para um build exato do motor:

```python
# Fixar um build exato para uma inicialização específica
browser = launch(version="158.0.8127.37-3")
```

```bash
# Testar o canal beta (remova OMBRA_VERSION — uma fixação exata -N ignora o canal)
unset OMBRA_VERSION
export OMBRA_RELEASE_CHANNEL=beta
ombrabrowser update

# Ou fixar / reverter para um build exato do motor
export OMBRA_VERSION=158.0.8127.37-3
ombrabrowser install --version 158.0.8127.37-3

# Ou apontar para um binário compilado localmente
export OMBRA_BINARY_PATH=/path/to/ombra/chromium
```

### macOS: o Gatekeeper bloqueia um build local

Os lançamentos oficiais do Ombra para macOS Apple Silicon são assinados com certificado Apple Developer ID e notarizados. Se você executar um build local de desenvolvimento não assinado e o macOS colocá-lo em quarentena, remova o atributo de quarentena uma vez:

```bash
xattr -cr ~/.ombra/engines/*/*.app
```

### Aguardando em uma página no Python síncrono

No Playwright síncrono, um único `time.sleep(15)` longo após `page.goto()` pausa o loop de eventos do Playwright, o que pode travar páginas de verificação. Em vez disso, aguarde em intervalos curtos com uma chamada leve de contexto:

```python
import time

for _ in range(15):
    page.context.cookies()  # mantém o Playwright processando sem tocar no DOM da página
    time.sleep(1)
```

Em Python assíncrono use `await asyncio.sleep(...)`; no Node.js use `await new Promise(r => setTimeout(r, ms))`. Evite também chamadas frequentes a `page.wait_for_timeout()` e chamadas desnecessárias a `page.evaluate()` antes das verificações para não gerar tráfego CDP extra.

## Segurança

- **Autenticidade e integridade do motor.** Antes da extração, o SDK verifica a assinatura Ed25519 do envelope de lançamento contra uma chave pública fixada e valida o digest SHA-256 tanto do arquivo compactado quanto do executável.
- **CDP apenas local.** A porta de depuração vincula-se estritamente a `127.0.0.1`. Nunca exponha uma porta CDP em uma rede pública sem autenticação adicional — o CDP concede controle total sobre o navegador.
- **Isolamento de segredos.** As credenciais de proxy existem apenas na memória do relay de loopback local e nunca aparecem nas linhas de comando do processo, nos metadados do perfil, nos logs nem nos detalhes de erro.
- **Sem telemetria.** O SDK não envia dados analíticos, relatórios de falhas nem pings ocultos de rede.

Relate problemas de segurança de forma privada seguindo [SECURITY.md](../../SECURITY.md).

## Mapa do repositório

```text
.
├── README.md                    # README principal (English)
├── translations/
│   ├── pt/README.md             # este arquivo (Português)
│   └── <locale>/README.md       # outras 20 localizações
├── desktop/                     # Ombra Desktop (Tauri: catálogo Rust + UI Vue)
├── docs/
│   ├── architecture.md          # arquitetura, limites de confiança, ciclo de vida
│   ├── sdk-contract.md          # contrato de inicialização v0.1, opções, erros, invariantes
│   ├── stealth-checkup.md       # método de checkup (English)
│   ├── stealth-checkup.ru.md    # método de checkup (Русский)
│   ├── versioning.md            # versionamento de SDK, motor e clientes
│   └── desktop/                 # guias de perfis locais e chaves do Desktop
├── spec/
│   └── schemas/                 # JSON Schemas para opções de inicialização e metadados de binário
├── sdks/
│   ├── manifest.json            # registro legível por máquina dos SDKs
│   ├── README.md                # estrutura dos SDKs e regras de contribuição
│   ├── python/                  # SDK Python (publicado como ombrabrowser)
│   ├── node/                    # SDK Node.js / TypeScript (publicado como @ombralabs/sdk)
│   └── ...                      # scaffolds de contrato para outras linguagens (Go, Rust, C#, Java, PHP, Ruby)
├── conformance/                 # casos entre linguagens de inicialização e invariantes de stealth
├── tools/check_repo.py          # validador de estrutura, schemas e links (CI)
└── .github/workflows/ci.yml
```

Este repositório hospeda o contrato do SDK, os schemas, os casos de conformidade, a documentação e o código-fonte do Ombra Desktop. Os patches do motor Chromium são mantidos em um repositório separado, com builds compilados publicados no [GitHub Releases](https://github.com/ombralabs/ombra/releases).

## FAQ

### Isto é um fork do Playwright?

Não. O SDK conecta o cliente oficial do Playwright (ou Puppeteer) ao Ombra Chromium via CDP local. Todos os tipos, locators, esperas e objetos de página permanecem padrão.

### O Ombra é gratuito e preciso de uma chave de licença?

O código-fonte do SDK neste repositório é open source sob a Licença Apache 2.0. Os builds atuais do motor e o gerenciador de perfis local Ombra Desktop funcionam gratuitamente e de forma autônoma — sem conta, chave de licença, ID de hardware nem limite de quantidade de perfis. `license_key` e `OMBRA_LICENSE_KEY` são necessários apenas para builds licenciados legados.

### Preciso instalar o Ombra Desktop para usar o SDK?

Não. O SDK inicia o motor diretamente como processo filho, o que o torna adequado para scripts, contêineres e CI. O Ombra Desktop é opcional caso você queira gerenciar um catálogo local de perfis por meio de uma interface gráfica.

### Qual é a diferença entre o Ombra e o `playwright-stealth`?

O `playwright-stealth` injeta JavaScript nas páginas por cima de um navegador comum, e detectores modernos frequentemente identificam os próprios patches. O Ombra compila suas modificações diretamente no código-fonte do Chromium, e o SDK não injeta scripts nas páginas.

### Posso usar meu próprio proxy?

Sim. Passe um proxy `http://`, `https://` ou `socks5://` em `proxy`. Quando há credenciais, o SDK executa um relay de loopback local para que elas nunca apareçam nos argumentos do processo. Observe que o próprio cliente `context.request` / `page.request` do Playwright pode ignorar as configurações de proxy no nível do navegador — para garantir que o tráfego passe pelo proxy, faça chamadas `fetch()` a partir do contexto da página.

### Quais versões do Playwright e do Puppeteer são compatíveis?

O SDK Python exige Playwright `>=1.60,<2.0` (instalado automaticamente com `ombrabrowser`). O SDK Node.js é compatível com `playwright-core@^1.60.0` ou `puppeteer-core >=22.0.0`. Consulte o [guia de versionamento](../../docs/versioning.md) para as regras de compatibilidade.

### O Ombra garante passar por todas as verificações de bots?

Não. A detecção é um alvo em constante movimento que depende do site, da região, da reputação do IP, do histórico do perfil e da versão do detector. Use o [método de checkup de stealth](../../docs/stealth-checkup.md) para medir e acompanhar objetivamente uma configuração específica.

### Para quais casos de uso o Ombra foi criado?

O Ombra foi criado para automação autorizada, testes de QA, monitoramento, pesquisa e gerenciamento de perfis de trabalho isolados. Acesso não autorizado, credential stuffing e abuso não são suportados.

## Como contribuir

As diretrizes de contribuição estão em [CONTRIBUTING.md](../../CONTRIBUTING.md), os padrões da comunidade em [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) e as instruções de SDK em [sdks/README.md](../../sdks/README.md).

- Atualize o [contrato do SDK](../../docs/sdk-contract.md) e os [schemas](../../spec/schemas) antes de adicionar uma nova opção de inicialização.
- Ao alterar o comportamento do SDK, atualize a implementação, os testes e os casos compartilhados em [conformance](../../conformance/README.md).
- Execute `python3 tools/check_repo.py` antes de abrir um pull request para validar a estrutura do repositório e os links.

## Licença

O código-fonte do SDK neste repositório é licenciado sob a [Licença Apache 2.0](../../LICENSE). A licença não concede direitos sobre as marcas registradas do Ombra, sobre o motor Ombra Chromium nem sobre o Ombra Desktop — consulte [NOTICE](../../NOTICE) para os termos de marcas registradas e de terceiros.

## Links

- 🌐 **Site** — [ombrabrowser.dev](https://ombrabrowser.dev)
- 📦 **PyPI** — [pypi.org/project/ombrabrowser](https://pypi.org/project/ombrabrowser/)
- 📦 **npm** — [npmjs.com/package/@ombralabs/sdk](https://www.npmjs.com/package/@ombralabs/sdk)
- 🚀 **Lançamentos (motor e Desktop)** — [GitHub Releases](https://github.com/ombralabs/ombra/releases)
- 📋 **Changelog** — [CHANGELOG.md](../../CHANGELOG.md)
- 🐛 **Bugs e sugestões de recursos** — [GitHub Issues](https://github.com/ombralabs/ombra/issues)
- 🏢 **Organização** — [Ombra Labs](https://github.com/ombralabs)
