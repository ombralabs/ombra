//! Группы профилей: название, цвет, заметка, «быстрый доступ» (спецификация 2А, «Модель данных»).
use super::{Store, StoreError, fold};
use rusqlite::{Connection, OptionalExtension, Row, params};
use serde::Serialize;

pub(crate) const NAME_MAX: usize = 50;

#[derive(Debug, Clone)]
pub struct GroupInput {
    pub name: String,
    pub color: String,
    pub note: String,
    pub quick_access: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct GroupRecord {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub note: String,
    pub quick_access: bool,
    pub created_at: i64,
    /// Сколько профилей в группе — для «облака» над списком.
    pub profile_count: i64,
}

const GROUP_SELECT: &str = "SELECT g.id, g.name, g.color, g.note, g.quick_access, g.created_at, \
                            (SELECT COUNT(*) FROM profiles p WHERE p.group_id = g.id AND p.deleted_at IS NULL) FROM groups g";

impl Store {
    pub fn create_group(&self, input: &GroupInput, now: i64) -> Result<GroupRecord, StoreError> {
        let (name, color) = validate(input)?;
        let conn = self.conn();
        ensure_free_name(&conn, &name, None)?;
        conn.execute(
            "INSERT INTO groups (name, name_folded, color, note, quick_access, created_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![name, fold(&name), color, input.note.trim(), input.quick_access, now],
        )?;
        let id = conn.last_insert_rowid();
        fetch(&conn, id)?.ok_or_else(|| not_found(id))
    }

    pub fn update_group(&self, id: i64, input: &GroupInput) -> Result<GroupRecord, StoreError> {
        let (name, color) = validate(input)?;
        let conn = self.conn();
        if !group_exists(&conn, id)? {
            return Err(not_found(id));
        }
        ensure_free_name(&conn, &name, Some(id))?;
        conn.execute(
            "UPDATE groups SET name = ?2, name_folded = ?3, color = ?4, note = ?5, quick_access = ?6 WHERE id = ?1",
            params![id, name, fold(&name), color, input.note.trim(), input.quick_access],
        )?;
        fetch(&conn, id)?.ok_or_else(|| not_found(id))
    }

    /// Профили группы переходят в «Без группы» — это делает триггер `groups_unlink_profiles`.
    pub fn delete_group(&self, id: i64) -> Result<(), StoreError> {
        let changed = self.conn().execute("DELETE FROM groups WHERE id = ?1", [id])?;
        if changed == 0 {
            return Err(not_found(id));
        }
        Ok(())
    }

    pub fn get_group(&self, id: i64) -> Result<Option<GroupRecord>, StoreError> {
        fetch(&self.conn(), id)
    }

    pub fn list_groups(&self) -> Result<Vec<GroupRecord>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(&format!("{GROUP_SELECT} ORDER BY ombra_fold(g.name), g.id"))?;
        let rows = stmt.query_map([], row_to_group)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn ungrouped_count(&self) -> Result<i64, StoreError> {
        Ok(self.conn().query_row("SELECT COUNT(*) FROM profiles WHERE group_id IS NULL AND deleted_at IS NULL", [], |r| r.get(0))?)
    }

    /// Перенос в группу (`None` — «Без группы»). Неизвестные профили пропускаются; возвращает число перенесённых.
    pub fn move_profiles(&self, ids: &[String], group_id: Option<i64>) -> Result<usize, StoreError> {
        let conn = self.conn();
        if let Some(group) = group_id
            && !group_exists(&conn, group)?
        {
            return Err(StoreError::Invalid("group_id"));
        }
        let tx = conn.unchecked_transaction()?;
        let mut moved = 0;
        for id in ids {
            moved += tx.execute("UPDATE profiles SET group_id = ?2 WHERE id = ?1", params![id, group_id])?;
        }
        tx.commit()?;
        Ok(moved)
    }
}

pub(crate) fn group_exists(conn: &Connection, id: i64) -> Result<bool, StoreError> {
    Ok(conn.query_row("SELECT EXISTS(SELECT 1 FROM groups WHERE id = ?1)", [id], |r| r.get(0))?)
}

/// Имя без пробелов по краям и цвет `#rrggbb` в нижнем регистре.
fn validate(input: &GroupInput) -> Result<(String, String), StoreError> {
    let name = input.name.trim();
    if name.is_empty() || name.chars().count() > NAME_MAX {
        return Err(StoreError::Invalid("group_name"));
    }
    let color = input.color.trim();
    let valid = color.len() == 7 && color.starts_with('#') && color[1..].bytes().all(|b| b.is_ascii_hexdigit());
    if !valid {
        return Err(StoreError::Invalid("group_color"));
    }
    Ok((name.to_string(), color.to_ascii_lowercase()))
}

/// Имя занято другой группой без учёта регистра (`except` — сама изменяемая группа).
fn ensure_free_name(conn: &Connection, name: &str, except: Option<i64>) -> Result<(), StoreError> {
    let taken: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM groups WHERE name_folded = ?1 AND id IS NOT ?2)",
        params![fold(name), except],
        |r| r.get(0),
    )?;
    if taken { Err(StoreError::Duplicate("group")) } else { Ok(()) }
}

fn not_found(id: i64) -> StoreError {
    StoreError::NotFound(format!("группа {id}"))
}

