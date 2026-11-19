//! Библиотека расширений и наборы — категории AdsPower (спецификация 3Б, «Библиотека», «Наборы»).
use super::groups::NAME_MAX;
use super::{Store, StoreError, fold};
use rusqlite::{Connection, OptionalExtension, Row, params};
use serde::Serialize;

/// Встроенный набор «Общий»: у новых профилей; переименовывается, но не удаляется.
pub const DEFAULT_CATEGORY: i64 = 0;
pub const REMARK_MAX: usize = 500;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ExtensionRecord {
    /// Идентификатор Chromium: 32 буквы a–p.
    pub id: String,
    pub name: String,
    pub version: String,
    /// `store` или `file`.
    pub source: String,
    pub manifest_version: i64,
    /// Есть право `proxy` или `privacy`: расширение может пустить трафик мимо шлюза.
    pub gateway_risk: bool,
    pub added_at: i64,
    pub updated_at: i64,
    /// Поле `description` манифеста (до 500 символов); у записей до миграции 007 — из папки при старте.
    pub description: String,
    /// Последний сегмент пути файла или папки, из которых добавлено; у расширений из магазина — `None`.
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ExtCategory {
    pub id: i64,
    pub name: String,
    pub remark: String,
    /// В порядке, в котором состав задан.
    pub extension_ids: Vec<String>,
    /// Живые профили с этим набором.
    pub profile_count: i64,
}

const EXTENSION_COLUMNS: &str =
    "id, name, version, source, manifest_version, gateway_risk, added_at, updated_at, description, file_name";

impl Store {
    /// Новая запись или обновление существующей (`added_at` остаётся прежним).
    pub fn upsert_extension(&self, r: &ExtensionRecord) -> Result<(), StoreError> {
        self.conn().execute(
            "INSERT INTO extensions (id, name, version, source, manifest_version, gateway_risk, added_at, updated_at, \
             description, file_name) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) \
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, version = excluded.version, source = excluded.source, \
             manifest_version = excluded.manifest_version, gateway_risk = excluded.gateway_risk, updated_at = excluded.updated_at, \
             description = excluded.description, file_name = excluded.file_name",
            params![
                r.id,
                r.name,
                r.version,
                r.source,
                r.manifest_version,
                r.gateway_risk,
                r.added_at,
                r.updated_at,
                r.description,
                r.file_name
            ],
        )?;
        Ok(())
    }

    /// Описание из манифеста — дозаполнение записей, добавленных до миграции 007.
    pub fn set_extension_description(&self, id: &str, description: &str) -> Result<(), StoreError> {
        self.conn().execute("UPDATE extensions SET description = ?2 WHERE id = ?1", params![id, description])?;
        Ok(())
    }

    pub fn get_extension(&self, id: &str) -> Result<Option<ExtensionRecord>, StoreError> {
        Ok(self
            .conn()
            .query_row(&format!("SELECT {EXTENSION_COLUMNS} FROM extensions WHERE id = ?1"), [id], row_to_extension)
            .optional()?)
    }

    pub fn list_extensions(&self) -> Result<Vec<ExtensionRecord>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(&format!("SELECT {EXTENSION_COLUMNS} FROM extensions ORDER BY ombra_fold(name), id"))?;
        let rows = stmt.query_map([], row_to_extension)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    /// Состав наборов чистится каскадом; файлы удаляет очистка при старте приложения.
    pub fn delete_extension(&self, id: &str) -> Result<(), StoreError> {
        if self.conn().execute("DELETE FROM extensions WHERE id = ?1", [id])? == 0 {
            return Err(StoreError::NotFound(format!("расширение {id}")));
        }
        Ok(())
    }

    /// Набор 0 первым, остальные по имени.
    pub fn list_ext_categories(&self) -> Result<Vec<ExtCategory>, StoreError> {
        let conn = self.conn();
        let ids: Vec<i64> = {
            let mut stmt = conn.prepare("SELECT id FROM ext_categories ORDER BY id != 0, ombra_fold(name), id")?;
            stmt.query_map([], |r| r.get(0))?.collect::<Result<_, _>>()?
        };
        ids.into_iter().map(|id| fetch_category(&conn, id)?.ok_or_else(|| not_found(id))).collect()
    }

    pub fn get_ext_category(&self, id: i64) -> Result<Option<ExtCategory>, StoreError> {
        fetch_category(&self.conn(), id)
    }

    /// Номер набора по имени без учёта регистра (импорт архива).
    pub fn ext_category_by_name(&self, name: &str) -> Result<Option<i64>, StoreError> {
        Ok(self
            .conn()
            .query_row("SELECT id FROM ext_categories WHERE name_folded = ?1", [fold(name.trim())], |r| r.get(0))
            .optional()?)
    }

    pub fn create_ext_category(&self, name: &str, remark: &str, now: i64) -> Result<ExtCategory, StoreError> {
        let (name, remark) = validate_category(name, remark)?;
        let conn = self.conn();
        ensure_free_name(&conn, &name, None)?;
        conn.execute(
            "INSERT INTO ext_categories (name, name_folded, remark, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![name, fold(&name), remark, now],
        )?;
        let id = conn.last_insert_rowid();
        fetch_category(&conn, id)?.ok_or_else(|| not_found(id))
    }

    pub fn update_ext_category(&self, id: i64, name: &str, remark: &str) -> Result<ExtCategory, StoreError> {
        let (name, remark) = validate_category(name, remark)?;
        let conn = self.conn();
        if !category_exists(&conn, id)? {
            return Err(not_found(id));
        }
        ensure_free_name(&conn, &name, Some(id))?;
        conn.execute(
            "UPDATE ext_categories SET name = ?2, name_folded = ?3, remark = ?4 WHERE id = ?1",
            params![id, name, fold(&name), remark],
        )?;
        fetch_category(&conn, id)?.ok_or_else(|| not_found(id))
    }

    /// Полная замена состава; повторы схлопываются; неизвестное расширение — ошибка поля, состав прежний.
    pub fn set_ext_category_items(&self, id: i64, extension_ids: &[String]) -> Result<ExtCategory, StoreError> {
        let conn = self.conn();
        if !category_exists(&conn, id)? {
            return Err(not_found(id));
        }
        let tx = conn.unchecked_transaction()?;
        tx.execute("DELETE FROM ext_category_items WHERE category_id = ?1", [id])?;
        for ext in extension_ids {
            let known: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM extensions WHERE id = ?1)", [ext], |r| r.get(0))?;
            if !known {
                // Транзакция откатывается при выходе.
                return Err(StoreError::Invalid("extension_ids"));
            }
            tx.execute(
                "INSERT OR IGNORE INTO ext_category_items (category_id, extension_id) VALUES (?1, ?2)",
                params![id, ext],
            )?;
        }
        tx.commit()?;
        fetch_category(&conn, id)?.ok_or_else(|| not_found(id))
    }

    /// Профили набора переходят в набор 0 — это делает триггер `ext_categories_unlink_profiles`.
    pub fn delete_ext_category(&self, id: i64) -> Result<(), StoreError> {
        if id == DEFAULT_CATEGORY {
            return Err(StoreError::Invalid("id"));
        }
        if self.conn().execute("DELETE FROM ext_categories WHERE id = ?1", [id])? == 0 {
            return Err(not_found(id));
        }
        Ok(())
    }

    /// Набор живым профилям из списка; неизвестные и профили в корзине пропускаются. Возвращает число изменённых.
    pub fn set_profiles_ext_category(&self, ids: &[String], category_id: i64) -> Result<usize, StoreError> {
        let conn = self.conn();
        check_ext_category(&conn, category_id)?;
        let tx = conn.unchecked_transaction()?;
        let mut changed = 0;
        for id in ids {
            changed += tx.execute(
                "UPDATE profiles SET ext_category_id = ?2 WHERE id = ?1 AND deleted_at IS NULL",
                params![id, category_id],
            )?;
        }
        tx.commit()?;
        Ok(changed)
    }

    /// Расширения набора для запуска: идентификатор и текущая версия, в порядке состава.
    pub fn category_extensions(&self, category_id: i64) -> Result<Vec<(String, String)>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT e.id, e.version FROM ext_category_items i JOIN extensions e ON e.id = i.extension_id \
             WHERE i.category_id = ?1 ORDER BY i.rowid",
        )?;
        let rows = stmt.query_map([category_id], |r| Ok((r.get(0)?, r.get(1)?)))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}

