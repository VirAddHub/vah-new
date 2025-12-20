-- Migration: Add email tracking columns to invoices table
-- Created: 2025-12-20
-- Purpose: Track when invoice emails are sent to prevent duplicates and enable retries

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS email_send_error TEXT NULL;

-- Index for finding invoices that need email sent
CREATE INDEX IF NOT EXISTS idx_invoices_email_sent_at 
    ON invoices(email_sent_at) 
    WHERE email_sent_at IS NULL;

-- Comments for documentation
COMMENT ON COLUMN invoices.email_sent_at IS 
    'Timestamp when the invoice email was successfully sent. NULL means not sent yet.';
COMMENT ON COLUMN invoices.email_send_error IS 
    'Error message if email sending failed. NULL if sent successfully or not attempted yet.';

