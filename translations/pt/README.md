# <img src="../../assets/logo.svg" width="24" height="24" alt=""> Ombra SDKs

Em Python e Node.js, `launch()` inicia o Ombra Chromium e retorna um objeto `Browser` do Playwright. Para usar o Puppeteer no Node.js, chame `launchPuppeteer()`.

**[Instalação](#instalação)** · <a href="../../README.md">English</a>

<details>
<summary>Idiomas</summary>

[English](../../README.md) · [Русский](../ru/README.md) · [Deutsch](../de/README.md) · [Español](../es/README.md) ·
[Français](../fr/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Polski](../pl/README.md) ·
[Português](README.md) · [Română](../ro/README.md) · [Türkçe](../tr/README.md) · [Українська](../uk/README.md) ·
[Tiếng Việt](../vi/README.md) · [Bahasa Indonesia](../id/README.md) · [简体中文](../zh-Hans/README.md) · [繁體中文](../zh-Hant/README.md) ·
[日本語](../ja/README.md) · [한국어](../ko/README.md) · [ไทย](../th/README.md) · [हिंदी](../hi/README.md) ·
[Filipino](../fil/README.md) · [ខ្មែរ](../km/README.md)

</details>

## Controles de impressão digital no Chromium

O Ombra implementa no Chromium os controles de impressão digital do navegador. Eles abrangem canvas, WebGL, áudio, fontes, paralelismo de hardware, posição e dimensões dos elementos, identificadores da GPU, fusos horários e sinais de automação. O motor usa a pilha TLS e HTTP/2 do Chromium e processa a entrada humanizada no próprio processo do navegador.

O SDK inicia o motor localmente e conecta o cliente de automação pelo Chrome DevTools Protocol (CDP). Você pode executá-lo em um script, em um contêiner ou em uma tarefa de integração contínua sem instalar o aplicativo de desktop do Ombra.

## Status

Os exemplos usam os pacotes para Python e Node.js publicados em versão alfa. O repositório também contém o contrato de inicialização compartilhado e a estrutura inicial de oito SDKs.

| Componente | Status |
|---|---|
| [Contrato do SDK](../../docs/sdk-contract.md) | Rascunho `0.1.0` |
| SDK para Python | `0.1.3` alfa · [`ombrabrowser` no PyPI](https://pypi.org/project/ombrabrowser/) |
| SDK para Node.js | `0.1.0` alfa · [`@ombralabs/sdk` no npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| [Esquemas compartilhados](../../spec/schemas) | Opções de inicialização e metadados do binário do motor |
| [Conformidade entre linguagens](../../conformance) | Casos de teste usados pelos dois SDKs |
| [Verificação de stealth](../../docs/stealth-checkup.md) | Critérios de teste e modelo de relatório |

## Instalação

**Python**

```bash
python -m pip install ombrabrowser
```

**Node.js / TypeScript**

```bash
npm install @ombralabs/sdk "playwright-core@^1.60.0"
```

Para usar o Puppeteer, instale `puppeteer-core` no lugar de `playwright-core`. A [página do pacote no npm](https://www.npmjs.com/package/@ombralabs/sdk) lista as versões compatíveis do cliente e do Node.js.

O SDK procura o motor primeiro no caminho indicado em `binary_path` no Python ou `binaryPath` no Node.js. Em seguida, consulta, nessa ordem, `OMBRA_BINARY_PATH`, o diretório do motor do aplicativo de desktop e o cache do SDK. Se não encontrar o motor, o SDK faz o download e verifica o binário.

Para desativar os downloads, use `download=False` no Python ou `download: false` no Node.js. Para preparar o motor sem abrir o navegador, chame `ensure_binary()` no Python ou `ensureBinary()` no Node.js.

## Início rápido

**Python**

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Se você usar um perfil com nome, abra as páginas no contexto existente do perfil para reutilizar os cookies e os dados armazenados pelos sites. O exemplo também configura um proxy.

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

Use `launchPuppeteer()` para obter um objeto `Browser` do Puppeteer.

```ts
import { launchPuppeteer } from "@ombralabs/sdk";

const browser = await launchPuppeteer({ headless: false });
await browser.close();
```

## Migração sem reescrita

Para migrar um script Python que usa Playwright, instale `ombrabrowser` e altere a importação e a chamada que inicia o navegador. Os métodos de página, tipos e seletores continuam sendo os do Playwright.

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
```

No Node.js, a mesma alteração ocupa duas linhas.

```diff
- import { chromium } from "playwright";
- const browser = await chromium.launch();
+ import { launch } from "@ombralabs/sdk";
+ const browser = await launch();
```

## Como funciona

```mermaid
flowchart LR
    Script["Seu script<br/>Playwright · Puppeteer"]
    SDK["Ombra SDK<br/>launch() + ponte CDP"]
    Engine["Ombra Chromium<br/>motor com patches"]
    Client["Cliente de automação nativo"]
    Profile[("Perfil<br/>semente · cookies · extensões")]

    Script -->|launch()| SDK
    SDK -->|iniciar| Engine
    SDK -->|conectar via CDP| Client
    Script --> Client
    Client -->|CDP| Engine
    Engine --> Profile
```

1. `launch()` localiza ou baixa o motor e verifica o binário.
2. O SDK seleciona o diretório e a semente do perfil. Se o proxy exigir autenticação, inicia um retransmissor local.
3. Inicia o Chromium com o perfil escolhido, as opções de inicialização e uma porta de depuração na interface de loopback.
4. Assim que `DevToolsActivePort` está pronto, o SDK conecta o Playwright ou o Puppeteer pelo CDP e retorna o `Browser` do cliente.
5. `browser.close()` encerra o motor e libera o bloqueio do perfil.

Depois da inicialização, o cliente envia os comandos de página diretamente ao Chromium.

## Matriz de SDK

| Ambiente de execução | Pacote publicado | Objeto de navegador |
|---|---|---|
| Python 3.10+ | `ombrabrowser` | `launch()` → `Browser` do Playwright |
| Node.js 20+ | `@ombralabs/sdk` | `launch()` → `Browser` do Playwright<br>`launchPuppeteer()` → `Browser` do Puppeteer |

Outros seis SDKs já têm diretórios neste repositório. O [manifesto dos SDKs](../../sdks/manifest.json) lista os pacotes e clientes previstos. O [guia dos SDKs](../../sdks/README.md) descreve a organização dos diretórios.

| Ambiente previsto | Pacote previsto | Cliente ou tipo de retorno |
|---|---|---|
| .NET 8+ | `Ombra` (NuGet) | Microsoft.Playwright `IBrowser` |
| Java 17+ | `dev.ombra:ombra` (Maven Central) | Playwright `Browser` |
| Go 1.22+ | `github.com/ombralabs/ombra/sdks/go` | chromedp |
| PHP 8.2+ | `ombralabs/ombra` (Packagist) | `Ombra\Browser` (CDP) |
| Ruby 3.2+ | `ombra` (RubyGems) | `Ferrum::Browser` |
| Rust 1.78+ | `ombra` (crates.io) | `chromiumoxide::Browser` |

## Opções de inicialização

Os nomes das opções seguem a API de Python e o contrato do SDK. Os equivalentes no Node.js usam camelCase, como `timeoutMs`, `userDataDir` e `binaryPath`.

| Opção | Padrão | Função |
|---|---|---|
| `headless` | `true` | Executa o motor sem abrir uma janela |
| `proxy` | nenhum | URL ou objeto de configuração do proxy. Proxies com autenticação usam um retransmissor local |
| `fingerprint` | nenhum | Semente e ajustes de sistema operacional, fuso horário, localidade, tela e GPU |
| `profile` | nenhum | Perfil com nome que preserva cookies, dados dos sites e semente |
| `user_data_dir` | temporário | Diretório de perfil explícito, incompatível com `profile` |
| `args` | `[]` | Argumentos adicionais enviados ao motor sem alteração |
| `timeout_ms` | `30000` | Tempo máximo em milissegundos para iniciar o motor e estabelecer a conexão CDP |
| `humanize` | padrão do motor | `false`, `true` ou uma configuração predefinida |
| `captcha` | `false` | Ativa o módulo do motor com limites opcionais |
| `binary_path` | busca automática | Seleciona um binário específico do motor |
| `download` | `true` | Baixa o binário do motor se ele estiver ausente |

O [contrato do SDK](../../docs/sdk-contract.md) lista todas as opções de inicialização e descreve os tipos de erro e o comportamento dos perfis.

## Gerenciamento do binário

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
# {'version': '151.0.7922.108', 'platform': 'macos-arm64',
#  'path': '…', 'installed': True, 'source': 'cache', 'sha256': '…'}

ensure_binary()   # download and verify without launching
clear_cache()     # remove SDK-managed binaries; profiles are untouched
```

Antes da inicialização, o SDK confere o hash SHA-256 do binário do motor. Mantenha essa verificação ativa em produção. `OMBRA_SKIP_CHECKSUM=1` destina-se a compilações locais de desenvolvimento.

## Configuração

| Variável | Padrão | Função |
|---|---|---|
| `OMBRA_BINARY_PATH` | não definida | Caminho explícito do binário do motor |
| `OMBRA_CACHE_DIR` | `~/.ombra` | Diretório dos binários gerenciados e dos perfis com nome |
| `OMBRA_DOWNLOAD_URL` | servidor de versões | URL base para download dos binários |
| `OMBRA_VERSION` | última compatível | Versão do motor a buscar |
| `OMBRA_AUTO_UPDATE` | `true` | Procura uma versão mais recente do motor ao iniciar |
| `OMBRA_SKIP_CHECKSUM` | `false` | Somente para desenvolvimento |
| `OMBRA_LICENSE_KEY` | não definida | Chave enviada ao motor |
| `OMBRA_TIMEOUT_MS` | `30000` | Tempo máximo de inicialização em milissegundos |
| `OMBRA_LOG_LEVEL` | `warn` | `error`, `warn`, `info`, `debug` |

O SDK usa o primeiro valor disponível nas opções de inicialização, nas variáveis de ambiente, nos metadados do perfil ou nos valores padrão, nessa ordem.

## Comparação

| Recurso | Playwright | playwright-stealth | undetected-chromedriver | Ombra |
|---|---|---|---|---|
| API | Playwright | Playwright | Selenium | Playwright ou Puppeteer |
| Nível das alterações | nenhum | JavaScript na página | opções de configuração | código-fonte do motor |
| Semente da impressão digital | não | não | parcial | por perfil |
| Entrada humanizada | não | não | não | motor |
| Isolamento de perfis | contexto do navegador | contexto do navegador | não | diretório de dados do usuário |
| Migração sem reescrita | — | troca da importação | reescrita | troca da importação |

Os resultados dos detectores dependem do site, do IP de saída e do perfil. O [guia de verificação](../../docs/stealth-checkup.md) explica como medi-los.

## O stealth é uma propriedade do motor

O motor aplica as configurações de impressão digital. Os SDKs enviam a ele a semente do perfil e as opções que você especifica na inicialização.

| Camada | Como o Ombra atua |
|---|---|
| TLS e HTTP/2 | Pilha de rede da versão do Chromium usada na compilação do motor |
| Identidade do navegador | Alterações no código-fonte do motor controladas pela semente do perfil |
| Sinais de automação | O motor trata os sinais do WebDriver. O SDK não chama `Runtime.enable` |
| Entrada | Movimentos do ponteiro, digitação e rolagem humanizados no processo do navegador |
| Coerência de rede | Resolução do fuso horário e da localidade com base no proxy |
| Estado | Um diretório de dados do usuário para cada perfil |

### Limites do SDK

- A porta de depuração do CDP aceita apenas conexões locais pela interface de loopback.
- O SDK mantém as credenciais do proxy, as chaves de licença e os cookies fora dos logs. Não envia telemetria.
- Um perfil existente mantém sua semente, a menos que você indique outra explicitamente.
- O SDK nunca injeta scripts de stealth com `addScriptToEvaluateOnNewDocument` ou `evaluateOnNewDocument` nem altera propriedades das páginas.
- Para verificar se o motor está pronto, o SDK usa o endpoint HTTP do CDP ou `Browser.getVersion`. Nunca chama `Runtime.enable` nessa verificação.
- O motor fornece a identidade do navegador. O SDK não substitui o agente de usuário nem a identidade pelo Playwright ou pelo Puppeteer e não chama `Emulation.setUserAgentOverride`, `setTimezoneOverride`, `setLocaleOverride` ou `setDeviceMetricsOverride`.
- O SDK nunca adiciona por conta própria `--enable-automation`, `--disable-blink-features=AutomationControlled` ou `--no-sandbox`.

## Verificação de stealth

Execute as verificações com a compilação do motor, o cliente de automação e o perfil que você pretende usar.

| Camada | Exemplos de testes | Critérios de aprovação |
|---|---|---|
| L0 Transporte | TrackMe, testes de vazamento de IP/WebRTC | Apenas o IP de saída fica visível. JA4 e HTTP/2 correspondem à compilação do Chromium usada pelo motor |
| L1 Identidade | Teste local, Sannysoft, Intoli | Sem contradições entre UA, UA-CH, plataforma, GPU, fontes e tela |
| L2 Impressão digital | CreepJS, FingerprintJS, BrowserScan | Sem sinais de modo headless ou de dados falsos. A impressão digital se mantém ao recarregar a página |
| L3 Automação | rebrowser, brotector, botd | Nenhum indício de CDP, scripts de inicialização ou WebDriver |
| L4 Comportamento | Fidelidade da entrada, rastros de `humanize`, teste básico com Cloudflare | Eventos confiáveis em ordem realista e desafio concluído |
| L5 Estabilidade | Semente, workers, iframes, origens diferentes | A mesma semente produz a mesma identidade a cada inicialização |

O procedimento descreve os resultados possíveis, o diagnóstico de problemas e o registro dos testes. Está disponível em [inglês](../../docs/stealth-checkup.md) e em [russo](../../docs/stealth-checkup.ru.md).

Para reproduzir e comparar os resultados, registre em cada teste a compilação do motor, a versão do cliente, as configurações do perfil, o IP de saída do proxy e a versão do detector.

## Mapa do repositório

```text
.
├── README.md                  # original em inglês
├── translations/
│   └── <locale>/README.md
├── desktop/                   # gerenciador de perfis offline
├── docs/
│   ├── desktop/               # documentação do gerenciador de perfis
│   ├── architecture.md        # componentes, fluxo de inicialização, limites
│   ├── sdk-contract.md        # contrato de inicialização v0 e comportamento do SDK
│   ├── stealth-checkup.md     # método e procedimento de verificação de stealth
│   ├── stealth-checkup.ru.md  # tradução em russo
│   └── versioning.md          # compatibilidade entre SDK, motor e cliente
├── spec/
│   └── schemas/               # JSON Schema para opções de inicialização e informações do binário
├── sdks/
│   ├── manifest.json          # registro de SDK legível por máquina
│   ├── README.md              # estrutura e regras de contribuição
│   ├── _template/             # modelo para adicionar uma linguagem
│   ├── python/  node/  dotnet/  java/
│   └── go/  php/  ruby/  rust/
├── conformance/               # testes de inicialização e stealth comuns às linguagens
├── tools/check_repo.py        # validação de estrutura e links (CI)
└── .github/workflows/ci.yml
```

Este repositório contém a estrutura inicial dos SDKs, o contrato de inicialização, os casos de conformidade e o gerenciador de perfis offline. O motor Chromium e a versão completa do Desktop 1.2.1 têm repositórios próprios. [Código-fonte e instruções de compilação do Desktop](../../desktop/README.md) · [Documentação do gerenciador de perfis](../../docs/desktop/README.md)

## O contrato

- `launch(options)` inicia o motor e retorna o `Browser` do cliente. A partir daí, o cliente se comunica diretamente com o Chromium pelo CDP.
- Antes de iniciar, o SDK verifica a plataforma e o hash SHA-256 do motor. Se o binário estiver ausente e os downloads habilitados, o SDK o baixa.
- Os perfis com nome preservam os cookies, os dados armazenados pelos sites e a semente entre as inicializações.
- Se a inicialização falhar, o SDK encerra o processo que iniciou e lança um erro tipado. O código que fez a chamada decide se deve tentar de novo.
- O SDK, o motor e o cliente de automação têm intervalos de versões independentes. Para consultar a compilação do motor, use `binary_info()` no Python ou `binaryInfo()` no Node.js.

## Compatibilidade

| Componente | Versões ou plataformas compatíveis |
|---|---|
| Motor | Compilação selecionada pelo SDK, informada por `binary_info()` ou `binaryInfo()` |
| macOS | Apple Silicon e Intel |
| Windows | x64 |
| Linux | x64 |
| Python | 3.10+ com uma versão compatível do Playwright |
| Node.js | 20+ com uma versão compatível do Playwright ou Puppeteer |

O SDK e o motor têm versões independentes. Se forem incompatíveis, o SDK informa ambas as versões em um erro tipado.

## Como contribuir

O [guia de contribuição](../../CONTRIBUTING.md) explica o processo de revisão. As instruções de compilação estão no [guia dos SDKs](../../sdks/README.md).

- Se mudar o comportamento de um SDK, atualize a implementação afetada e adicione um teste ou um caso de conformidade compartilhado.
- Para criar um SDK em outra linguagem, copie o [modelo de SDK](../../sdks/_template), registre o novo SDK no [manifesto](../../sdks/manifest.json) e abra um pull request em rascunho.
- Para adicionar uma opção de inicialização, atualize primeiro o [contrato do SDK](../../docs/sdk-contract.md) e os [esquemas](../../spec/schemas).
- Alterações no stealth do motor devem ser feitas no repositório do motor. O SDK deve continuar passando na verificação.
- Comunique problemas de segurança em particular, seguindo a [política de segurança](../../SECURITY.md).

## Perguntas frequentes

### O Ombra é um fork do Playwright?

Não. O SDK conecta o cliente oficial do Playwright ao Ombra Chromium. Você pode continuar usando os tipos, as funções auxiliares e os objetos de página do Playwright.

### Preciso do aplicativo de desktop do Ombra?

O SDK inicia o motor diretamente. O aplicativo de desktop é opcional e permite gerenciar os perfis manualmente.

### Qual é a diferença entre o Ombra e o playwright-stealth?

As alterações na impressão digital do Ombra são compiladas no Chromium. O SDK preserva os scripts das páginas.

### O Ombra resolve CAPTCHAs?

O motor possui um módulo opcional de CAPTCHA. O suporte depende do tipo de tarefa, da compilação do motor e dos modelos disponíveis. O SDK repassa as configurações de cada inicialização e dá acesso aos controles CDP do módulo.

### Posso usar meu próprio proxy?

Sim. Passe o proxy para `launch()`. Se ele exigir autenticação, um retransmissor local impede que as credenciais apareçam na linha de comando do motor.

### Quais versões do Playwright e do Puppeteer são compatíveis?

Cada SDK declara as versões de cliente compatíveis no manifesto do próprio pacote. Os clientes são dependências separadas. Consulte os intervalos de versões no [guia de versionamento](../../docs/versioning.md).

### O Ombra passa em todos os testes de detecção de bots?

Os resultados dependem do site, da região, da reputação do IP de saída, da versão do detector e das configurações do perfil. O [guia de verificação de stealth](../../docs/stealth-checkup.md) explica como avaliar uma configuração específica.

## Licença

O código-fonte dos SDKs deste repositório é distribuído sob a [Licença Apache 2.0](../../LICENSE). A licença não concede direitos sobre o motor Ombra, o nome Ombra ou o logotipo. Consulte [NOTICE](../../NOTICE) para informações sobre marcas e créditos a terceiros.

---

[Ombra Labs](https://github.com/ombralabs) · [ombrabrowser.dev](https://ombrabrowser.dev)
