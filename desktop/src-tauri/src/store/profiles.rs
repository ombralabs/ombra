use super::secrets::{Secret, SecretField};
use super::tags::{prune_tags, set_profile_tags_tx};
use super::{Store, StoreError};
use rusqlite::types::{Type, Value};
use rusqlite::{Connection, OptionalExtension, Row, params, params_from_iter};
use serde::Serialize;
use std::collections::HashMap;

/// Данные профиля для создания и правки.
#[derive(Debug, Clone)]
pub struct ProfileInput {
    pub name: String,
    pub note: String,
    pub group_id: Option<i64>,
    pub platform_domain: String,
    pub start_urls: Vec<String>,
    /// Открывать вкладки прошлой сессии (по умолчанию да, как в AdsPower).
    pub restore_tabs: bool,
    pub extra_args: Vec<String>,
    pub username: Option<String>,
    pub password: SecretField,
    pub totp_secret: SecretField,
    pub fingerprint_json: String,
    pub proxy_id: Option<i64>,
    /// `None` — закладки не меняются; список заменяет прежний в той же транзакции.
    pub bookmarks: Option<Vec<super::bookmarks::Bookmark>>,
    /// Набор расширений; 0 — «Общий».
    pub ext_category_id: i64,
    pub network: Option<crate::network::ProfileNetwork>,
    pub inline_proxy: Option<super::proxies::ProxyInput>,
}

impl ProfileInput {
    pub fn new(name: impl Into<String>, fingerprint_json: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            note: String::new(),
            group_id: None,
            platform_domain: String::new(),
            start_urls: Vec::new(),
            restore_tabs: true,
            extra_args: Vec::new(),
            username: None,
            password: SecretField::Keep,
            totp_secret: SecretField::Keep,
            fingerprint_json: fingerprint_json.into(),
            proxy_id: None,
            bookmarks: None,
            ext_category_id: super::extensions::DEFAULT_CATEGORY,
            network: None,
            inline_proxy: None,
        }
    }
}

/// Профиль, как его видит остальное приложение: секреты — только флаги наличия.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ProfileRecord {
    pub id: String,
    pub serial: i64,
    pub name: String,
    pub note: String,
    pub group_id: Option<i64>,
    pub platform_domain: String,
    pub start_urls: Vec<String>,
    pub extra_args: Vec<String>,
    pub username: Option<String>,
    pub has_password: bool,
    pub has_totp: bool,
    pub fingerprint_json: String,
    pub proxy_id: Option<i64>,
    pub created_at: i64,
    pub last_opened_at: Option<i64>,
    pub restore_tabs: bool,
    /// Когда шлюз последний раз заменили при запуске; `None` — последний запуск прошёл без замены.
    pub gateway_replaced_at: Option<i64>,
    /// В корзине с этого времени; `None` — живой профиль.
    pub deleted_at: Option<i64>,
    pub ext_category_id: i64,
    pub network: crate::network::ProfileNetwork,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortKey {
    #[default]
    Serial,
    Name,
    LastOpened,
    Created,
}

/// Фильтр по группе: «Без группы» или конкретная группа.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GroupFilter {
    Ungrouped,
    Id(i64),
}

/// Поиск по имени, заметке, точному номеру и внешнему IP закреплённого прокси; фильтр по статусу применяет ядро приложения.
#[derive(Debug, Clone, Default)]
pub struct ListQuery {
    pub search: Option<String>,
    pub sort: SortKey,
    pub descending: bool,
    pub group: Option<GroupFilter>,
    pub tag: Option<String>,
}

/// Поля массовой правки: `None` — не менять.
#[derive(Debug, Clone, Default)]
pub struct ProfileEdit {
    pub note: Option<String>,
    pub start_urls: Option<Vec<String>>,
    pub restore_tabs: Option<bool>,
    pub extra_args: Option<Vec<String>>,
}

/// Прежние (пароль, TOTP) в зашифрованном виде.
type OldSecrets = (Option<Vec<u8>>, Option<Vec<u8>>);

/// Одно расшифрованное поле профиля: `None` — не задано.
pub type SecretRead = Result<Option<Secret>, StoreError>;

const COLUMNS: &str = "id, serial, name, note, group_id, platform_domain, start_urls, extra_args, username, \
                       password_enc IS NOT NULL, totp_enc IS NOT NULL, fingerprint, proxy_id, created_at, last_opened_at, \
                       restore_tabs, gateway_replaced_at, deleted_at, ext_category_id, network";

impl Store {
    pub fn create_profile(&self, input: &ProfileInput, now: i64) -> Result<ProfileRecord, StoreError> {
        let mut created = self.create_profiles(std::slice::from_ref(input), &[], now)?;
        Ok(created.remove(0))
    }

    /// Все профили и их теги одной транзакцией: ошибка любого — ничего не создано и номера не израсходованы.
    pub fn create_profiles(&self, inputs: &[ProfileInput], tags: &[String], now: i64) -> Result<Vec<ProfileRecord>, StoreError> {
        self.create_with_tags(inputs, now, |tx, ids| super::tags::add_tags_tx(tx, ids, tags))
    }

    /// Как `create_profiles`, но теги у каждого профиля свои (`row_tags[i]` — для `inputs[i]`), в той же транзакции.
    pub fn create_profiles_tagged(&self, inputs: &[ProfileInput], row_tags: &[Vec<String>], now: i64) -> Result<Vec<ProfileRecord>, StoreError> {
        if inputs.len() != row_tags.len() { return Err(StoreError::Invalid("row_tags")); }
        self.create_with_tags(inputs, now, |tx, ids| {
            for (id, tags) in ids.iter().zip(row_tags).filter(|(_, t)| !t.is_empty()) {
                super::tags::add_tags_tx(tx, std::slice::from_ref(id), tags)?;
            }
            Ok(())
        })
    }

    fn create_with_tags(
        &self,
        inputs: &[ProfileInput],
        now: i64,
        add_tags: impl FnOnce(&Connection, &[String]) -> Result<(), StoreError>,
    ) -> Result<Vec<ProfileRecord>, StoreError> {
        for input in inputs {
            validate(input)?;
        }
        let mut secrets = Vec::with_capacity(inputs.len());
        for input in inputs {
            secrets.push((self.apply_secret(&input.password, None)?, self.apply_secret(&input.totp_secret, None)?));
        }
        let conn = self.conn();
        for input in inputs {
            check_proxy(&conn, input.proxy_id)?;
            check_group(&conn, input.group_id)?;
            super::extensions::check_ext_category(&conn, input.ext_category_id)?;
        }
        let tx = conn.unchecked_transaction()?;
        let mut ids = Vec::with_capacity(inputs.len());
        for (input, (password, totp)) in inputs.iter().zip(secrets) {
            let mut input = input.clone();
            if let Some(proxy) = &input.inline_proxy { input.proxy_id = Some(self.insert_proxy_tx(&tx, proxy)?); }
            ids.push(insert_row(&tx, &input, password, totp, now)?);
        }
        for (id, input) in ids.iter().zip(inputs) {
            if let Some(list) = &input.bookmarks {
                super::bookmarks::set_bookmarks_tx(&tx, id, list)?;
            }
        }
        add_tags(&tx, &ids)?;
        tx.commit()?;
        ids.iter()
            .map(|id| fetch(&conn, id)?.ok_or_else(|| StoreError::NotFound(format!("профиль {id}"))))
            .collect()
    }

