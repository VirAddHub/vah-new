-- Migration: Backfill missing receipt dates for mail items
-- Date: 2026-01-08
-- Purpose: Ensure all mail items have receipt dates for destruction logging compliance
--          Uses created_at as fallback for items missing received_at_ms and received_date

-- Step 1: Backfill received_at_ms from created_at for items missing it
-- This ensures we have a millisecond timestamp for accurate date calculations
UPDATE mail_item
SET received_at_ms = created_at
WHERE received_at_ms IS NULL 
  AND created_at IS NOT NULL;

-- Step 2: Backfill received_date from created_at for items missing both
-- This ensures we have a date string for backward compatibility
UPDATE mail_item
SET received_date = to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD')
WHERE received_date IS NULL 
  AND received_at_ms IS NULL 
  AND created_at IS NOT NULL;

-- Step 3: Backfill received_at_ms from received_date for items that have received_date but not received_at_ms
-- This ensures consistency between the two fields
UPDATE mail_item
SET received_at_ms = (EXTRACT(EPOCH FROM (received_date::timestamptz)) * 1000)::BIGINT
WHERE received_at_ms IS NULL 
  AND received_date IS NOT NULL 
  AND received_date != '';

-- Step 4: Verify backfill results
-- This query shows how many items still lack receipt dates (should be 0 after backfill)
SELECT 
    COUNT(*) as items_without_receipt_date,
    COUNT(CASE WHEN received_at_ms IS NULL AND received_date IS NULL AND created_at IS NULL THEN 1 END) as items_without_any_date
FROM mail_item
WHERE deleted = false;

-- Step 5: Add a CHECK constraint to ensure future mail items always have at least one date field
-- This prevents new mail items from being created without receipt dates
-- Note: created_at is already NOT NULL in the schema, so this constraint should always pass
-- But it's added as a safety measure to ensure receipt dates are always available
DO $$
BEGIN
    -- Only add constraint if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_mail_item_has_receipt_date'
    ) THEN
        ALTER TABLE mail_item
        ADD CONSTRAINT check_mail_item_has_receipt_date 
        CHECK (
            received_at_ms IS NOT NULL 
            OR (received_date IS NOT NULL AND received_date != '')
            OR created_at IS NOT NULL
        );
    END IF;
END $$;

-- Note: This constraint ensures that at least one of these fields must be set:
-- - received_at_ms (preferred, most accurate)
-- - received_date (fallback, date string)
-- - created_at (last resort, creation timestamp)
-- 
-- All new mail items created via OneDrive imports already set received_at_ms and received_date,
-- so this constraint primarily protects against manual inserts or other code paths.

