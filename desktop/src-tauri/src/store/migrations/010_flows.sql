-- Автоматизация, А1-1: процессы. JSON процесса — как в файле экспорта, без `subflows`; имя и группа дублируются
-- в столбцы для списка процессов.
CREATE TABLE flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grp TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
