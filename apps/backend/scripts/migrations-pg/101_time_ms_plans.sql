-- 101_time_ms_plans.sql
-- plans: TEXT → BIGINT(ms) + generated timestamptz mirrors

-- Add new millisecond columns
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS effective_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS retired_at_ms BIGINT;

-- Add generated timestamptz mirrors for SQL convenience
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS created_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(created_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS updated_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(updated_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS effective_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(effective_at_ms / 1000.0)) STORED,
  ADD COLUMN IF NOT EXISTS retired_at_ts timestamptz
    GENERATED ALWAYS AS (to_timestamp(retired_at_ms / 1000.0)) STORED;

-- Backfill from legacy TEXT columns (Postgres native text format, not strict ISO)
UPDATE plans
SET created_at_ms = COALESCE(created_at_ms,
      ((EXTRACT(EPOCH FROM (created_at::timestamptz)) * 1000))::BIGINT),
    updated_at_ms = COALESCE(updated_at_ms,
      ((EXTRACT(EPOCH FROM (updated_at::timestamptz)) * 1000))::BIGINT),
    effective_at_ms = COALESCE(effective_at_ms,
      CASE WHEN effective_at IS NOT NULL THEN
        ((EXTRACT(EPOCH FROM (effective_at::timestamptz)) * 1000))::BIGINT
      ELSE NULL END),
    retired_at_ms = COALESCE(retired_at_ms,
      CASE WHEN retired_at IS NOT NULL THEN
        ((EXTRACT(EPOCH FROM (retired_at::timestamptz)) * 1000))::BIGINT
      ELSE NULL END);

-- Add index for effective_at queries
CREATE INDEX IF NOT EXISTS plans_effective_at_ms_idx ON plans (effective_at_ms);
