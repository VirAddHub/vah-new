-- 102_time_ms_scan_tokens.sql
-- scan_tokens: TEXT → BIGINT(ms) + generated timestamptz mirrors

-- Add new millisecond columns
ALTER TABLE scan_tokens
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS expires_at_ms BIGINT;

-- Add generated timestamptz mirrors
ALTER TABLE scan_tokens
  ADD COLUMN IF NOT EXISTS created_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(created_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS expires_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(expires_at_ms / 1000.0)) STORED;

-- Backfill from legacy TEXT columns
UPDATE scan_tokens
SET created_at_ms = COALESCE(created_at_ms,
      ((EXTRACT(EPOCH FROM (created_at::timestamptz)) * 1000))::BIGINT),
    expires_at_ms = COALESCE(expires_at_ms,
      ((EXTRACT(EPOCH FROM (expires_at::timestamptz)) * 1000))::BIGINT)
WHERE created_at IS NOT NULL OR expires_at IS NOT NULL;

-- Add index for expiration queries
CREATE INDEX IF NOT EXISTS scan_tokens_expires_ms_idx ON scan_tokens (expires_at_ms);
