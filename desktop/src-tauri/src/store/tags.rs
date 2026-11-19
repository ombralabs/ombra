//! Теги профилей: общие для всех профилей, сравниваются без учёта регистра, хранится первое написание.
//! Тег, за которым не осталось профилей, удаляется (`prune_tags`).
use super::{Store, StoreError, fold};
use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use std::collections::{HashMap, HashSet};

/// Длина тега в символах — одна на хранилище и формы (`app::forms::tag_errors`).
pub const TAG_MAX: usize = 30;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct TagRecord {
    pub id: i64,
    pub name: String,
    pub profile_count: i64,
}

impl Store {
    pub fn list_tags(&self) -> Result<Vec<TagRecord>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT t.id, t.name, (SELECT COUNT(*) FROM profile_tags pt JOIN profiles p ON p.id = pt.profile_id \
             WHERE pt.tag_id = t.id AND p.deleted_at IS NULL) \
             FROM tags t ORDER BY ombra_fold(t.name), t.id",
        )?;
        let rows = stmt.query_map([], |r| Ok(TagRecord { id: r.get(0)?, name: r.get(1)?, profile_count: r.get(2)? }))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn profile_tags(&self, id: &str) -> Result<Vec<String>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT t.name FROM profile_tags pt JOIN tags t ON t.id = pt.tag_id \
             WHERE pt.profile_id = ?1 ORDER BY ombra_fold(t.name), t.id",
        )?;
        let rows = stmt.query_map([id], |r| r.get(0))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    /// Теги всех профилей одним запросом — для списка. Профили без тегов в карту не попадают.
    pub fn tags_by_profile(&self) -> Result<HashMap<String, Vec<String>>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT pt.profile_id, t.name FROM profile_tags pt JOIN tags t ON t.id = pt.tag_id \
             ORDER BY pt.profile_id, ombra_fold(t.name), t.id",
        )?;
        let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
        let mut map: HashMap<String, Vec<String>> = HashMap::new();
        for row in rows {
            let (profile, name) = row?;
            map.entry(profile).or_default().push(name);
        }
        Ok(map)
    }

    /// Одна транзакция на все профили и теги. Неизвестные профили пропускаются.
    pub fn add_tags(&self, ids: &[String], names: &[String]) -> Result<(), StoreError> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        add_tags_tx(&tx, ids, names)?;
        tx.commit()?;
        Ok(())
    }

    /// Снимает теги и удаляет теги без профилей.
    pub fn remove_tags(&self, ids: &[String], names: &[String]) -> Result<(), StoreError> {
        let names = clean_names(names)?;
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        for name in &names {
            let Some(tag_id) = find_tag(&tx, name)? else { continue };
            for id in ids {
                tx.execute("DELETE FROM profile_tags WHERE profile_id = ?1 AND tag_id = ?2", params![id, tag_id])?;
            }
        }
        prune_tags(&tx)?;
        tx.commit()?;
        Ok(())
    }

    /// Набор тегов профиля заменяется списком одной транзакцией; теги без профилей удаляются. Неизвестный профиль пропускается.
    pub fn set_profile_tags(&self, id: &str, names: &[String]) -> Result<(), StoreError> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        set_profile_tags_tx(&tx, id, names)?;
        tx.commit()?;
        Ok(())
    }

    /// Быстрая правка меняет только указанные теги; параллельные правки остальных тегов не теряются.
    pub fn change_profile_tags(&self, id: &str, add: &[String], remove: &[String]) -> Result<Vec<String>, StoreError> {
        clean_names(add)?;
        let remove = clean_names(remove)?;
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM profiles WHERE id = ?1 AND deleted_at IS NULL)", [id], |r| r.get(0))?;
        if !exists { return Err(StoreError::NotFound(format!("профиль {id}"))); }
        add_tags_tx(&tx, &[id.to_string()], add)?;
        for name in remove {
            if let Some(tag_id) = find_tag(&tx, &name)? {
                tx.execute("DELETE FROM profile_tags WHERE profile_id = ?1 AND tag_id = ?2", params![id, tag_id])?;
            }
        }
        prune_tags(&tx)?;
        let tags = {
            let mut stmt = tx.prepare("SELECT t.name FROM profile_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.profile_id = ?1 ORDER BY ombra_fold(t.name), t.id")?;
            stmt.query_map([id], |r| r.get(0))?.collect::<Result<Vec<String>, _>>()?
        };
        tx.commit()?;
        Ok(tags)
    }
}

