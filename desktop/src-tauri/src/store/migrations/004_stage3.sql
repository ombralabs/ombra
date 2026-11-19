-- Этап 3: корзина профилей.
ALTER TABLE profiles ADD COLUMN deleted_at INTEGER;
CREATE INDEX profiles_deleted ON profiles(deleted_at);
