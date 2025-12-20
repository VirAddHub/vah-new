-- Migration: Create business_owner_invite table
-- Created: 2025-12-20
-- Purpose: Track invite tokens for business owner verification

CREATE TABLE IF NOT EXISTS business_owner_invite (
    id BIGSERIAL PRIMARY KEY,
    business_owner_id BIGINT NOT NULL REFERENCES business_owner(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    last_sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_business_owner_invite_token_hash 
    ON business_owner_invite(token_hash);

-- Unique constraint: only one active invite per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_owner_invite_active 
    ON business_owner_invite(business_owner_id) 
    WHERE used_at IS NULL;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_business_owner_invite_owner_id 
    ON business_owner_invite(business_owner_id);

-- Comments for documentation
COMMENT ON TABLE business_owner_invite IS 
    'Invite tokens for business owner identity verification';
COMMENT ON COLUMN business_owner_invite.token_hash IS 
    'SHA-256 hash of the invite token (never store raw token)';
COMMENT ON COLUMN business_owner_invite.used_at IS 
    'Timestamp when the invite was used to start verification';

