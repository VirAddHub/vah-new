-- 105_time_ms_webhook_export_address.sql
-- Add ms mirrors for webhook_log, export_job, address, user_address

-- webhook_log: add ms mirror for received_at
ALTER TABLE webhook_log
  ADD COLUMN IF NOT EXISTS received_at_ms BIGINT;

UPDATE webhook_log
SET received_at_ms = COALESCE(received_at_ms,
      ((EXTRACT(EPOCH FROM (received_at::timestamptz)) * 1000))::BIGINT)
WHERE received_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS webhook_log_received_ms_idx ON webhook_log (received_at_ms);

-- export_job: add ms mirrors for timestamptz columns
ALTER TABLE export_job
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS started_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS completed_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS finished_at_ms BIGINT;

UPDATE export_job
SET created_at_ms = COALESCE(created_at_ms, ((EXTRACT(EPOCH FROM created_at) * 1000))::BIGINT),
    started_at_ms = COALESCE(started_at_ms, CASE WHEN started_at IS NOT NULL THEN ((EXTRACT(EPOCH FROM started_at) * 1000))::BIGINT ELSE NULL END),
    completed_at_ms = COALESCE(completed_at_ms, CASE WHEN completed_at IS NOT NULL THEN ((EXTRACT(EPOCH FROM completed_at) * 1000))::BIGINT ELSE NULL END),
    finished_at_ms = COALESCE(finished_at_ms, CASE WHEN finished_at IS NOT NULL THEN ((EXTRACT(EPOCH FROM finished_at) * 1000))::BIGINT ELSE NULL END);

CREATE INDEX IF NOT EXISTS export_job_created_ms_idx ON export_job (created_at_ms);

-- address: add ms mirror for created_at timestamptz
ALTER TABLE address
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT;

UPDATE address
SET created_at_ms = COALESCE(created_at_ms, ((EXTRACT(EPOCH FROM created_at) * 1000))::BIGINT);

-- user_address: add ms mirror for created_at timestamptz
ALTER TABLE user_address
  ADD COLUMN IF NOT EXISTS created_at_ms BIGINT;

UPDATE user_address
SET created_at_ms = COALESCE(created_at_ms, ((EXTRACT(EPOCH FROM created_at) * 1000))::BIGINT);
