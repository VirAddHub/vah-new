-- 004_export_job.sql
-- Create the export_job table if it doesn't exist.
-- Use BIGSERIAL for id to avoid extension dependencies.
CREATE TABLE IF NOT EXISTS public.export_job (
  id              BIGSERIAL PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,                      -- matches code usage
  finished_at     timestamptz,                      -- alias for completed_at
  status          text NOT NULL DEFAULT 'pending',  -- pending|running|done|failed
  type            text,                             -- 'gdpr_v1', etc. (matches code usage)
  kind            text,                             -- alternative naming
  params          jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_path       text,
  file_size       bigint,                           -- matches code usage
  error           text,                             -- matches code usage (not error_message)
  error_message   text,                             -- alias for error
  user_id         bigint,                           -- for GDPR exports
  token           text,                             -- for download access
  expires_at      bigint                            -- for cleanup (bigint to match code)
);

CREATE INDEX IF NOT EXISTS export_job_status_idx ON public.export_job (status);
CREATE INDEX IF NOT EXISTS export_job_type_idx   ON public.export_job (type);
CREATE INDEX IF NOT EXISTS export_job_kind_idx   ON public.export_job (kind);
CREATE INDEX IF NOT EXISTS export_job_user_id_idx ON public.export_job (user_id);
CREATE INDEX IF NOT EXISTS export_job_token_idx  ON public.export_job (token);
CREATE INDEX IF NOT EXISTS export_job_expires_at_idx ON public.export_job (expires_at);
CREATE INDEX IF NOT EXISTS export_job_status_type_idx ON public.export_job (status, type);

-- Add status check constraint to prevent invalid values
ALTER TABLE public.export_job
  ADD CONSTRAINT export_job_status_chk
  CHECK (status IN ('pending','running','done','failed'));
