# Ombra Desktop

Ombra Desktop is a local profile manager. You can create profiles, search by name, note or number, and edit names and notes. Moving a profile to Trash keeps its files on disk and lets you restore the profile later. All actions work offline.

The app opens the existing ordinary Ombra data directory automatically. Close any other app that holds the same catalog before starting it. [Data locations, key migration and backups](../docs/desktop/local-keys.md).

| Source | Use |
| --- | --- |
| [Rust catalog](src-tauri/Cargo.toml) | Open an ordinary local SQLite catalog, manage profiles and organize them with groups, tags, labels and bookmarks. |
| [Vue controls](src/components/) | Import form fields, buttons, dialogs, the group palette and the tag editor. Use the [base styles](src/styles/base.css) and the [English and Russian messages](src/i18n/). |

The app uses `Store::open_local`, which holds the catalog lock and loads the matching local encryption key. For an existing encrypted APFS vault, use Desktop 1.2.1 to unlock or recover the vault. [Vault recovery](../docs/desktop/profile-security.md).

## Development

From this directory, use the pinned Rust toolchain and Node.js 22 LTS (22.12+), 24 LTS or 26+. Linux builds use pkg-config and the D-Bus development headers for the legacy keyring reader. On Debian or Ubuntu, the packages are `pkg-config` and `libdbus-1-dev`.

```sh
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm ci
npm run check
npm run tauri -- dev
```

The Rust tests use temporary directories and SQLite databases. The Vue check runs the TypeScript compiler and component tests. To use the catalog from another Rust crate, add a path dependency on `src-tauri`. [Profile operations with a Rust example](../docs/desktop/profiles.md).

## Build installers

Use the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for the platform. For an Apple silicon DMG, run the macOS command. For the other listed installers, use the corresponding platform build environment.

| Installer | Command |
| --- | --- |
| macOS arm64 DMG | `npm run tauri -- build --target aarch64-apple-darwin --bundles dmg -- --locked` |
| Linux Debian package | `npm run tauri -- build --bundles deb -- --locked` |
| Windows NSIS setup | `npm run tauri -- build --bundles nsis -- --locked` |

Set `OMBRA_DESKTOP_DATA_DIR` to an absolute path before launching the executable to work with a test catalog or a backup copy. The app will create a catalog if the directory is empty.

The desktop source is covered by the repository’s existing desktop terms. [NOTICE](../NOTICE).