/// Добавление тегов внутри уже открытой транзакции (так же его использует массовое создание).
pub(crate) fn add_tags_tx(conn: &Connection, ids: &[String], names: &[String]) -> Result<(), StoreError> {
    let names = clean_names(names)?;
    for name in &names {
        let tag_id = match find_tag(conn, name)? {
            Some(id) => id,
            None => {
                conn.execute("INSERT INTO tags (name) VALUES (?1)", [name])?;
                conn.last_insert_rowid()
            }
        };
        for id in ids {
            conn.execute(
                "INSERT OR IGNORE INTO profile_tags (profile_id, tag_id) \
                 SELECT ?1, ?2 WHERE EXISTS (SELECT 1 FROM profiles WHERE id = ?1)",
                params![id, tag_id],
            )?;
        }
    }
    // Тег, созданный только для неизвестных профилей, не должен остаться.
    prune_tags(conn)
}

/// Замена набора тегов профиля внутри открытой транзакции. Имена проверяются до записи: ошибка не снимает старые теги.
pub(crate) fn set_profile_tags_tx(conn: &Connection, id: &str, names: &[String]) -> Result<(), StoreError> {
    clean_names(names)?;
    conn.execute("DELETE FROM profile_tags WHERE profile_id = ?1", [id])?;
    add_tags_tx(conn, &[id.to_string()], names)
}

pub(crate) fn prune_tags(conn: &Connection) -> Result<(), StoreError> {
    conn.execute(
        "DELETE FROM tags WHERE NOT EXISTS (SELECT 1 FROM profile_tags pt WHERE pt.tag_id = tags.id)",
        [],
    )?;
    Ok(())
}

/// Теги без пробелов по краям, без повторов без учёта регистра; пустой или длиннее 30 символов — ошибка.
fn clean_names(names: &[String]) -> Result<Vec<String>, StoreError> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for name in names {
        let name = name.trim();
        if name.is_empty() || name.chars().count() > TAG_MAX {
            return Err(StoreError::Invalid("tag"));
        }
        if seen.insert(fold(name)) {
            out.push(name.to_string());
        }
    }
    Ok(out)
}