    /// Change the name and note of an active profile without rewriting other fields.
    pub fn edit_profile_details(&self, id: &str, name: &str, note: &str) -> Result<(), StoreError> {
        let name = validate_name(name)?;
        let updated = self.conn().execute(
            "UPDATE profiles SET name = ?2, note = ?3 WHERE id = ?1 AND deleted_at IS NULL",
            params![id, name, note],
        )?;
        if updated == 0 {
            return Err(StoreError::NotFound(format!("профиль {id}")));
        }
        Ok(())
    }

    /// Меняет заданные поля у профилей одной транзакцией; несуществующие id пропускаются. Возвращает число изменённых.
    pub fn edit_profiles(&self, ids: &[String], edit: &ProfileEdit) -> Result<usize, StoreError> {
        let start_urls = edit.start_urls.as_deref().map(to_json);
        let extra_args = edit.extra_args.as_deref().map(to_json);
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        let mut changed = 0;
        for id in ids {
            changed += tx.execute(
                "UPDATE profiles SET note = COALESCE(?2, note), start_urls = COALESCE(?3, start_urls), \
                 restore_tabs = COALESCE(?4, restore_tabs), extra_args = COALESCE(?5, extra_args) WHERE id = ?1",
                params![id, edit.note, start_urls, edit.restore_tabs, extra_args],
            )?;
        }
        tx.commit()?;
        Ok(changed)
    }

    /// Только живой профиль: из корзины — `None`. Всё, что работает с профилем «по-живому», идёт через него.
    pub fn get_profile(&self, id: &str) -> Result<Option<ProfileRecord>, StoreError> {
        Ok(self
            .conn()
            .query_row(&format!("SELECT {COLUMNS} FROM profiles WHERE id = ?1 AND deleted_at IS NULL"), [id], row_to_record)
            .optional()?)
    }

    /// Живой профиль по номеру (New Browser).
    pub fn profile_by_serial(&self, serial: i64) -> Result<Option<ProfileRecord>, StoreError> {
        Ok(self
            .conn()
            .query_row(&format!("SELECT {COLUMNS} FROM profiles WHERE serial = ?1 AND deleted_at IS NULL"), [serial], row_to_record)
            .optional()?)
    }

    /// Профиль, включая корзину — только для кода корзины.
    pub fn get_profile_any(&self, id: &str) -> Result<Option<ProfileRecord>, StoreError> {
        fetch(&self.conn(), id)
    }

    /// Корзина: по времени удаления, новые сверху.
    pub fn list_trash(&self) -> Result<Vec<ProfileRecord>, StoreError> {
        let conn = self.conn();
        let mut stmt = conn.prepare(&format!(
            "SELECT {COLUMNS} FROM profiles WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC, serial DESC"
        ))?;
        let rows = stmt.query_map([], row_to_record)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    /// В корзину (`Some(now)`) или обратно (`None`) одной транзакцией; неизвестный id — `NotFound`, и не меняется ничего.
    pub fn set_deleted(&self, ids: &[String], deleted_at: Option<i64>) -> Result<(), StoreError> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        for id in ids {
            if tx.execute("UPDATE profiles SET deleted_at = ?2 WHERE id = ?1", params![id, deleted_at])? == 0 {
                return Err(StoreError::NotFound(format!("профиль {id}")));
            }
        }
        tx.commit()?;
        Ok(())
    }

    /// Неприменяемые поля `fingerprint_config` Local API — JSON-объект строкой.
    pub fn api_extra(&self, id: &str) -> Result<String, StoreError> {
        self.conn()
            .query_row("SELECT api_extra FROM profiles WHERE id = ?1", [id], |r| r.get(0))
            .optional()?
            .ok_or_else(|| StoreError::NotFound(format!("профиль {id}")))
    }

    /// Хранится только JSON-объект: Local API собирает из него `fingerprint_config` ответа.
    pub fn set_api_extra(&self, id: &str, json: &str) -> Result<(), StoreError> {
        if !matches!(serde_json::from_str::<serde_json::Value>(json), Ok(serde_json::Value::Object(_))) {
            return Err(StoreError::Invalid("api_extra"));
        }
        let changed = self.conn().execute("UPDATE profiles SET api_extra = ?2 WHERE id = ?1", params![id, json])?;
        if changed == 0 {
            return Err(StoreError::NotFound(format!("профиль {id}")));
        }
        Ok(())
    }

    /// Пароль и ключ 2FA профиля расшифрованными — для ответов Local API (решение заказчика: открытым текстом).
    /// В журналы и `Debug` они не попадают: `Secret` их не раскрывает.
    #[cfg(test)]
    pub fn profile_secrets(&self, id: &str) -> Result<(Option<Secret>, Option<Secret>), StoreError> {
        let (password, totp) = self.profile_secrets_each(id)?;
        Ok((password?, totp?))
    }

    /// Как `profile_secrets`, но поля расшифровываются по отдельности: нерасшифрованное (`StoreError::Crypto`) не мешает
    /// второму. Внешняя ошибка — профиля нет или база не читается.
    pub fn profile_secrets_each(&self, id: &str) -> Result<(SecretRead, SecretRead), StoreError> {
        let row: Option<OldSecrets> = self
            .conn()
            .query_row("SELECT password_enc, totp_enc FROM profiles WHERE id = ?1", [id], |r| {
                Ok((r.get(0)?, r.get(1)?))
            })
            .optional()?;
        let (password, totp) = row.ok_or_else(|| StoreError::NotFound(format!("профиль {id}")))?;
        let decrypt = |blob: Option<Vec<u8>>| blob.map(|blob| self.secrets.decrypt(&blob)).transpose();
        Ok((decrypt(password), decrypt(totp)))
    }

    /// Отметка о замене шлюза при запуске остаётся, только пока закреплён тот же прокси: другой прокси или его
    /// отсутствие — как ручное назначение (`set_profiles_proxy`).
    pub fn update_profile(&self, id: &str, input: &ProfileInput) -> Result<ProfileRecord, StoreError> {
        self.update_profile_with_tags(id, input, None)
    }

