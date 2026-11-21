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
npx --no-install ombra-sdk install --version 158.0.8127.37-2
npx --no-install ombra-sdk install --version=158.0.8127.37-2
```

Browser versions come from [GitHub Releases](https://github.com/ombralabs/ombra/releases). The SDK uses `https://api.github.com/repos/ombralabs/ombra/releases/latest` for unpinned stable builds. If GitHub's latest selection is missing or is not a published stable browser build, it selects the first stable browser release from the paginated releases list. Drafts, development builds, and non-browser tags are excluded. `releaseChannel: "beta"` selects prereleases from the list. A revision pin such as `158.0.8127.37-2` queries `/releases/tags/vVERSION`; a Chromium-family pin such as `158.0.8127.37` selects a matching release on the requested channel. Every selected release must publish signed `release.json` and `ombra-engine-VERSION-PLATFORM.EXT` assets under `https://github.com/ombralabs/ombra/releases/download/vVERSION/`. The manifest's Ed25519 signature, version, platform filename, SHA-256, and size are verified. Automatic installation requires published GitHub assets for your platform; example pins above do not guarantee availability.

The SDK supports Chromium >=151.0.7922.108 and <159, with `158.0.8127.37` as the default Chromium family. Existing 151 release pins remain supported. GitHub stable and beta selections are recorded separately for offline reuse; old CDN channel caches need one online GitHub lookup before unpinned reuse. A previously installed, receipt-valid exact version remains usable offline with `version` and `download: false`. Set `OMBRA_DOWNLOAD_URL=off` to disable downloads; an explicit mirror URL retains the legacy `/engine/channels/CHANNEL.json` and `/engine/releases/VERSION/` layout. There is no automatic CDN fallback. Valid installed versions are reused rather than overwritten. Managed/app-cached binaries require their checksum receipt; explicit development binaries via `binaryPath` or `OMBRA_BINARY_PATH` are supported separately. `OMBRA_SKIP_CHECKSUM=1` is a warning-producing development bypass.

## Quick start (Playwright)

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch({ version: "158.0.8127.37-2" });
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
});
```

`launchContext()` and `launchPersistentContext()` return a native Playwright `BrowserContext` (with `viewport: null` by default to avoid an SDK-requested viewport override; native-client context defaults can still send CDP configuration).

### Mobile page layout on desktop

Serve a local `index.html` containing `<meta name="viewport" content="width=device-width, initial-scale=1">`
at `http://127.0.0.1:8000/`. You can run `python3 -m http.server 8000 --bind 127.0.0.1` in its directory.

```ts
import { launch } from "@ombralabs/sdk";

const browser = await launch({ mobileViewport: { width: 390, height: 844 } });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:8000/");
  console.log(await page.evaluate(() => document.documentElement.clientWidth)); // 390
} finally {
  await browser.close();
}
```

`mobileViewport` selects Chromium's mobile layout on the host operating system for this launch.
Supply both dimensions as whole CSS pixels from 1 through 10,000. Pages without a viewport
declaration follow Chromium's mobile layout rules.

The same option works with `launchContext` and `launchPersistentContext`. An explicit Playwright
context `viewport` takes precedence, including one passed in `contextOptions`. The persistent helper
uses the native viewport. Any OS selected in `fingerprint.os` or inherited from the profile must
match the host. This option requires an engine build with `--mobile-layout-viewport` support.

## Quick start (Puppeteer)

Use `launchPuppeteer()` from `@ombralabs/sdk` or `launch()` from `@ombralabs/sdk/puppeteer`:

```ts
import { launch } from "@ombralabs/sdk/puppeteer";

const browser = await launch({ headless: false, version: "158.0.8127.37-2" });
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
```

## Browser-level CDP controls

Use `ombraCdp()` with a Playwright Browser, BrowserContext, or Puppeteer Browser to control humanized input and run native agent tasks:

```ts
import { launch, ombraCdp } from "@ombralabs/sdk";

const browser = await launch();
const cdp = await ombraCdp(browser);
await cdp.setHumanize({ enabled: true, preset: "careful" });
console.log(await cdp.getHumanizeState());

await cdp.detach();
await browser.close();
```

The `@ombralabs/sdk/cdp` entrypoint exports `ombraCdp` and `OmbraCDP`.

## Binary management & health checks

```ts
import {
  binaryInfo,
  ensureBinary,
  clearCache,
  lastLaunchInfo,
  checkEngineHealth,
} from "@ombralabs/sdk";

console.log(await binaryInfo({ version: "158.0.8127.37-2" }));
await ensureBinary({ version: "158.0.8127.37-2" });
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
    ├── cdp.test.ts
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

Conformance tests observe SDK-owned options, command construction and CDP calls with simulated clients/engines. They do not establish fingerprint undetectability or a complete absence of native-client traffic: Playwright/Puppeteer can send their own Runtime/Log/utility-world and new-context defaults. Playwright attaches with `noDefaults: true`. The SDK requests `viewport: null` for contexts to avoid its own viewport override. Real GitHub/engine integration is a separate check, not an automatic unit-test claim.

### Native engine paths

Engine `158.0.8127.37-3` and newer use `Ombra.app/Contents/MacOS/Ombra` on macOS, `ombra` on Linux and `ombra.exe` on Windows. The SDK also resolves historical `Chromium.app/Contents/MacOS/Chromium`, macOS DMG installs with `Ombra.app/Contents/MacOS/Chromium`, and `chrome` / `chrome.exe` layouts. Existing version caches and checksum receipts stay in place; an installation containing conflicting executables or build metadata is rejected. Archive names and signature verification are unchanged.
