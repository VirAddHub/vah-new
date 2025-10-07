-- Migration: Fix missing schema elements
-- Date: 2025-10-07
-- Purpose: Fix missing tables and columns causing 500 errors

-- Add missing support_ticket table
CREATE TABLE IF NOT EXISTS support_ticket (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Add missing columns to mail_item table
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS forwarding_status TEXT;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS expires_at BIGINT;

-- Ensure forwarding_request table has all required columns
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS reviewed_at BIGINT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS reviewed_by INT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS processing_at BIGINT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS dispatched_at BIGINT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS delivered_at BIGINT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_ticket_user ON support_ticket(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON support_ticket(status);
CREATE INDEX IF NOT EXISTS idx_mail_item_file_url ON mail_item(file_url);
CREATE INDEX IF NOT EXISTS idx_mail_item_public_url ON mail_item(public_url);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_reviewed ON forwarding_request(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_processing ON forwarding_request(processing_at);
