-- Модуль капч движка (этап 1в капч, решения C54, C57): JSON настроек профиля. Пустой JSON — значения по умолчанию
-- (`captcha::Captcha`): модуль выключен у всех профилей, и у прежних.
ALTER TABLE profiles ADD COLUMN captcha TEXT NOT NULL DEFAULT '{}';
