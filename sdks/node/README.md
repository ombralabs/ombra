# Ombra SDK for Node.js

> **Alpha (`0.1.0`).** Implements [contract v0.1](../../docs/sdk-contract.md) for Playwright and Puppeteer over CDP, with dual ESM + CommonJS builds, and native `Ombra` CDP domain support.

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Package

| Item | Value |
|---|---|
| Package | `@ombralabs/sdk` |
| Version | `0.1.0` |
| Distribution | [npm](https://www.npmjs.com/package/@ombralabs/sdk) |
| Runtime | Node.js >=20.0.0; native file-lock addon and ESM resolver |
| Language | TypeScript, dual ESM (`dist/esm`) and CommonJS (`dist/cjs`) + `.d.ts` |
| Returns | Native Playwright `Browser` / `BrowserContext`; native Puppeteer `Browser` from `launchPuppeteer()` or `@ombralabs/sdk/puppeteer` |
| Status | Alpha |

## Installation

Install the SDK and an automation client in your Node.js project.

```bash
# Playwright 1.60.0 or newer in the 1.x series; no stock browser download needed.
npm install @ombralabs/sdk "playwright-core@^1.60.0"

# Or current Puppeteer (this client version needs Node.js >=22.12.0).
npm install @ombralabs/sdk puppeteer-core@25.18.0

# Optional offline GeoIP database reader for fingerprint.timezone="auto"
npm install mmdb-lib
```

Choose one client; the SDK also accepts the full `playwright` / `puppeteer` packages. Their own Node requirements apply. The compatibility floor is Playwright >=1.60.0 <2 (required for `connectOverCDP({ noDefaults: true })`) or Puppeteer >=22.0.0. Puppeteer 22 remains a deprecated compatibility test case for Node 20, not a recommendation for new projects. Neither client is needed for binary management, CDP helpers, or importing the SDK; a selected missing client raises `ClientNotInstalledError`. TypeScript infers native return types from the installed client; absent clients have `unknown` defaults. ESM and CommonJS declarations are supplied, with TypeScript 5.7+ verified using `skipLibCheck: false`.

Automatic Linux engine installation requires XZ Utils' `xz` on PATH (Debian/Ubuntu: `sudo apt-get install xz-utils`; other distributions: `xz`). External/preinstalled binaries, macOS gzip archives, and Windows ZIP archives do not require XZ. Engine platforms are `darwin-arm64`, `darwin-x64`, `linux-x64`, and `windows-x64`; Linux also needs the engine's system libraries and a display for headed use.

Runtime dependencies are `fs-ext-extra-prebuilt@2.2.17` (OS file locks for profiles and installers) and `import-meta-resolve@4.2.0` (optional client resolution). Allow the native dependency's install script (on npm versions with script approval, add `"allowScripts": { "fs-ext-extra-prebuilt": true }` to your application's package.json). When no compatible prebuilt addon is available, its node-gyp fallback requires Python and a C++ build toolchain (Xcode Command Line Tools on macOS, compiler/make on Linux, Visual Studio C++ build tools on Windows). Unsupported native-addon targets can fail installation; do not bypass lock loading. Use a local filesystem that supports OS file locks for cache/profile directories.

Resolve or pre-download the signed and checksum-verified Ombra engine using your application's installed CLI:

```bash
npx --no-install ombra-sdk install
npx --no-install ombra-sdk info
# Pin a release available for your platform:
npx --no-install ombra-sdk install --version 151.0.7922.108-9
npx --no-install ombra-sdk install --version=151.0.7922.108-9
```

Release availability differs by platform; for example the reviewed stable channel serves -9 on Apple Silicon/Linux/Windows and -7 on Intel macOS. Choose a published version for your platform. The SDK supports Chromium >=151.0.7922.108 and <152. An unpinned legacy cache needs one online, verified channel lookup before offline reuse. A previously installed, receipt-valid exact version remains usable offline with `version` and `download: false`. Valid installed versions are reused rather than overwritten. Managed/app-cached binaries require their checksum receipt; explicit development binaries via `binaryPath` or `OMBRA_BINARY_PATH` are supported separately. `OMBRA_SKIP_CHECKSUM=1` is a warning-producing development bypass.

