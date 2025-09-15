-- migrations/add_session_index.sql
CREATE INDEX IF NOT EXISTS idx_user_session_token ON "user"(session_token);
