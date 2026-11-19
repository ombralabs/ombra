pub mod bookmarks;
pub mod extensions;
pub mod groups;
pub mod profiles;
pub mod profile_labels;
pub mod proxies;
pub mod secrets;
pub(crate) mod local_key;
pub mod tags;

use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use rusqlite::{Connection, OpenFlags, OptionalExtension};
use rusqlite::functions::FunctionFlags;
use secrets::{Secret, SecretBox};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("база данных: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("не найдено: {0}")]
    NotFound(String),
    #[error("неверное значение поля {0}")]
    Invalid(&'static str),
    #[error("уже существует: {0}")]
    Duplicate(&'static str),
    #[error("ошибка шифрования")]
    Crypto,
    #[error("связка ключей: {0}")]
    Keychain(String),
    #[error("файл: {0}")]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Lock(#[from] crate::lock::LockError),
    #[error("protected profile storage must be opened in the original Desktop")]
    Protected,
    #[error("unsupported profile database version {0}")]
    Schema(i64),

}

const MIGRATIONS: &[&str] = &[
    include_str!("migrations/001_init.sql"),
    include_str!("migrations/002_stage2.sql"),
    include_str!("migrations/003_api.sql"),
    include_str!("migrations/004_stage3.sql"),
    include_str!("migrations/005_bookmarks.sql"),
    include_str!("migrations/006_extensions.sql"),
    include_str!("migrations/007_extension_details.sql"),
    include_str!("migrations/008_humanize.sql"),
    include_str!("migrations/009_captcha.sql"),
    include_str!("migrations/010_flows.sql"),
    include_str!("migrations/011_flow_tasks.sql"),
    include_str!("migrations/012_task_queue.sql"),
    include_str!("migrations/013_task_revisions.sql"),
    include_str!("migrations/014_profile_labels.sql"),
    include_str!("migrations/015_task_headless.sql"),
    include_str!("migrations/016_profile_network.sql"),
    include_str!("migrations/017_rpa_quota.sql"),
];

/// Сколько запись ждёт базу, которую держит другой процесс Ombra (окно рядом с `ombra flow`, спецификация А2).
const BUSY_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);

/// Порт Local API. Решение заказчика 10.10.2026: 45678 — не мешает AdsPower (50325) и другим программам и лежит
/// ниже 49152, вне временных портов macOS для исходящих соединений.
pub const API_PORT_KEY: &str = "api.port";
/// Ключ Local API; пусто — проверки ключа нет.
pub const API_KEY_KEY: &str = "api.key";
pub const DEFAULT_API_PORT: u16 = 45678;
/// Local API включён; по умолчанию — да.
pub const API_ENABLED_KEY: &str = "api.enabled";
/// Ключ сервисного аккаунта Google (JSON целиком, зашифрован); пусто — ключа нет.
pub const GOOGLE_KEY_KEY: &str = "google.service_key";
/// Что делать при закрытии приложения с запущенными профилями.
pub const ON_QUIT_KEY: &str = "app.on_quit";
/// Refresh-токен входа через Ombra (зашифрован); пусто — входа нет.
const LICENSE_REFRESH_KEY: &str = "license.refresh_token";

/// Префикс зашифрованного значения настройки: дальше base64 от nonce и шифртекста `SecretBox`.
const SECRET_PREFIX: &str = "enc:";

/// Настройки-секреты: пишутся только своими методами, с шифрованием.
const SECRET_KEYS: [&str; 3] = [API_KEY_KEY, GOOGLE_KEY_KEY, LICENSE_REFRESH_KEY];

/// Настройка «При закрытии приложения».
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuitAction {
    Ask,
    StopAll,
}

impl QuitAction {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ask => "ask",
            Self::StopAll => "stop_all",
        }
    }
}

/// SQLite в режиме WAL, одно соединение за мьютексом.
pub struct Store {
    conn: Mutex<Connection>,
    secrets: SecretBox,
    _directory_lock: Option<crate::lock::DirLock>,
}

