# Ombra SDK for Python

> **Scaffold.** Layout and contract only. No package is published and no client is implemented yet. The API below is the target defined by [contract v0.1](../../docs/sdk-contract.md).

[← All SDKs](../README.md) · [Contract](../../docs/sdk-contract.md) · [Stealth invariants](../../docs/sdk-contract.md#11-stealth-invariants)

## Target package

| Item | Value |
|---|---|
| Package | `ombra` |
| Registry | PyPI |
| Python | 3.10+ |
| CDP client | Playwright (sync and async) |
| Status | Scaffold |

## Target API

```python
from ombra import Ombra

client = Ombra(endpoint="http://127.0.0.1:45678")

profile = client.profiles.create(
    name="checkout-eu",
    fingerprint={"seed": 20261116, "os": "macos"},
    proxy="socks5://user:pass@proxy:1080",
)

session = client.launch(profile.id, headless=False)
browser = session.connect_playwright()
page = browser.new_page()
page.goto("https://example.com")
browser.close()
session.close()
```

The async client mirrors the same surface:

```python
from ombra import AsyncOmbra

client = AsyncOmbra(endpoint="http://127.0.0.1:45678")
profile = await client.profiles.create(name="checkout-eu")
session = await client.launch(profile.id, headless=True)
browser = await session.connect_playwright()
```

## Layout

```text
sdks/python/
├── pyproject.toml
├── src/ombra/
│   ├── __init__.py
│   ├── client.py        # Ombra, AsyncOmbra
│   ├── profiles.py      # Profile, ProfileSpec, ProfilesClient
│   ├── session.py       # Session, Playwright helpers
│   ├── transport.py     # HTTP, envelope, auth, timeouts
│   └── errors.py        # OmbraError hierarchy
└── tests/
    ├── test_transport.py
    ├── test_profiles.py
    └── test_session.py
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

- Keep the sync and async clients on one transport implementation; do not duplicate the envelope logic.
- Do not depend on Playwright at import time. The connection helper imports it lazily so `ombra` works without the extra.
- `session.debug_port` is an `int`; the wire sends a string.
- No `Runtime.enable`, no init scripts, no `Emulation.*` — see the contract.
