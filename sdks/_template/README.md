# SDK template

Use this directory when adding a language to the monorepo. Copy it, rename it, then delete the parts that do not apply.

## Checklist

- [ ] Create `sdks/<language>/README.md` from this file.
- [ ] Create the source root and test root using the language's conventions.
- [ ] Add the language to [`sdks/manifest.json`](../manifest.json) with `id`, `language`, `directory`, `package`, `registry`, `runtime`, `source_root`, `tests_root`, `cdp_clients`, and `status`.
- [ ] Add a row to the matrix in [`sdks/README.md`](../README.md).
- [ ] Add a row to the root [`README.md`](../../README.md#sdk-matrix).
- [ ] Implement `launch(options)` per the [contract](../../docs/sdk-contract.md).
- [ ] Implement binary resolution, SHA-256 verification, and `binary_info()`.
- [ ] Implement named profiles, the seed, and the profile lock.
- [ ] Implement the authenticated-proxy relay.
- [ ] Implement the native client connection and return its real browser object.
- [ ] Implement the error hierarchy with stable kinds.
- [ ] Add a conformance case and make it runnable.
- [ ] Run `python3 tools/check_repo.py`.

## README sections

A new SDK README should answer:

1. **Status** — one line: scaffold, contract, alpha, beta, or stable.
2. **Target package** — name, registry, runtime, return type.
3. **Target API** — a short, realistic snippet using `launch()`.
4. **Layout** — the actual tree, including the package manifest.
5. **Build and test** — commands that will exist when the implementation lands.
6. **Notes** — ecosystem-specific decisions and traps.

## Manifest entry

```json
{
  "id": "<language>",
  "language": "<Display name>",
  "directory": "sdks/<language>",
  "package": "<package name>",
  "registry": "<registry>",
  "runtime": "<runtime and minimum version>",
  "source_root": "sdks/<language>/<source root>",
  "tests_root": "sdks/<language>/<test root>",
  "cdp_clients": ["<client>"],
  "status": "scaffold"
}
```

The checker validates that both roots exist and that the directory has a README.

## Review checklist

- [ ] `launch()` returns a real browser object from the native automation client.
- [ ] The SDK does not wrap or intercept page methods.
- [ ] The SDK does not add launch flags, CDP domains, or scripts.
- [ ] The SDK does not reimplement fingerprint logic.
- [ ] The SDK does not depend on the engine source or the Ombra app.
- [ ] The public API follows the language's naming conventions.
- [ ] Errors preserve the engine's stderr tail.
- [ ] No telemetry, no hidden retries, no silent profile creation.
- [ ] The README does not promise a CAPTCHA success rate or undetectability.