impl Store {
    /// Open an ordinary Desktop data directory with its existing key and single-instance lock.
    pub fn open_local(root: &Path) -> Result<Self, StoreError> {
        let paths = crate::paths::Paths::new(root);
        let lock = crate::lock::DirLock::acquire(root)?;
        for marker in [paths.security_config(), paths.vault_image(), paths.vault_key_file()] {
            match std::fs::symlink_metadata(marker) {
                Ok(_) => return Err(StoreError::Protected),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => return Err(error.into()),
            }
        }
        let database = paths.db();
        match std::fs::symlink_metadata(&database) {
            Ok(metadata) if metadata.is_file() => {
                let conn = open_database(&database, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
                conn.busy_timeout(BUSY_TIMEOUT)?;
                schema_version(&conn)?;
            }
            Ok(_) => return Err(StoreError::Invalid("database")),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        let key = local_key::profile_key(&paths)?;
        let mut store = Self::open(&paths.db(), SecretBox::from_key(&key))?;
        store._directory_lock = Some(lock);
        Ok(store)
    }

    fn open(path: &Path, secrets: SecretBox) -> Result<Self, StoreError> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let conn = open_database(path, OpenFlags::default())?;
        conn.busy_timeout(BUSY_TIMEOUT)?;
        // Новую базу два процесса Ombra переводят в WAL одновременно: второй получает «база занята» сразу, без
        // `busy_timeout` (SQLite так обходит взаимную блокировку), поэтому — повторы в пределах того же времени.
        let deadline = std::time::Instant::now() + BUSY_TIMEOUT;
        loop {
            match conn.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(())) {
                Err(rusqlite::Error::SqliteFailure(e, _))
                    if e.code == rusqlite::ErrorCode::DatabaseBusy && std::time::Instant::now() < deadline =>
                {
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
                result => break result?,
            }
        }
        Self::init(conn, secrets)
    }

    pub fn open_in_memory(secrets: SecretBox) -> Result<Self, StoreError> {
        Self::init(Connection::open_in_memory()?, secrets)
    }

    fn init(mut conn: Connection, secrets: SecretBox) -> Result<Self, StoreError> {
        // Транзакции берут замок записи сразу (`BEGIN IMMEDIATE`): отложенная, которая сначала читает, а потом пишет,
        // при записи другого процесса Ombra между ними сразу получает `SQLITE_BUSY_SNAPSHOT` — `busy_timeout` не помогает.
        conn.set_transaction_behavior(rusqlite::TransactionBehavior::Immediate);
        // `secure_delete`: удалённое и перезаписанное затирается нулями — прежние байты секретов
        // не остаются в свободных местах страниц.
        conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;")?;
        register_functions(&conn)?;
        migrate(&conn)?;
        // Сборка до 008, открывшая базу версии 8, добавляет профили с `humanize_seed` по умолчанию 0: после возврата на эту
        // сборку у них был бы один почерк на всех. Ноль — «seed не задан»: каждому свой, как в миграции 008.
        conn.execute("UPDATE profiles SET humanize_seed = random() WHERE humanize_seed = 0", [])?;
        let store = Self { conn: Mutex::new(conn), secrets, _directory_lock: None };
        // До 2В-2 ключ API хранился открытым. Шифруется здесь, а не SQL-миграцией: нужен ключ секретов.
        if store.encrypt_plain_setting(API_KEY_KEY)? {
            // Страница с открытым ключом могла остаться в WAL: страницы переносятся в базу, журнал обрезается.
            store.conn().execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
        }
        Ok(store)
    }

    fn conn(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().expect("мьютекс базы отравлен")
    }

    #[cfg(test)]
    pub(crate) fn raw(&self) -> MutexGuard<'_, Connection> {
        self.conn()
    }

    #[cfg(test)]
    pub fn schema_version(&self) -> Result<i64, StoreError> {
        Ok(self.conn().query_row("PRAGMA user_version", [], |r| r.get(0))?)
    }

