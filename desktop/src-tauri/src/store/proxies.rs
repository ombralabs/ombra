use super::secrets::{Secret, SecretField};
use super::{Store, StoreError};
use rusqlite::types::Type;
use rusqlite::{Connection, OptionalExtension, Row, params};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyKind {
    Http,
    Https,
    Socks5,
}

impl ProxyKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Http => "http",
            Self::Https => "https",
            Self::Socks5 => "socks5",
        }
    }

    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "http" => Some(Self::Http),
            "https" => Some(Self::Https),
            "socks5" => Some(Self::Socks5),
            _ => None,
        }
    }
}

#[derive(Clone)]
pub struct ProxyInput {
    pub kind: ProxyKind,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: SecretField,
    pub note: String,
    pub enabled: bool,
}

/// Результат последней проверки прокси: кнопкой «Проверить» или при запуске профиля.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ProxyCheck {
    pub at: i64,
    pub ok: bool,
    /// IP и страна последней удачной проверки: неудача их не стирает.
    pub exit_ip: Option<String>,
    pub country: Option<String>,
}

#[derive(Clone, PartialEq, Serialize)]
pub struct ProxyRecord {
    pub id: i64,
    pub kind: ProxyKind,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub has_password: bool,
    pub note: String,
    pub enabled: bool,
    /// `None`, пока прокси ни разу не проверяли.
    pub check: Option<ProxyCheck>,
}

// Логин прокси в `Debug` не попадает.
impl fmt::Debug for ProxyInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProxyInput")
            .field("kind", &self.kind)
            .field("host", &self.host)
            .field("port", &self.port)
            .field("username", &self.username.as_ref().map(|_| "***"))
            .field("password", &self.password)
            .field("note", &self.note)
            .field("enabled", &self.enabled)
            .finish()
    }
}

impl fmt::Debug for ProxyRecord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProxyRecord")
            .field("id", &self.id)
            .field("kind", &self.kind)
            .field("host", &self.host)
            .field("port", &self.port)
            .field("username", &self.username.as_ref().map(|_| "***"))
            .field("has_password", &self.has_password)
            .field("note", &self.note)
            .field("enabled", &self.enabled)
            .field("check", &self.check)
            .finish()
    }
}

/// Всё, что нужно прослойке. Пароль расшифрован и в `Debug` не раскрывается.
#[derive(Clone)]
pub struct ProxyCredentials {
    pub id: i64,
    pub kind: ProxyKind,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<Secret>,
}

/// Закрепления одного прокси: сколько профилей за ним и имя профиля, если он один.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProxyPins {
    pub profiles: i64,
    pub only: Option<String>,
}

impl fmt::Debug for ProxyCredentials {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProxyCredentials")
            .field("id", &self.id)
            .field("kind", &self.kind)
            .field("host", &self.host)
            .field("port", &self.port)
            .field("username", &self.username.as_ref().map(|_| "***"))
            .field("password", &self.password.as_ref().map(|_| "***"))
            .finish()
    }
}

/// Колонки (kind, host, port, username, password_enc) как в таблице.
type ProxyRow = (String, String, u16, Option<String>, Option<Vec<u8>>);

const COLUMNS: &str =
    "id, kind, host, port, username, password_enc IS NOT NULL, note, enabled, checked_at, check_ok, exit_ip, country";

impl Store {
    pub fn create_proxy(&self, input: &ProxyInput) -> Result<ProxyRecord, StoreError> {
        let conn = self.conn();
        let id = self.insert_proxy_tx(&conn, input)?;
        fetch(&conn, id)?.ok_or_else(|| StoreError::NotFound(format!("прокси {id}")))
    }

