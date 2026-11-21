# Desktop profiles

Ombra Desktop manages profiles offline. It opens the existing local catalog, where you can create profiles, search and edit their names and notes, and move profiles to Trash or restore them. The browser section downloads and installs verified stable browser releases from public GitHub Releases when requested. The underlying Rust catalog also supports groups, tags, labels and bookmarks. [Desktop README](../../desktop/README.md).

| Guide | What it covers |
| --- | --- |
| [Working with profiles](profiles.md) | Create, organize, find and restore catalog entries. Look up the equivalent operations in Desktop 1.2.1. |
| [Local keys](local-keys.md) | Locate profile data and keys, migrate an older key and back up an existing installation. |
| [Profile security](profile-security.md) | Unlock an existing macOS vault, recover access and understand the original desktop Local API protections. |

The catalog originated in Ombra Desktop 1.2.1, commit `1a388dfaa658878659af7d945083e9f4ca0c3c7c`. The guides identify features of that version, including browser launch and vault mounting.

The catalog tests open temporary databases, reopen saved profile edits and check that a directory marked as protected stays closed. [Local profile tests](../../desktop/src-tauri/tests/local_profiles.rs).
