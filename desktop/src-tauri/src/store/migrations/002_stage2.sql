CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_folded TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    quick_access INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- Этап 1 не заполнял group_id; ссылки на несуществующие группы обнуляются.
UPDATE profiles SET group_id = NULL WHERE group_id IS NOT NULL;

-- ON DELETE SET NULL без пересборки таблицы profiles: SQLite не добавляет внешний ключ к существующей колонке.
CREATE TRIGGER groups_unlink_profiles AFTER DELETE ON groups
BEGIN
    UPDATE profiles SET group_id = NULL WHERE group_id = OLD.id;
END;

ALTER TABLE profiles ADD COLUMN restore_tabs INTEGER NOT NULL DEFAULT 1;
ALTER TABLE profiles ADD COLUMN gateway_replaced_at INTEGER;
ALTER TABLE profiles ADD COLUMN cookies_hash TEXT;

ALTER TABLE proxies ADD COLUMN checked_at INTEGER;
ALTER TABLE proxies ADD COLUMN check_ok INTEGER;
ALTER TABLE proxies ADD COLUMN exit_ip TEXT;
ALTER TABLE proxies ADD COLUMN country TEXT;

CREATE TABLE cookies (
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    value_enc BLOB NOT NULL,
    expires INTEGER,
    http_only INTEGER NOT NULL,
    secure INTEGER NOT NULL,
    same_site TEXT CHECK (same_site IN ('strict', 'lax', 'none')),
    host_only INTEGER NOT NULL,
    PRIMARY KEY (profile_id, domain, name, path)
) WITHOUT ROWID;

CREATE INDEX profiles_group ON profiles(group_id);
CREATE INDEX profiles_last_opened ON profiles(last_opened_at);
CREATE INDEX profiles_created ON profiles(created_at);
CREATE INDEX profile_tags_tag ON profile_tags(tag_id);
