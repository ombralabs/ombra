# Ombra SDK for Node.js

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `@ombra/sdk` |
| Registry | npm |
| Runtime | Node.js 20+ |
| Language | TypeScript, ESM and CJS builds |
| CDP clients | Playwright, Puppeteer |
| Status | Scaffold |

## Target API

```ts
import { Ombra } from "@ombra/sdk";

const client = new Ombra({ endpoint: "http://127.0.0.1:45678" });

const profile = await client.profiles.create({
  name: "checkout-eu",
  fingerprint: { seed: 20261116, os: "macos" },
  proxy: "socks5://user:pass@proxy:1080",
});

const session = await client.launch(profile.id, { headless: false });
const browser = await session.connectPlaywright();
const page = await browser.newPage();
await page.goto("https://example.com");
await browser.close();
await session.close();
```

Puppeteer uses the same session:

```ts
const browser = await session.connectPuppeteer();
```

## Layout

```text
sdks/node/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── client.ts        # Ombra
│   ├── profiles.ts      # Profile, ProfileSpec, ProfilesClient
│   ├── session.ts       # Session, Playwright/Puppeteer helpers
│   ├── transport.ts     # fetch, envelope, auth, timeouts
│   └── errors.ts        # OmbraError hierarchy
└── tests/
    ├── transport.test.ts
    ├── profiles.test.ts
    └── session.test.ts
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

- Use the built-in `fetch`; do not add an HTTP dependency.
- Ship ESM with a CJS compatibility build, and declare `engines.node >= 20`.
- The Playwright and Puppeteer helpers are optional peer dependencies. Import them lazily.
- `debug_port` is a number on the session object, a string on the wire.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
