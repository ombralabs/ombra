-- Старые задачи сохраняют запуск на каждом профиле. Прогресс очереди привязан к заданию, а не к профилю.
ALTER TABLE flow_tasks ADD COLUMN distribution TEXT NOT NULL DEFAULT 'per_profile';
ALTER TABLE flow_tasks ADD COLUMN work_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE flow_runs ADD COLUMN item_index INTEGER;
CREATE UNIQUE INDEX flow_runs_item ON flow_runs(batch_id, item_index) WHERE item_index IS NOT NULL;