/// Набора нет — ошибка поля `ext_category_id` (форма профиля, назначение, Local API).
pub(crate) fn check_ext_category(conn: &Connection, id: i64) -> Result<(), StoreError> {
    if category_exists(conn, id)? { Ok(()) } else { Err(StoreError::Invalid("ext_category_id")) }
}

fn category_exists(conn: &Connection, id: i64) -> Result<bool, StoreError> {
    Ok(conn.query_row("SELECT EXISTS(SELECT 1 FROM ext_categories WHERE id = ?1)", [id], |r| r.get(0))?)
}

fn validate_category(name: &str, remark: &str) -> Result<(String, String), StoreError> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > NAME_MAX {
        return Err(StoreError::Invalid("name"));
    }
    let remark = remark.trim();
    if remark.chars().count() > REMARK_MAX {
        return Err(StoreError::Invalid("remark"));
    }
    Ok((name.to_string(), remark.to_string()))
}

/// Имя занято другим набором без учёта регистра (`except` — сам изменяемый набор).
fn ensure_free_name(conn: &Connection, name: &str, except: Option<i64>) -> Result<(), StoreError> {
    let taken: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM ext_categories WHERE name_folded = ?1 AND id IS NOT ?2)",
        params![fold(name), except],
        |r| r.get(0),
    )?;
    if taken { Err(StoreError::Duplicate("ext_category")) } else { Ok(()) }
}

