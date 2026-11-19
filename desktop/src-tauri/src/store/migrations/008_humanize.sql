-- Очеловечивание ввода (этап Э5 движка, решение D4): у профиля — настройки и seed персоны движка. Пустой JSON —
-- значения по умолчанию (`humanize::Humanize`): включено у всех профилей, и у прежних (решение владельца 2026-10-11).
-- Seed — 64 бита: INTEGER со знаком, приложение читает его как u64 побитово; прежним профилям — свой из random().
ALTER TABLE profiles ADD COLUMN humanize TEXT NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN humanize_seed INTEGER NOT NULL DEFAULT 0;
UPDATE profiles SET humanize_seed = random();