    fn get_setting(&self, key: &str) -> Result<Option<String>, StoreError> {
        Ok(self
            .conn()
            .query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| r.get(0))
            .optional()?)
    }

    /// Обычная настройка. Секретные (`API_KEY_KEY`) пишутся только своими методами
    /// с шифрованием — здесь `Invalid("setting")`.
    fn set_setting(&self, key: &str, value: &str) -> Result<(), StoreError> {
        if SECRET_KEYS.contains(&key) {
            return Err(StoreError::Invalid("setting"));
        }
        write_setting(&self.conn(), key, value)
    }

    /// Лимит одновременных запусков; нечитаемое или нулевое значение — значение по умолчанию.
    /// Порт Local API; нечитаемое, нулевое или большее 65535 значение — порт по умолчанию.
    pub fn api_port(&self) -> Result<u16, StoreError> {
        Ok(self
            .get_setting(API_PORT_KEY)?
            .and_then(|value| value.trim().parse::<u16>().ok())
            .filter(|port| *port > 0)
            .unwrap_or(DEFAULT_API_PORT))
    }

    #[cfg(test)]
    pub fn set_api_port(&self, port: u16) -> Result<(), StoreError> {
        if port == 0 {
            return Err(StoreError::Invalid("api_port"));
        }
        self.set_setting(API_PORT_KEY, &port.to_string())
    }

    /// Ключ Local API; пусто — ключа нет. Хранится зашифрованным; не расшифровался — `Crypto`.
    pub fn api_key(&self) -> Result<Option<String>, StoreError> {
        Ok(self.secret_setting(API_KEY_KEY)?.map(|key| key.expose().to_string()))
    }

    /// `None` и пустая строка выключают проверку ключа.
    #[cfg(test)]
    pub fn set_api_key(&self, key: Option<&str>) -> Result<(), StoreError> {
        self.set_secret_setting(API_KEY_KEY, key)
    }

    /// Local API включён; по умолчанию — да. Выключают только `0` и `false`.
    pub fn api_enabled(&self) -> Result<bool, StoreError> {
        Ok(self.get_setting(API_ENABLED_KEY)?.is_none_or(|value| {
            let value = value.trim();
            value != "0" && !value.eq_ignore_ascii_case("false")
        }))
    }

    #[cfg(test)]
    pub fn set_api_enabled(&self, enabled: bool) -> Result<(), StoreError> {
        self.set_setting(API_ENABLED_KEY, if enabled { "1" } else { "0" })
    }

    /// Порт, ключ и «включён» Local API — одной транзакцией: сбой посередине не оставляет половину настроек.
    /// Ключ — как у `set_api_key`: `None` и пустая строка выключают проверку.
    pub fn set_api_config(&self, port: u16, key: Option<&str>, enabled: bool) -> Result<(), StoreError> {
        if port == 0 {
            return Err(StoreError::Invalid("api_port"));
        }
        let key = self.secret_value(key)?;
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        write_setting(&tx, API_PORT_KEY, &port.to_string())?;
        write_setting(&tx, API_KEY_KEY, &key)?;
        write_setting(&tx, API_ENABLED_KEY, if enabled { "1" } else { "0" })?;
        tx.commit()?;
        Ok(())
    }

    /// «При закрытии приложения»; нет значения или оно неизвестно — «Спрашивать».
    pub fn on_quit(&self) -> Result<QuitAction, StoreError> {
        Ok(match self.get_setting(ON_QUIT_KEY)?.as_deref().map(str::trim) {
            Some("stop_all") => QuitAction::StopAll,
            _ => QuitAction::Ask,
        })
    }

    pub fn set_on_quit(&self, action: QuitAction) -> Result<(), StoreError> {
        self.set_setting(ON_QUIT_KEY, action.as_str())
    }

    /// `enc:<base64>` расшифровывается ключом секретов. Значение без префикса читается как открытое:
    /// так хранился ключ API до 2В-2. Пусто — `None`.
    pub(crate) fn secret_setting(&self, key: &str) -> Result<Option<Secret>, StoreError> {
        let Some(value) = self.get_setting(key)? else { return Ok(None) };
        let secret = match value.strip_prefix(SECRET_PREFIX) {
            Some(encoded) => {
                let blob = B64.decode(encoded.trim()).map_err(|_| StoreError::Crypto)?;
                self.secrets.decrypt(&blob)?
            }
            None => Secret::new(value.trim()),
        };
        Ok((!secret.expose().is_empty()).then_some(secret))
    }

    /// Значение секретной настройки для записи: пробелы по краям обрезаются; пусто или `None` — пустая строка,
    /// иначе `enc:` и base64 шифртекста.
    fn secret_value(&self, value: Option<&str>) -> Result<String, StoreError> {
        let value = value.map(str::trim).unwrap_or("");
        if value.is_empty() {
            return Ok(String::new());
        }
        let blob = self.secrets.encrypt(&Secret::new(value))?;
        Ok(format!("{SECRET_PREFIX}{}", B64.encode(blob)))
    }

    pub(crate) fn set_secret_setting(&self, key: &str, value: Option<&str>) -> Result<(), StoreError> {
        let value = self.secret_value(value)?;
        write_setting(&self.conn(), key, &value)
    }

    /// Непустое открытое значение секретной настройки шифруется на месте; зашифрованное и пустое не трогаются.
    /// `true` — значение было открытым и теперь зашифровано.
    fn encrypt_plain_setting(&self, key: &str) -> Result<bool, StoreError> {
        match self.get_setting(key)? {
            Some(value) if !value.starts_with(SECRET_PREFIX) && !value.trim().is_empty() => {
                self.set_secret_setting(key, Some(value.as_str()))?;
                Ok(true)
            }
            _ => Ok(false),
        }
    }
}

