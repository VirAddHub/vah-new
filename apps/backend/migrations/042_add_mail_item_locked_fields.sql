-- Migration: Add locked fields to mail_item table
-- Created: 2025-12-20
-- Purpose: Support "locked ingestion" - create mail items even when user plan/status/kyc is inactive

ALTER TABLE mail_item
ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE mail_item
ADD COLUMN IF NOT EXISTS locked_reason TEXT NULL;

-- Index for efficient queries of locked items
CREATE INDEX IF NOT EXISTS idx_mail_item_locked 
    ON mail_item(locked) 
    WHERE locked = true;

-- Comments for documentation
COMMENT ON COLUMN mail_item.locked IS 
    'If true, this mail item was ingested while user plan/status/kyc was inactive. Item is created but locked from user access.';
COMMENT ON COLUMN mail_item.locked_reason IS 
    'Reason for locking: plan_inactive, user_inactive, kyc_not_approved, etc.';

