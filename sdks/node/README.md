# Ombra SDK for Node.js

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `@ombra/sdk` |
| Registry | npm |
| Runtime | Node.js 20+ |
| Language | TypeScript, ESM and CJS builds |
| Returns | `playwright.Browser`; `puppeteer.Browser` from `launchPuppeteer()` |
| Status | Scaffold |

## Target API

```ts
import { launch } from "@ombra/sdk";

const browser = await launch();
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();
```

With options:

```ts
const browser = await launch({
  profile: "pricing-eu",
  headless: false,
  proxy: "socks5://user:pass@proxy:1080",
  fingerprint: { seed: 20261116, os: "macos" },
});
```

Puppeteer is a separate entry point because the return type differs:

```ts
import { launchPuppeteer } from "@ombra/sdk";

const browser = await launchPuppeteer({ headless: false });
const page = await browser.newPage();
```

Binary management:

```ts
import { binaryInfo, ensureBinary, clearCache } from "@ombra/sdk";

console.log(await binaryInfo());
await ensureBinary();
await clearCache();
```

## Layout

```text
sdks/node/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── launch.ts        # launch, launchPuppeteer
│   ├── binary.ts        # resolve, verify, download, binaryInfo
│   ├── profile.ts       # named profiles, seed persistence, lock
│   ├── proxy.ts         # loopback relay
│   └── errors.ts        # OmbraError hierarchy
└── tests/
    ├── options.test.ts
    ├── binary.test.ts
    └── launch.test.ts
```

## Build and test (planned)

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Notes

- Playwright and Puppeteer are optional peer dependencies. Import them lazily so either can be absent.
- Ship ESM with a CJS compatibility build, and declare `engines.node >= 20`.
- Use the built-in `fetch` for binary downloads; do not add an HTTP dependency.
- Do not wrap the returned browser. Type checks and existing page objects must keep working.
