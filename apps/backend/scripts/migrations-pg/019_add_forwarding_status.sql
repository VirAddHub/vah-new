-- Migration: Add forwarding_status column to mail_item table
-- This column tracks the forwarding status of mail items

-- Add forwarding_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mail_item' 
        AND column_name = 'forwarding_status'
    ) THEN
        ALTER TABLE mail_item ADD COLUMN forwarding_status text DEFAULT 'No';
        CREATE INDEX IF NOT EXISTS idx_mail_item_forwarding_status ON mail_item(forwarding_status);
    END IF;
END $$;

-- Add updated_by column if it doesn't exist (for tracking who updated the forwarding status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mail_item' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE mail_item ADD COLUMN updated_by bigint REFERENCES "user"(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_mail_item_updated_by ON mail_item(updated_by);
    END IF;
END $$;
