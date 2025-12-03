-- Migration: Add mailroom_expiry_notified_at column to mail_item table
-- Created: 2025-11-28
-- Purpose: Track when mailroom has been notified about 30-day expiry for each mail item
--          Prevents duplicate notifications when running the daily expiry reminder job

-- Add column to track when mailroom expiry notification was sent
-- Uses BIGINT (milliseconds since epoch) to match received_at_ms format
ALTER TABLE mail_item
    ADD COLUMN IF NOT EXISTS mailroom_expiry_notified_at BIGINT;

-- Add index for efficient queries in the expiry reminder script
-- The script queries: WHERE mailroom_expiry_notified_at IS NULL
CREATE INDEX IF NOT EXISTS idx_mail_item_expiry_notified 
    ON mail_item(mailroom_expiry_notified_at) 
    WHERE mailroom_expiry_notified_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN mail_item.mailroom_expiry_notified_at IS 
    'Timestamp (ms since epoch) when mailroom was notified about 30-day expiry. NULL means not yet notified.';