fn fetch(conn: &Connection, id: i64) -> Result<Option<GroupRecord>, StoreError> {
    Ok(conn.query_row(&format!("{GROUP_SELECT} WHERE g.id = ?1"), [id], row_to_group).optional()?)
}

fn row_to_group(row: &Row<'_>) -> rusqlite::Result<GroupRecord> {
    Ok(GroupRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        note: row.get(3)?,
        quick_access: row.get(4)?,
        created_at: row.get(5)?,
        profile_count: row.get(6)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::profiles::ProfileInput;
    use crate::store::tests::memory_store;

    fn group(name: &str, color: &str) -> GroupInput {
        GroupInput { name: name.into(), color: color.into(), note: String::new(), quick_access: false }
    }

    fn profile(store: &Store, name: &str) -> String {
        store.create_profile(&ProfileInput::new(name, r#"{"seed":1}"#), 1).unwrap().id
    }

    #[test]
    fn groups_are_created_listed_and_counted() {
        let store = memory_store();
        let mut input = group("  Реклама ", "#2447C9");
        input.note = "  кампания  ".into();
        input.quick_access = true;
        let ads = store.create_group(&input, 100).unwrap();
        assert_eq!(
            (ads.name.as_str(), ads.color.as_str(), ads.note.as_str(), ads.quick_access, ads.created_at),
            ("Реклама", "#2447c9", "кампания", true, 100)
        );
        let shops = store.create_group(&group("магазины", "#0b6e6e"), 101).unwrap();
        let a = profile(&store, "a");
        let b = profile(&store, "b");
        profile(&store, "c");
        assert_eq!(store.move_profiles(&[a.clone(), b.clone()], Some(shops.id)).unwrap(), 2);
        let listed: Vec<(String, i64)> =
            store.list_groups().unwrap().into_iter().map(|g| (g.name, g.profile_count)).collect();
        assert_eq!(listed, [("магазины".to_string(), 2), ("Реклама".to_string(), 0)]);
        assert_eq!(store.ungrouped_count().unwrap(), 1);
        assert_eq!(store.get_group(shops.id).unwrap().unwrap().profile_count, 2);
        assert_eq!(store.get_group(999).unwrap(), None);

        let mut change = group("Реклама 2", "#7A3FC4");
        change.quick_access = false;
        let updated = store.update_group(ads.id, &change).unwrap();
        assert_eq!((updated.name.as_str(), updated.color.as_str(), updated.quick_access), ("Реклама 2", "#7a3fc4", false));
        assert!(matches!(store.update_group(999, &change), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn group_name_is_unique_ignoring_case() {
        let store = memory_store();
        let shops = store.create_group(&group("Магазины", "#2447c9"), 1).unwrap();
        assert!(matches!(store.create_group(&group("МАГАЗИНЫ", "#2447c9"), 1), Err(StoreError::Duplicate("group"))));
        assert!(matches!(store.create_group(&group("  магазины ", "#2447c9"), 1), Err(StoreError::Duplicate("group"))));
        let other = store.create_group(&group("Реклама", "#2447c9"), 1).unwrap();
        assert!(matches!(store.update_group(other.id, &group("магазины", "#2447c9")), Err(StoreError::Duplicate("group"))));
        assert_eq!(store.update_group(shops.id, &group("МАГАЗИНЫ", "#2447c9")).unwrap().name, "МАГАЗИНЫ");
    }

    #[test]
    fn group_validation() {
        let store = memory_store();
        assert!(matches!(store.create_group(&group("   ", "#2447c9"), 1), Err(StoreError::Invalid("group_name"))));
        assert!(matches!(store.create_group(&group(&"я".repeat(51), "#2447c9"), 1), Err(StoreError::Invalid("group_name"))));
        store.create_group(&group(&"я".repeat(50), "#2447c9"), 1).unwrap();
        for bad in ["red", "#12345G", "#12345", "2447c9", "#2447c9ff", ""] {
            assert!(matches!(store.create_group(&group("x", bad), 1), Err(StoreError::Invalid("group_color"))), "{bad}");
        }
        assert_eq!(store.create_group(&group("x", " #ABCDEF "), 1).unwrap().color, "#abcdef");
    }

    #[test]
    fn deleting_group_ungroups_profiles() {
        let store = memory_store();
        let shops = store.create_group(&group("Магазины", "#2447c9"), 1).unwrap();
        let a = profile(&store, "a");
        store.move_profiles(std::slice::from_ref(&a), Some(shops.id)).unwrap();
        store.delete_group(shops.id).unwrap();
        assert_eq!(store.get_profile(&a).unwrap().unwrap().group_id, None);
        assert_eq!(store.ungrouped_count().unwrap(), 1);
        assert!(matches!(store.delete_group(shops.id), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn move_profiles_checks_group() {
        let store = memory_store();
        let shops = store.create_group(&group("Магазины", "#2447c9"), 1).unwrap();
        let a = profile(&store, "a");
        assert!(matches!(store.move_profiles(std::slice::from_ref(&a), Some(999)), Err(StoreError::Invalid("group_id"))));
        assert_eq!(store.move_profiles(&[a.clone(), "nope00".to_string()], Some(shops.id)).unwrap(), 1);
        assert_eq!(store.get_profile(&a).unwrap().unwrap().group_id, Some(shops.id));
        assert_eq!(store.move_profiles(std::slice::from_ref(&a), None).unwrap(), 1);
        assert_eq!(store.get_profile(&a).unwrap().unwrap().group_id, None);
    }
}
