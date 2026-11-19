-- Поля fingerprint_config Local API, которые Ombra хранит и возвращает, но не применяет (спецификация 2Б).
ALTER TABLE profiles ADD COLUMN api_extra TEXT NOT NULL DEFAULT '{}';
