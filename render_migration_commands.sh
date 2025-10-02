# Individual Migration Commands for Render Console
# Run these one by one in your Render backend shell

echo "🚀 Starting Time Standardization Migration on Render"
echo "=================================================="

# Pre-migration validation
echo "🔍 Pre-migration validation..."
psql $DATABASE_URL -c "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('plans', 'scan_tokens', 'invoice_token', 'mail_item', 'webhook_log', 'export_job', 'address', 'user_address')
  AND column_name LIKE '%_ms'
ORDER BY table_name, column_name;
"

echo "📊 Current plans table schema:"
psql $DATABASE_URL -c "
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'plans' AND column_name IN ('created_at', 'updated_at', 'effective_at', 'retired_at')
ORDER BY ordinal_position;
"

# Run migrations in sequence
echo "🔄 Running Migration 101: Plans table..."
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/101_time_ms_plans.sql

echo "🔄 Running Migration 102: Scan tokens..."
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/102_time_ms_scan_tokens.sql

echo "🔄 Running Migration 103: Invoice token..."
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/103_time_ms_invoice_token.sql

echo "🔄 Running Migration 104: Mail item dates..."
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/104_time_ms_mail_item_dates.sql

echo "🔄 Running Migration 105: Webhook, export, address..."
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/105_time_ms_webhook_export_address.sql

echo "🔄 Running Migration 106: Not null defaults..."
psql $DATABASE_URL -f apps/backend/scripts/migrations-pg/106_time_ms_not_null_defaults.sql

# Post-migration validation
echo "🔍 Post-migration validation..."

echo "📊 New *_ms columns:"
psql $DATABASE_URL -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%_ms'
ORDER BY table_name;
"

echo "📊 Sample plans data:"
psql $DATABASE_URL -c "
SELECT
  id,
  created_at,           -- legacy text
  created_at_ms,        -- new canonical
  created_at_ts,        -- generated mirror
  LENGTH(created_at_ms::text) as ms_digits  -- should be 13
FROM plans
ORDER BY id DESC
LIMIT 5;
"

echo "📊 Generated columns verification:"
psql $DATABASE_URL -c "
SELECT
  id,
  created_at_ms,
  created_at_ts,
  to_timestamp(created_at_ms / 1000.0) as manual_calc,
  created_at_ts = to_timestamp(created_at_ms / 1000.0) as match
FROM plans
LIMIT 5;
"

echo "🎉 Migration completed successfully!"
echo "🔍 Run validation queries to verify results"
