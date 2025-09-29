-- Up
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_token_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token_expires_at
  ON "user" (reset_token_expires_at);

-- Down (safe to leave no-op if your tooling doesn't use downs)
-- ALTER TABLE "user"
--   DROP COLUMN IF EXISTS reset_token_hash,
--   DROP COLUMN IF EXISTS reset_token_expires_at,
--   DROP COLUMN IF EXISTS reset_token_used_at;
