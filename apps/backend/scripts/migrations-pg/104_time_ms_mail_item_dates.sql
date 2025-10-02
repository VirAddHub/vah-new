-- 104_time_ms_mail_item_dates.sql
-- mail_item: received_date/forwarded_date TEXT → add *_at_ms columns

-- Add new millisecond columns
ALTER TABLE mail_item
  ADD COLUMN IF NOT EXISTS received_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS forwarded_at_ms BIGINT;

-- Add generated timestamptz mirrors
ALTER TABLE mail_item
  ADD COLUMN IF NOT EXISTS received_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(received_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS forwarded_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(forwarded_at_ms / 1000.0)) STORED;

-- Backfill from legacy TEXT columns
UPDATE mail_item
SET received_at_ms = COALESCE(received_at_ms,
      CASE WHEN received_date IS NOT NULL
        THEN ((EXTRACT(EPOCH FROM (received_date::timestamptz)) * 1000))::BIGINT
        ELSE NULL END),
    forwarded_at_ms = COALESCE(forwarded_at_ms,
      CASE WHEN forwarded_date IS NOT NULL
        THEN ((EXTRACT(EPOCH FROM (forwarded_date::timestamptz)) * 1000))::BIGINT
        ELSE NULL END);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS mail_item_received_ms_idx ON mail_item (received_at_ms);
CREATE INDEX IF NOT EXISTS mail_item_forwarded_ms_idx ON mail_item (forwarded_at_ms);
