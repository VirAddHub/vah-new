-- 103_time_ms_invoice_token.sql
-- invoice_token: harmonise regardless of legacy TEXT/timestamptz variants

-- Add new millisecond columns
ALTER TABLE invoice_token
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS expires_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS used_at_ms BIGINT;

-- Add generated timestamptz mirrors
ALTER TABLE invoice_token
  ADD COLUMN IF NOT EXISTS created_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(created_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS expires_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(expires_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS used_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(used_at_ms / 1000.0)) STORED;

-- Backfill created_at (handles both text and timestamptz variants)
UPDATE invoice_token
SET created_at_ms = COALESCE(created_at_ms,
  CASE
    WHEN pg_typeof(created_at)::text = 'timestamp with time zone'
      THEN ((EXTRACT(EPOCH FROM (created_at::timestamptz)) * 1000))::BIGINT
    WHEN pg_typeof(created_at)::text = 'text'
      THEN ((EXTRACT(EPOCH FROM (created_at::timestamptz)) * 1000))::BIGINT
    ELSE ((EXTRACT(EPOCH FROM NOW())*1000))::BIGINT
  END)
WHERE created_at IS NOT NULL;

-- Backfill expires_at
UPDATE invoice_token
SET expires_at_ms = COALESCE(expires_at_ms,
  CASE
    WHEN pg_typeof(expires_at)::text = 'timestamp with time zone'
      THEN ((EXTRACT(EPOCH FROM (expires_at::timestamptz)) * 1000))::BIGINT
    WHEN pg_typeof(expires_at)::text = 'text'
      THEN ((EXTRACT(EPOCH FROM (expires_at::timestamptz)) * 1000))::BIGINT
    ELSE ((EXTRACT(EPOCH FROM NOW())*1000))::BIGINT
  END)
WHERE expires_at IS NOT NULL;

-- Backfill used_at (if column exists in your schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='invoice_token' AND column_name='used_at') THEN
    UPDATE invoice_token
    SET used_at_ms = COALESCE(used_at_ms,
      CASE
        WHEN pg_typeof(used_at)::text = 'timestamp with time zone'
          THEN ((EXTRACT(EPOCH FROM (used_at::timestamptz)) * 1000))::BIGINT
        WHEN pg_typeof(used_at)::text = 'text'
          THEN ((EXTRACT(EPOCH FROM (used_at::timestamptz)) * 1000))::BIGINT
        ELSE NULL
      END)
    WHERE used_at IS NOT NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS invoice_token_expires_ms_idx ON invoice_token (expires_at_ms);
CREATE INDEX IF NOT EXISTS invoice_token_created_ms_idx ON invoice_token (created_at_ms);
