-- 006_export_job_expires_ms_normalize.sql
-- If expires_at looks like seconds (< 1e12), scale to milliseconds.
UPDATE public.export_job
SET expires_at = expires_at * 1000
WHERE expires_at IS NOT NULL
  AND expires_at < 100000000000; -- 1e11: well below any modern ms timestamp