    /// Профиль и, если заданы, его теги (набор заменяется) — одной транзакцией: ошибка тегов не оставляет
    /// сохранённого профиля.
    pub fn update_profile_with_tags(
        &self,
        id: &str,
        input: &ProfileInput,
        tags: Option<&[String]>,
    ) -> Result<ProfileRecord, StoreError> {
        validate(input)?;
        let conn = self.conn();
        check_proxy(&conn, input.proxy_id)?;
        check_group(&conn, input.group_id)?;
        super::extensions::check_ext_category(&conn, input.ext_category_id)?;
        let old: Option<OldSecrets> = conn
            .query_row("SELECT password_enc, totp_enc FROM profiles WHERE id = ?1", [id], |r| {
                Ok((r.get(0)?, r.get(1)?))
            })
            .optional()?;
        let (old_password, old_totp) = old.ok_or_else(|| StoreError::NotFound(format!("профиль {id}")))?;
        let password = self.apply_secret(&input.password, old_password)?;
        let totp = self.apply_secret(&input.totp_secret, old_totp)?;
        let tx = conn.unchecked_transaction()?;
        let mut input = input.clone();
        if let Some(proxy) = &input.inline_proxy { input.proxy_id = Some(self.insert_proxy_tx(&tx, proxy)?); }
        tx.execute(
            // Справа от `=` в UPDATE SQLite видит прежние значения строки: `proxy_id IS ?13` сравнивает старый прокси с новым.
            "UPDATE profiles SET name = ?2, note = ?3, group_id = ?4, platform_domain = ?5, start_urls = ?6, \
             restore_tabs = ?7, extra_args = ?8, username = ?9, password_enc = ?10, totp_enc = ?11, \
             fingerprint = ?12, proxy_id = ?13, ext_category_id = ?14, \
             network = COALESCE(?15, CASE WHEN ?13 IS NOT NULL THEN json_set(network, '$.direct', json('false')) ELSE network END), \
             gateway_replaced_at = CASE WHEN ?13 IS NOT NULL AND proxy_id IS ?13 THEN gateway_replaced_at END \
             WHERE id = ?1",
            params![
                id,
                input.name.trim(),
                input.note,
                input.group_id,
                input.platform_domain,
                to_json(&input.start_urls),
                input.restore_tabs,
                to_json(&input.extra_args),
                input.username,
                password,
                totp,
                input.fingerprint_json,
                input.proxy_id,
                input.ext_category_id,
                input.network.as_ref().map(|value| serde_json::to_string(value).expect("network"))
            ],
        )?;
        if let Some(tags) = tags {
            set_profile_tags_tx(&tx, id, tags)?;
        }
        if let Some(list) = &input.bookmarks {
            super::bookmarks::set_bookmarks_tx(&tx, id, list)?;
        }
        tx.commit()?;
        fetch(&conn, id)?.ok_or_else(|| StoreError::NotFound(format!("профиль {id}")))
    }

    /// Вместе с профилем уходят его теги и cookies (каскад); теги без профилей удаляются.
    pub fn delete_profile(&self, id: &str) -> Result<(), StoreError> {
        self.delete_profiles(&[id.to_string()])
    }

    /// Пачка одной транзакцией: неизвестный id — `NotFound`, и не удалено ничего.
    pub fn delete_profiles(&self, ids: &[String]) -> Result<(), StoreError> {
        let conn = self.conn();
        let tx = conn.unchecked_transaction()?;
        for id in ids {
            if tx.execute("DELETE FROM profiles WHERE id = ?1", [id])? == 0 {
                return Err(StoreError::NotFound(format!("профиль {id}")));
            }
        }
        prune_tags(&tx)?;
        tx.commit()?;
        Ok(())
    }

    pub fn touch_last_opened(&self, id: &str, now: i64) -> Result<(), StoreError> {
        let changed = self
            .conn()
            .execute("UPDATE profiles SET last_opened_at = ?2 WHERE id = ?1", params![id, now])?;
        if changed == 0 {
            return Err(StoreError::NotFound(format!("профиль {id}")));
        }
        Ok(())
    }

    /// Назначить (`Some`) или сбросить (`None`) шлюз у профилей. Ручное назначение снимает отметку о замене при запуске.
    /// Неизвестные профили пропускаются; возвращает число изменённых.
    pub fn set_profiles_proxy(&self, ids: &[String], proxy_id: Option<i64>) -> Result<usize, StoreError> {
        let conn = self.conn();
        check_proxy(&conn, proxy_id)?;
        let tx = conn.unchecked_transaction()?;
        let mut changed = 0;
        for id in ids {
            changed += tx.execute(
                "UPDATE profiles SET proxy_id = ?2, gateway_replaced_at = NULL, network = json_set(network, '$.direct', json('false')) WHERE id = ?1",
                params![id, proxy_id],
            )?;
        }
        tx.commit()?;
        Ok(changed)
    }

    /// Итог выбора шлюза при запуске: прокси закрепляется, отметка о замене записывается или сбрасывается.
    pub fn record_gateway(&self, id: &str, proxy_id: i64, replaced_at: Option<i64>) -> Result<(), StoreError> {
        let conn = self.conn();
        check_proxy(&conn, Some(proxy_id))?;
        let changed = conn.execute(
            "UPDATE profiles SET proxy_id = ?2, gateway_replaced_at = ?3 WHERE id = ?1",
            params![id, proxy_id, replaced_at],
        )?;
        if changed == 0 {
            return Err(StoreError::NotFound(format!("профиль {id}")));
        }
        Ok(())
    }

    pub fn count_profiles(&self) -> Result<i64, StoreError> {
        Ok(self.conn().query_row("SELECT COUNT(*) FROM profiles WHERE deleted_at IS NULL", [], |r| r.get(0))?)
    }

