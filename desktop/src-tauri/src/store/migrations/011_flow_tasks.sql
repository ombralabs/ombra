-- Автоматизация, А2: задачи, их пакеты и запуски (спецификация А2, «Хранилище»). Параметры и таблица задачи —
-- зашифрованный JSON, как пароли профилей.
CREATE TABLE flow_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    flow_id INTEGER,            -- процесс из базы; без внешнего ключа: процесс могут удалить
    flow_json TEXT,             -- процесс из файла, вместе с subflows
    profiles TEXT NOT NULL,     -- JSON-массив id в порядке выбора
    run_order TEXT NOT NULL,    -- ordered | random
    threads INTEGER NOT NULL,
    missing_row TEXT NOT NULL,  -- skip | random
    params_enc BLOB NOT NULL,
    data_enc BLOB,
    created_at INTEGER NOT NULL
);
CREATE TABLE flow_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES flow_tasks(id) ON DELETE CASCADE,
    flow_json TEXT NOT NULL,    -- снимок процесса на момент старта
    pid INTEGER NOT NULL,       -- процесс Ombra, который ведёт пакет
    started_at INTEGER NOT NULL,
    finished_at INTEGER
);
CREATE TABLE flow_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES flow_batches(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    serial INTEGER NOT NULL,    -- номер профиля на момент старта
    position INTEGER NOT NULL,  -- место в порядке исполнения, с 0
    status TEXT NOT NULL,
    error TEXT,
    started_at INTEGER,
    finished_at INTEGER
);
CREATE INDEX flow_batches_task ON flow_batches(task_id);
CREATE INDEX flow_runs_batch ON flow_runs(batch_id);
