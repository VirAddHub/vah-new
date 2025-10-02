-- Verification Script for Activity & Plan Fixes
-- Run this against your production database to verify all fixes are working

-- ============================================================================
-- 1. CHECK: Required columns exist in user table
-- ============================================================================
SELECT
    'user table columns' as check_name,
    CASE
        WHEN COUNT(*) = 3 THEN '✅ PASS - All required columns exist'
        ELSE '❌ FAIL - Missing columns: ' ||
             CASE WHEN COUNT(CASE WHEN column_name = 'last_login_at' THEN 1 END) = 0 THEN 'last_login_at ' ELSE '' END ||
             CASE WHEN COUNT(CASE WHEN column_name = 'last_active_at' THEN 1 END) = 0 THEN 'last_active_at ' ELSE '' END ||
             CASE WHEN COUNT(CASE WHEN column_name = 'deleted_at' THEN 1 END) = 0 THEN 'deleted_at' ELSE '' END
    END as status
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name IN ('last_login_at', 'last_active_at', 'deleted_at');

-- ============================================================================
-- 2. CHECK: admin_audit table has all required columns
-- ============================================================================
SELECT
    'admin_audit table columns' as check_name,
    CASE
        WHEN COUNT(*) >= 7 THEN '✅ PASS - All required columns exist'
        ELSE '❌ FAIL - Missing columns. Found ' || COUNT(*) || ' columns, need 7'
    END as status
FROM information_schema.columns
WHERE table_name = 'admin_audit'
AND column_name IN ('id', 'admin_id', 'action', 'target_type', 'target_id', 'details', 'created_at');

-- ============================================================================
-- 3. CHECK: Indexes exist for performance
-- ============================================================================
SELECT
    'user table indexes' as check_name,
    CASE
        WHEN COUNT(*) >= 3 THEN '✅ PASS - All required indexes exist'
        ELSE '⚠️  WARNING - Some indexes missing. Found ' || COUNT(*) || ' of 3'
    END as status
FROM pg_indexes
WHERE tablename = 'user'
AND indexname IN ('idx_user_last_login', 'idx_user_last_active', 'idx_user_deleted_at');

-- ============================================================================
-- 4. INSPECT: Sample user data to verify activity tracking
-- ============================================================================
SELECT
    'Sample user activity data' as check_name,
    id,
    email,
    CASE
        WHEN last_login_at IS NULL THEN 'Never logged in'
        ELSE 'Logged in at ' || to_timestamp(last_login_at / 1000)::text
    END as last_login,
    CASE
        WHEN last_active_at IS NULL THEN 'Never active'
        WHEN last_active_at > (EXTRACT(EPOCH FROM NOW()) * 1000 - 5 * 60 * 1000) THEN '🟢 Online (active in last 5 min)'
        ELSE '⚪ Offline (last active: ' || to_timestamp(last_active_at / 1000)::text || ')'
    END as activity_status
FROM "user"
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 5. INSPECT: Plan assignments for users
-- ============================================================================
SELECT
    'User plan assignments' as check_name,
    u.id,
    u.email,
    u.plan_id,
    p.name as plan_name,
    p.price_pence,
    p.interval
FROM "user" u
LEFT JOIN plans p ON u.plan_id = p.id
WHERE u.deleted_at IS NULL
AND u.plan_id IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 5;

-- ============================================================================
-- 6. CHECK: Plans table has active plans
-- ============================================================================
SELECT
    'Active plans' as check_name,
    COUNT(*) as active_plan_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' active plans found'
        ELSE '❌ FAIL - No active plans in database'
    END as status
FROM plans
WHERE active = true AND retired_at IS NULL;

-- ============================================================================
-- 7. INSPECT: Recent admin audit entries
-- ============================================================================
SELECT
    'Recent admin audit log' as check_name,
    aa.id,
    aa.action,
    aa.target_type,
    aa.target_id,
    u.email as admin_email,
    to_timestamp(aa.created_at / 1000)::text as created_at
FROM admin_audit aa
JOIN "user" u ON aa.admin_id = u.id
ORDER BY aa.created_at DESC
LIMIT 5;

-- ============================================================================
-- 8. CHECK: Data consistency - users with activity but no login
-- ============================================================================
SELECT
    'Data consistency check' as check_name,
    COUNT(*) as inconsistent_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ PASS - No data inconsistencies found'
        ELSE '⚠️  WARNING - ' || COUNT(*) || ' users have activity timestamp but never logged in (will be cleaned by migration 018)'
    END as status
FROM "user"
WHERE last_login_at IS NULL
AND last_active_at IS NOT NULL
AND deleted_at IS NULL;

-- ============================================================================
-- 9. SUMMARY: Overall system health
-- ============================================================================
SELECT
    '=== OVERALL SUMMARY ===' as summary,
    (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL) as total_active_users,
    (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL AND last_login_at IS NOT NULL) as users_who_logged_in,
    (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL AND last_active_at > (EXTRACT(EPOCH FROM NOW()) * 1000 - 5 * 60 * 1000)) as currently_online_users,
    (SELECT COUNT(*) FROM plans WHERE active = true) as active_plans,
    (SELECT COUNT(*) FROM admin_audit) as total_audit_entries;

-- ============================================================================
-- 10. OPTIONAL: Fix any data inconsistencies found
-- ============================================================================
-- Uncomment and run this if step 8 found inconsistencies:
/*
UPDATE "user"
SET last_active_at = NULL
WHERE last_login_at IS NULL
AND last_active_at IS NOT NULL;

SELECT 'Data cleanup completed' as result,
       'Users with activity but no login have been fixed' as details;
*/

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Connect to your production database:
--    psql "your-production-database-url"
--
-- 2. Run this entire file:
--    \i VERIFY_FIXES.sql
--
-- 3. Check the output:
--    ✅ All checks should show PASS
--    ⚠️  Warnings are acceptable but should be investigated
--    ❌ Failures mean migration 018 hasn't been run or failed
--
-- 4. If any checks fail:
--    - Run migration 018: \i apps/backend/scripts/migrations-pg/018_ensure_required_columns.sql
--    - Run this verification script again
--
-- 5. If data consistency check shows warnings:
--    - Uncomment section 10 above and run it to clean up
-- ============================================================================
