-- Check for any "Unknown" values in destruction_log table
-- This helps identify records that were created before constraints were added

-- Check for "Unknown" staff names
SELECT 
    'Records with "Unknown" staff_name' AS check_type,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - No "Unknown" staff names'
        ELSE '❌ FAIL - Found "Unknown" staff names'
    END AS status
FROM destruction_log
WHERE staff_name = 'Unknown' OR LOWER(staff_name) LIKE '%unknown%';

-- Check for "UN" staff initials
SELECT 
    'Records with "UN" staff_initials' AS check_type,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - No "UN" staff initials'
        ELSE '❌ FAIL - Found "UN" staff initials'
    END AS status
FROM destruction_log
WHERE staff_initials = 'UN' OR UPPER(staff_initials) = 'UN';

-- Show details of any "Unknown" records (if any exist)
SELECT 
    id,
    mail_item_id,
    user_id,
    staff_name,
    staff_initials,
    actor_type,
    action_source,
    staff_user_id,
    recorded_at,
    created_at,
    CASE 
        WHEN staff_name = 'Unknown' OR LOWER(staff_name) LIKE '%unknown%' THEN 'Has "Unknown" in staff_name'
        WHEN staff_initials = 'UN' OR UPPER(staff_initials) = 'UN' THEN 'Has "UN" in staff_initials'
        ELSE 'OK'
    END AS issue_type
FROM destruction_log
WHERE staff_name = 'Unknown' 
   OR LOWER(staff_name) LIKE '%unknown%'
   OR staff_initials = 'UN' 
   OR UPPER(staff_initials) = 'UN'
ORDER BY recorded_at DESC;

-- Summary: Total records vs records with issues
SELECT 
    '=== SUMMARY ===' AS report_section,
    '' AS detail
UNION ALL
SELECT 
    'Total destruction_log records:',
    COUNT(*)::text
FROM destruction_log
UNION ALL
SELECT 
    'Records with "Unknown" staff_name:',
    COUNT(*)::text
FROM destruction_log
WHERE staff_name = 'Unknown' OR LOWER(staff_name) LIKE '%unknown%'
UNION ALL
SELECT 
    'Records with "UN" staff_initials:',
    COUNT(*)::text
FROM destruction_log
WHERE staff_initials = 'UN' OR UPPER(staff_initials) = 'UN'
UNION ALL
SELECT 
    'Records with valid attribution:',
    COUNT(*)::text
FROM destruction_log
WHERE staff_name != 'Unknown' 
  AND LOWER(staff_name) NOT LIKE '%unknown%'
  AND staff_initials != 'UN' 
  AND UPPER(staff_initials) != 'UN';

