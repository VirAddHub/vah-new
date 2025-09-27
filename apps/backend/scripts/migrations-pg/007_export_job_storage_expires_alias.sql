-- 007_export_job_storage_expires_alias.sql
-- Provide a compatibility column "storage_expires_at" that mirrors expires_at (milliseconds).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='export_job' AND column_name='storage_expires_at'
  ) THEN
    -- Generated ALWAYS column mirrors expires_at and prevents drift.
    ALTER TABLE public.export_job
      ADD COLUMN storage_expires_at bigint GENERATED ALWAYS AS (expires_at) STORED;

    -- Index for any queries filtering by storage_expires_at (optional but cheap).
    CREATE INDEX IF NOT EXISTS export_job_storage_expires_idx
      ON public.export_job (storage_expires_at);
  END IF;
END
$$;
