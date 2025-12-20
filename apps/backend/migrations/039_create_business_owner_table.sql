-- Migration: Create business_owner table
-- Created: 2025-12-20
-- Purpose: Store additional directors/owners/PSCs for identity verification

CREATE TABLE IF NOT EXISTS business_owner (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    sumsub_applicant_id TEXT NULL,
    kyc_id_status TEXT NOT NULL DEFAULT 'not_started',  -- not_started|pending|approved|rejected
    kyc_updated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one owner per email per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_owner_user_email 
    ON business_owner(user_id, email);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_business_owner_user_id 
    ON business_owner(user_id);

CREATE INDEX IF NOT EXISTS idx_business_owner_kyc_status 
    ON business_owner(kyc_id_status);

-- Comments for documentation
COMMENT ON TABLE business_owner IS 
    'Additional directors/owners/PSCs who need identity verification (no VAH account)';
COMMENT ON COLUMN business_owner.sumsub_applicant_id IS 
    'Sumsub applicant ID for identity verification';
COMMENT ON COLUMN business_owner.kyc_id_status IS 
    'Identity verification status: not_started|pending|approved|rejected';

