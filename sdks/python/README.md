# Ombra SDK for Python (`ombrabrowser`)

> **Alpha (`0.1.3`).** Implements [SDK contract v0.1](https://github.com/ombralabs/ombra/blob/main/docs/sdk-contract.md) and attaches Playwright over CDP (`connect_over_cdp(..., no_defaults=True, is_local=True)`) to Ombra stealth Chromium.

[All SDKs](https://github.com/ombralabs/ombra/blob/main/sdks/README.md) · [Contract](https://github.com/ombralabs/ombra/blob/main/docs/sdk-contract.md) · [Stealth invariants](https://github.com/ombralabs/ombra/blob/main/docs/sdk-contract.md#12-stealth-invariants)

## Package overview

| Item | Value |
|---|---|
| Package | `ombrabrowser` (`0.1.3`) |
| Registry | PyPI |
| Python | 3.10+ |
| Engine range | `>=151.0.7922.108,<152` |
| Returns | `playwright.sync_api.Browser` / `playwright.async_api.Browser` |
| Playwright | `>=1.60,<2.0` (installed automatically) |
| Status | Alpha |

## Installation

```bash
pip install ombrabrowser
# Optional GeoIP auto-detection for timezone/locale="auto" + SOCKS5 upstream proxy helpers:
pip install "ombrabrowser[geoip]"
```

For local development from the repository root:

```bash
pip install -e sdks/python
```

Playwright is included in the standard installation; the legacy `ombrabrowser[playwright]` extra remains a compatibility alias. On first launch, the SDK resolves a local Ombra engine or downloads and verifies it automatically. No desktop app or `playwright install chromium` command is required.

## Migrating from Playwright

Replace the import and browser launch; keep your existing page code:

```diff
- from playwright.sync_api import sync_playwright
- pw = sync_playwright().start()
- browser = pw.chromium.launch()
+ from ombrabrowser import launch
+ browser = launch()

  page = browser.new_page()
  page.goto("https://example.com")
  # ... rest of your code works unchanged
```

For async code, use `from ombrabrowser import launch_async` and `browser = await launch_async()`.

## Usage

```python
from ombrabrowser import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

Pin an exact engine release with `version` in any `launch*()` helper:

```python
from ombrabrowser import launch, binary_info, ensure_binary

engine_version = "151.0.7922.108-9"
ensure_binary(version=engine_version)  # Optional: download and verify before launching
browser = launch(version=engine_version)
try:
    page = browser.new_page()
    page.goto("https://example.com")
finally:
    browser.close()
print(binary_info(version=engine_version))
```

`version` overrides `OMBRA_VERSION` and disables automatic upgrades for that launch.
Include the release suffix (`-9`) for an exact build; a Chromium-only pin accepts
local releases or the channel release with that Chromium version. A conflicting `binary_path` or
`OMBRA_BINARY_PATH` raises `UnsupportedEngineError`. If the requested build is
missing and `download=False`, launch raises `BinaryNotFoundError`.

```bash
ombrabrowser install --version 151.0.7922.108-9
OMBRA_VERSION=151.0.7922.108-9 python your_script.py
```

With a persistent named profile, authenticated proxy relay, fingerprint, and native engine humanization:

```python
from ombrabrowser import launch

browser = launch(
    profile="pricing-eu",
    headless=False,
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"seed": 20261116, "os": "macos"},
    humanize={"preset": "default"},
)
```

Async, context, and persistent-context helpers:

```python
from ombrabrowser import (
    launch_async,
    launch_context,
    launch_context_async,
    launch_persistent_context,
    launch_persistent_context_async,
    last_launch_info,
)

browser = await launch_async()
context = launch_context(viewport={"width": 1920, "height": 1080}, locale="en-US")
persistent_ctx = launch_persistent_context("my-profile")
print(last_launch_info(persistent_ctx))
persistent_ctx.close()
```

Custom `Ombra` CDP domain (9 CAPTCHA events, live policy control, humanize, and native agent):

```python
from ombrabrowser import launch, ombra_cdp

browser = launch(captcha={"solve": False})  # detect-only mode (or captcha=True to auto-solve)
page = browser.new_page()

# Attaches to a browser-level CDP session (works with Browser or BrowserContext):
with ombra_cdp(browser) as cdp:
    with cdp.record_captcha_events() as rec:
        page.goto("https://example.com")
        # Pumps Playwright's sync loop while waiting for Ombra.captcha* events:
        event = rec.wait_for(("captchaDetected", "captchaSolved"), timeout_ms=10_000, page=page)
        print(event["event"], event.get("captcha"))

    print(cdp.get_captcha_state())
    cdp.set_captcha_policy(solve=True, max_attempts=3, time_budget_ms=30_000)

browser.close()
```

Binary management and CLI:

```python
from ombrabrowser import binary_info, ensure_binary, clear_cache

print(binary_info())
ensure_binary()
clear_cache()
```

```bash
ombrabrowser info      # Print JSON diagnostics (or `ombrabrowser doctor`)
ombrabrowser install   # Download and verify Ed25519 + SHA-256 engine archive
ombrabrowser update    # Check channel manifest and update cached engine
ombrabrowser clear-cache
ombrabrowser login     # Save license key to ~/.ombra/license.key (chmod 600)
ombrabrowser logout
```

`launch()` returns a real Playwright `Browser`. There is no wrapper and no new page API.

## Layout

```text
sdks/python/
├── LICENSE
├── MANIFEST.in
├── NOTICE
├── pyproject.toml
├── README.md
├── src/ombrabrowser/
│   ├── __init__.py       # Public exports and error hierarchy
│   ├── __main__.py       # `python -m ombrabrowser` / `ombrabrowser` CLI
│   ├── _version.py       # SDK version, contract range, engine compatibility
│   ├── binary.py         # Resolution order, Ed25519 + SHA-256 verification, cache
│   ├── captcha.py        # Re-exports for custom CAPTCHA CDP events and commands
│   ├── cdp.py            # Browser-level Ombra CDP domain client (sync & async)
│   ├── config.py         # Env vars, platform detection, signing pubkeys, license resolution
│   ├── errors.py         # Typed OmbraError hierarchy + secret redaction
│   ├── geoip.py          # Optional GeoIP lookup for timezone/locale="auto"
│   ├── launcher.py       # Sync/async launchers, CDP attach, readiness, process reaper
│   ├── options.py        # launch-options.schema.json validation + CLI flag builder
│   ├── profile.py        # Named profile slugification, seed persistence, cross-process locks
│   ├── proxy.py          # Proxy validation + in-memory loopback SOCKS5 credential relay
│   └── py.typed          # PEP 561 typing marker
└── tests/
    ├── conftest.py
    ├── test_binary.py
    ├── test_cdp_captcha.py
    ├── test_engine_versions.py
    ├── test_cli.py
    ├── test_launch.py
    ├── test_options.py
    ├── test_profile.py
    ├── test_proxy.py
    └── test_stealth_invariants.py
```

## Build and test

```bash
cd sdks/python
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
pytest -v tests
# Optional live test against an installed/cached Ombra Chromium binary:
OMBRA_REAL_BROWSER_TEST=1 pytest -v tests -m real_browser
```

## Notes

- Playwright is a required dependency; the older `ombrabrowser[playwright]` installation command remains supported.
- Sync and async launchers share binary resolution, profile locking, option validation, and the loopback SOCKS5 proxy relay.
- `launch_context()` / `launch_persistent_context()` close the underlying browser and engine process when the context closes.
- Obeys all stealth invariants (`SI-01`..`SI-12`): connects via `connect_over_cdp(..., no_defaults=True, is_local=True)`, defaults `new_page()`/`new_context()` to `no_viewport=True`, and never injects init scripts, `Runtime.enable`, `--enable-automation`, proxy credentials on CLI, or `Emulation` overrides.