    /// Имена профилей по id одним запросом; неизвестные id пропускаются.
    pub fn profile_names(&self, ids: &[String]) -> Result<HashMap<String, String>, StoreError> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let placeholders = vec!["?"; ids.len()].join(", ");
        let conn = self.conn();
        let mut stmt = conn.prepare(&format!("SELECT id, name FROM profiles WHERE id IN ({placeholders})"))?;
        let rows = stmt.query_map(params_from_iter(ids), |r| Ok((r.get(0)?, r.get(1)?)))?;
        Ok(rows.collect::<Result<HashMap<_, _>, _>>()?)
    }

    pub fn list_profiles(&self, query: &ListQuery) -> Result<Vec<ProfileRecord>, StoreError> {
        let mut sql = format!("SELECT {COLUMNS} FROM profiles p WHERE p.deleted_at IS NULL");
        let mut args: Vec<Value> = Vec::new();
        if let Some(search) = query.search.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            let like = format!("%{}%", escape_like(&super::fold(search)));
            // IP — из последней удачной проверки прокси (её пишет и «Проверить», и каждый запуск).
            sql.push_str(
                " AND (ombra_fold(p.name) LIKE ? ESCAPE '\\' OR ombra_fold(p.note) LIKE ? ESCAPE '\\' \
                 OR CAST(p.serial AS TEXT) = ? \
                 OR EXISTS (SELECT 1 FROM proxies x WHERE x.id = p.proxy_id AND ombra_fold(x.exit_ip) LIKE ? ESCAPE '\\'))",
            );
            args.push(like.clone().into());
            args.push(like.clone().into());
            args.push(search.to_string().into());
            args.push(like.into());
        }
        match query.group {
            Some(GroupFilter::Ungrouped) => sql.push_str(" AND p.group_id IS NULL"),
            Some(GroupFilter::Id(group)) => {
                sql.push_str(" AND p.group_id = ?");
                args.push(group.into());
            }
            None => {}
        }
        if let Some(tag) = query.tag.as_deref().map(str::trim).filter(|t| !t.is_empty()) {
            sql.push_str(
                " AND EXISTS (SELECT 1 FROM profile_tags pt JOIN tags t ON t.id = pt.tag_id \
                 WHERE pt.profile_id = p.id AND ombra_fold(t.name) = ?)",
            );
            args.push(super::fold(tag).into());
        }
        let order = match query.sort {
            SortKey::Serial => "p.serial",
            SortKey::Name => "ombra_fold(p.name)",
            SortKey::LastOpened => "p.last_opened_at",
            SortKey::Created => "p.created_at",
        };
        let direction = if query.descending { "DESC" } else { "ASC" };
        // Никогда не открытые профили — в конце при любом направлении.
        let nulls = if query.sort == SortKey::LastOpened { " NULLS LAST" } else { "" };
        sql.push_str(&format!(" ORDER BY {order} {direction}{nulls}, p.serial {direction}"));

        let conn = self.conn();
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_from_iter(args.iter()), row_to_record)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn apply_secret(&self, field: &SecretField, old: Option<Vec<u8>>) -> Result<Option<Vec<u8>>, StoreError> {
        Ok(match field {
            SecretField::Keep => old,
            SecretField::Clear => None,
            SecretField::Set(secret) => Some(self.secrets.encrypt(secret)?),
        })
    }
}

fn validate(input: &ProfileInput) -> Result<(), StoreError> {
    if input.network.as_ref().is_some_and(|network| network.direct) && (input.proxy_id.is_some() || input.inline_proxy.is_some()) { return Err(StoreError::Invalid("proxy_id")); }
    validate_name(&input.name)?;
    if serde_json::from_str::<serde_json::Value>(&input.fingerprint_json).is_err() {
        return Err(StoreError::Invalid("fingerprint"));
    }
    Ok(())
}

fn validate_name(name: &str) -> Result<&str, StoreError> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > 100 {
        return Err(StoreError::Invalid("name"));
    }
    Ok(name)
}

fn check_proxy(conn: &Connection, proxy_id: Option<i64>) -> Result<(), StoreError> {
    if let Some(id) = proxy_id {
        let exists: bool = conn.query_row("SELECT EXISTS(SELECT 1 FROM proxies WHERE id = ?1)", [id], |r| r.get(0))?;
        if !exists {
            return Err(StoreError::Invalid("proxy_id"));
        }
    }
    Ok(())
}

fn check_group(conn: &Connection, group_id: Option<i64>) -> Result<(), StoreError> {
    if let Some(id) = group_id
        && !super::groups::group_exists(conn, id)?
    {
        return Err(StoreError::Invalid("group_id"));
    }
    Ok(())
}

/// Одна строка `profiles`; номер и короткий id выдаются внутри транзакции вызывающего.
fn insert_row(
    conn: &Connection,
    input: &ProfileInput,
    password: Option<Vec<u8>>,
    totp: Option<Vec<u8>>,
    now: i64,
) -> Result<String, StoreError> {
    let serial = next_serial(conn)?;
    let id = unused_id(conn)?;
    conn.execute(
        "INSERT INTO profiles (id, serial, name, note, group_id, platform_domain, start_urls, extra_args, username, \
         password_enc, totp_enc, fingerprint, proxy_id, restore_tabs, created_at, ext_category_id, humanize_seed, network) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, random(), ?17)",
        params![
            id,
            serial,
            input.name.trim(),
            input.note,
            input.group_id,
            input.platform_domain,
            to_json(&input.start_urls),
            to_json(&input.extra_args),
            input.username,
            password,
            totp,
            input.fingerprint_json,
            input.proxy_id,
            input.restore_tabs,
            now,
            input.ext_category_id,
            serde_json::to_string(&input.network.clone().unwrap_or_default()).expect("network")
        ],
    )?;
    Ok(id)
}

/// Номера не переиспользуются: счётчик хранится в настройках.
fn next_serial(conn: &Connection) -> Result<i64, StoreError> {
    let current: Option<String> = conn
        .query_row("SELECT value FROM settings WHERE key = 'profiles.next_serial'", [], |r| r.get(0))
        .optional()?;
    let serial = current.and_then(|v| v.parse().ok()).unwrap_or(1_i64);
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('profiles.next_serial', ?1) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [(serial + 1).to_string()],
    )?;
    Ok(serial)
}

fn unused_id(conn: &Connection) -> Result<String, StoreError> {
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
    loop {
        let mut bytes = [0u8; 6];
        getrandom::fill(&mut bytes).map_err(|_| StoreError::Crypto)?;
        let id: String = bytes.iter().map(|b| ALPHABET[*b as usize % ALPHABET.len()] as char).collect();
        let taken: bool = conn.query_row("SELECT EXISTS(SELECT 1 FROM profiles WHERE id = ?1)", [&id], |r| r.get(0))?;
        if !taken {
            return Ok(id);
        }
    }
}

fn fetch(conn: &Connection, id: &str) -> Result<Option<ProfileRecord>, StoreError> {
    Ok(conn
        .query_row(&format!("SELECT {COLUMNS} FROM profiles WHERE id = ?1"), [id], row_to_record)
        .optional()?)
}

fn row_to_record(row: &Row<'_>) -> rusqlite::Result<ProfileRecord> {
    Ok(ProfileRecord {
        id: row.get(0)?,
        serial: row.get(1)?,
        name: row.get(2)?,
        note: row.get(3)?,
        group_id: row.get(4)?,
        platform_domain: row.get(5)?,
        start_urls: json_column(row, 6)?,
        extra_args: json_column(row, 7)?,
        username: row.get(8)?,
        has_password: row.get(9)?,
        has_totp: row.get(10)?,
        fingerprint_json: row.get(11)?,
        proxy_id: row.get(12)?,
        created_at: row.get(13)?,
        last_opened_at: row.get(14)?,
        restore_tabs: row.get(15)?,
        gateway_replaced_at: row.get(16)?,
        deleted_at: row.get(17)?,
        ext_category_id: row.get(18)?,
        network: serde_json::from_str(&row.get::<_, String>(19)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(19, Type::Text, Box::new(e)))?,
    })
}

