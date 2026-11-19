# Local keys and profile data

The local catalog takes an application data directory and keeps the SQLite database in `ombra.db`. Desktop 1.2.1 also keeps each browser directory under `profiles/<id>/`. Its default application data directory depends on the platform.

| Platform | Default directory |
| --- | --- |
| macOS | `~/Library/Application Support/Ombra` |
| Windows | `%LOCALAPPDATA%\Ombra` |
| Linux | `$XDG_DATA_HOME/Ombra` when the variable is an absolute path, otherwise `~/.local/share/Ombra` |

| File | Purpose |
| --- | --- |
| `secrets.key` | 32-byte key for encrypted fields in the ordinary SQLite store, including profile and proxy passwords, per-profile authenticator secrets, cookie values and the Local API key. |
| `vault-device.key` | Device key for an existing protected macOS installation. It lives alongside `security.json`. |
| `vault-secrets.key` | SQLite field-encryption key inside the mounted vault. The original JSON-string representation is also supported. |

SQLite uses XChaCha20-Poly1305 with a fresh nonce for each encrypted value. In an ordinary installation the key lives beside the database. A process that can read both files can decrypt those fields. Browser history, site storage and ordinary profile metadata are outside this field-level encryption. A [macOS vault](profile-security.md) additionally protects the profile files while its volume is unmounted.

## Opening an existing database

A fresh installation creates a local key without writing to the operating system's credential store. If an older database has encrypted fields and its local key is missing, the migration reads those fields in read-only mode. It tries the old development key, if present, then the legacy system credential `Ombra / secrets-key`. A candidate must decrypt every stored encrypted value before it is saved. macOS may ask for access to the legacy key on this first migration.

If access is denied or the old data cannot be decrypted, opening stops and the original database is preserved. The migration retains the old system credential. Subsequent starts use the local file. An empty database, or one with no encrypted values, needs no system credential.

Key creation and migration hold an interprocess lock. The application writes a temporary file and publishes it atomically without replacing an existing key. A corrupt key file produces an error. On Unix, key directories and files are restricted to their owner with modes `0700` and `0600`, and key files are opened without following symbolic links. Windows uses the user directory's access controls.

For older macOS vaults, a normal unlock in Desktop 1.2.1 can import the previous device key from the `Ombra.ProfileVault` Keychain entry. A recovery unlock can create a replacement device key with the storage password and an unused recovery code. Mounting these vaults belongs to the original desktop application.

## Backup and restore

Close the desktop app and its browsers before copying the application data directory to a private backup. Keep the database, profile directories and their matching keys together. After adding encrypted data, an older build can read it only if it uses the same key. A backup taken before an upgrade preserves the earlier state.

For a protected installation, include the complete `Profiles.sparsebundle`, `security.json` and local key files. Keep the storage password and an unused recovery code available for restoring on another Mac. An ordinary profile archive contains only the selected profile. [Profile security and recovery](profile-security.md).
