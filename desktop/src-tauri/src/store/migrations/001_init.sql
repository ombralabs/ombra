CREATE TABLE proxies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('http', 'https', 'socks5')),
    host TEXT NOT NULL,
    port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 65535),
    username TEXT,
    password_enc BLOB,
    note TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    serial INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    group_id INTEGER,
    platform_domain TEXT NOT NULL DEFAULT '',
    start_urls TEXT NOT NULL DEFAULT '[]',
    extra_args TEXT NOT NULL DEFAULT '[]',
    username TEXT,
    password_enc BLOB,
    totp_enc BLOB,
    fingerprint TEXT NOT NULL,
    proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    last_opened_at INTEGER
);

CREATE INDEX profiles_name ON profiles(name);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE profile_tags (
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (profile_id, tag_id)
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