fn json_column(row: &Row<'_>, index: usize) -> rusqlite::Result<Vec<String>> {
    let text: String = row.get(index)?;
    serde_json::from_str(&text).map_err(|e| rusqlite::Error::FromSqlConversionFailure(index, Type::Text, Box::new(e)))
}

fn to_json(values: &[String]) -> String {
    serde_json::to_string(values).expect("список строк сериализуется")
}

fn escape_like(text: &str) -> String {
    text.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::groups::GroupInput;
    use crate::store::proxies::{ProxyInput, ProxyKind};
    use crate::store::secrets::Secret;
    use crate::store::tests::memory_store;

    const FP: &str = r#"{"seed":12345}"#;

    fn named(name: &str) -> ProfileInput {
        ProfileInput::new(name, FP)
    }

    #[test]
    fn trash_hides_profiles_from_live_queries() {
        let store = memory_store();
        let a = store.create_profile(&ProfileInput::new("A", "{}"), 1).unwrap();
        let b = store.create_profile(&ProfileInput::new("B", "{}"), 2).unwrap();
        store.set_deleted(std::slice::from_ref(&a.id), Some(10)).unwrap();
        let live: Vec<String> = store.list_profiles(&ListQuery::default()).unwrap().into_iter().map(|p| p.id).collect();
        assert_eq!(live, std::slice::from_ref(&b.id));
        assert!(store.get_profile(&a.id).unwrap().is_none(), "get_profile не видит корзину");
        assert!(store.profile_by_serial(a.serial).unwrap().is_none(), "New Browser не откроет профиль из корзины");
        assert_eq!(store.profile_by_serial(b.serial).unwrap().map(|p| p.id), Some(b.id.clone()));
        assert_eq!(store.get_profile_any(&a.id).unwrap().unwrap().deleted_at, Some(10));
        assert_eq!(store.count_profiles().unwrap(), 1);
        let trash: Vec<String> = store.list_trash().unwrap().into_iter().map(|p| p.id).collect();
        assert_eq!(trash, std::slice::from_ref(&a.id));
        store.set_deleted(std::slice::from_ref(&a.id), None).unwrap();
        assert!(store.get_profile(&a.id).unwrap().is_some(), "восстановлен");
        assert!(store.profile_by_serial(a.serial).unwrap().is_some());
        assert!(matches!(store.set_deleted(&["nope".into()], Some(1)), Err(StoreError::NotFound(_))));
    }

    /// Корзина не попадает в счётчики групп, «без группы», теги и закрепления прокси.
    #[test]
    fn trash_is_excluded_from_counts_and_pins() {
        let store = memory_store();
        let group = store
            .create_group(&GroupInput { name: "G".into(), color: "#2447c9".into(), note: String::new(), quick_access: false }, 1)
            .unwrap();
        let proxy = store
            .create_proxy(&ProxyInput {
                kind: ProxyKind::Http,
                host: "127.0.0.1".into(),
                port: 8080,
                username: None,
                password: SecretField::Keep,
                note: String::new(),
                enabled: true,
            })
            .unwrap();
        let mut input = named("a");
        input.proxy_id = Some(proxy.id);
        let a = store.create_profile(&input, 1).unwrap();
        input.name = "b".into();
        let b = store.create_profile(&input, 2).unwrap();
        let c = store.create_profile(&named("c"), 3).unwrap();
        let ab = [a.id.clone(), b.id.clone()];
        store.move_profiles(&ab, Some(group.id)).unwrap();
        store.add_tags(&[a.id.clone(), c.id.clone()], &["t".to_string()]).unwrap();
        store.set_deleted(&[a.id.clone(), c.id.clone()], Some(5)).unwrap();
        assert_eq!(store.list_groups().unwrap()[0].profile_count, 1);
        assert_eq!(store.ungrouped_count().unwrap(), 0);
        assert_eq!(store.list_tags().unwrap()[0].profile_count, 0);
        let pins = store.proxy_pins().unwrap();
        assert_eq!((pins[&proxy.id].profiles, pins[&proxy.id].only.as_deref()), (1, Some("b")));
        store.set_deleted(std::slice::from_ref(&b.id), Some(5)).unwrap();
        assert!(store.proxy_pins().unwrap().is_empty());
    }

    #[test]
    fn create_assigns_short_id_and_growing_serial() {
        let store = memory_store();
        let a = store.create_profile(&named("  Магазин  "), 100).unwrap();
        let b = store.create_profile(&named("Реклама"), 101).unwrap();
        assert_eq!(a.id.len(), 6);
        assert!(a.id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit()), "{}", a.id);
        assert_ne!(a.id, b.id);
        assert_eq!((a.serial, b.serial), (1, 2));
        assert_eq!(a.name, "Магазин");
        assert_eq!(a.created_at, 100);
        assert_eq!(store.get_profile(&a.id).unwrap(), Some(a));
    }

    #[test]
    fn serial_is_not_reused_after_delete() {
        let store = memory_store();
        store.create_profile(&named("a"), 1).unwrap();
        let b = store.create_profile(&named("b"), 1).unwrap();
        store.delete_profile(&b.id).unwrap();
        assert_eq!(store.create_profile(&named("c"), 1).unwrap().serial, 3);
    }

    #[test]
    fn batch_delete_is_all_or_nothing() {
        let store = memory_store();
        let a = store.create_profile(&named("a"), 1).unwrap().id;
        let b = store.create_profile(&named("b"), 1).unwrap().id;
        store.add_tags(std::slice::from_ref(&a), &["vip".to_string()]).unwrap();
        let err = store.delete_profiles(&[a.clone(), "nope00".into(), b.clone()]).unwrap_err();
        assert!(matches!(err, StoreError::NotFound(_)), "{err}");
        assert_eq!(store.count_profiles().unwrap(), 2, "ничего не удалено");
        assert_eq!(store.profile_tags(&a).unwrap(), ["vip"]);
        store.delete_profiles(&[a, b]).unwrap();
        assert_eq!(store.count_profiles().unwrap(), 0);
        assert!(store.list_tags().unwrap().is_empty(), "теги без профилей удалены");
    }

    #[test]
    fn password_is_stored_encrypted() {
        let store = memory_store();
        let mut input = named("a");
        input.username = Some("user".into());
        input.password = SecretField::Set(Secret::new("hunter2"));
        let rec = store.create_profile(&input, 1).unwrap();
        assert!(rec.has_password);
        assert!(!rec.has_totp);
        let blob: Vec<u8> = store
            .raw()
            .query_row("SELECT password_enc FROM profiles WHERE id = ?1", [&rec.id], |r| r.get(0))
            .unwrap();
        assert!(!blob.windows(7).any(|w| w == b"hunter2"));
    }

    #[test]
    fn profile_and_tags_are_saved_together() {
        let store = memory_store();
        let rec = store.create_profile(&named("a"), 1).unwrap();
        let tags = vec!["vip".to_string()];
        let updated = store.update_profile_with_tags(&rec.id, &named("b"), Some(tags.as_slice())).unwrap();
        assert_eq!(updated.name, "b");
        assert_eq!(store.profile_tags(&rec.id).unwrap(), ["vip"]);

        let too_long = ["я".repeat(31)];
        let err = store.update_profile_with_tags(&rec.id, &named("c"), Some(too_long.as_slice())).unwrap_err();
        assert!(matches!(err, StoreError::Invalid("tag")), "{err}");
        assert_eq!(store.get_profile(&rec.id).unwrap().unwrap().name, "b", "ошибка тегов — профиль не изменён");
        assert_eq!(store.profile_tags(&rec.id).unwrap(), ["vip"]);

        store.update_profile_with_tags(&rec.id, &named("d"), None).unwrap();
        assert_eq!(store.profile_tags(&rec.id).unwrap(), ["vip"], "без тегов теги не меняются");
    }

    #[test]
    fn update_keeps_clears_and_replaces_secrets() {
        let store = memory_store();
        let mut input = named("a");
        input.password = SecretField::Set(Secret::new("one"));
        let rec = store.create_profile(&input, 1).unwrap();
        let read = |store: &Store| -> Option<Vec<u8>> {
            store.raw().query_row("SELECT password_enc FROM profiles WHERE id = ?1", [&rec.id], |r| r.get(0)).unwrap()
        };
        let original = read(&store);

        input.password = SecretField::Keep;
        input.name = "b".into();
        let updated = store.update_profile(&rec.id, &input).unwrap();
        assert_eq!(updated.name, "b");
        assert_eq!(read(&store), original);

        input.password = SecretField::Set(Secret::new("two"));
        store.update_profile(&rec.id, &input).unwrap();
        assert_ne!(read(&store), original);

        input.password = SecretField::Clear;
        assert!(!store.update_profile(&rec.id, &input).unwrap().has_password);
        assert_eq!(read(&store), None);
    }

    #[test]
    fn invalid_input_is_rejected() {
        let store = memory_store();
        assert!(matches!(store.create_profile(&named("   "), 1), Err(StoreError::Invalid("name"))));
        assert!(matches!(store.create_profile(&ProfileInput::new("a", "not json"), 1), Err(StoreError::Invalid("fingerprint"))));
        let mut input = named("a");
        input.proxy_id = Some(999);
        assert!(matches!(store.create_profile(&input, 1), Err(StoreError::Invalid("proxy_id"))));
    }

    #[test]
    fn list_searches_sorts_and_filters() {
        let store = memory_store();
        let alpha = store.create_profile(&named("Alpha"), 30).unwrap();
        let beta = store.create_profile(&named("beta"), 10).unwrap();
        let sale = store.create_profile(&named("50% off"), 20).unwrap();
        let names = |q: &ListQuery| -> Vec<String> {
            store.list_profiles(q).unwrap().into_iter().map(|p| p.name).collect()
        };

        assert_eq!(names(&ListQuery::default()), ["Alpha", "beta", "50% off"]);
        assert_eq!(names(&ListQuery { search: Some("50%".into()), ..Default::default() }), ["50% off"]);
        assert_eq!(names(&ListQuery { search: Some("_".into()), ..Default::default() }), Vec::<String>::new());
        assert_eq!(names(&ListQuery { search: Some("A".into()), ..Default::default() }), ["Alpha", "beta"]);
        assert_eq!(names(&ListQuery { search: Some("2".into()), ..Default::default() }), ["beta"]);
        assert_eq!(
            names(&ListQuery { sort: SortKey::Name, descending: true, ..Default::default() }),
            ["beta", "Alpha", "50% off"]
        );
        assert_eq!(names(&ListQuery { sort: SortKey::Created, ..Default::default() }), ["beta", "50% off", "Alpha"]);

        let shops = store
            .create_group(
                &GroupInput { name: "Магазины".into(), color: "#2447c9".into(), note: String::new(), quick_access: false },
                1,
            )
            .unwrap();
        store.move_profiles(std::slice::from_ref(&beta.id), Some(shops.id)).unwrap();
        store.add_tags(std::slice::from_ref(&alpha.id), &["shop".to_string()]).unwrap();
        assert_eq!(names(&ListQuery { group: Some(GroupFilter::Id(shops.id)), ..Default::default() }), ["beta"]);
        assert_eq!(names(&ListQuery { tag: Some("shop".into()), ..Default::default() }), ["Alpha"]);

        store.touch_last_opened(&sale.id, 500).unwrap();
        assert_eq!(store.get_profile(&sale.id).unwrap().unwrap().last_opened_at, Some(500));
    }

    #[test]
    fn missing_profiles_are_reported() {
        let store = memory_store();
        assert!(matches!(store.delete_profile("nope00"), Err(StoreError::NotFound(_))));
        assert!(matches!(store.touch_last_opened("nope00", 1), Err(StoreError::NotFound(_))));
        assert!(matches!(store.update_profile("nope00", &named("a")), Err(StoreError::NotFound(_))));
        assert_eq!(store.get_profile("nope00").unwrap(), None);
    }

    #[test]
    fn deleting_proxy_unlinks_profile() {
        let store = memory_store();
        let proxy = store
            .create_proxy(&ProxyInput {
                kind: ProxyKind::Http,
                host: "gw.example.net".into(),
                port: 8080,
                username: None,
                password: SecretField::Keep,
                note: String::new(),
                enabled: true,
            })
            .unwrap();
        let mut input = named("a");
        input.proxy_id = Some(proxy.id);
        let rec = store.create_profile(&input, 1).unwrap();
        store.delete_proxy(proxy.id).unwrap();
        assert_eq!(store.get_profile(&rec.id).unwrap().unwrap().proxy_id, None);
    }

    #[test]
    fn search_finds_profile_by_exit_ip_of_its_proxy() {
        let store = memory_store();
        let proxy = |host: &str| {
            store
                .create_proxy(&ProxyInput {
                    kind: ProxyKind::Http,
                    host: host.into(),
                    port: 8080,
                    username: None,
                    password: SecretField::Keep,
                    note: String::new(),
                    enabled: true,
                })
                .unwrap()
                .id
        };
        let de = proxy("gw1.example.net");
        let us = proxy("gw2.example.net");
        store.record_proxy_check(de, 1, Some(("203.0.113.24", "DE"))).unwrap();
        store.record_proxy_check(us, 1, Some(("198.51.100.7", "US"))).unwrap();
        let mut alpha = named("Альфа");
        alpha.proxy_id = Some(de);
        store.create_profile(&alpha, 1).unwrap();
        let mut beta = named("Бета");
        beta.proxy_id = Some(us);
        store.create_profile(&beta, 1).unwrap();
        store.create_profile(&named("Гамма"), 1).unwrap();
        let names = |search: &str| -> Vec<String> {
            let query = ListQuery { search: Some(search.into()), ..Default::default() };
            store.list_profiles(&query).unwrap().into_iter().map(|p| p.name).collect()
        };
        assert_eq!(names("203.0.113"), ["Альфа"], "часть IP");
        assert_eq!(names("198.51.100.7"), ["Бета"], "IP целиком");
        assert_eq!(names("192.0.2.1"), Vec::<String>::new(), "чужой IP и профиль без прокси не находятся");
        assert_eq!(names("гам"), ["Гамма"], "поиск по имени работает как раньше");
    }

    #[test]
    fn search_and_sort_ignore_case_for_cyrillic() {
        let store = memory_store();
        for name in ["борис", "Анна", "вера", "БОРИС 2", "Ёжик"] {
            store.create_profile(&named(name), 1).unwrap();
        }
        let names = |q: &ListQuery| -> Vec<String> {
            store.list_profiles(q).unwrap().into_iter().map(|p| p.name).collect()
        };
        assert_eq!(names(&ListQuery { search: Some("БОР".into()), ..Default::default() }), ["борис", "БОРИС 2"]);
        assert_eq!(names(&ListQuery { search: Some("ёж".into()), ..Default::default() }), ["Ёжик"]);
        assert_eq!(names(&ListQuery { search: Some("ежик".into()), ..Default::default() }), ["Ёжик"]);
        assert_eq!(names(&ListQuery { search: Some("ЕЖИК".into()), ..Default::default() }), ["Ёжик"]);
        assert_eq!(
            names(&ListQuery { sort: SortKey::Name, ..Default::default() })[..4],
            ["Анна", "борис", "БОРИС 2", "вера"]
        );
    }

    #[test]
    fn never_opened_profiles_sort_last_both_ways() {
        let store = memory_store();
        let a = store.create_profile(&named("a"), 1).unwrap();
        store.create_profile(&named("never"), 1).unwrap();
        let c = store.create_profile(&named("c"), 1).unwrap();
        store.touch_last_opened(&a.id, 100).unwrap();
        store.touch_last_opened(&c.id, 200).unwrap();
        let names = |descending: bool| -> Vec<String> {
            store
                .list_profiles(&ListQuery { sort: SortKey::LastOpened, descending, ..Default::default() })
                .unwrap()
                .into_iter()
                .map(|p| p.name)
                .collect()
        };
        assert_eq!(names(false), ["a", "c", "never"]);
        assert_eq!(names(true), ["c", "a", "never"]);
        assert_eq!(store.count_profiles().unwrap(), 3);
    }

    #[test]
    fn list_filters_by_group_ungrouped_and_tag() {
        let store = memory_store();
        let shops = store
            .create_group(
                &GroupInput { name: "Магазины".into(), color: "#2447c9".into(), note: String::new(), quick_access: false },
                1,
            )
            .unwrap();
        let mut input = named("a");
        input.group_id = Some(shops.id);
        let a = store.create_profile(&input, 1).unwrap();
        store.create_profile(&named("b"), 1).unwrap();
        input.name = "c".into();
        let c = store.create_profile(&input, 1).unwrap();
        store.add_tags(std::slice::from_ref(&c.id), &["VIP".to_string()]).unwrap();
        let names = |q: &ListQuery| -> Vec<String> {
            store.list_profiles(q).unwrap().into_iter().map(|p| p.name).collect()
        };
        assert_eq!(names(&ListQuery { group: Some(GroupFilter::Id(shops.id)), ..Default::default() }), ["a", "c"]);
        assert_eq!(names(&ListQuery { group: Some(GroupFilter::Ungrouped), ..Default::default() }), ["b"]);
        assert_eq!(names(&ListQuery { tag: Some(" vip ".into()), ..Default::default() }), ["c"]);
        assert_eq!(
            names(&ListQuery { group: Some(GroupFilter::Id(shops.id)), tag: Some("Vip".into()), ..Default::default() }),
            ["c"]
        );
        assert_eq!(names(&ListQuery { group: Some(GroupFilter::Ungrouped), tag: Some("vip".into()), ..Default::default() }), Vec::<String>::new());
        assert_eq!(a.group_id, Some(shops.id));
    }

    #[test]
    fn profile_keeps_group_and_restore_tabs() {
        let store = memory_store();
        let shops = store
            .create_group(
                &GroupInput { name: "Магазины".into(), color: "#2447c9".into(), note: String::new(), quick_access: false },
                1,
            )
            .unwrap();
        let fresh = store.create_profile(&named("fresh"), 1).unwrap();
        assert_eq!((fresh.group_id, fresh.restore_tabs, fresh.gateway_replaced_at), (None, true, None));

        let mut input = named("a");
        input.group_id = Some(shops.id);
        input.restore_tabs = false;
        let rec = store.create_profile(&input, 1).unwrap();
        assert_eq!((rec.group_id, rec.restore_tabs), (Some(shops.id), false));

        input.group_id = None;
        input.restore_tabs = true;
        let updated = store.update_profile(&rec.id, &input).unwrap();
        assert_eq!((updated.group_id, updated.restore_tabs), (None, true));

        input.group_id = Some(999);
        assert!(matches!(store.create_profile(&input, 1), Err(StoreError::Invalid("group_id"))));
        assert!(matches!(store.update_profile(&rec.id, &input), Err(StoreError::Invalid("group_id"))));
    }

    fn some_proxy(store: &Store) -> i64 {
        store
            .create_proxy(&ProxyInput {
                kind: ProxyKind::Http,
                host: "gw.example.net".into(),
                port: 8080,
                username: None,
                password: SecretField::Keep,
                note: String::new(),
                enabled: true,
            })
            .unwrap()
            .id
    }

    #[test]
    fn profiles_are_pinned_and_unpinned_in_bulk() {
        let store = memory_store();
        let proxy = some_proxy(&store);
        let a = store.create_profile(&named("a"), 1).unwrap().id;
        let b = store.create_profile(&named("b"), 1).unwrap().id;
        let c = store.create_profile(&named("c"), 1).unwrap().id;
        store.record_gateway(&a, proxy, Some(50)).unwrap();
        assert_eq!(
            store.set_profiles_proxy(&[a.clone(), b.clone(), "nope00".to_string()], Some(proxy)).unwrap(),
            2
        );
        let pinned = |id: &str| store.get_profile(id).unwrap().unwrap();
        assert_eq!((pinned(&a).proxy_id, pinned(&b).proxy_id, pinned(&c).proxy_id), (Some(proxy), Some(proxy), None));
        assert_eq!(pinned(&a).gateway_replaced_at, None, "ручное назначение снимает отметку о замене");
        assert_eq!(store.set_profiles_proxy(std::slice::from_ref(&a), None).unwrap(), 1);
        assert_eq!(pinned(&a).proxy_id, None);
        assert!(matches!(
            store.set_profiles_proxy(std::slice::from_ref(&a), Some(999)),
            Err(StoreError::Invalid("proxy_id"))
        ));
    }

    #[test]
    fn record_gateway_sets_and_clears_replacement() {
        let store = memory_store();
        let proxy = some_proxy(&store);
        let a = store.create_profile(&named("a"), 1).unwrap().id;
        store.record_gateway(&a, proxy, Some(500)).unwrap();
        let rec = store.get_profile(&a).unwrap().unwrap();
        assert_eq!((rec.proxy_id, rec.gateway_replaced_at), (Some(proxy), Some(500)));
        store.record_gateway(&a, proxy, None).unwrap();
        assert_eq!(store.get_profile(&a).unwrap().unwrap().gateway_replaced_at, None);
        assert!(matches!(store.record_gateway("nope00", proxy, None), Err(StoreError::NotFound(_))));
        assert!(matches!(store.record_gateway(&a, 999, None), Err(StoreError::Invalid("proxy_id"))));
    }

    #[test]
    fn update_keeps_replacement_mark_only_for_the_same_proxy() {
        let store = memory_store();
        let first = some_proxy(&store);
        let second = some_proxy(&store);
        let a = store.create_profile(&named("a"), 1).unwrap().id;
        store.record_gateway(&a, first, Some(500)).unwrap();
        let mut input = named("a");
        input.note = "правка".into();
        input.proxy_id = Some(first);
        assert_eq!(store.update_profile(&a, &input).unwrap().gateway_replaced_at, Some(500), "тот же прокси — отметка остаётся");
        input.proxy_id = Some(second);
        let moved = store.update_profile(&a, &input).unwrap();
        assert_eq!((moved.proxy_id, moved.gateway_replaced_at), (Some(second), None), "другой прокси — как ручное назначение");
        store.record_gateway(&a, second, Some(600)).unwrap();
        input.proxy_id = None;
        let unpinned = store.update_profile(&a, &input).unwrap();
        assert_eq!((unpinned.proxy_id, unpinned.gateway_replaced_at), (None, None), "без прокси нет и отметки");
    }

    #[test]
    fn bulk_insert_is_all_or_nothing() {
        let store = memory_store();
        let made = store.create_profiles(&[named("a"), named("b")], &["Shop".into()], 5).unwrap();
        assert_eq!(made.iter().map(|p| (p.serial, p.created_at)).collect::<Vec<_>>(), [(1, 5), (2, 5)]);
        assert_eq!(store.profile_tags(&made[1].id).unwrap(), ["Shop"]);
        assert!(matches!(
            store.create_profiles(&[named("c"), named("d")], &["".into()], 5),
            Err(StoreError::Invalid("tag"))
        ));
        assert!(matches!(
            store.create_profiles(&[named("c"), ProfileInput::new("d", "not json")], &[], 5),
            Err(StoreError::Invalid("fingerprint"))
        ));
        let mut orphan = named("c");
        orphan.group_id = Some(42);
        assert!(matches!(store.create_profiles(&[orphan], &[], 5), Err(StoreError::Invalid("group_id"))));
        assert_eq!(store.count_profiles().unwrap(), 2);
        assert_eq!(store.create_profile(&named("e"), 6).unwrap().serial, 3, "откат не расходует номера");
    }

    #[test]
    fn bulk_edit_touches_only_given_fields() {
        let store = memory_store();
        let mut input = named("a");
        input.note = "старая".into();
        input.extra_args = vec!["--disable-sync".into()];
        let a = store.create_profile(&input, 1).unwrap();
        let b = store.create_profile(&named("b"), 1).unwrap();
        let edit = ProfileEdit { note: Some("новая".into()), restore_tabs: Some(false), ..Default::default() };
        assert_eq!(store.edit_profiles(&[a.id.clone(), b.id.clone(), "nope00".into()], &edit).unwrap(), 2);
        let a = store.get_profile(&a.id).unwrap().unwrap();
        assert_eq!((a.note.as_str(), a.restore_tabs), ("новая", false));
        assert_eq!(a.extra_args, ["--disable-sync"], "аргументы не заданы — не меняются");
        let edit = ProfileEdit {
            start_urls: Some(vec!["https://example.com/".into()]),
            extra_args: Some(vec![]),
            ..Default::default()
        };
        store.edit_profiles(std::slice::from_ref(&a.id), &edit).unwrap();
        let a = store.get_profile(&a.id).unwrap().unwrap();
        assert_eq!((a.note.as_str(), a.start_urls.clone(), a.extra_args.clone()), ("новая", vec!["https://example.com/".to_string()], vec![]));
        assert!(!store.get_profile(&b.id).unwrap().unwrap().restore_tabs);
    }

    #[test]
    fn api_extra_round_trips_and_rejects_non_objects() {
        let store = memory_store();
        let rec = store.create_profile(&named("a"), 1).unwrap();
        assert_eq!(store.api_extra(&rec.id).unwrap(), "{}");

        let extra = r#"{"fonts":["all"],"webrtc":"disabled"}"#;
        store.set_api_extra(&rec.id, extra).unwrap();
        assert_eq!(store.api_extra(&rec.id).unwrap(), extra);
        for bad in ["[]", "\"x\"", "1", "not json", ""] {
            assert!(matches!(store.set_api_extra(&rec.id, bad), Err(StoreError::Invalid("api_extra"))), "{bad:?}");
        }
        assert_eq!(store.api_extra(&rec.id).unwrap(), extra, "отказ ничего не меняет");

        let mut input = named("b");
        input.note = "правка".into();
        store.update_profile(&rec.id, &input).unwrap();
        assert_eq!(store.api_extra(&rec.id).unwrap(), extra, "правка профиля не трогает api_extra");

        assert!(matches!(store.api_extra("nope00"), Err(StoreError::NotFound(_))));
        assert!(matches!(store.set_api_extra("nope00", "{}"), Err(StoreError::NotFound(_))));
    }

    #[test]
    fn profile_secrets_are_decrypted() {
        let store = memory_store();
        let bare = store.create_profile(&named("a"), 1).unwrap();
        let (password, totp) = store.profile_secrets(&bare.id).unwrap();
        assert!(password.is_none() && totp.is_none());

        let mut input = named("b");
        input.username = Some("user".into());
        input.password = SecretField::Set(Secret::new("hunter2"));
        input.totp_secret = SecretField::Set(Secret::new("JBSWY3DPEHPK3PXP"));
        let rec = store.create_profile(&input, 1).unwrap();
        let (password, totp) = store.profile_secrets(&rec.id).unwrap();
        assert_eq!(password.unwrap().expose(), "hunter2");
        assert_eq!(totp.unwrap().expose(), "JBSWY3DPEHPK3PXP");
        assert!(matches!(store.profile_secrets("nope00"), Err(StoreError::NotFound(_))));
    }
}
