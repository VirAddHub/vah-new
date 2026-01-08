-- Migration: Verify destruction_log schema is correct
-- This is a verification script, not a migration
-- Run this to confirm all constraints and fields are in place

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'destruction_log'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'destruction_log'
ORDER BY constraint_name;

-- Verify no "Unknown" values exist (should return 0 rows)
SELECT COUNT(*) as unknown_count
FROM destruction_log
WHERE staff_name = 'Unknown' OR staff_initials = 'UN';

-- Test constraint: Try to insert with "Unknown" (should fail)
-- Uncomment to test:
-- INSERT INTO destruction_log (
--     mail_item_id, user_id, user_display_name, receipt_date, eligibility_date,
--     staff_name, staff_initials, notes, actor_type, action_source, staff_user_id
-- ) VALUES (
--     999999, 999999, 'Test', '2025-01-01', '2025-01-31',
--     'Unknown', 'UN', 'Test', 'admin', 'admin_ui', 1
-- );

