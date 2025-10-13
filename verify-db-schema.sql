-- Database Schema Verification for Admin-Driven Forwarding System
-- Run this to verify the database is properly set up

-- 1. Check admin user exists
SELECT 
  'Admin Users' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS' 
    ELSE '❌ FAIL - No admin users found' 
  END as status
FROM "user" 
WHERE is_admin = true OR is_staff = true;

-- 2. Check forwarding_request table has new columns
SELECT 
  'Forwarding Request Columns' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 9 THEN '✅ PASS - All 9 new columns present' 
    ELSE '❌ FAIL - Missing columns' 
  END as status
FROM information_schema.columns
WHERE table_name = 'forwarding_request'
  AND column_name IN (
    'reviewed_at', 'reviewed_by', 'processing_at', 'dispatched_at',
    'delivered_at', 'cancelled_at', 'courier', 'tracking_number', 'admin_notes'
  );

-- 3. Check performance indexes exist
SELECT 
  'Performance Indexes' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ PASS - Performance indexes present' 
    ELSE '❌ FAIL - Missing performance indexes' 
  END as status
FROM pg_indexes 
WHERE tablename = 'forwarding_request' 
  AND indexname LIKE 'idx_fr_%';

-- 4. Check mail_item has forwarding_status column
SELECT 
  'Mail Item Forwarding Status' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS - forwarding_status column present' 
    ELSE '❌ FAIL - forwarding_status column missing' 
  END as status
FROM information_schema.columns
WHERE table_name = 'mail_item' 
  AND column_name = 'forwarding_status';

-- 5. Check trigger exists
SELECT 
  'Status Mirroring Trigger' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS - Trigger present' 
    ELSE '❌ FAIL - Trigger missing' 
  END as status
FROM pg_trigger 
WHERE tgname = 'forwarding_request_status_mirror';

-- 6. Check pg_trgm extension
SELECT 
  'Trigram Extension' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS - pg_trgm extension installed' 
    ELSE '❌ FAIL - pg_trgm extension missing' 
  END as status
FROM pg_extension 
WHERE extname = 'pg_trgm';

-- 7. Show sample admin user details
SELECT 
  'Sample Admin User' as check_type,
  email,
  is_admin,
  is_staff,
  '✅ INFO' as status
FROM "user" 
WHERE is_admin = true OR is_staff = true
LIMIT 1;

-- 8. Show forwarding_request table structure
SELECT 
  'Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  '✅ INFO' as status
FROM information_schema.columns
WHERE table_name = 'forwarding_request'
ORDER BY ordinal_position;


