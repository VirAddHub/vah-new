#!/bin/bash
# Secure migration runner script
# Usage: ./run-migration.sh <migration-file>
# Example: ./run-migration.sh migrations-pg/018_ensure_required_columns.sql

set -e  # Exit on error

# Check if migration file argument is provided
if [ -z "$1" ]; then
    echo "❌ Error: No migration file specified"
    echo "Usage: ./run-migration.sh <migration-file>"
    echo "Example: ./run-migration.sh migrations-pg/018_ensure_required_columns.sql"
    exit 1
fi

MIGRATION_FILE="$1"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Check if DATABASE_URL environment variable is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set your database URL as an environment variable:"
    echo "  export DATABASE_URL='postgresql://user:password@host/database'  # pragma: allowlist secret"
    echo ""
    echo "Or run with:"
    echo "  DATABASE_URL='your-url-here' ./run-migration.sh $MIGRATION_FILE"
    exit 1
fi

# Confirm before running
echo "🔍 Migration file: $MIGRATION_FILE"
echo "🗄️  Database: $(echo $DATABASE_URL | sed -E 's/(postgresql:\/\/[^:]+:)[^@]+(@.*)/\1***\2/')"
echo ""
read -p "⚠️  Are you sure you want to run this migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🚀 Running migration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run the migration
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Migration completed successfully!"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Migration failed!"
    exit 1
fi
