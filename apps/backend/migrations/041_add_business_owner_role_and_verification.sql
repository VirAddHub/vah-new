-- Migration: Add role and requires_verification to business_owner
-- Created: 2026-01-27
-- Purpose: Support full company control verification flow

-- Add role column (director | psc)
ALTER TABLE business_owner 
ADD COLUMN IF NOT EXISTS role TEXT NULL;

-- Add requires_verification column
ALTER TABLE business_owner 
ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN NOT NULL DEFAULT true;

-- Add updated_at column
ALTER TABLE business_owner 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Rename kyc_id_status to status for consistency
ALTER TABLE business_owner 
RENAME COLUMN kyc_id_status TO status;

-- Update existing records to have role = 'director' (safe default)
UPDATE business_owner 
SET role = 'director' 
WHERE role IS NULL;

-- Make role NOT NULL after backfill
ALTER TABLE business_owner 
ALTER COLUMN role SET NOT NULL;

-- Comments
COMMENT ON COLUMN business_owner.role IS 
    'Role of the person: director | psc';
COMMENT ON COLUMN business_owner.requires_verification IS 
    'Whether this person must complete Sumsub verification before address access';
COMMENT ON COLUMN business_owner.status IS 
    'Verification status: not_started | pending | verified | rejected';
