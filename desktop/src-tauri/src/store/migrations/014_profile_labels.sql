-- Ручная метка профиля не зависит от состояния браузера и обычных тегов.
CREATE TABLE profile_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_folded TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    preset TEXT UNIQUE
);
INSERT INTO profile_labels (name, name_folded, color, preset) VALUES
    ('BAN', 'ban', '#b42318', 'ban'),
    ('READY', 'ready', '#237a36', 'ready'),
    ('NEW', 'new', '#1454ed', 'new');

-- Отсутствие назначения означает «Без статуса». У профиля может быть одна метка.
CREATE TABLE profile_label_assignments (
    profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES profile_labels(id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX profile_label_assignments_label ON profile_label_assignments(label_id);
