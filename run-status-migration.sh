#!/bin/bash
# Run the status normalization migration
# This converts old capitalized status values to new normalized format

set -e

echo "🚀 Running status normalization migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    echo "Please set it with: export DATABASE_URL='your-postgres-url'"
    exit 1
fi

echo "🗄️  Database: $(echo $DATABASE_URL | sed -E 's/(postgresql:\/\/[^:]+:)[^@]+(@.*)/\1***\2/')"

echo ""
echo "📋 This migration will convert status values:"
echo "   'Requested' → 'requested'"
echo "   'Processing' → 'in_progress'"
echo "   'Dispatched' → 'dispatched'"
echo "   'Delivered' → 'dispatched'"
echo "   'Cancelled' → 'cancelled'"
echo ""

read -p "⚠️  Are you sure you want to run this migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🔄 Running migration..."

# Run the migration
psql "$DATABASE_URL" -f "apps/backend/migrations/028_normalize_forwarding_status.sql"

echo ""
echo "✅ Status normalization migration completed!"
echo "🎉 Your admin dashboard should now show all forwarding requests correctly!"
