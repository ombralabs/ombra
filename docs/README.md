# Documentation

Start here if you are integrating Ombra from a script, adding a language SDK, working with desktop profile data, or validating a build.

| Document | Read it when |
|---|---|
| [Architecture](architecture.md) | You need to know which component owns what, or how a launch actually works |
| [Desktop profiles](desktop/README.md) | You work with local profile data, encryption keys, or an existing desktop vault |
| [SDK contract](sdk-contract.md) | You are implementing or reviewing an SDK |
| [Stealth checkup](stealth-checkup.md) | You are validating an engine, SDK, or client configuration before release |
| [Stealth checkup (RU)](stealth-checkup.ru.md) | Same, in Russian |
| [Versioning](versioning.md) | You are releasing a package or changing the launch contract |
| [SDK index](../sdks/README.md) | You want the per-language layout and build commands |
| [Conformance](../conformance/README.md) | You are adding a test case or a report consumer |

## Reading order

**Integrator:** README → [SDK contract](sdk-contract.md) → the SDK README for your language → [architecture](architecture.md) if something behaves unexpectedly.

**SDK author:** [Architecture](architecture.md) → [SDK contract](sdk-contract.md) → [conformance](../conformance/README.md) → [sdks/README.md](../sdks/README.md).

**Release owner:** [Stealth checkup](stealth-checkup.md) → [versioning](versioning.md) → [CHANGELOG](../CHANGELOG.md).

## Conventions

- English is the canonical language for technical documents. The Russian README and checkup are maintained translations.
- Contract option names are `snake_case`; language surfaces follow local convention.
- Examples are labeled when they describe a target API rather than an implemented one.
- Every link to another document is relative, so the repository works offline and in forks.
- Do not put credentials, real IPs, profile data, or customer names in docs or screenshots.

## Adding a document

1. Put it in `docs/` with a lowercase, hyphenated name.
2. Add it to the table above.
3. Link it from the most relevant README.
4. Run `python3 tools/check_repo.py` before opening the pull request.
