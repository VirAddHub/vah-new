-- Migration: Add expires_at column to mail_item table
-- This column stores when mail items expire for retention policy

ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS expires_at bigint;

-- Create index for efficient querying of expired items
CREATE INDEX IF NOT EXISTS idx_mail_item_expires_at ON mail_item(expires_at);

-- Set default expires_at for existing records (1 year from now)
-- Using a fixed timestamp: January 1, 2026 (well in the future)
UPDATE mail_item SET expires_at = 1735689600000 WHERE expires_at IS NULL;
