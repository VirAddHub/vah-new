-- up
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_token_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_token_expires_at
  ON "user" (reset_token_expires_at);

CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash
  ON "user" (reset_token_hash);

-- down
DROP INDEX IF EXISTS idx_users_reset_token_hash;
DROP INDEX IF EXISTS idx_users_reset_token_expires_at;
ALTER TABLE "user"
  DROP COLUMN IF EXISTS reset_token_used_at,
  DROP COLUMN IF EXISTS reset_token_expires_at,
  DROP COLUMN IF EXISTS reset_token_hash;
