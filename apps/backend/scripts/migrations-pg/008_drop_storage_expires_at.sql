-- 008_drop_storage_expires_at.sql
-- Safely remove the storage_expires_at compatibility column and its index (if present).

-- Drop the index first (optional; dropping the column will remove dependent indexes anyway)
DROP INDEX IF EXISTS public.export_job_storage_expires_idx;

-- Drop the generated column (no-op if already gone)
ALTER TABLE public.export_job
  DROP COLUMN IF EXISTS storage_expires_at;

-- Verify removal and log a notice
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='export_job'
      AND column_name='storage_expires_at'
  ) THEN
    RAISE EXCEPTION 'Failed to drop storage_expires_at column';
  ELSE
    RAISE NOTICE 'storage_expires_at column successfully removed';
  END IF;
END
$$;
