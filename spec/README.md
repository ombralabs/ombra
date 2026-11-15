# Launch schemas

This directory contains JSON Schema files for the SDK launch surface. They describe the language-neutral option object and the binary metadata, not a network protocol.

| Schema | Covers |
|---|---|
| [launch-options.schema.json](schemas/launch-options.schema.json) | The option object accepted by `launch()` |
| [binary-info.schema.json](schemas/binary-info.schema.json) | The result of `binary_info()` |

All schemas use JSON Schema 2020-12. They are the reference for the typed option objects in every SDK; the SDK may expose a more idiomatic builder, but the fields and validation rules are the same.

## Why JSON Schema

The SDKs do not share a runtime, so a small schema is the cheapest way to keep option names, defaults, and validation identical across eight languages. The schemas are also used by the conformance report and by the docs generator.

There is no OpenAPI document because there is no HTTP API in the SDK path. The SDK launches a local process and speaks CDP; see [docs/architecture.md](../docs/architecture.md).

## Validating an option object

Any 2020-12 validator works. With Python:

```bash
python3 -m pip install jsonschema
python3 - <<'PY'
import json
from jsonschema import validate

with open("spec/schemas/launch-options.schema.json") as f:
    schema = json.load(f)
with open("options.json") as f:
    validate(json.load(f), schema)
print("valid")
PY
```

The repository's own CI does not install `jsonschema`; the schemas are checked for JSON validity by `tools/check_repo.py`, and option behavior is enforced by the per-SDK tests.