## Quick start (Playwright)

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch({ version: "151.0.7922.108-9" });
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

For an existing Playwright launcher, replace its launcher import with `import * as chromium from "@ombralabs/sdk"` and keep `await chromium.launch(...)`. For Puppeteer, use `import * as puppeteer from "@ombralabs/sdk/puppeteer"` and keep `await puppeteer.launch(...)`. Pass SDK options below; client-only launch flags such as `executablePath` should become `binaryPath`. No stock Chromium launch or JavaScript fingerprint patches are needed.

The `version` option also applies to `launchContext`, `launchPersistentContext`, `launchPuppeteer`, `ensureBinary`, and `binaryInfo`. An explicit binary/environment path conflicting with the requested version fails.

With a persistent profile, authenticated proxy, humanized input, and seed-coherent persona:

```ts
import { launch, launchContext, launchPersistentContext } from "@ombralabs/sdk";

const browser = await launch({
  profile: "pricing-eu",
  headless: false,
  proxy: "socks5://user:pass@proxy.example.com:1080",
  fingerprint: {
    seed: 20261116,
    os: "macos",
    screen: { width: 1440, height: 900 },
  },
  humanize: { preset: "careful" },
  captcha: true,
});
```

`launchContext()` and `launchPersistentContext()` return a native Playwright `BrowserContext` (with `viewport: null` by default to avoid an SDK-requested viewport override; native-client context defaults can still send CDP configuration).

## Quick start (Puppeteer)

Use `launchPuppeteer()` from `@ombralabs/sdk` or `launch()` from `@ombralabs/sdk/puppeteer`:

```ts
import { launch } from "@ombralabs/sdk/puppeteer";

const browser = await launch({ headless: false, version: "151.0.7922.108-9" });
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
```

## Custom `Ombra` CDP domain & CAPTCHA events

Ombra Chromium exposes a browser-level `Ombra` CDP domain (`Ombra.pdl`) that streams 9 real-time CAPTCHA lifecycle events (`captchaDetected`, `captchaStateChanged`, `captchaInvisible`, `captchaBlocked`, `captchaHardMode`, `captchaGone`, `captchaSolving`, `captchaSolved`, `captchaFailed`) without calling any `enable` command:

```ts
import { launch, ombraCdp } from "@ombralabs/sdk";

const browser = await launch({
  captcha: {
    solve: false, // detect & emit events without automatic solving
    allowLLM: false,
    manualMode: true,
    manualResumeMs: 2000,
  },
});

const cdp = await ombraCdp(browser); // works with Playwright Browser, BrowserContext, and Puppeteer Browser
const recorder = cdp.recordCaptchaEvents();

const page = await browser.newPage();
await page.goto("https://example.com");

// Wait for a specific CAPTCHA event or inspect live state
const state = await cdp.getCaptchaState();
console.log(state.signaturesVersion, state.captchas);

// Trigger manual solve or update policy/humanize live
await cdp.setCaptchaPolicy({ solve: true, maxAttempts: 3 });
await cdp.solveCaptcha();
await cdp.setHumanize({ enabled: true, preset: "careful" });

recorder.stop();
await cdp.detach();
await browser.close();
```

Subpath entrypoints `@ombralabs/sdk/cdp` and `@ombralabs/sdk/captcha` export the same helpers (`ombraCdp`, `OmbraCDP`, `CaptchaEventRecorder`, `CAPTCHA_EVENTS`).

## Binary management & health checks

```ts
import {
  binaryInfo,
  ensureBinary,
  clearCache,
  lastLaunchInfo,
  checkEngineHealth,
} from "@ombralabs/sdk";

console.log(await binaryInfo({ version: "151.0.7922.108-9" }));
await ensureBinary({ version: "151.0.7922.108-9" });
await clearCache(); // removes SDK-managed binaries; preserves ~/.ombra/profiles & license.key
```

CLI (`ombra-sdk`):

