# Desktop profiles

The Rust catalog manages local profile records, groups, tags, labels and bookmarks without an Ombra account. Reusable desktop controls are also included as source. See the [component README](../../desktop/README.md) and [Rust package manifest](../../desktop/src-tauri/Cargo.toml).

| Guide | What it covers |
| --- | --- |
| [Working with profiles](profiles.md) | Create, organize, find and restore catalog entries. Look up the equivalent operations in Desktop 1.2.1. |
| [Local keys](local-keys.md) | Locate profile data and keys, migrate an older key and back up an existing installation. |
| [Profile security](profile-security.md) | Unlock an existing macOS vault, recover access and understand the original desktop Local API protections. |

The source is Ombra Desktop 1.2.1, commit `1a388dfaa658878659af7d945083e9f4ca0c3c7c`. The complete 1.2.1 desktop application required the retired sign-in service to reach its profile window. Its source contains browser launch, the Local API, vault mounting and the desktop window. References to those features below describe that version.

The catalog tests open temporary databases, reopen saved profile edits and check that a directory marked as protected stays closed. [Local profile tests](../../desktop/src-tauri/tests/local_profiles.rs).
