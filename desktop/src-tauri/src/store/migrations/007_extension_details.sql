-- Карточка расширения на экране «Расширения»: описание из манифеста и имя файла или папки, из которых добавлено.
ALTER TABLE extensions ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE extensions ADD COLUMN file_name TEXT;