    /// Ручной прокси сохраняется в одной транзакции с профилем, без осиротевших записей при ошибке.
    pub(super) fn insert_proxy_tx(&self, conn: &Connection, input: &ProxyInput) -> Result<i64, StoreError> {
        validate(input)?;
        let password = match &input.password {
            SecretField::Set(secret) => Some(self.secrets.encrypt(secret)?),
            SecretField::Keep | SecretField::Clear => None,
        };
        conn.execute(
            "INSERT INTO proxies (kind, host, port, username, password_enc, note, enabled) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![input.kind.as_str(), input.host.trim(), input.port, input.username, password, input.note, input.enabled],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_proxy(&self, id: i64) -> Result<Option<ProxyRecord>, StoreError> {
        fetch(&self.conn(), id)
    }

    pub fn update_proxy(&self, id: i64, input: &ProxyInput) -> Result<ProxyRecord, StoreError> {
        validate(input)?;
        let conn = self.conn();
        let old: Option<ProxyRow> = conn
            .query_row(
                "SELECT kind, host, port, username, password_enc FROM proxies WHERE id = ?1",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .optional()?;
        let (kind, host, port, username, old_password) =
            old.ok_or_else(|| StoreError::NotFound(format!("прокси {id}")))?;
        let password = match &input.password {
            SecretField::Keep => old_password,
            SecretField::Clear => None,
            SecretField::Set(secret) => Some(self.secrets.encrypt(secret)?),
        };
        // Другой адрес или логин — прошлая проверка (IP, страна) говорит уже не об этом прокси.
        let moved = (kind.as_str(), host.as_str(), port, username.as_deref())
            != (input.kind.as_str(), input.host.trim(), input.port, input.username.as_deref());
        conn.execute(
            "UPDATE proxies SET kind = ?2, host = ?3, port = ?4, username = ?5, password_enc = ?6, note = ?7, \
             enabled = ?8 WHERE id = ?1",
            params![id, input.kind.as_str(), input.host.trim(), input.port, input.username, password, input.note, input.enabled],
        )?;
        if moved {
            conn.execute(
                "UPDATE proxies SET checked_at = NULL, check_ok = NULL, exit_ip = NULL, country = NULL WHERE id = ?1",
                [id],
            )?;
        }
        fetch(&conn, id)?.ok_or_else(|| StoreError::NotFound(format!("прокси {id}")))
    }

    pub fn delete_proxy(&self, id: i64) -> Result<(), StoreError> {
        self.delete_proxies(&[id])
    }

    /// Пачка одной транзакцией: неизвестный id — `NotFound`, и не удалено ничего.
    /// Закрепления профилей снимаются (ON DELETE SET NULL).
    pub fn delete_proxies(&self, ids: &[i64]) -> Result<(), StoreError> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        for id in ids {
            if tx.execute("DELETE FROM proxies WHERE id = ?1", [id])? == 0 {
                return Err(StoreError::NotFound(format!("прокси {id}")));
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn list_proxies(&self) -> Result<Vec<ProxyRecord>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(&format!("SELECT {COLUMNS} FROM proxies ORDER BY id"))?;
        let rows = stmt.query_map([], row_to_record)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    #[cfg(test)]
    pub fn count_profiles_with_proxy(&self, id: i64) -> Result<i64, StoreError> {
        Ok(self.conn().query_row("SELECT COUNT(*) FROM profiles WHERE proxy_id = ?1", [id], |r| r.get(0))?)
    }

    /// Закрепления всех прокси одним запросом (строки экрана «Прокси»); прокси без профилей в ответ не попадают.
    pub fn proxy_pins(&self) -> Result<HashMap<i64, ProxyPins>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(
            "SELECT proxy_id, COUNT(*), MIN(name) FROM profiles WHERE proxy_id IS NOT NULL AND deleted_at IS NULL GROUP BY proxy_id",
        )?;
        let rows = stmt.query_map([], |r| {
            let profiles: i64 = r.get(1)?;
            let name: String = r.get(2)?;
            Ok((r.get::<_, i64>(0)?, ProxyPins { profiles, only: (profiles == 1).then_some(name) }))
        })?;
        Ok(rows.collect::<Result<HashMap<_, _>, _>>()?)
    }

    /// `Some((ip, country))` — прокси работает; `None` — недоступен: время и флаг обновляются, прошлые IP и страна остаются.
    pub fn record_proxy_check(&self, id: i64, at: i64, geo: Option<(&str, &str)>) -> Result<(), StoreError> {
        let conn = self.conn();
        let changed = match geo {
            Some((ip, country)) => conn.execute(
                "UPDATE proxies SET checked_at = ?2, check_ok = 1, exit_ip = ?3, country = ?4 WHERE id = ?1",
                params![id, at, ip, country],
            )?,
            None => conn.execute("UPDATE proxies SET checked_at = ?2, check_ok = 0 WHERE id = ?1", params![id, at])?,
        };
        if changed == 0 {
            return Err(StoreError::NotFound(format!("прокси {id}")));
        }
        Ok(())
    }

    pub fn set_proxy_enabled(&self, id: i64, enabled: bool) -> Result<(), StoreError> {
        let changed = self.conn().execute("UPDATE proxies SET enabled = ?2 WHERE id = ?1", params![id, enabled])?;
        if changed == 0 {
            return Err(StoreError::NotFound(format!("прокси {id}")));
        }
        Ok(())
    }

    /// Дубликат при импорте: тип, хост без учёта регистра ASCII, порт и логин (`None` и "" — одно и то же).
    pub fn find_proxy(
        &self,
        kind: ProxyKind,
        host: &str,
        port: u16,
        username: Option<&str>,
    ) -> Result<Option<i64>, StoreError> {
        Ok(self
            .conn()
            .query_row(
                "SELECT id FROM proxies WHERE kind = ?1 AND lower(host) = lower(?2) AND port = ?3 \
                 AND COALESCE(username, '') = ?4 ORDER BY id LIMIT 1",
                params![kind.as_str(), host.trim(), port, username.unwrap_or("")],
                |r| r.get(0),
            )
            .optional()?)
    }

    pub fn proxy_credentials(&self, id: i64) -> Result<ProxyCredentials, StoreError> {
        let conn = self.conn();
        let row: Option<ProxyRow> = conn
            .query_row(
                "SELECT kind, host, port, username, password_enc FROM proxies WHERE id = ?1",
                [id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .optional()?;
        let (kind, host, port, username, password) = row.ok_or_else(|| StoreError::NotFound(format!("прокси {id}")))?;
        Ok(ProxyCredentials {
            id,
            kind: ProxyKind::parse(&kind).ok_or(StoreError::Invalid("kind"))?,
            host,
            port,
            username,
            password: password.map(|blob| self.secrets.decrypt(&blob)).transpose()?,
        })
    }
}

fn validate(input: &ProxyInput) -> Result<(), StoreError> {
    let host = input.host.trim();
    if host.is_empty() || host.len() > 253 || host.contains(char::is_whitespace) {
        return Err(StoreError::Invalid("host"));
    }
    if input.port == 0 {
        return Err(StoreError::Invalid("port"));
    }
    if matches!(input.password, SecretField::Set(_)) && input.username.as_deref().unwrap_or("").is_empty() {
        return Err(StoreError::Invalid("username"));
    }
    Ok(())
}

fn fetch(conn: &Connection, id: i64) -> Result<Option<ProxyRecord>, StoreError> {
    Ok(conn
        .query_row(&format!("SELECT {COLUMNS} FROM proxies WHERE id = ?1"), [id], row_to_record)
        .optional()?)
}

fn row_to_record(row: &Row<'_>) -> rusqlite::Result<ProxyRecord> {
    let kind: String = row.get(1)?;
    let kind = ProxyKind::parse(&kind)
        .ok_or_else(|| rusqlite::Error::FromSqlConversionFailure(1, Type::Text, "неизвестный тип прокси".into()))?;
    let checked_at: Option<i64> = row.get(8)?;
    let check_ok: Option<bool> = row.get(9)?;
    let exit_ip: Option<String> = row.get(10)?;
    let country: Option<String> = row.get(11)?;
    Ok(ProxyRecord {
        id: row.get(0)?,
        kind,
        host: row.get(2)?,
        port: row.get(3)?,
        username: row.get(4)?,
        has_password: row.get(5)?,
        note: row.get(6)?,
        enabled: row.get(7)?,
        check: checked_at.map(|at| ProxyCheck { at, ok: check_ok.unwrap_or(false), exit_ip, country }),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::tests::memory_store;

    fn input() -> ProxyInput {
        ProxyInput {
            kind: ProxyKind::Socks5,
            host: " gw.example.net ".into(),
            port: 1080,
            username: Some("user".into()),
            password: SecretField::Set(Secret::new("s3cr3t")),
            note: "основной".into(),
            enabled: true,
        }
    }

    #[test]
    fn create_get_and_credentials() {
        let store = memory_store();
        let rec = store.create_proxy(&input()).unwrap();
        assert_eq!(rec.kind, ProxyKind::Socks5);
        assert_eq!(rec.host, "gw.example.net");
        assert!(rec.has_password);
        assert_eq!(store.get_proxy(rec.id).unwrap(), Some(rec.clone()));
        let creds = store.proxy_credentials(rec.id).unwrap();
        assert_eq!(creds.password.unwrap().expose(), "s3cr3t");
        assert_eq!((creds.host.as_str(), creds.port), ("gw.example.net", 1080));
    }

    #[test]
    fn batch_delete_is_all_or_nothing() {
        let store = memory_store();
        let a = store.create_proxy(&input()).unwrap().id;
        let b = store.create_proxy(&input()).unwrap().id;
        assert!(matches!(store.delete_proxies(&[a, 999, b]), Err(StoreError::NotFound(_))));
        assert_eq!(store.list_proxies().unwrap().len(), 2, "ничего не удалено");
        store.delete_proxies(&[a, b]).unwrap();
        assert!(store.list_proxies().unwrap().is_empty());
    }

    #[test]
    fn update_keeps_password_unless_changed() {
        let store = memory_store();
        let rec = store.create_proxy(&input()).unwrap();
        let mut change = input();
        change.password = SecretField::Keep;
        change.port = 1081;
        assert_eq!(store.update_proxy(rec.id, &change).unwrap().port, 1081);
        assert_eq!(store.proxy_credentials(rec.id).unwrap().password.unwrap().expose(), "s3cr3t");
        change.password = SecretField::Clear;
        assert!(!store.update_proxy(rec.id, &change).unwrap().has_password);
    }

    #[test]
    fn invalid_proxies_are_rejected() {
        let store = memory_store();
        let mut bad = input();
        bad.host = "  ".into();
        assert!(matches!(store.create_proxy(&bad), Err(StoreError::Invalid("host"))));
        let mut bad = input();
        bad.port = 0;
        assert!(matches!(store.create_proxy(&bad), Err(StoreError::Invalid("port"))));
        let mut bad = input();
        bad.username = None;
        assert!(matches!(store.create_proxy(&bad), Err(StoreError::Invalid("username"))));
        assert!(matches!(store.proxy_credentials(42), Err(StoreError::NotFound(_))));
        assert!(matches!(store.delete_proxy(42), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn kind_round_trips() {
        for kind in [ProxyKind::Http, ProxyKind::Https, ProxyKind::Socks5] {
            assert_eq!(ProxyKind::parse(kind.as_str()), Some(kind));
        }
        assert_eq!(ProxyKind::parse("ftp"), None);
    }

    #[test]
    fn input_and_record_debug_hide_login_and_password() {
        let text = format!("{:?}", input());
        assert!(!text.contains("user\"") && !text.contains("s3cr3t"), "{text}");
        assert!(text.contains("gw.example.net"), "{text}");
        let store = memory_store();
        let record = store.create_proxy(&input()).unwrap();
        let text = format!("{record:?}");
        assert!(!text.contains("user\""), "{text}");
        assert!(text.contains("1080"), "{text}");
    }

    #[test]
    fn credentials_debug_hides_login_and_password() {
        let creds = ProxyCredentials {
            id: 1,
            kind: ProxyKind::Socks5,
            host: "gw.example.net".into(),
            port: 1080,
            username: Some("alice-login".into()),
            password: Some(Secret::new("hunter2")),
        };
        let text = format!("{creds:?}");
        assert!(!text.contains("alice-login") && !text.contains("hunter2"), "{text}");
        assert!(text.contains("gw.example.net") && text.contains("1080"), "{text}");
    }

    #[test]
    fn lists_proxies_and_counts_their_profiles() {
        let store = memory_store();
        let a = store.create_proxy(&input()).unwrap();
        let mut other = input();
        other.host = "b.example.net".into();
        let b = store.create_proxy(&other).unwrap();
        let mut profile = crate::store::profiles::ProfileInput::new("p", r#"{"seed":1}"#);
        profile.proxy_id = Some(a.id);
        store.create_profile(&profile, 1).unwrap();
        store.create_profile(&profile, 2).unwrap();
        assert_eq!(store.list_proxies().unwrap(), vec![a.clone(), b.clone()]);
        assert_eq!(store.count_profiles_with_proxy(a.id).unwrap(), 2);
        assert_eq!(store.count_profiles_with_proxy(b.id).unwrap(), 0);
    }

    #[test]
    fn pins_name_the_only_profile() {
        let store = memory_store();
        let a = store.create_proxy(&input()).unwrap();
        let b = store.create_proxy(&input()).unwrap();
        let free = store.create_proxy(&input()).unwrap();
        let pinned = |name: &str, proxy: i64| {
            let mut profile = crate::store::profiles::ProfileInput::new(name, r#"{"seed":1}"#);
            profile.proxy_id = Some(proxy);
            store.create_profile(&profile, 1).unwrap().id
        };
        let alpha = pinned("Альфа", a.id);
        pinned("Бета", b.id);
        pinned("Гамма", b.id);
        let pins = store.proxy_pins().unwrap();
        assert_eq!(pins.get(&a.id), Some(&ProxyPins { profiles: 1, only: Some("Альфа".into()) }));
        assert_eq!(pins.get(&b.id), Some(&ProxyPins { profiles: 2, only: None }), "несколько — без имени");
        assert_eq!(pins.get(&free.id), None, "свободного прокси в ответе нет");
        let names = store.profile_names(&[alpha.clone(), "nope00".into()]).unwrap();
        assert_eq!((names.len(), names.get(&alpha).map(String::as_str)), (1, Some("Альфа")));
        assert!(store.profile_names(&[]).unwrap().is_empty());
    }

    #[test]
    fn check_result_is_recorded_and_failure_keeps_last_ip() {
        let store = memory_store();
        let rec = store.create_proxy(&input()).unwrap();
        assert_eq!(rec.check, None);
        store.record_proxy_check(rec.id, 100, Some(("203.0.113.24", "DE"))).unwrap();
        assert_eq!(
            store.get_proxy(rec.id).unwrap().unwrap().check,
            Some(ProxyCheck { at: 100, ok: true, exit_ip: Some("203.0.113.24".into()), country: Some("DE".into()) })
        );
        store.record_proxy_check(rec.id, 200, None).unwrap();
        let check = store.list_proxies().unwrap()[0].check.clone();
        assert_eq!(
            check,
            Some(ProxyCheck { at: 200, ok: false, exit_ip: Some("203.0.113.24".into()), country: Some("DE".into()) })
        );
        assert!(format!("{:?}", store.get_proxy(rec.id).unwrap().unwrap()).contains("203.0.113.24"));
        assert!(matches!(store.record_proxy_check(999, 1, None), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn editing_address_forgets_last_check() {
        let store = memory_store();
        let rec = store.create_proxy(&input()).unwrap();
        store.record_proxy_check(rec.id, 10, Some(("203.0.113.24", "DE"))).unwrap();
        let mut same = input();
        same.password = SecretField::Keep;
        same.note = "другая заметка".into();
        assert!(store.update_proxy(rec.id, &same).unwrap().check.is_some(), "заметка адрес не меняет");
        let mut moved = same.clone();
        moved.port = 1081;
        assert_eq!(store.update_proxy(rec.id, &moved).unwrap().check, None);
    }

    #[test]
    fn enable_toggle() {
        let store = memory_store();
        let rec = store.create_proxy(&input()).unwrap();
        store.set_proxy_enabled(rec.id, false).unwrap();
        assert!(!store.get_proxy(rec.id).unwrap().unwrap().enabled);
        store.set_proxy_enabled(rec.id, true).unwrap();
        assert!(store.get_proxy(rec.id).unwrap().unwrap().enabled);
        assert!(matches!(store.set_proxy_enabled(999, true), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn duplicates_are_found_by_kind_host_port_login() {
        let store = memory_store();
        let rec = store.create_proxy(&input()).unwrap();
        let find = |kind, host: &str, port, user: Option<&str>| store.find_proxy(kind, host, port, user).unwrap();
        assert_eq!(find(ProxyKind::Socks5, "GW.Example.NET", 1080, Some("user")), Some(rec.id));
        assert_eq!(find(ProxyKind::Http, "gw.example.net", 1080, Some("user")), None);
        assert_eq!(find(ProxyKind::Socks5, "gw.example.net", 1081, Some("user")), None);
        assert_eq!(find(ProxyKind::Socks5, "gw.example.net", 1080, Some("other")), None);
        assert_eq!(find(ProxyKind::Socks5, "gw.example.net", 1080, None), None);

        let mut open = input();
        open.kind = ProxyKind::Http;
        open.host = "open.example.net".into();
        open.port = 8080;
        open.username = None;
        open.password = SecretField::Keep;
        let open = store.create_proxy(&open).unwrap();
        assert_eq!(find(ProxyKind::Http, "open.example.net", 8080, None), Some(open.id));
        assert_eq!(find(ProxyKind::Http, " open.example.net ", 8080, Some("")), Some(open.id));
    }
}