fn find_tag(conn: &Connection, name: &str) -> Result<Option<i64>, StoreError> {
    Ok(conn
        .query_row("SELECT id FROM tags WHERE ombra_fold(name) = ?1 ORDER BY id LIMIT 1", [fold(name)], |r| r.get(0))
        .optional()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::profiles::ProfileInput;
    use crate::store::tests::memory_store;

    fn profile(store: &Store, name: &str) -> String {
        store.create_profile(&ProfileInput::new(name, r#"{"seed":1}"#), 1).unwrap().id
    }

    fn names(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn quick_tag_changes_are_atomic_and_preserve_unrelated_tags() {
        let store = memory_store();
        let a = profile(&store, "a");
        let b = profile(&store, "b");
        store.add_tags(&[a.clone(), b.clone()], &names(&["Shop"])).unwrap();
        store.add_tags(std::slice::from_ref(&a), &names(&["main", "from-task"])).unwrap();
        assert_eq!(store.change_profile_tags(&a, &names(&[" VIP ", "vip"]), &names(&["MAIN"])).unwrap(), ["from-task", "Shop", "VIP"]);
        assert_eq!(store.profile_tags(&b).unwrap(), ["Shop"]);
        let before = store.profile_tags(&a).unwrap();
        assert!(store.change_profile_tags(&a, &["я".repeat(31)], &names(&["Shop"])).is_err());
        assert!(store.change_profile_tags(&a, &names(&["new"]), &["я".repeat(31)]).is_err());
        assert_eq!(store.profile_tags(&a).unwrap(), before, "неверное имя не снимает и не добавляет другие теги");
        assert!(store.change_profile_tags("missing", &names(&["orphan"]), &[]).is_err());
        assert!(!store.list_tags().unwrap().iter().any(|tag| tag.name == "orphan" || tag.name == "new"));
        store.change_profile_tags(&a, &[], &names(&["vip"])).unwrap();
        assert!(!store.list_tags().unwrap().iter().any(|tag| tag.name == "VIP"), "неиспользуемый тег удаляется из справочника");
    }

    #[test]
    fn tags_are_shared_case_insensitively_and_pruned() {
        let store = memory_store();
        let a = profile(&store, "a");
        let b = profile(&store, "b");
        store.add_tags(std::slice::from_ref(&a), &names(&["Shop"])).unwrap();
        store.add_tags(std::slice::from_ref(&b), &names(&[" shop ", "SHOP"])).unwrap();
        let tags = store.list_tags().unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!((tags[0].name.as_str(), tags[0].profile_count), ("Shop", 2));
        assert_eq!(store.profile_tags(&b).unwrap(), ["Shop"]);

        store.remove_tags(&[a.clone(), b.clone()], &names(&["SHOP"])).unwrap();
        assert!(store.list_tags().unwrap().is_empty(), "тег без профилей удаляется");

        store.add_tags(std::slice::from_ref(&a), &names(&["vip"])).unwrap();
        store.delete_profile(&a).unwrap();
        assert!(store.list_tags().unwrap().is_empty(), "удаление профиля убирает его последний тег");
    }

    #[test]
    fn tag_validation() {
        let store = memory_store();
        let a = profile(&store, "a");
        assert!(matches!(store.add_tags(std::slice::from_ref(&a), &names(&["  "])), Err(StoreError::Invalid("tag"))));
        assert!(matches!(store.add_tags(std::slice::from_ref(&a), &["я".repeat(31)]), Err(StoreError::Invalid("tag"))));
        assert!(store.list_tags().unwrap().is_empty(), "ошибка ничего не записывает");
        store.add_tags(std::slice::from_ref(&a), &["я".repeat(30)]).unwrap();
        assert_eq!(store.list_tags().unwrap().len(), 1);
    }

    #[test]
    fn tags_by_profile_lists_names_in_order() {
        let store = memory_store();
        let a = profile(&store, "a");
        let b = profile(&store, "b");
        let c = profile(&store, "c");
        store.add_tags(std::slice::from_ref(&a), &names(&["b-tag", "A-tag"])).unwrap();
        store.add_tags(std::slice::from_ref(&b), &names(&["b-tag"])).unwrap();
        let map = store.tags_by_profile().unwrap();
        assert_eq!(map[&a], ["A-tag", "b-tag"]);
        assert_eq!(map[&b], ["b-tag"]);
        assert!(!map.contains_key(&c));
        let all: Vec<(String, i64)> = store.list_tags().unwrap().into_iter().map(|t| (t.name, t.profile_count)).collect();
        assert_eq!(all, [("A-tag".to_string(), 1), ("b-tag".to_string(), 2)]);
    }

    #[test]
    fn profile_tags_are_replaced_as_a_set() {
        let store = memory_store();
        let a = profile(&store, "a");
        let b = profile(&store, "b");
        store.add_tags(std::slice::from_ref(&a), &names(&["old", "Shop"])).unwrap();
        store.add_tags(std::slice::from_ref(&b), &names(&["shop"])).unwrap();

        store.set_profile_tags(&a, &names(&["vip", " SHOP ", "VIP"])).unwrap();
        assert_eq!(store.profile_tags(&a).unwrap(), ["Shop", "vip"], "регистр — как у существующего тега, повторы склеены");
        let all: Vec<String> = store.list_tags().unwrap().into_iter().map(|t| t.name).collect();
        assert_eq!(all, ["Shop", "vip"], "тег без профилей удалён");

        assert!(matches!(store.set_profile_tags(&a, &["я".repeat(31)]), Err(StoreError::Invalid("tag"))));
        assert_eq!(store.profile_tags(&a).unwrap(), ["Shop", "vip"], "ошибка ничего не меняет");

        store.set_profile_tags(&a, &[]).unwrap();
        assert!(store.profile_tags(&a).unwrap().is_empty());
        assert_eq!(store.profile_tags(&b).unwrap(), ["Shop"], "теги другого профиля не тронуты");
        store.set_profile_tags("nope00", &names(&["x"])).unwrap();
        assert_eq!(store.list_tags().unwrap().len(), 1, "неизвестный профиль пропускается");
    }

    #[test]
    fn unknown_profiles_are_skipped() {
        let store = memory_store();
        store.add_tags(&["nope00".to_string()], &names(&["x"])).unwrap();
        assert!(store.list_tags().unwrap().is_empty());
        store.remove_tags(&["nope00".to_string()], &names(&["x"])).unwrap();
    }
}
