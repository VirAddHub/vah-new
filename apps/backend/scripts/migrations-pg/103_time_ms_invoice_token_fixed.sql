-- 103_time_ms_invoice_token_fixed.sql
-- invoice_token: harmonise regardless of legacy TEXT/timestamptz variants

-- Add new millisecond columns if they don't exist
ALTER TABLE invoice_token
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS expires_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS used_at_ms BIGINT;

-- Add generated timestamptz mirrors if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_token' AND column_name='created_at_ts') THEN
        ALTER TABLE invoice_token
        ADD COLUMN created_at_ts timestamptz
        GENERATED ALWAYS AS (to_timestamp(created_at_ms / 1000.0)) STORED;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_token' AND column_name='expires_at_ts') THEN
        ALTER TABLE invoice_token
        ADD COLUMN expires_at_ts timestamptz
        GENERATED ALWAYS AS (to_timestamp(expires_at_ms / 1000.0)) STORED;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoice_token' AND column_name='used_at_ts') THEN
        ALTER TABLE invoice_token
        ADD COLUMN used_at_ts timestamptz
        GENERATED ALWAYS AS (to_timestamp(used_at_ms / 1000.0)) STORED;
    END IF;
END $$;

-- Backfill created_at_ms (handle bigint case)
UPDATE invoice_token
SET created_at_ms = COALESCE(created_at_ms, created_at)
WHERE created_at_ms IS NULL AND created_at IS NOT NULL;

-- Backfill expires_at_ms (handle text case)
UPDATE invoice_token
SET expires_at_ms = COALESCE(expires_at_ms,
  CASE
    WHEN pg_typeof(expires_at)::text = 'text'
      THEN ((EXTRACT(EPOCH FROM (expires_at::timestamptz)) * 1000))::BIGINT
    ELSE ((EXTRACT(EPOCH FROM NOW())*1000))::BIGINT
  END)
WHERE expires_at_ms IS NULL AND expires_at IS NOT NULL;

-- Backfill used_at_ms (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='invoice_token' AND column_name='used_at') THEN
    UPDATE invoice_token
    SET used_at_ms = COALESCE(used_at_ms,
      CASE
        WHEN pg_typeof(used_at)::text = 'text'
          THEN ((EXTRACT(EPOCH FROM (used_at::timestamptz)) * 1000))::BIGINT
        ELSE NULL
      END)
    WHERE used_at_ms IS NULL AND used_at IS NOT NULL;
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS invoice_token_expires_ms_idx ON invoice_token (expires_at_ms);
CREATE INDEX IF NOT EXISTS invoice_token_created_ms_idx ON invoice_token (created_at_ms);
