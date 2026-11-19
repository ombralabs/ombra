# Ombra Desktop components

This directory contains the local profile catalog and reusable Vue controls from Ombra Desktop 1.2.1. Develop these components here. The full 1.2.1 application required the retired account service. Its source is in the [legacy Desktop repository](https://github.com/ombralabs/desktop/tree/1a388dfaa658878659af7d945083e9f4ca0c3c7c). [Profile manager documentation](../docs/desktop/README.md).

| Source | Use |
| --- | --- |
| [Rust catalog](src-tauri/Cargo.toml) | Open an ordinary local SQLite catalog, manage profiles and organize them with groups, tags, labels and bookmarks. |
| [Vue controls](src/components/) | Import form fields, buttons, dialogs, the group palette and the tag editor. Use the [base styles](src/styles/base.css) and the [English and Russian messages](src/i18n/). |

The catalog opens with `Store::open_local` using the directory lock and local encryption key. An Ombra account and a network connection are unnecessary. Desktop 1.2.1 handles existing encrypted APFS vaults. [Data and key handling](../docs/desktop/local-keys.md).

## Development

From this directory, use the pinned Rust toolchain and Node.js 22 LTS (22.12+), 24 LTS or 26+. Linux builds use pkg-config and the D-Bus development headers for the legacy keyring reader. On Debian or Ubuntu, the packages are `pkg-config` and `libdbus-1-dev`.

```sh
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm ci
npm run check
```

The Rust tests use temporary directories and SQLite databases. The Vue check runs the TypeScript compiler and component tests. To use the catalog from another Rust crate, add a path dependency on `src-tauri`. [Profile operations with a Rust example](../docs/desktop/profiles.md).

The desktop source is covered by the repository’s existing desktop terms. [NOTICE](../NOTICE).
