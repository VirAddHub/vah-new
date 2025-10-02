#!/bin/bash
# Database verification script
# Checks if all required columns and tables exist

set -e  # Exit on error

# Check if DATABASE_URL environment variable is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set your database URL as an environment variable:"
    echo "  export DATABASE_URL='postgresql://user:password@host/database'  # pragma: allowlist secret"
    echo ""
    echo "Or run with:"
    echo "  DATABASE_URL='your-url-here' ./verify-database.sh"
    exit 1
fi

echo "🔍 Verifying database schema..."
echo "🗄️  Database: $(echo $DATABASE_URL | sed -E 's/(postgresql:\/\/[^:]+:)[^@]+(@.*)/\1***\2/')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run verification queries
psql "$DATABASE_URL" << 'EOF'
-- Check user table columns
\echo '1. Checking user table columns...'
SELECT
    CASE
        WHEN COUNT(*) = 3 THEN '✅ PASS - All required columns exist (last_login_at, last_active_at, deleted_at)'
        ELSE '❌ FAIL - Missing columns in user table'
    END as result
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN ('last_login_at', 'last_active_at', 'deleted_at');

\echo ''
\echo '2. Checking admin_audit table columns...'
SELECT
    CASE
        WHEN COUNT(*) >= 7 THEN '✅ PASS - All required columns exist (id, admin_id, action, target_type, target_id, details, created_at)'
        ELSE '❌ FAIL - Missing columns in admin_audit table'
    END as result
FROM information_schema.columns
WHERE table_name = 'admin_audit'
AND column_name IN ('id', 'admin_id', 'action', 'target_type', 'target_id', 'details', 'created_at');

\echo ''
\echo '3. Checking database statistics...'
SELECT
    'Total users: ' || COUNT(*) as result
FROM "user"
WHERE deleted_at IS NULL;

SELECT
    'Users with login data: ' || COUNT(*) as result
FROM "user"
WHERE deleted_at IS NULL AND last_login_at IS NOT NULL;

SELECT
    'Active plans: ' || COUNT(*) as result
FROM plans
WHERE active = true;

\echo ''
\echo '4. Checking for data inconsistencies...'
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ PASS - No data inconsistencies'
        ELSE '⚠️  WARNING - ' || COUNT(*) || ' users have activity but never logged in'
    END as result
FROM "user"
WHERE last_login_at IS NULL
AND last_active_at IS NOT NULL
AND deleted_at IS NULL;
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verification complete!"
