-- Verification Script for Time Standardization Migrations
-- Run with: psql $DATABASE_URL -f verify-migrations.sql

\echo '=== Checking new *_ms columns exist ==='
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('plans', 'scan_tokens', 'invoice_token', 'mail_item', 'admin_audit', 'webhook_log', 'export_job')
  AND column_name LIKE '%_ms'
ORDER BY table_name, ordinal_position;

\echo ''
\echo '=== Checking generated *_ts columns exist ==='
SELECT
  table_name,
  column_name,
  data_type,
  is_generated
FROM information_schema.columns
WHERE table_name IN ('plans', 'scan_tokens', 'invoice_token', 'mail_item')
  AND column_name LIKE '%_ts'
ORDER BY table_name, ordinal_position;

\echo ''
\echo '=== Verifying plans table data ==='
SELECT
  id,
  name,
  LENGTH(created_at_ms::text) as ms_digits_should_be_13,
  created_at_ms,
  created_at_ts,
  created_at as legacy_text
FROM plans
LIMIT 3;

\echo ''
\echo '=== Verifying admin_audit timestamps ==='
SELECT
  id,
  action,
  LENGTH(created_at::text) as digits_should_be_13,
  created_at,
  to_timestamp(created_at / 1000.0) as readable_time
FROM admin_audit
ORDER BY id DESC
LIMIT 5;

\echo ''
\echo '=== Checking mail_item timestamps ==='
SELECT
  id,
  subject,
  LENGTH(updated_at::text) as digits_should_be_13,
  updated_at,
  to_timestamp(updated_at / 1000.0) as readable_time
FROM mail_item
WHERE updated_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

\echo ''
\echo '=== Verifying generated columns compute correctly ==='
SELECT
  id,
  created_at_ms,
  created_at_ts,
  to_timestamp(created_at_ms / 1000.0) as manual_calculation,
  created_at_ts = to_timestamp(created_at_ms / 1000.0) as columns_match_should_be_true
FROM plans
LIMIT 3;

\echo ''
\echo '=== Success! All verifications complete. ==='
