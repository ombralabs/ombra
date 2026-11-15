# Ombra SDK for Python

> **Scaffold.** Layout and contract only. No package is published and no launcher is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#12-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `ombra` |
| Registry | PyPI |
| Python | 3.10+ |
| Returns | `playwright.sync_api.Browser` / `playwright.async_api.Browser` |
| Status | Scaffold |

## Target API

```python
from ombra import launch

browser = launch()
page = browser.new_page()
page.goto("https://example.com")
print(page.title())
browser.close()
```

With a profile and launch options:

```python
from ombra import launch

browser = launch(
    profile="pricing-eu",
    headless=False,
    proxy="socks5://user:pass@proxy:1080",
    fingerprint={"seed": 20261116, "os": "macos"},
    humanize={"preset": "default"},
)
```

Async and context helpers:

```python
from ombra import launch_async, launch_context

browser = await launch_async()
context = launch_context(viewport={"width": 1920, "height": 1080}, locale="en-US")
```

Binary management:

```python
from ombra import binary_info, ensure_binary, clear_cache

print(binary_info())
ensure_binary()
clear_cache()
```

`launch()` returns a real Playwright `Browser`. There is no wrapper and no new page API.

## Layout

```text
sdks/python/
├── pyproject.toml
├── src/ombra/
│   ├── __init__.py
│   ├── launcher.py      # launch, launch_async, launch_context
│   ├── binary.py        # resolve, verify, download, binary_info
│   ├── profile.py       # named profiles, seed persistence, lock
│   ├── proxy.py         # loopback relay for authenticated proxies
│   └── errors.py        # OmbraError hierarchy
└── tests/
    ├── test_options.py
    ├── test_binary.py
    ├── test_profile.py
    └── test_launch.py
```

## Build and test (planned)

```bash
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
ruff check src tests
mypy src
pytest -q
```

## Notes

- Keep Playwright an optional extra; `ombra` must import without it, and the launcher raises a clear error when it is missing.
- The sync and async launchers share the binary, profile, and proxy code.
- `launch_context()` creates a browser and a context, and closing the context does not orphan the browser process.
- Never inject init scripts, enable `Runtime`, or override identity through `Emulation`.
