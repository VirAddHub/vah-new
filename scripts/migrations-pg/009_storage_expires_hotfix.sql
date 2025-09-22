-- 009_storage_expires_hotfix.sql
-- Create a compat column to stop 42703 in old builds. Idempotent.
ALTER TABLE public.export_job
  ADD COLUMN IF NOT EXISTS storage_expires_at bigint GENERATED ALWAYS AS (expires_at) STORED;

CREATE INDEX IF NOT EXISTS export_job_storage_expires_idx
  ON public.export_job (storage_expires_at);