```bash
npx --no-install ombra-sdk install [--version <v>] [--channel <stable|beta>]
npx --no-install ombra-sdk info [--quick] [--json] [--proxy <url>]
npx --no-install ombra-sdk doctor
npx --no-install ombra-sdk update [--channel <stable|beta>]
npx --no-install ombra-sdk clear-cache
npx --no-install ombra-sdk login [<license-key>]
npx --no-install ombra-sdk logout
```

## Layout

```text
sdks/node/
├── package.json
├── tsconfig.json
├── tsconfig.cjs.json
├── tsconfig.test.json
├── scripts/
│   ├── build.mjs        # dual ESM (dist/esm) + CJS (dist/cjs) builder
│   └── test.mjs         # Node 20+ TypeScript test runner
├── src/
│   ├── index.ts         # primary Playwright + shared exports
│   ├── puppeteer.ts     # @ombralabs/sdk/puppeteer subpath
│   ├── cdp.ts           # browser-level Ombra CDP domain client
│   ├── captcha.ts       # @ombralabs/sdk/captcha subpath
│   ├── launch.ts        # engine lifecycle, readiness probe, CDP attach
│   ├── options.ts       # schema validation & CLI switch builder
│   ├── binary.ts        # Ed25519 + SHA-256 verification & downloader
│   ├── archive.ts       # validated .tar.gz / .tar.xz / .zip extraction
│   ├── profile.ts       # named profiles, seed persistence, OS file lock
│   ├── proxy.ts         # loopback SOCKS5 -> HTTP/HTTPS/SOCKS5 auth relay
│   ├── geoip.ts         # optional mmdb-lib proxy-aware GeoIP hints
│   ├── config.ts        # env vars, platform tags, license storage
│   ├── errors.ts        # OmbraError hierarchy & secret redaction
│   ├── cli.ts           # ombra-sdk CLI
│   └── version.ts       # SDK & contract version ranges
└── tests/
    ├── helpers.ts
    ├── options.test.ts
    ├── profile.test.ts
    ├── binary.test.ts
    ├── proxy.test.ts
    ├── stealth.test.ts
    ├── cdp-captcha.test.ts
    └── launch.test.ts
```

## Build and test

```bash
cd sdks/node
npm install
npm run typecheck
npm run build
npm test
npm run test:tooling
npm run test:package -- /absolute/path/to/verified-packages
# Node >=22.12 for the complete current/legacy native-client type matrix:
npm run test:native-types
# On Node 20, select compatible clients instead:
npm run test:native-types -- none playwright-core@1.60.0 playwright@1.60.0 puppeteer-core@22.0.0 puppeteer@22.0.0
```

To try a local build, install the tarball retained by `test:package` in your application.

```bash
npm install /absolute/path/to/verified-packages/ombralabs-sdk-0.1.0.tgz "playwright-core@^1.60.0"
```

Build/test scripts use the SDK-local TypeScript CLI and types, with no sibling-project or global compiler fallback. Run package/native-consumer checks through `npm run` so Windows uses npm's JavaScript CLI. These checks need registry access or a populated npm cache; they never download stock browsers. `test:package` installs a tarball with runtime install scripts, checks every export in ESM/CJS, the installed executable CLI, and actual native profile lock contention/release. `test:native-types` uses separate consumers with neither client, only Playwright, or only Puppeteer, including full packages with nested core dependencies.

CI targets exact Node 20.0.0 and Node 26 on Linux, macOS, and Windows. Linux/macOS run the full unit and simulated conformance suite. Windows runs build/type checks, CDP/optional-loader tests, clean-package CLI/native-lock checks and native-client declaration checks; the fake-engine launch fixtures are POSIX scripts, so Windows browser lifecycle and process-tree cleanup are not covered. Cleanup for an already-dead Windows process leader remains best-effort.

Conformance tests observe SDK-owned options, command construction and CDP calls with simulated clients/engines. They do not establish fingerprint undetectability or a complete absence of native-client traffic: Playwright/Puppeteer can send their own Runtime/Log/utility-world and new-context defaults. Playwright attaches with `noDefaults: true`. The SDK requests `viewport: null` for contexts to avoid its own viewport override. Real CDN/engine integration is a separate check, not an automatic unit-test claim.
