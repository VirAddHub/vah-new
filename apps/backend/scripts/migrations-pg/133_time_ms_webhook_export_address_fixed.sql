-- 105_time_ms_webhook_export_address_fixed.sql
-- Add ms mirrors for webhook_log, export_job, address_slot

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

-- address_slot: add ms mirror for created_at timestamptz (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='address_slot' AND column_name='created_at') THEN
        ALTER TABLE address_slot
        ADD COLUMN IF NOT EXISTS created_at_ms BIGINT;

        UPDATE address_slot
        SET created_at_ms = COALESCE(created_at_ms, ((EXTRACT(EPOCH FROM created_at) * 1000))::BIGINT);
    END IF;
END $$;
