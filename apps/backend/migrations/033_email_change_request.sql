-- Migration: Create email_change_request table for email change verification
-- Created: 2025-01-XX
-- Purpose: Store pending email change requests with tokens for verification
--          Prevents email enumeration and ensures email changes are verified

CREATE TABLE IF NOT EXISTS email_change_request (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    new_email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookups (used in confirmation)
CREATE INDEX IF NOT EXISTS idx_email_change_request_token_hash 
    ON email_change_request(token_hash);

-- Index for user lookups (used when cleaning up old requests)
CREATE INDEX IF NOT EXISTS idx_email_change_request_user_id 
    ON email_change_request(user_id);

-- Unique constraint: only one active (unused) request per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_change_request_user_active 
    ON email_change_request(user_id) 
    WHERE used_at IS NULL;

-- Index for expiry cleanup queries
CREATE INDEX IF NOT EXISTS idx_email_change_request_expires_at 
    ON email_change_request(expires_at);

-- Comments for documentation
COMMENT ON TABLE email_change_request IS 
    'Stores pending email change requests. Tokens are hashed (SHA-256) before storage.';
COMMENT ON COLUMN email_change_request.token_hash IS 
    'SHA-256 hash of the verification token. Original token is never stored.';
COMMENT ON COLUMN email_change_request.expires_at IS 
    'Token expires 30 minutes after creation. Requests older than this cannot be confirmed.';
COMMENT ON COLUMN email_change_request.used_at IS 
    'Timestamp when the token was successfully used. NULL means pending.';

