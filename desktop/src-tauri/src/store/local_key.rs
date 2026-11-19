//! Local keys for every build. OS credential storage is read only to migrate old data.
use super::{StoreError, secrets::SecretBox};
use crate::paths::Paths;
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use rusqlite::OpenFlags;
use std::{fs, io::{self, Read, Write}, path::Path};
use zeroize::Zeroizing;

pub(crate) type Key = Zeroizing<[u8; 32]>;

pub(crate) fn new_key() -> Result<Key, StoreError> {
    let mut key = Zeroizing::new([0; 32]);
    getrandom::fill(key.as_mut()).map_err(|_| StoreError::Crypto)?;
    Ok(key)
}

fn decode(text: &str) -> Result<Key, StoreError> {
    let bytes = Zeroizing::new(B64.decode(text.trim()).map_err(|_| StoreError::Crypto)?);
    Ok(Zeroizing::new(bytes.as_slice().try_into().map_err(|_| StoreError::Crypto)?))
}

/// Never creates or replaces a credential: denial/missing legacy key must preserve the database.
pub(crate) fn legacy_key(service: &str, account: &str) -> Result<Key, StoreError> {
    let entry = keyring::Entry::new(service, account).map_err(|e| StoreError::Keychain(e.to_string()))?;
    let text = Zeroizing::new(entry.get_password().map_err(|e| StoreError::Keychain(e.to_string()))?);
    decode(&text)
}

pub(crate) fn read_key(path: &Path) -> Result<Option<Key>, StoreError> {
    let file = match crate::sys::private_options().read(true).open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.into()),
    };
    let meta = file.metadata()?;
    if !meta.is_file() || meta.len() > 256 { return Err(StoreError::Crypto); }
    #[cfg(unix)] {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if meta.uid() != unsafe { libc::geteuid() } { return Err(io::Error::from(io::ErrorKind::PermissionDenied).into()); }
        file.set_permissions(fs::Permissions::from_mode(0o600))?;
    }
    let mut text = Zeroizing::new(String::new());
    file.take(257).read_to_string(&mut text)?;
    if text.len() > 256 { return Err(StoreError::Crypto); }
    // The original APFS vault key uses a JSON string; ordinary keys use raw base64.
    if text.trim_start().starts_with('"') {
        let text = Zeroizing::new(serde_json::from_str::<String>(&text).map_err(|_| StoreError::Crypto)?);
        decode(&text).map(Some)
    } else { decode(&text).map(Some) }
}

/// The lock covers read, migration and atomic publication; a corrupt file never falls back.
pub(crate) fn load_with(path: &Path, lock_path: &Path, initialize: impl FnOnce() -> Result<Key, StoreError>) -> Result<Key, StoreError> {
    let parent = path.parent().ok_or_else(|| io::Error::from(io::ErrorKind::InvalidInput))?;
    fs::create_dir_all(parent)?;
    if !fs::symlink_metadata(parent)?.is_dir() { return Err(io::Error::from(io::ErrorKind::PermissionDenied).into()); }
    #[cfg(unix)] {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if fs::metadata(parent)?.uid() != unsafe { libc::geteuid() } { return Err(io::Error::from(io::ErrorKind::PermissionDenied).into()); }
        fs::set_permissions(parent, fs::Permissions::from_mode(0o700))?;
    }
    let lock = crate::sys::private_options().create(true).truncate(false).write(true).open(lock_path)?;
    lock.lock()?;
    if let Some(key) = read_key(path)? { return Ok(key); }
    let key = initialize()?;
    let text = Zeroizing::new(B64.encode(*key));
    let mut file = tempfile::NamedTempFile::new_in(parent)?;
    #[cfg(unix)] {
        use std::os::unix::fs::PermissionsExt;
        file.as_file().set_permissions(fs::Permissions::from_mode(0o600))?;
    }
    file.write_all(text.as_bytes())?;
    file.as_file().sync_all()?;
    file.persist_noclobber(path).map_err(|e| StoreError::Io(e.error))?;
    #[cfg(unix)] fs::File::open(parent)?.sync_all()?;
    Ok(key)
}

pub(crate) fn profile_key(paths: &Paths) -> Result<Key, StoreError> {
    profile_key_with(paths, || legacy_key("Ombra", "secrets-key"))
}

