use ombra_desktop_store::store::{Store, StoreError, profiles::{ListQuery, ProfileInput}};
use rusqlite::{Connection, params};
use std::fs;

#[test]
fn local_profile_edits_survive_reopen_and_preserve_legacy_fields() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open_local(dir.path()).unwrap();
    let mut profile = ProfileInput::new("Work", "{}");
    let id = store.create_profile(&profile, 1).unwrap().id;
    assert!(Store::open_local(dir.path()).is_err());
    drop(store);

    let path = dir.path().join("ombra.db");
    let db = Connection::open(&path).unwrap();
    db.execute("UPDATE profiles SET captcha = ?1, humanize = ?1, humanize_seed = 19 WHERE id = ?2",
        params!["opaque-legacy-value", id]).unwrap();
    db.execute("INSERT INTO settings VALUES ('license.refresh_token','enc:old-session')", []).unwrap();
    drop(db);

    let store = Store::open_local(dir.path()).unwrap();
    profile.name = "Personal".into();
    store.update_profile_with_tags(&id, &profile, Some(&["local".into()])).unwrap();
    let rows = store.list_profiles(&ListQuery::default()).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!((rows[0].id.as_str(), rows[0].name.as_str()), (id.as_str(), "Personal"));
    drop(store);

    let db = Connection::open(path).unwrap();
    let fields: (String, String, i64) = db.query_row("SELECT captcha, humanize, humanize_seed FROM profiles WHERE id = ?1",
        [id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).unwrap();
    assert_eq!(fields, ("opaque-legacy-value".into(), "opaque-legacy-value".into(), 19));
    let session: String = db.query_row("SELECT value FROM settings WHERE key = 'license.refresh_token'", [], |r| r.get(0)).unwrap();
    assert_eq!(session, "enc:old-session");
}

#[test]
fn protected_roots_remain_closed_even_if_the_config_is_damaged_or_missing() {
    for marker in ["security.json", "Profiles.sparsebundle", "vault-secrets.key"] {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join(marker), b"existing").unwrap();
        assert!(matches!(Store::open_local(dir.path()), Err(StoreError::Protected)));
        assert!(!dir.path().join("ombra.db").exists());
        assert!(!dir.path().join("secrets.key").exists());
        assert_eq!(fs::read(dir.path().join(marker)).unwrap(), b"existing");
    }
}

#[test]
fn newer_database_is_rejected_before_key_creation_or_journal_changes() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("ombra.db");
    let db = Connection::open(&path).unwrap();
    db.execute_batch("CREATE TABLE future(value TEXT); PRAGMA user_version = 18").unwrap();
    drop(db);
    let before = fs::read(&path).unwrap();
    assert!(matches!(Store::open_local(dir.path()), Err(StoreError::Schema(18))));
    assert!(!dir.path().join("secrets.key").exists());
    assert_eq!(fs::read(path).unwrap(), before);
}

#[cfg(unix)]
#[test]
fn linked_databases_do_not_create_keys_or_change_the_link_target() {
    for exists in [false, true] {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("catalog");
        fs::create_dir(&root).unwrap();
        let target = dir.path().join("other.db");
        if exists {
            Connection::open(&target).unwrap().execute_batch("CREATE TABLE untouched(id)").unwrap();
        }
        let before = fs::read(&target).ok();
        std::os::unix::fs::symlink(&target, root.join("ombra.db")).unwrap();
        assert!(Store::open_local(&root).is_err());
        assert!(!root.join("secrets.key").exists());
        assert_eq!(fs::read(&target).ok(), before);
    }
}

#[test]
fn restored_database_and_valid_but_unrelated_key_stay_untouched() {
    use ombra_desktop_store::store::secrets::{Secret, SecretField};
    let original = tempfile::tempdir().unwrap();
    let other = tempfile::tempdir().unwrap();
    let store = Store::open_local(original.path()).unwrap();
    let mut profile = ProfileInput::new("Local", "{}");
    profile.password = SecretField::Set(Secret::new("fixture"));
    store.create_profile(&profile, 1).unwrap();
    drop(store);
    drop(Store::open_local(other.path()).unwrap());
    let path = other.path().join("ombra.db");
    fs::copy(original.path().join("ombra.db"), &path).unwrap();
    let before = fs::read(&path).unwrap();
    let key = fs::read(other.path().join("secrets.key")).unwrap();
    assert!(matches!(Store::open_local(other.path()), Err(StoreError::Crypto)));
    assert_eq!(fs::read(path).unwrap(), before);
    assert_eq!(fs::read(other.path().join("secrets.key")).unwrap(), key);
}
