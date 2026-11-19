# Profile security in Desktop 1.2.1

Desktop 1.2.1 opens an existing macOS profile vault stored in the AES-256 encrypted APFS image `Profiles.sparsebundle`. The local catalog library works with ordinary profile data. Use the full desktop app on macOS for a protected installation. Its settings show **Local encrypted storage** for installations that already have a vault.

## Unlocking and recovery

- Enter the storage password and six-digit code at **Profiles are locked**, then select **Unlock profiles**. One unlock opens the workspace for that session. A six-digit code is valid on 30-second time steps with one step of clock tolerance on either side. Reuse of an accepted step is rejected across restarts.
- If the authenticator is unavailable, select **Cannot access your authenticator?** and use the storage password and a recovery code. Each code works once. Eight codes are issued per set. On a different Mac, or when the device key is missing, this unlock can establish a new local device key.
- After a recovery unlock, **Settings → Security & data → Local encrypted storage** lets you replace the authenticator. For five minutes you can start replacement by re-entering the storage password. Confirm the replacement authenticator with its own code and save the newly issued recovery codes.
- Changing the password or replacing the authenticator normally requires the current password and a fresh authenticator or recovery code. A new storage password must have at least 12 characters. Each change invalidates the previous set of recovery codes. After five failed authentication attempts, the retry delay starts at 30 seconds and increases to a maximum of 15 minutes. The delay survives restarting the app.

## Storage and migration

The application supplies a random volume password to macOS `hdiutil` over standard input. It derives a separate key from the user's password with PBKDF2-HMAC-SHA256, a random salt and 600,000 iterations. The ordinary unlock uses this derived key and the device key to open an XChaCha20-Poly1305 encrypted payload. The app checks the authenticator code before mounting the image. Recovery codes have separate encrypted copies of the payload, each bound to the storage password and that code.

The volume mounts in a private temporary directory outside Application Support. It holds the database, Chromium directories and cache, extensions, working files and persistent profile logs. The mount location keeps macOS Chromium cache files inside the vault. Outside the volume, `ui.json` can retain the language for the unlock screen.

When an existing installation has a pending migration, the app locks the old data, copies the files, verifies them with SHA-256 and saves progress atomically. It checks the SQLite field key inside the vault before removing the original data and the old external browser cache. A busy source or an unsupported symbolic link stops the copy. After an interruption, open the app with the same storage password and a fresh code to resume.

On exit a guard process waits for the owner to finish, stops remaining browsers and unmounts the image. Opening a corrupt or incomplete vault fails with its data preserved. Windows and Linux support ordinary profile storage. The 1.2.1 APFS implementation requires macOS.

## Local API

In the original desktop app, **Settings → Integrations → Local API** controls the IPv4 loopback listener. Its default address is `127.0.0.1:45678`. A local client can reach the listener when it is enabled. Turn on **Require an API key** to authenticate clients. **New key** rotates the credential, so update any local client that uses the previous key.

The server checks the Host header and browser-origin metadata before dispatching requests. When a key is configured, it checks the bearer credential on every route. If the configured key cannot be read, startup fails. For a protected installation, the local API and commands that read profile data become available only after vault unlock. Closing the app closes the listener.
