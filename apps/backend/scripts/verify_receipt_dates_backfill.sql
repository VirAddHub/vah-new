-- Verification script: Check if receipt dates backfill worked
-- Run this AFTER migration 052_backfill_missing_receipt_dates.sql

-- Step 1: Count items without receipt dates (should be 0 after backfill)
SELECT 
    'Items without receipt dates' AS check_type,
    COUNT(*) AS count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - All items have receipt dates'
        ELSE '❌ FAIL - Some items still missing receipt dates'
    END AS status
FROM mail_item
WHERE deleted = false
  AND received_at_ms IS NULL 
  AND (received_date IS NULL OR received_date = '')
  AND created_at IS NULL;

-- Step 2: Show breakdown of receipt date sources
SELECT 
    'Receipt date source breakdown' AS check_type,
    COUNT(*) AS count,
    receipt_date_source
FROM (
    SELECT 
        CASE 
            WHEN received_at_ms IS NOT NULL THEN 'received_at_ms (preferred)'
            WHEN received_date IS NOT NULL AND received_date != '' THEN 'received_date (fallback)'
            WHEN created_at IS NOT NULL THEN 'created_at (last resort)'
            ELSE 'NO DATE (should not exist)'
        END AS receipt_date_source,
        CASE 
            WHEN received_at_ms IS NOT NULL THEN 1
            WHEN received_date IS NOT NULL AND received_date != '' THEN 2
            WHEN created_at IS NOT NULL THEN 3
            ELSE 4
        END AS sort_order
    FROM mail_item
    WHERE deleted = false
) AS categorized
GROUP BY receipt_date_source, sort_order
ORDER BY sort_order;

-- Step 3: Check mail item 37 specifically (the one that was failing)
SELECT 
    m.id,
    m.user_id,
    m.received_at_ms,
    m.received_date,
    m.created_at,
    -- Calculate receipt date (same logic as backend)
    CASE 
        WHEN m.received_at_ms IS NOT NULL THEN
            to_timestamp(m.received_at_ms / 1000)::date
        WHEN m.received_date IS NOT NULL AND m.received_date != '' THEN
            m.received_date::date
        WHEN m.created_at IS NOT NULL THEN
            to_timestamp(m.created_at / 1000)::date
        ELSE NULL::date
    END AS calculated_receipt_date,
    -- Calculate eligibility date
    CASE 
        WHEN m.received_at_ms IS NOT NULL THEN
            (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days')::date
        WHEN m.received_date IS NOT NULL AND m.received_date != '' THEN
            (m.received_date::date + INTERVAL '30 days')::date
        WHEN m.created_at IS NOT NULL THEN
            (to_timestamp(m.created_at / 1000) + INTERVAL '30 days')::date
        ELSE NULL::date
    END AS eligibility_date,
    -- Check if eligible now
    CASE 
        WHEN m.received_at_ms IS NOT NULL THEN
            (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days') <= NOW()
        WHEN m.received_date IS NOT NULL AND m.received_date != '' THEN
            (m.received_date::date + INTERVAL '30 days') <= NOW()
        WHEN m.created_at IS NOT NULL THEN
            (to_timestamp(m.created_at / 1000) + INTERVAL '30 days') <= NOW()
        ELSE false
    END AS is_eligible_for_destruction,
    -- Check if already destroyed
    (SELECT COUNT(*) FROM destruction_log WHERE mail_item_id = m.id) AS destruction_log_count,
    CASE 
        WHEN m.received_at_ms IS NOT NULL OR 
             (m.received_date IS NOT NULL AND m.received_date != '') OR 
             m.created_at IS NOT NULL THEN '✅ Has receipt date'
        ELSE '❌ Missing receipt date'
    END AS receipt_date_status
FROM mail_item m
WHERE m.id = 37;

-- Step 4: Sample of recently backfilled items (items that now have received_at_ms from created_at)
SELECT 
    m.id,
    m.user_id,
    m.subject,
    m.received_at_ms,
    m.received_date,
    m.created_at,
    to_timestamp(m.received_at_ms / 1000)::date AS receipt_date_from_ms,
    to_timestamp(m.created_at / 1000)::date AS receipt_date_from_created,
    CASE 
        WHEN m.received_at_ms = m.created_at THEN '✅ Backfilled from created_at'
        ELSE 'Original received_at_ms'
    END AS backfill_status
FROM mail_item m
WHERE m.deleted = false
  AND m.received_at_ms IS NOT NULL
  AND m.received_at_ms = m.created_at  -- Items where received_at_ms equals created_at (likely backfilled)
ORDER BY m.id DESC
LIMIT 10;

-- Step 5: Verify CHECK constraint exists
SELECT 
    'CHECK constraint status' AS check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'check_mail_item_has_receipt_date'
            AND conrelid = 'mail_item'::regclass
        ) THEN '✅ PASS - Constraint exists'
        ELSE '❌ FAIL - Constraint missing'
    END AS status;

-- Step 6: Summary report
SELECT 
    '=== SUMMARY REPORT ===' AS report_section,
    '' AS detail
UNION ALL
SELECT 
    'Total non-deleted mail items:',
    COUNT(*)::text
FROM mail_item
WHERE deleted = false
UNION ALL
SELECT 
    'Items with received_at_ms:',
    COUNT(*)::text
FROM mail_item
WHERE deleted = false AND received_at_ms IS NOT NULL
UNION ALL
SELECT 
    'Items with received_date:',
    COUNT(*)::text
FROM mail_item
WHERE deleted = false AND received_date IS NOT NULL AND received_date != ''
UNION ALL
SELECT 
    'Items with created_at:',
    COUNT(*)::text
FROM mail_item
WHERE deleted = false AND created_at IS NOT NULL
UNION ALL
SELECT 
    'Items WITHOUT any receipt date:',
    COUNT(*)::text
FROM mail_item
WHERE deleted = false
  AND received_at_ms IS NULL 
  AND (received_date IS NULL OR received_date = '')
  AND created_at IS NULL;

