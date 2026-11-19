//! Ручные статусы профилей: общий справочник и одно назначение на профиль.
use super::{Store, StoreError, fold};
use rusqlite::{OptionalExtension, Row, params};
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ProfileLabel {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub preset: Option<String>,
}

fn read_label(row: &Row<'_>) -> rusqlite::Result<ProfileLabel> {
    Ok(ProfileLabel { id: row.get(0)?, name: row.get(1)?, color: row.get(2)?, preset: row.get(3)? })
}

impl Store {
    pub fn list_profile_labels(&self) -> Result<Vec<ProfileLabel>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare("SELECT id, name, color, preset FROM profile_labels ORDER BY (preset IS NULL), id")?;
        Ok(stmt.query_map([], read_label)?.collect::<Result<_, _>>()?)
    }

    pub fn save_profile_label(&self, id: Option<i64>, name: &str, color: &str) -> Result<ProfileLabel, StoreError> {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > 32 || name.chars().any(char::is_control) {
            return Err(StoreError::Invalid("name"));
        }
        let color = color.trim().to_ascii_lowercase();
        if color.len() != 7 || !color.starts_with('#') || !color[1..].bytes().all(|ch| ch.is_ascii_hexdigit()) {
            return Err(StoreError::Invalid("color"));
        }
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        if let Some(id) = id {
            let preset: Option<String> = tx.query_row("SELECT preset FROM profile_labels WHERE id = ?1", [id], |r| r.get(0))
                .optional()?.ok_or_else(|| StoreError::NotFound(format!("метка {id}")))?;
            if preset.is_some() { return Err(StoreError::Invalid("preset")); }
        }
        let folded = fold(name);
        let taken: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM profile_labels WHERE name_folded = ?1 AND (?2 IS NULL OR id != ?2))", params![folded, id], |r| r.get(0))?;
        if taken { return Err(StoreError::Duplicate("profile_label")); }
        let saved_id = if let Some(id) = id {
            tx.execute("UPDATE profile_labels SET name = ?2, name_folded = ?3, color = ?4 WHERE id = ?1", params![id, name, folded, color])?;
            id
        } else {
            tx.execute("INSERT INTO profile_labels(name, name_folded, color) VALUES (?1, ?2, ?3)", params![name, folded, color])?;
            tx.last_insert_rowid()
        };
        tx.commit()?;
        Ok(ProfileLabel { id: saved_id, name: name.to_string(), color, preset: None })
    }

    pub fn delete_profile_label(&self, id: i64) -> Result<(), StoreError> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let preset: Option<String> = tx.query_row("SELECT preset FROM profile_labels WHERE id = ?1", [id], |r| r.get(0))
            .optional()?.ok_or_else(|| StoreError::NotFound(format!("метка {id}")))?;
        if preset.is_some() { return Err(StoreError::Invalid("preset")); }
        tx.execute("DELETE FROM profile_labels WHERE id = ?1", [id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn set_profile_label(&self, profile: &str, label: Option<i64>) -> Result<Option<ProfileLabel>, StoreError> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM profiles WHERE id = ?1 AND deleted_at IS NULL)", [profile], |r| r.get(0))?;
        if !exists { return Err(StoreError::NotFound(format!("профиль {profile}"))); }
        let saved = if let Some(id) = label {
            let saved = tx.query_row("SELECT id, name, color, preset FROM profile_labels WHERE id = ?1", [id], read_label)
                .optional()?.ok_or_else(|| StoreError::NotFound(format!("метка {id}")))?;
            tx.execute("INSERT INTO profile_label_assignments(profile_id, label_id) VALUES (?1, ?2) ON CONFLICT(profile_id) DO UPDATE SET label_id = excluded.label_id", params![profile, id])?;
            Some(saved)
        } else {
            tx.execute("DELETE FROM profile_label_assignments WHERE profile_id = ?1", [profile])?;
            None
        };
        tx.commit()?;
        Ok(saved)
    }

    pub fn labels_by_profile(&self) -> Result<HashMap<String, ProfileLabel>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare("SELECT l.id, l.name, l.color, l.preset, a.profile_id FROM profile_label_assignments a JOIN profile_labels l ON l.id = a.label_id")?;
        Ok(stmt.query_map([], |row| Ok((row.get(4)?, read_label(row)?)))?.collect::<Result<_, _>>()?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::profiles::ProfileInput;
    use crate::store::tests::{memory_store, test_box};

    fn profile(store: &Store) -> String {
        store.create_profile(&ProfileInput::new("Магазин", r#"{"seed":12345}"#), 1).unwrap().id
    }

    #[test]
    fn migration_keeps_existing_profiles_and_starts_without_a_manual_status() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("old.db");
        {
            let conn = rusqlite::Connection::open(&path).unwrap();
            crate::store::register_functions(&conn).unwrap();
            for sql in &crate::store::MIGRATIONS[..13] { conn.execute_batch(sql).unwrap(); }
            conn.execute_batch("PRAGMA user_version = 13").unwrap();
            conn.execute("INSERT INTO profiles(id, serial, name, note, fingerprint, created_at) VALUES ('old', 42, 'Магазин', 'Заметка', ?1, 1)", [r#"{"seed":12345}"#]).unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        let profile = store.get_profile("old").unwrap().unwrap();
        assert_eq!((profile.serial, profile.name.as_str(), profile.note.as_str()), (42, "Магазин", "Заметка"));
        assert!(store.labels_by_profile().unwrap().is_empty());
        assert_eq!(store.list_profile_labels().unwrap().len(), 3);
    }

    #[test]
    fn labels_persist_across_reopen_and_presets_are_not_duplicated() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("labels.db");
        let (id, custom) = {
            let store = Store::open(&path, test_box()).unwrap();
            assert_eq!(store.list_profile_labels().unwrap().iter().map(|l| l.name.as_str()).collect::<Vec<_>>(), ["BAN", "READY", "NEW"]);
            let id = profile(&store);
            assert!(store.labels_by_profile().unwrap().is_empty());
            let custom = store.save_profile_label(None, "  На проверке  ", "#6B46C1").unwrap();
            assert_eq!(custom.color, "#6b46c1");
            store.set_profile_label(&id, Some(custom.id)).unwrap();
            (id, custom)
        };
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.list_profile_labels().unwrap().len(), 4);
        assert_eq!(store.labels_by_profile().unwrap()[&id], custom);
        assert_eq!(store.get_profile(&id).unwrap().unwrap().name, "Магазин");
    }

    #[test]
    fn changing_and_removing_a_label_updates_every_assignment() {
        let store = memory_store();
        let (a, b) = (profile(&store), profile(&store));
        let label = store.save_profile_label(None, "Проверить", "#2447c9").unwrap();
        for id in [&a, &b] { store.set_profile_label(id, Some(label.id)).unwrap(); }
        let updated = store.save_profile_label(Some(label.id), "Готов к работе", "#237a36").unwrap();
        assert!(store.labels_by_profile().unwrap().values().all(|label| *label == updated));
        store.set_profile_label(&a, None).unwrap();
        assert!(!store.labels_by_profile().unwrap().contains_key(&a));
        assert!(store.labels_by_profile().unwrap().contains_key(&b));
        store.delete_profile_label(label.id).unwrap();
        assert!(store.labels_by_profile().unwrap().is_empty());
        assert!(store.get_profile(&b).unwrap().is_some());
    }

    #[test]
    fn validation_preserves_presets_and_assignments() {
        let store = memory_store();
        let presets = store.list_profile_labels().unwrap();
        let id = profile(&store);
        store.set_profile_label(&id, Some(presets[0].id)).unwrap();
        for (name, color) in [("", "#2447c9"), ("bad\nname", "#2447c9"), ("тест", "red"), ("тест", "#gggggg")] {
            assert!(matches!(store.save_profile_label(None, name, color), Err(StoreError::Invalid(_))));
        }
        assert!(matches!(store.save_profile_label(None, &"а".repeat(33), "#2447c9"), Err(StoreError::Invalid("name"))));
        assert!(matches!(store.save_profile_label(None, " ban ", "#2447c9"), Err(StoreError::Duplicate("profile_label"))));
        let label = store.save_profile_label(None, "Проверка", "#2447c9").unwrap();
        assert!(matches!(store.save_profile_label(None, "ПРОВЕРКА", "#2447c9"), Err(StoreError::Duplicate("profile_label"))));
        store.save_profile_label(Some(label.id), "проверка", "#237a36").unwrap();
        assert!(store.delete_profile_label(presets[0].id).is_err());
        assert!(store.save_profile_label(Some(presets[0].id), "Rename", "#2447c9").is_err());
        assert!(store.set_profile_label(&id, Some(99999)).is_err());
        assert_eq!(store.labels_by_profile().unwrap()[&id], presets[0]);
        assert!(store.set_profile_label("unknown", Some(label.id)).is_err());
        store.delete_profile(&id).unwrap();
        assert!(store.labels_by_profile().unwrap().is_empty());
    }
}
