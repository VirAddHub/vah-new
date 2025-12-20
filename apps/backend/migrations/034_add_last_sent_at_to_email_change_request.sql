-- Migration: Add last_sent_at column to email_change_request table
-- Created: 2025-12-20
-- Purpose: Track when confirmation emails were last sent for rate limiting resends

ALTER TABLE email_change_request 
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ NULL;

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_email_change_request_last_sent_at 
    ON email_change_request(last_sent_at);

-- Comment for documentation
COMMENT ON COLUMN email_change_request.last_sent_at IS 
    'Timestamp when the confirmation email was last sent. Used for rate limiting resends (60 seconds minimum).';

