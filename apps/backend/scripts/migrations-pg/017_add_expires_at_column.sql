-- Migration: Add expires_at column to mail_item table
-- This column stores when mail items expire for retention policy

ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS expires_at bigint;

-- Create index for efficient querying of expired items
CREATE INDEX IF NOT EXISTS idx_mail_item_expires_at ON mail_item(expires_at);

-- Set default expires_at for existing records (1 year from now)
-- Using a DO block to calculate the timestamp
DO $$
DECLARE
    default_expires_at bigint;
BEGIN
    default_expires_at := EXTRACT(EPOCH FROM NOW()) * 1000 + (365 * 24 * 60 * 60 * 1000);
    UPDATE mail_item SET expires_at = default_expires_at WHERE expires_at IS NULL;
END $$;
