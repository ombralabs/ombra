-- Этап 3Б: библиотека расширений и наборы (категории AdsPower).
CREATE TABLE extensions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('store', 'file')),
    manifest_version INTEGER NOT NULL,
    gateway_risk INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE ext_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_folded TEXT NOT NULL UNIQUE,
    remark TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
);

-- Набор 0 «Общий» — аналог «0 = follow team extension» AdsPower: у новых профилей, не удаляется.
INSERT INTO ext_categories (id, name, name_folded, remark, created_at)
VALUES (0, 'Общий', ombra_fold('Общий'), '', CAST(strftime('%s', 'now') AS INTEGER));

CREATE TABLE ext_category_items (
    category_id INTEGER NOT NULL REFERENCES ext_categories(id) ON DELETE CASCADE,
    extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, extension_id)
);

-- Без REFERENCES: SQLite не даёт добавить внешний ключ с ненулевым значением по умолчанию через ALTER TABLE.
ALTER TABLE profiles ADD COLUMN ext_category_id INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER ext_categories_unlink_profiles AFTER DELETE ON ext_categories
BEGIN
    UPDATE profiles SET ext_category_id = 0 WHERE ext_category_id = OLD.id;
END;