/// Запись настройки без проверок — внутри `Store` и в транзакциях.
fn write_setting(conn: &Connection, key: &str, value: &str) -> Result<(), StoreError> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
    )?;
    Ok(())
}

// Resolve directory aliases such as /var -> /private/var on macOS, but never follow the database file itself.
fn open_database(path: &Path, flags: OpenFlags) -> Result<Connection, StoreError> {
    let name = path.file_name().ok_or(StoreError::Invalid("database"))?;
    let parent = path.parent().filter(|dir| !dir.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let database = parent.canonicalize()?.join(name);
    Ok(Connection::open_with_flags(database, flags | OpenFlags::SQLITE_OPEN_NOFOLLOW)?)
}

fn schema_version(conn: &Connection) -> Result<i64, StoreError> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if !(0..=MIGRATIONS.len() as i64).contains(&current) {
        return Err(StoreError::Schema(current));
    }
    Ok(current)
}

/// Read the version again under the write lock so concurrent upgrades run only once.
fn migrate(conn: &Connection) -> Result<(), StoreError> {
    let tx = conn.unchecked_transaction()?;
    let current = schema_version(&tx)?;
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        tx.execute_batch(sql)?;
        tx.execute_batch(&format!("PRAGMA user_version = {}", index + 1))?;
    }
    tx.commit()?;
    Ok(())
}

/// Свёртка для поиска и сортировки: нижний регистр, «ё» = «е».
pub(crate) fn fold(text: &str) -> String {
    text.to_lowercase().replace('ё', "е")
}

