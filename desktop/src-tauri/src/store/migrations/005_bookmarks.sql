-- Этап 3А: закладки профиля.
CREATE TABLE bookmarks (
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (profile_id, position)
);
