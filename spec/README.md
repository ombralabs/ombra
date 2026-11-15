# Wire schemas

This directory contains JSON Schema files for the v0 subset of the Ombra Local API. They describe the **wire**, not the SDK surface: SDKs expose typed facades over these payloads.

| Schema | Covers |
|---|---|
| [envelope.schema.json](schemas/envelope.schema.json) | The `code` / `msg` / `data` response envelope |
| [launch-response.schema.json](schemas/launch-response.schema.json) | `POST /api/v2/browser-profile/start` and the active-profile query |
| [profile.schema.json](schemas/profile.schema.json) | A profile row returned by `POST /api/v2/browser-profile/list` |

All schemas use JSON Schema 2020-12. Unknown fields are allowed where the profile row is additive; the places that reject unknown fields are the `ombra.humanize` and `ombra.captcha` namespaces, because the app rejects unknown keys there too.

## Why not OpenAPI yet

The Local API has v1 and v2 variants, string-typed numbers, and query parameters that also work in a POST body. Publishing a partial OpenAPI document would imply more coverage than we have. The v0 schemas cover the payloads the SDKs actually use; the app's Local API implementation remains normative for everything else.

When the contract reaches `0.2`, an OpenAPI document will be generated from the same source as the SDK types, not maintained by hand.

## Validating a payload

Any 2020-12 validator works. With Python:

```bash
python3 -m pip install jsonschema
python3 - <<'PY'
import json
from jsonschema import validate

with open("spec/schemas/launch-response.schema.json") as f:
    schema = json.load(f)
with open("report.json") as f:
    validate(json.load(f), schema)
print("valid")
PY
```

The repository's own CI does not install `jsonschema`; the schemas are checked for JSON validity by `tools/check_repo.py`, and wire conformance is enforced by the per-SDK tests.