/// `ombra_fold(text)` — строка в нижнем регистре по правилам Unicode: `LIKE` и `COLLATE NOCASE` в SQLite знают только ASCII.
fn register_functions(conn: &Connection) -> Result<(), StoreError> {
    conn.create_scalar_function(
        "ombra_fold",
        1,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |ctx| Ok(ctx.get::<Option<String>>(0)?.map(|text| fold(&text))),
    )?;
    Ok(())
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    pub(crate) fn test_box() -> SecretBox {
        SecretBox::from_key(&[7u8; 32])
    }

    pub(crate) fn memory_store() -> Store {
        Store::open_in_memory(test_box()).unwrap()
    }

    /// Значение настройки как есть, в обход `set_setting`: открытый ключ 2Б, чужой или испорченный секрет.
    pub(crate) fn put_raw_setting(store: &Store, key: &str, value: &str) {
        write_setting(&store.raw(), key, value).unwrap();
    }

    /// Вся таблица настроек одной строкой: проверить, что открытого текста секрета в ней нет.
    fn all_settings(store: &Store) -> String {
        store
            .raw()
            .query_row("SELECT group_concat(key || '=' || value, ';') FROM settings", [], |r| r.get::<_, Option<String>>(0))
            .unwrap()
            .unwrap_or_default()
    }

    #[test]
    fn migrations_run_once_and_survive_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sub dir/ombra.db");
        {
            let store = Store::open(&path, test_box()).unwrap();
            assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
            store.set_setting("engine.version", "145.0.7632.109.2").unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
        assert_eq!(store.get_setting("engine.version").unwrap().as_deref(), Some("145.0.7632.109.2"));
    }

    #[test]
    fn task_revision_migration_keeps_completed_queue_items() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            register_functions(&conn).unwrap();
            for sql in &MIGRATIONS[..12] { conn.execute_batch(sql).unwrap(); }
            conn.execute_batch("PRAGMA user_version = 12;
                INSERT INTO flow_tasks (name, profiles, run_order, threads, missing_row, params_enc, created_at, distribution, work_total)
                VALUES ('Очередь', '[\"a1\"]', 'ordered', 1, 'skip', X'00', 1, 'queue', 2);
                INSERT INTO flow_batches (task_id, flow_json, pid, started_at, finished_at) VALUES (1, '{}', 1, 1, 2);
                INSERT INTO flow_runs (batch_id, profile_id, serial, position, status, item_index) VALUES (1, 'a1', 1, 0, 'done', 0);").unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        let headless: Option<bool> = store.conn().query_row("SELECT headless FROM flow_tasks WHERE id = 1", [], |row| row.get(0)).unwrap();
        assert_eq!(headless, None, "прежние задачи продолжают наследовать режим процесса");
        let item: Option<i64> = store.conn().query_row("SELECT item_index FROM flow_runs WHERE batch_id = 1", [], |row| row.get(0)).unwrap();
        assert_eq!(item, Some(0));
    }

    #[test]
    fn queue_migration_keeps_existing_tasks_and_their_run_history() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            register_functions(&conn).unwrap();
            for sql in &MIGRATIONS[..11] { conn.execute_batch(sql).unwrap(); }
            conn.execute_batch("PRAGMA user_version = 11").unwrap();
            conn.execute_batch("INSERT INTO flow_tasks (name, profiles, run_order, threads, missing_row, params_enc, created_at) VALUES ('Прежняя', '[\"a1\"]', 'ordered', 1, 'skip', X'00', 1);
                INSERT INTO flow_batches (task_id, flow_json, pid, started_at, finished_at) VALUES (1, '{}', 1, 1, 2);
                INSERT INTO flow_runs (batch_id, profile_id, serial, position, status) VALUES (1, 'a1', 1, 0, 'done');").unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        let previous: (String, String, Option<i64>) = store.conn().query_row(
            "SELECT distribution, status, item_index FROM flow_tasks JOIN flow_batches ON task_id = flow_tasks.id JOIN flow_runs ON batch_id = flow_batches.id",
            [], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).unwrap();
        assert_eq!(previous, ("per_profile".into(), "done".into(), None));
    }

    #[test]
    fn stage3_profiles_get_humanize_with_seeds_of_their_own() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            register_functions(&conn).unwrap();
            for sql in &MIGRATIONS[..7] {
                conn.execute_batch(sql).unwrap();
            }
            conn.execute_batch("PRAGMA user_version = 7").unwrap();
            for (id, serial) in [("aaaaaa", 1), ("bbbbbb", 2)] {
                conn.execute(
                    "INSERT INTO profiles (id, serial, name, fingerprint, created_at) VALUES (?1, ?2, 'Магазин', '{}', 1)",
                    rusqlite::params![id, serial],
                )
                .unwrap();
            }
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
        let count: i64 = store.conn().query_row("SELECT count(DISTINCT humanize_seed) FROM profiles WHERE humanize = '{}'", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 2);
    }

    /// База сборки Э5 (версия 8): у её профилей модуль капч выключен (C54).
    #[test]
    fn humanize_era_profiles_get_the_captcha_module_off() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            register_functions(&conn).unwrap();
            for sql in &MIGRATIONS[..8] {
                conn.execute_batch(sql).unwrap();
            }
            conn.execute_batch("PRAGMA user_version = 8").unwrap();
            conn.execute(
                "INSERT INTO profiles (id, serial, name, fingerprint, created_at) VALUES ('aaaaaa', 1, 'Магазин', '{}', 1)",
                [],
            )
            .unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
        let stored: String = store.conn().query_row("SELECT captcha FROM profiles WHERE id='aaaaaa'", [], |r| r.get(0)).unwrap();
        assert_eq!(stored, "{}");
    }

    #[test]
    fn stage3_extensions_get_empty_details() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            // 006 вызывает `ombra_fold` — как при открытии базы.
            register_functions(&conn).unwrap();
            for sql in &MIGRATIONS[..6] {
                conn.execute_batch(sql).unwrap();
            }
            conn.execute_batch("PRAGMA user_version = 6").unwrap();
            conn.execute(
                "INSERT INTO extensions (id, name, version, source, manifest_version, gateway_risk, added_at, updated_at) \
                 VALUES ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Альфа', '1.0', 'file', 3, 0, 1, 1)",
                [],
            )
            .unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
        let record = store.get_extension("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").unwrap().unwrap();
        assert_eq!((record.description.as_str(), record.file_name), ("", None));
    }

    #[test]
    fn settings_are_overwritten() {
        let store = memory_store();
        assert_eq!(store.get_setting("ui.language").unwrap(), None);
        store.set_setting("ui.language", "ru").unwrap();
        store.set_setting("ui.language", "en").unwrap();
        assert_eq!(store.get_setting("ui.language").unwrap().as_deref(), Some("en"));
    }

    #[test]
    fn stage1_database_is_upgraded_in_place() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            conn.execute_batch(include_str!("migrations/001_init.sql")).unwrap();
            conn.execute_batch("PRAGMA user_version = 1").unwrap();
            conn.execute("INSERT INTO proxies (id, kind, host, port) VALUES (3, 'http', 'gw.example.net', 8080)", [])
                .unwrap();
            conn.execute(
                "INSERT INTO profiles (id, serial, name, group_id, fingerprint, proxy_id, created_at) \
                 VALUES ('k7f2q9', 1, 'Магазин', 5, '{\"seed\":1}', 3, 100)",
                [],
            )
            .unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
        let conn = store.raw();
        let int = |sql: &str| -> Option<i64> { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
        let text = |sql: &str| -> Option<String> { conn.query_row(sql, [], |r| r.get(0)).unwrap() };
        assert_eq!(text("SELECT name FROM profiles WHERE id = 'k7f2q9'").as_deref(), Some("Магазин"));
        assert_eq!(int("SELECT group_id FROM profiles WHERE id = 'k7f2q9'"), None, "group_id этапа 1 обнулён");
        assert_eq!(int("SELECT proxy_id FROM profiles WHERE id = 'k7f2q9'"), Some(3));
        assert_eq!(int("SELECT restore_tabs FROM profiles WHERE id = 'k7f2q9'"), Some(1));
        assert_eq!(int("SELECT gateway_replaced_at FROM profiles WHERE id = 'k7f2q9'"), None);
        assert_eq!(text("SELECT cookies_hash FROM profiles WHERE id = 'k7f2q9'"), None);
        assert_eq!(text("SELECT api_extra FROM profiles WHERE id = 'k7f2q9'").as_deref(), Some("{}"));
        assert_eq!(text("SELECT host FROM proxies WHERE id = 3").as_deref(), Some("gw.example.net"));
        assert_eq!(int("SELECT checked_at FROM proxies WHERE id = 3"), None);
        for table in ["groups", "cookies"] {
            let exists: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                    [table],
                    |r| r.get(0),
                )
                .unwrap();
            assert!(exists, "нет таблицы {table}");
        }
    }

    #[test]
    fn deleting_group_row_unlinks_its_profiles() {
        let store = memory_store();
        let conn = store.raw();
        conn.execute(
            "INSERT INTO groups (id, name, name_folded, color, created_at) VALUES (1, 'A', 'a', '#000000', 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO profiles (id, serial, name, group_id, fingerprint, created_at) VALUES ('p1', 1, 'p', 1, '{}', 1)",
            [],
        )
        .unwrap();
        conn.execute("DELETE FROM groups WHERE id = 1", []).unwrap();
        let group: Option<i64> = conn.query_row("SELECT group_id FROM profiles WHERE id = 'p1'", [], |r| r.get(0)).unwrap();
        assert_eq!(group, None);
    }

    #[test]
    fn stage2_database_gets_api_extra() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let conn = Connection::open(&path).unwrap();
            conn.execute_batch(include_str!("migrations/001_init.sql")).unwrap();
            conn.execute_batch(include_str!("migrations/002_stage2.sql")).unwrap();
            conn.execute_batch("PRAGMA user_version = 2").unwrap();
            conn.execute(
                "INSERT INTO profiles (id, serial, name, fingerprint, created_at) \
                 VALUES ('k7f2q9', 1, 'Магазин', '{\"seed\":1}', 100)",
                [],
            )
            .unwrap();
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.schema_version().unwrap(), MIGRATIONS.len() as i64);
        assert_eq!(store.api_extra("k7f2q9").unwrap(), "{}");
        assert_eq!(store.get_profile("k7f2q9").unwrap().unwrap().name, "Магазин");
        assert_eq!(store.get_profile("k7f2q9").unwrap().unwrap().ext_category_id, 0);
    }

    #[test]
    fn api_settings_default_and_validation() {
        let store = memory_store();
        assert_eq!(DEFAULT_API_PORT, 45678);
        assert_eq!(store.api_port().unwrap(), DEFAULT_API_PORT);
        assert_eq!(store.api_key().unwrap(), None);

        store.set_api_port(50400).unwrap();
        assert_eq!(store.api_port().unwrap(), 50400);
        assert_eq!(store.get_setting(API_PORT_KEY).unwrap().as_deref(), Some("50400"));
        assert!(matches!(store.set_api_port(0), Err(StoreError::Invalid("api_port"))));
        assert_eq!(store.api_port().unwrap(), 50400, "отказ ничего не меняет");
        for bad in ["порт", "0", "70000", "-1", ""] {
            store.set_setting(API_PORT_KEY, bad).unwrap();
            assert_eq!(store.api_port().unwrap(), DEFAULT_API_PORT, "{bad:?}");
        }

        store.set_api_key(Some("s3cret-key")).unwrap();
        assert_eq!(store.api_key().unwrap().as_deref(), Some("s3cret-key"));
        assert!(store.get_setting(API_KEY_KEY).unwrap().unwrap().starts_with(SECRET_PREFIX), "ключ API хранится зашифрованным");
        store.set_api_key(Some("   ")).unwrap();
        assert_eq!(store.api_key().unwrap(), None, "одни пробелы — ключа нет");
        store.set_api_key(Some("k")).unwrap();
        store.set_api_key(None).unwrap();
        assert_eq!(store.api_key().unwrap(), None);
    }

    #[test]
    fn api_key_is_stored_encrypted() {
        let store = memory_store();
        store.set_api_key(Some("  s3cret-key ")).unwrap();
        assert_eq!(store.api_key().unwrap().as_deref(), Some("s3cret-key"));
        let raw = store.get_setting(API_KEY_KEY).unwrap().unwrap();
        assert!(raw.starts_with(SECRET_PREFIX), "{raw}");
        assert!(!all_settings(&store).contains("s3cret-key"), "открытого ключа в таблице нет");
        store.set_api_key(None).unwrap();
        assert_eq!(store.get_setting(API_KEY_KEY).unwrap().as_deref(), Some(""));
        assert_eq!(store.api_key().unwrap(), None);
    }

    #[test]
    fn plain_api_key_from_2b_is_encrypted_on_open() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let store = Store::open(&path, test_box()).unwrap();
            // Так ключ сохранял 2Б: открытым текстом.
            put_raw_setting(&store, API_KEY_KEY, " legacy-key ");
            assert_eq!(store.api_key().unwrap().as_deref(), Some("legacy-key"), "открытое значение читается");
        }
        let store = Store::open(&path, test_box()).unwrap();
        let raw = store.get_setting(API_KEY_KEY).unwrap().unwrap();
        assert!(raw.starts_with(SECRET_PREFIX), "{raw}");
        assert!(!all_settings(&store).contains("legacy-key"), "открытый ключ зашифрован на месте");
        assert_eq!(store.api_key().unwrap().as_deref(), Some("legacy-key"));
        drop(store);
        let reopened = Store::open(&path, test_box()).unwrap();
        assert_eq!(reopened.get_setting(API_KEY_KEY).unwrap(), Some(raw), "зашифрованное второй раз не шифруется");
    }

    /// База с настройками ключа CloakBrowser и закреплённой версии (до 04.10.2026): строки лежат, никому не мешают.
    #[test]
    fn stale_engine_rows_are_ignored() {
        let store = memory_store();
        store.set_api_key(Some("s3cret-key")).unwrap();
        put_raw_setting(&store, "engine.license_key", "enc:AAAA");
        put_raw_setting(&store, "engine.version", "145.0.7632.109.2");
        assert_eq!(store.api_key().unwrap().as_deref(), Some("s3cret-key"));
        assert_eq!(store.get_setting("engine.version").unwrap().as_deref(), Some("145.0.7632.109.2"));
    }

    #[test]
    fn api_enabled_and_on_quit_have_defaults() {
        let store = memory_store();
        assert!(store.api_enabled().unwrap(), "по умолчанию Local API включён");
        store.set_api_enabled(false).unwrap();
        assert!(!store.api_enabled().unwrap());
        assert_eq!(store.get_setting(API_ENABLED_KEY).unwrap().as_deref(), Some("0"));
        store.set_api_enabled(true).unwrap();
        assert!(store.api_enabled().unwrap());
        for (raw, enabled) in [("false", false), (" FALSE ", false), ("0", false), ("1", true), ("мусор", true), ("", true)] {
            store.set_setting(API_ENABLED_KEY, raw).unwrap();
            assert_eq!(store.api_enabled().unwrap(), enabled, "{raw:?}");
        }

        assert_eq!(store.on_quit().unwrap(), QuitAction::Ask);
        store.set_on_quit(QuitAction::StopAll).unwrap();
        assert_eq!(store.on_quit().unwrap(), QuitAction::StopAll);
        assert_eq!(store.get_setting(ON_QUIT_KEY).unwrap().as_deref(), Some("stop_all"));
        store.set_setting(ON_QUIT_KEY, "explode").unwrap();
        assert_eq!(store.on_quit().unwrap(), QuitAction::Ask, "неизвестное значение — спрашивать");
        assert_eq!(serde_json::to_value(QuitAction::StopAll).unwrap(), serde_json::json!("stop_all"));
        assert_eq!(serde_json::from_value::<QuitAction>(serde_json::json!("ask")).unwrap(), QuitAction::Ask);
    }

    #[test]
    fn migrated_plain_key_leaves_no_bytes_in_database_files() {
        const PLAIN: &str = "legacy-key-7f3a9c2e51b8d406";
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        {
            let store = Store::open(&path, test_box()).unwrap();
            // Так ключ сохранял 2Б: открытым текстом. При закрытии SQLite переносит его из WAL в файл базы.
            put_raw_setting(&store, API_KEY_KEY, PLAIN);
        }
        let store = Store::open(&path, test_box()).unwrap();
        assert_eq!(store.api_key().unwrap().as_deref(), Some(PLAIN));
        let secure: i64 = store.raw().query_row("PRAGMA secure_delete", [], |r| r.get(0)).unwrap();
        assert_eq!(secure, 1, "удалённое и перезаписанное затирается нулями");
        for file in [path.clone(), dir.path().join("ombra.db-wal")] {
            let bytes = std::fs::read(&file).unwrap_or_default();
            assert!(
                !bytes.windows(PLAIN.len()).any(|window| window == PLAIN.as_bytes()),
                "открытый ключ остался в {}",
                file.display()
            );
        }
    }

    #[test]
    fn secret_settings_are_written_only_by_their_methods() {
        let store = memory_store();
        store.set_api_key(Some("s3cret-key")).unwrap();
        assert!(matches!(store.set_setting(API_KEY_KEY, "plain"), Err(StoreError::Invalid("setting"))));
        assert!(matches!(store.set_setting(LICENSE_REFRESH_KEY, "plain"), Err(StoreError::Invalid("setting"))));
        assert_eq!(store.api_key().unwrap().as_deref(), Some("s3cret-key"), "отказ ничего не меняет");
        assert!(!all_settings(&store).contains("plain"));
    }

    #[test]
    fn api_config_is_saved_in_one_transaction() {
        let store = memory_store();
        let read = |store: &Store| (store.api_port().unwrap(), store.api_key().unwrap(), store.api_enabled().unwrap());
        store.set_api_config(50400, Some(" old-key "), true).unwrap();
        assert_eq!(read(&store), (50400, Some("old-key".to_string()), true));
        assert!(store.get_setting(API_KEY_KEY).unwrap().unwrap().starts_with(SECRET_PREFIX), "ключ зашифрован");
        assert!(matches!(store.set_api_config(0, None, true), Err(StoreError::Invalid("api_port"))));

        // Сбой на последней записи: порт и ключ, записанные раньше в той же транзакции, откатываются.
        store
            .raw()
            .execute_batch(
                "CREATE TRIGGER fail_enabled_insert BEFORE INSERT ON settings WHEN NEW.key = 'api.enabled' \
                 BEGIN SELECT RAISE(ABORT, 'сбой записи'); END; \
                 CREATE TRIGGER fail_enabled_update BEFORE UPDATE ON settings WHEN NEW.key = 'api.enabled' \
                 BEGIN SELECT RAISE(ABORT, 'сбой записи'); END;",
            )
            .unwrap();
        assert!(matches!(store.set_api_config(50500, Some("new-key"), false), Err(StoreError::Db(_))));
        assert_eq!(read(&store), (50400, Some("old-key".to_string()), true), "не изменено ни одно значение");

        store.raw().execute_batch("DROP TRIGGER fail_enabled_insert; DROP TRIGGER fail_enabled_update;").unwrap();
        store.set_api_config(50500, None, false).unwrap();
        assert_eq!(read(&store), (50500, None, false));
    }

    #[test]
    fn a_second_process_waits_for_a_busy_database() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        let first = Store::open(&path, test_box()).unwrap();
        let second = Store::open(&path, test_box()).unwrap();
        // Первый «процесс» держит запись; второй пишет, пока она не кончилась.
        let conn = first.raw();
        conn.execute_batch("BEGIN IMMEDIATE; INSERT INTO settings (key, value) VALUES ('t.first', '1');").unwrap();
        let writer = std::thread::spawn(move || second.set_setting("t.second", "2"));
        std::thread::sleep(std::time::Duration::from_millis(300));
        conn.execute_batch("COMMIT").unwrap();
        drop(conn);
        writer.join().unwrap().unwrap();
        assert_eq!(first.get_setting("t.second").unwrap().as_deref(), Some("2"));
    }

    /// Окно и `ombra flow` впервые стартуют после обновления одновременно: миграции выполняет один, второй видит
    /// новую версию под замком и ничего не повторяет.
    #[test]
    fn two_processes_migrate_a_fresh_database_at_once() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("ombra.db");
        let start = std::sync::Barrier::new(2);
        std::thread::scope(|scope| {
            let opened: Vec<_> = (0..2)
                .map(|_| {
                    scope.spawn(|| {
                        start.wait();
                        Store::open(&path, test_box())
                    })
                })
                .collect();
            for handle in opened {
                let store = handle.join().unwrap().unwrap();
                let version: i64 = store.raw().query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
                assert_eq!(version, MIGRATIONS.len() as i64);
            }
        });
    }
}
