-- NULL наследует режим процесса; 0/1 задают режим только для этой задачи.
ALTER TABLE flow_tasks ADD COLUMN headless INTEGER CHECK (headless IN (0, 1));
