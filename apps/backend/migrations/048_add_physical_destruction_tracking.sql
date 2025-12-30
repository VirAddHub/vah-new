-- Migration: Add physical destruction tracking to mail_item
-- Date: 2025-12-28
-- Purpose: Track confirmation of physical mail destruction for HMRC AML compliance

-- Track confirmation of physical mail destruction
ALTER TABLE mail_item
ADD COLUMN IF NOT EXISTS physical_destruction_date TIMESTAMPTZ NULL;

-- Optional index for reporting / audits
CREATE INDEX IF NOT EXISTS idx_mail_item_physical_destruction_date
ON mail_item(physical_destruction_date)
WHERE physical_destruction_date IS NOT NULL;

