#!/bin/bash
# Run all pending migrations
# This script should be run on the production server

set -e

echo "🚀 Running pending migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    exit 1
fi

echo "🗄️  Database: $(echo $DATABASE_URL | sed -E 's/(postgresql:\/\/[^:]+:)[^@]+(@.*)/\1***\2/')"

# Create migrations tracking table
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS _migrations (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
"

# Get applied migrations
APPLIED=$(psql "$DATABASE_URL" -t -c "SELECT name FROM _migrations ORDER BY applied_at;" | tr -d ' ')

echo "📋 Applied migrations:"
echo "$APPLIED"

# Run migrations in order
MIGRATIONS=(
    "003_invoice_token.sql"
    "004_webhook_log.pg.sql"
    "006_add_soft_delete.sql"
    "020_fix_missing_columns.sql"
    "021_add_forwarding_address.sql"
    "022_remove_digital_mailbox_plan.sql"
    "023_add_payment_retry_system.sql"
    "025_forwarding_charges.sql"
    "026_enhanced_forwarding_system.sql"
    "027_admin_forwarding_system.sql"
    "028_forwarding_perf.sql"
    "028_normalize_forwarding_status.sql"
    "029_forwarding_trigger.sql"
    "20251001_add_password_reset_columns.sql"
)

APPLIED_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    if echo "$APPLIED" | grep -q "^$migration$"; then
        echo "[SKIP] $migration"
        continue
    fi
    
    echo "[APPLY] $migration"
    
    if [ -f "migrations/$migration" ]; then
        psql "$DATABASE_URL" -f "migrations/$migration"
        psql "$DATABASE_URL" -c "INSERT INTO _migrations(name) VALUES ('$migration');"
        echo "✅ Applied: $migration"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        echo "❌ Migration file not found: migrations/$migration"
    fi
done

if [ $APPLIED_COUNT -eq 0 ]; then
    echo "✅ No new migrations to apply"
else
    echo "✅ Applied $APPLIED_COUNT new migrations"
fi

echo "🎉 Migration process completed!"