fn not_found(id: i64) -> StoreError {
    StoreError::NotFound(format!("набор расширений {id}"))
}

fn fetch_category(conn: &Connection, id: i64) -> Result<Option<ExtCategory>, StoreError> {
    let head = conn
        .query_row(
            "SELECT c.name, c.remark, \
             (SELECT COUNT(*) FROM profiles p WHERE p.ext_category_id = c.id AND p.deleted_at IS NULL) \
             FROM ext_categories c WHERE c.id = ?1",
            [id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, i64>(2)?)),
        )
        .optional()?;
    let Some((name, remark, profile_count)) = head else { return Ok(None) };
    let mut stmt = conn.prepare("SELECT extension_id FROM ext_category_items WHERE category_id = ?1 ORDER BY rowid")?;
    let extension_ids = stmt.query_map([id], |r| r.get(0))?.collect::<Result<Vec<String>, _>>()?;
    Ok(Some(ExtCategory { id, name, remark, extension_ids, profile_count }))
}

fn row_to_extension(row: &Row<'_>) -> rusqlite::Result<ExtensionRecord> {
    Ok(ExtensionRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        version: row.get(2)?,
        source: row.get(3)?,
        manifest_version: row.get(4)?,
        gateway_risk: row.get(5)?,
        added_at: row.get(6)?,
        updated_at: row.get(7)?,
        description: row.get(8)?,
        file_name: row.get(9)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::profiles::ProfileInput;
    use crate::store::tests::memory_store;

    fn ext(id: &str, name: &str) -> ExtensionRecord {
        ExtensionRecord {
            id: id.into(),
            name: name.into(),
            version: "1.0".into(),
            source: "file".into(),
            manifest_version: 3,
            gateway_risk: false,
            added_at: 1,
            updated_at: 1,
            description: String::new(),
            file_name: None,
        }
    }

    const A: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const B: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    #[test]
    fn description_and_file_name_round_trip() {
        let store = memory_store();
        let mut record = ext(A, "Альфа");
        record.description = "Блокировщик".into();
        record.file_name = Some("alpha.zip".into());
        store.upsert_extension(&record).unwrap();
        assert_eq!(store.get_extension(A).unwrap().unwrap(), record);
        // Запись из магазина поверх файловой: имени файла больше нет.
        record.file_name = None;
        store.upsert_extension(&record).unwrap();
        assert_eq!(store.get_extension(A).unwrap().unwrap().file_name, None);
        store.set_extension_description(A, "Новое").unwrap();
        assert_eq!(store.get_extension(A).unwrap().unwrap().description, "Новое");
    }

    #[test]
    fn default_category_exists_and_is_first() {
        let store = memory_store();
        let shop = store.create_ext_category("Магазин", "", 5).unwrap();
        let list = store.list_ext_categories().unwrap();
        assert_eq!(list.iter().map(|c| c.id).collect::<Vec<_>>(), vec![DEFAULT_CATEGORY, shop.id]);
        assert_eq!(list[0].name, "Общий");
        assert!(shop.id > 0);
    }

    #[test]
    fn category_names_are_checked() {
        let store = memory_store();
        store.create_ext_category("Магазин", "", 5).unwrap();
        assert!(matches!(store.create_ext_category("  МАГАЗИН ", "", 5), Err(StoreError::Duplicate("ext_category"))));
        assert!(matches!(store.create_ext_category("общий", "", 5), Err(StoreError::Duplicate("ext_category"))));
        assert!(matches!(store.create_ext_category("  ", "", 5), Err(StoreError::Invalid("name"))));
        assert!(matches!(store.create_ext_category(&"я".repeat(51), "", 5), Err(StoreError::Invalid("name"))));
        assert!(matches!(store.create_ext_category("Ок", &"я".repeat(501), 5), Err(StoreError::Invalid("remark"))));
        let renamed = store.update_ext_category(DEFAULT_CATEGORY, "Все", "для всех").unwrap();
        assert_eq!((renamed.name.as_str(), renamed.remark.as_str()), ("Все", "для всех"));
        assert!(matches!(store.update_ext_category(99, "Нет", ""), Err(StoreError::NotFound(_))));
        assert_eq!(store.ext_category_by_name(" все ").unwrap(), Some(DEFAULT_CATEGORY));
        assert_eq!(store.ext_category_by_name("нет такого").unwrap(), None);
    }

    #[test]
    fn items_replace_and_cascade_with_the_extension() {
        let store = memory_store();
        store.upsert_extension(&ext(A, "Альфа")).unwrap();
        store.upsert_extension(&ext(B, "Бета")).unwrap();
        let shop = store.create_ext_category("Магазин", "", 5).unwrap();
        let set = store.set_ext_category_items(shop.id, &[B.into(), A.into(), B.into()]).unwrap();
        assert_eq!(set.extension_ids, vec![B.to_string(), A.to_string()]);
        assert!(matches!(store.set_ext_category_items(shop.id, &["c".repeat(32)]), Err(StoreError::Invalid("extension_ids"))));
        assert_eq!(store.get_ext_category(shop.id).unwrap().unwrap().extension_ids.len(), 2, "ошибка не меняет состав");
        let mut newer = ext(A, "Альфа");
        newer.version = "2.0".into();
        store.upsert_extension(&newer).unwrap();
        assert_eq!(store.category_extensions(shop.id).unwrap(), vec![(B.into(), "1.0".into()), (A.into(), "2.0".into())]);
        store.delete_extension(B).unwrap();
        assert_eq!(store.get_ext_category(shop.id).unwrap().unwrap().extension_ids, vec![A.to_string()]);
        assert!(matches!(store.delete_extension(B), Err(StoreError::NotFound(_))));
        assert_eq!(store.list_extensions().unwrap().len(), 1);
    }

    #[test]
    fn deleting_a_category_moves_profiles_to_default() {
        let store = memory_store();
        let shop = store.create_ext_category("Магазин", "", 5).unwrap();
        let mut input = ProfileInput::new("p", r#"{"seed":1}"#);
        input.ext_category_id = shop.id;
        let profile = store.create_profile(&input, 1).unwrap();
        assert_eq!(profile.ext_category_id, shop.id);
        assert_eq!(store.get_ext_category(shop.id).unwrap().unwrap().profile_count, 1);
        assert!(matches!(store.delete_ext_category(DEFAULT_CATEGORY), Err(StoreError::Invalid("id"))));
        store.delete_ext_category(shop.id).unwrap();
        assert_eq!(store.get_profile(&profile.id).unwrap().unwrap().ext_category_id, DEFAULT_CATEGORY);
        assert!(matches!(store.delete_ext_category(shop.id), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn profiles_get_a_category_only_if_it_exists_and_only_when_live() {
        let store = memory_store();
        let shop = store.create_ext_category("Магазин", "", 5).unwrap();
        let live = store.create_profile(&ProfileInput::new("live", r#"{"seed":1}"#), 1).unwrap();
        let trashed = store.create_profile(&ProfileInput::new("trash", r#"{"seed":2}"#), 1).unwrap();
        store.set_deleted(std::slice::from_ref(&trashed.id), Some(9)).unwrap();
        let ids = [live.id.clone(), trashed.id.clone(), "nope".into()];
        assert_eq!(store.set_profiles_ext_category(&ids, shop.id).unwrap(), 1);
        assert_eq!(store.get_ext_category(shop.id).unwrap().unwrap().profile_count, 1);
        assert!(matches!(store.set_profiles_ext_category(&ids, 77), Err(StoreError::Invalid("ext_category_id"))));
        let mut input = ProfileInput::new("bad", r#"{"seed":3}"#);
        input.ext_category_id = 77;
        assert!(matches!(store.create_profile(&input, 1), Err(StoreError::Invalid("ext_category_id"))));
    }
}
