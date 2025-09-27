-- migrations/add_password_reset.sql
CREATE TABLE IF NOT EXISTS password_reset (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
