//! Закладки профиля: упорядоченный список, при сохранении заменяется целиком.
use super::{Store, StoreError};
use rusqlite::params;
use serde::{Deserialize, Serialize};

pub const BOOKMARKS_MAX: usize = 500;
pub const BOOKMARK_TITLE_MAX: usize = 200;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Bookmark {
    pub title: String,
    pub url: String,
}

impl Store {
    pub fn profile_bookmarks(&self, id: &str) -> Result<Vec<Bookmark>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare("SELECT title, url FROM bookmarks WHERE profile_id = ?1 ORDER BY position")?;
        let rows = stmt.query_map([id], |r| Ok(Bookmark { title: r.get(0)?, url: r.get(1)? }))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn set_profile_bookmarks(&self, id: &str, list: &[Bookmark]) -> Result<(), StoreError> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        set_bookmarks_tx(&tx, id, list)?;
        Ok(tx.commit()?)
    }
}

/// Замена списка внутри чужой транзакции (создание и правка профиля).
pub(crate) fn set_bookmarks_tx(conn: &rusqlite::Connection, id: &str, list: &[Bookmark]) -> Result<(), StoreError> {
    let valid = |bookmark: &Bookmark| {
        let url = bookmark.url.trim();
        (1..=BOOKMARK_TITLE_MAX).contains(&bookmark.title.trim().chars().count())
            && (url.starts_with("http://") || url.starts_with("https://"))
    };
    if list.len() > BOOKMARKS_MAX || !list.iter().all(valid) {
        return Err(StoreError::Invalid("bookmarks"));
    }
    conn.execute("DELETE FROM bookmarks WHERE profile_id = ?1", [id])?;
    for (position, b) in list.iter().enumerate() {
        conn.execute(
            "INSERT INTO bookmarks (profile_id, position, title, url) VALUES (?1, ?2, ?3, ?4)",
            params![id, position as i64, b.title.trim(), b.url.trim()],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::profiles::ProfileInput;
    use crate::store::tests::memory_store;

    fn b(t: &str) -> Bookmark {
        Bookmark { title: t.into(), url: format!("https://{t}.test/") }
    }

    #[test]
    fn bookmarks_keep_order_and_are_replaced() {
        let store = memory_store();
        let rec = store.create_profile(&ProfileInput::new("a", "{}"), 1).unwrap();
        store.set_profile_bookmarks(&rec.id, &[b("z"), b("a")]).unwrap();
        assert_eq!(store.profile_bookmarks(&rec.id).unwrap(), [b("z"), b("a")]);
        store.set_profile_bookmarks(&rec.id, &[b("m")]).unwrap();
        assert_eq!(store.profile_bookmarks(&rec.id).unwrap(), [b("m")]);
        for invalid in [vec![b("")], vec![b("x"); BOOKMARKS_MAX + 1],
            vec![Bookmark { title: "Local".into(), url: "file:///tmp".into() }]] {
            assert!(matches!(store.set_profile_bookmarks(&rec.id, &invalid), Err(StoreError::Invalid("bookmarks"))));
            assert_eq!(store.profile_bookmarks(&rec.id).unwrap(), [b("m")]);
        }
    }
}
