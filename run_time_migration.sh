#!/bin/bash
# Migration execution script for time standardization
# Run this on Render where DATABASE_URL is accessible

set -e

echo "🚀 Starting Time Standardization Migration"
echo "=========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set it to your Render PostgreSQL URL"
    exit 1
fi

echo "✅ DATABASE_URL is set (length: ${#DATABASE_URL})"

# Create backup
echo "📦 Creating database backup..."
BACKUP_FILE="backup_before_time_migration_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Pre-migration validation
echo "🔍 Running pre-migration validation..."
psql "$DATABASE_URL" -c "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('plans', 'scan_tokens', 'invoice_token', 'mail_item', 'webhook_log', 'export_job', 'address', 'user_address')
  AND column_name LIKE '%_ms'
ORDER BY table_name, column_name;
"

echo "📊 Current plans table schema:"
psql "$DATABASE_URL" -c "
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
echo "🔄 Running migrations..."

MIGRATIONS=(
    "101_time_ms_plans.sql"
    "102_time_ms_scan_tokens.sql"
    "103_time_ms_invoice_token.sql"
    "104_time_ms_mail_item_dates.sql"
    "105_time_ms_webhook_export_address.sql"
    "106_time_ms_not_null_defaults.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    echo "Running $migration..."
    psql "$DATABASE_URL" -f "apps/backend/scripts/migrations-pg/$migration"
    echo "✅ $migration completed"
done

# Post-migration validation
echo "🔍 Running post-migration validation..."

echo "📊 New *_ms columns:"
psql "$DATABASE_URL" -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name LIKE '%_ms'
ORDER BY table_name;
"

echo "📊 Sample plans data:"
psql "$DATABASE_URL" -c "
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
psql "$DATABASE_URL" -c "
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
echo "📁 Backup file: $BACKUP_FILE"
echo "🔍 Run validation queries to verify results"