fn profile_key_with(paths: &Paths, legacy: impl FnOnce() -> Result<Key, StoreError>) -> Result<Key, StoreError> {
    let destination = paths.local_key_file();
    let key = load_with(&destination, &paths.root().join(".ombra-key.lock"), || {
        let blobs = encrypted_values(&paths.db(), false)?;
        // Development and release used different keys. Only reuse one if it opens ALL old values.
        if let Some(key) = read_key(&paths.dev_key_file())? && opens_all(&key, &blobs) {
            return Ok(key);
        }
        if blobs.is_empty() { return new_key(); }
        let key = legacy()?;
        if !opens_all(&key, &blobs) { return Err(StoreError::Crypto); }
        Ok(key)
    })?;
    // A restored database and a separately restored key may come from different installations.
    if !opens_all(&key, &encrypted_values(&paths.db(), true)?) { return Err(StoreError::Crypto); }
    Ok(key)
}

fn opens_all(key: &[u8; 32], blobs: &[Vec<u8>]) -> bool {
    let secrets = SecretBox::from_key(key);
    blobs.iter().all(|blob| secrets.decrypt(blob).is_ok())
}

/// Read-only, before opening/migrating Store. No new key for a database containing encrypted data.
fn encrypted_values(path: &Path, first_only: bool) -> Result<Vec<Vec<u8>>, StoreError> {
    if !path.try_exists()? { return Ok(vec![]); }
    let conn = super::open_database(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    let mut values = vec![];
    for (table, columns) in [
        ("profiles", &["password_enc", "totp_enc"][..]),
        ("proxies", &["password_enc"][..]),
        ("cookies", &["value_enc"][..]),
        ("flow_tasks", &["params_enc", "data_enc"][..]),
    ] {
        if !conn.table_exists(None, table)? { continue; }
        for column in columns {
            let mut statement = conn.prepare(&format!("SELECT {column} FROM {table} WHERE {column} IS NOT NULL"))?;
            for row in statement.query_map([], |row| row.get::<_, Vec<u8>>(0))? {
                values.push(row?);
                if first_only { return Ok(values); }
            }
        }
    }
    if conn.table_exists(None, "settings")? {
        // A stale account session is opaque to this catalog. Migration still verifies all old secrets.
        let query = if first_only {
            "SELECT value FROM settings WHERE substr(value, 1, 4) = 'enc:' AND key != 'license.refresh_token' LIMIT 1"
        } else {
            "SELECT value FROM settings WHERE substr(value, 1, 4) = 'enc:'"
        };
        let mut statement = conn.prepare(query)?;
        for value in statement.query_map([], |row| row.get::<_, String>(0))? {
            values.push(B64.decode(&value?[4..]).map_err(|_| StoreError::Crypto)?);
        }
    }
    Ok(values)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::{Store, secrets::Secret};
    use rusqlite::Connection;

    fn fixture(paths: &Paths, key: &[u8; 32]) {
        let store = Store::open(&paths.db(), SecretBox::from_key(key)).unwrap();
        store.set_api_key(Some("preserved-api-token")).unwrap();
        store.set_secret_setting("legacy.key", Some("preserved-value")).unwrap();
    }

    fn no_legacy() -> Result<Key, StoreError> { panic!("must not access OS credentials") }

    #[test]
    fn fresh_and_empty_existing_database_never_access_keychain() {
        for database in [false, true] {
            let dir = tempfile::tempdir().unwrap();
            let paths = Paths::new(dir.path());
            if database { Store::open(&paths.db(), SecretBox::from_key(&[9; 32])).unwrap(); }
            let first = profile_key_with(&paths, no_legacy).unwrap();
            assert_eq!(*first, *profile_key_with(&paths, no_legacy).unwrap());
            #[cfg(unix)] {
                use std::os::unix::fs::PermissionsExt;
                assert_eq!(fs::metadata(paths.local_key_file()).unwrap().permissions().mode() & 0o777, 0o600);
                assert_eq!(fs::metadata(paths.root()).unwrap().permissions().mode() & 0o777, 0o700);
            }
        }
    }

    #[test]
    fn migration_preserves_database_and_restart_never_accesses_keychain() {
        let dir = tempfile::tempdir().unwrap();
        let paths = Paths::new(dir.path());
        fixture(&paths, &[7; 32]);
        let before = fs::read(paths.db()).unwrap();
        let key = profile_key_with(&paths, || Ok(Zeroizing::new([7; 32]))).unwrap();
        assert_eq!(fs::read(paths.db()).unwrap(), before);
        assert_eq!(*key, *profile_key_with(&paths, no_legacy).unwrap());
        let store = Store::open(&paths.db(), SecretBox::from_key(&key)).unwrap();
        assert_eq!(store.api_key().unwrap().as_deref(), Some("preserved-api-token"));
        assert_eq!(store.secret_setting("legacy.key").unwrap().unwrap().expose(), "preserved-value");
    }

    #[test]
    fn refused_missing_or_wrong_legacy_key_cannot_replace_existing_data() {
        let dir = tempfile::tempdir().unwrap();
        let paths = Paths::new(dir.path());
        fixture(&paths, &[7; 32]);
        let before = fs::read(paths.db()).unwrap();
        assert!(profile_key_with(&paths, || Err(StoreError::Keychain("unavailable".into()))).is_err());
        assert!(profile_key_with(&paths, || Ok(Zeroizing::new([8; 32]))).is_err());
        assert!(!paths.local_key_file().exists());
        assert_eq!(fs::read(paths.db()).unwrap(), before);
    }

    #[test]
    fn development_key_is_used_only_when_it_matches_existing_data() {
        let dir = tempfile::tempdir().unwrap();
        let paths = Paths::new(dir.path());
        fixture(&paths, &[7; 32]);
        fs::write(paths.dev_key_file(), B64.encode([8; 32])).unwrap();
        assert_eq!(*profile_key_with(&paths, || Ok(Zeroizing::new([7; 32]))).unwrap(), [7; 32]);
        fs::remove_file(paths.local_key_file()).unwrap();
        fs::write(paths.dev_key_file(), B64.encode([7; 32])).unwrap();
        assert_eq!(*profile_key_with(&paths, no_legacy).unwrap(), [7; 32]);
    }

    #[test]
    fn validates_every_encrypted_column_including_cookies_and_tasks() {
        let dir = tempfile::tempdir().unwrap();
        let paths = Paths::new(dir.path());
        let conn = Connection::open(paths.db()).unwrap();
        conn.execute_batch("CREATE TABLE profiles(password_enc BLOB, totp_enc BLOB);
            CREATE TABLE proxies(password_enc BLOB); CREATE TABLE cookies(value_enc BLOB);
            CREATE TABLE flow_tasks(params_enc BLOB, data_enc BLOB);
            CREATE TABLE settings(key TEXT, value TEXT);").unwrap();
        let good = SecretBox::from_key(&[7; 32]).encrypt(&Secret::new("keep")).unwrap();
        let bad = SecretBox::from_key(&[8; 32]).encrypt(&Secret::new("other-key")).unwrap();
        conn.execute("INSERT INTO profiles VALUES (?1, ?1)", [&good]).unwrap();
        conn.execute("INSERT INTO proxies VALUES (?1)", [&good]).unwrap();
        conn.execute("INSERT INTO cookies VALUES (?1)", [&good]).unwrap();
        conn.execute("INSERT INTO flow_tasks VALUES (?1, ?2)", [&good, &bad]).unwrap();
        conn.execute("INSERT INTO settings VALUES ('captcha.key', ?1)", [format!("enc:{}", B64.encode(&good))]).unwrap();
        assert_eq!(encrypted_values(&paths.db(), false).unwrap().len(), 7);
        assert!(profile_key_with(&paths, || Ok(Zeroizing::new([7; 32]))).is_err());
        assert!(!paths.local_key_file().exists());
        conn.execute("UPDATE flow_tasks SET data_enc = ?1", [&good]).unwrap();
        assert!(profile_key_with(&paths, || Ok(Zeroizing::new([7; 32]))).is_ok());
    }

    #[test]
    fn corrupt_file_is_not_replaced_and_old_vault_json_is_supported() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("key");
        let lock = dir.path().join("lock");
        fs::write(&path, "truncated").unwrap();
        assert!(load_with(&path, &lock, no_legacy).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "truncated");
        fs::write(&path, serde_json::to_string(&B64.encode([7; 32])).unwrap()).unwrap();
        assert_eq!(*load_with(&path, &lock, no_legacy).unwrap(), [7; 32]);
    }

    #[test]
    fn parallel_first_start_publishes_one_complete_key() {
        use std::sync::{Arc, atomic::{AtomicUsize, Ordering}};
        let dir = tempfile::tempdir().unwrap();
        let calls = Arc::new(AtomicUsize::new(0));
        let handles: Vec<_> = (0..8).map(|_| {
            let path = dir.path().join("key");
            let lock = dir.path().join("lock");
            let calls = calls.clone();
            std::thread::spawn(move || load_with(&path, &lock, || {
                calls.fetch_add(1, Ordering::SeqCst); new_key()
            }).unwrap())
        }).collect();
        let keys: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
        assert!(keys.iter().all(|key| **key == *keys[0]));
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[cfg(unix)]
    #[test]
    fn symlinks_are_rejected_without_overwriting_the_target() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("target");
        let path = dir.path().join("key");
        fs::write(&target, B64.encode([7; 32])).unwrap();
        std::os::unix::fs::symlink(&target, &path).unwrap();
        assert!(load_with(&path, &dir.path().join("lock"), no_legacy).is_err());
        assert_eq!(fs::read_to_string(&target).unwrap(), B64.encode([7; 32]));
    }
}
