-- Verify forwarding system schema exists
-- Run this to check if migrations are needed

-- Check if forwarding_request table exists with all required columns
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'forwarding_request'
        ) THEN '✅ forwarding_request table exists'
        ELSE '❌ forwarding_request table missing'
    END as table_check;

-- Check for required columns in forwarding_request
SELECT 
    column_name,
    CASE 
        WHEN column_name IN (
            'id', 'created_at', 'user_id', 'mail_item_id', 'status',
            'to_name', 'address1', 'address2', 'city', 'state', 'postal', 'country',
            'reason', 'method', 'idem_key', 'updated_at', 'tracking', 'courier',
            'reviewed_at', 'reviewed_by', 'processing_at', 'dispatched_at', 
            'delivered_at', 'cancelled_at', 'tracking_number', 'admin_notes'
        ) THEN '✅'
        ELSE '❌'
    END as column_status
FROM information_schema.columns 
WHERE table_name = 'forwarding_request'
ORDER BY column_name;

-- Check if forwarding_charge table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'forwarding_charge'
        ) THEN '✅ forwarding_charge table exists'
        ELSE '❌ forwarding_charge table missing'
    END as charge_table_check;

-- Check if forwarding_outbox table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'forwarding_outbox'
        ) THEN '✅ forwarding_outbox table exists'
        ELSE '❌ forwarding_outbox table missing'
    END as outbox_table_check;

-- Check if mail_item has forwarding_status column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'mail_item' AND column_name = 'forwarding_status'
        ) THEN '✅ mail_item.forwarding_status exists'
        ELSE '❌ mail_item.forwarding_status missing'
    END as mail_item_forwarding_check;

-- Check for required indexes
SELECT 
    indexname,
    CASE 
        WHEN indexname IN (
            'idx_forwarding_req_user', 'idx_forwarding_req_status', 
            'idx_forwarding_req_mail_item', 'idx_forwarding_charge_request',
            'idx_forwarding_charge_status', 'idx_mail_item_forwarding_status'
        ) THEN '✅'
        ELSE '❌'
    END as index_status
FROM pg_indexes 
WHERE tablename IN ('forwarding_request', 'forwarding_charge', 'mail_item')
AND indexname LIKE '%forwarding%'
ORDER BY tablename, indexname;
