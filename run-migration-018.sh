#!/bin/bash
# Migration 018 Runner Script
# This script should be run on your production server (Render) where the database is accessible

echo "🚀 Starting Migration 018 - Ensure Required Columns"
echo "=================================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    echo "Please set it with: export DATABASE_URL='your-database-url-here'"
    exit 1
fi

# Check if we can connect to the database
echo "📡 Testing database connection..."
psql "$DATABASE_URL" -c "SELECT 'Database connection successful' as status;" || {
    echo "❌ Failed to connect to database"
    exit 1
}

echo "✅ Database connection successful"
echo ""

# Run the migration
echo "🔄 Running Migration 018..."
psql "$DATABASE_URL" -f apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql || {
    echo "❌ Migration failed"
    exit 1
}

echo "✅ Migration 018 completed successfully"
echo ""

# Run verification
echo "🔍 Running verification checks..."
psql "$DATABASE_URL" -f VERIFY_FIXES.sql || {
    echo "⚠️  Verification script had issues, but migration may have succeeded"
}

echo ""
echo "🎉 Migration 018 process completed!"
echo ""
echo "Next steps:"
echo "1. Deploy your backend changes"
echo "2. Deploy your frontend changes" 
echo "3. Test the admin dashboard functionality"
echo ""
echo "Expected fixes:"
echo "✅ Activity status (Online/Offline) should now work correctly"
echo "✅ Last login timestamps should display properly"
echo "✅ Delete user functionality should work without errors"
echo "✅ Plan changes should persist correctly"
echo "✅ Admin audit logging should work properly"