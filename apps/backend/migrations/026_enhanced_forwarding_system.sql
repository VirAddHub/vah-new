-- Migration: Add enhanced forwarding system with outbox pattern
-- Date: 2025-01-04

-- Add new columns to mail_item table
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS forwarding_status TEXT;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS expires_at BIGINT;

-- Drop old forwarding_request table if it exists (with old schema)
DROP TABLE IF EXISTS forwarding_request CASCADE;

-- Create new forwarding_request table with enhanced schema
CREATE TABLE forwarding_request (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  mail_item_id INT REFERENCES mail_item(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Requested',
  to_name TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  postal TEXT,
  country TEXT,
  reason TEXT,
  method TEXT,
  idem_key TEXT,
  updated_at BIGINT,
  tracking TEXT,
  courier TEXT
);

-- Create forwarding_charge table
CREATE TABLE forwarding_charge (
  id SERIAL PRIMARY KEY,
  forwarding_request_id INT UNIQUE REFERENCES forwarding_request(id) ON DELETE CASCADE,
  amount_pence INT DEFAULT 200,
  status TEXT DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

-- Create forwarding_outbox table for retryable events
CREATE TABLE forwarding_outbox (
  id SERIAL PRIMARY KEY,
  forwarding_request_id INT REFERENCES forwarding_request(id) ON DELETE CASCADE,
  event TEXT,
  payload_json TEXT,
  status TEXT DEFAULT 'pending',
  attempt_count INT DEFAULT 0,
  last_error TEXT,
  next_attempt_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forwarding_req_user ON forwarding_request(user_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_status ON forwarding_request(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_mail_item ON forwarding_request(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_request ON forwarding_charge(forwarding_request_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_status ON forwarding_charge(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_outbox_status ON forwarding_outbox(status, next_attempt_at);

-- Unique constraint to prevent duplicate active forwarding requests
CREATE UNIQUE INDEX IF NOT EXISTS forwarding_request_active_uniq
ON forwarding_request (user_id, mail_item_id)
WHERE status IN ('Requested','Processing');

COMMENT ON TABLE forwarding_request IS 'Enhanced forwarding requests with full address details and state management';
COMMENT ON TABLE forwarding_charge IS 'Tracks £2 forwarding charges for non-HMRC/Companies House mail';
COMMENT ON TABLE forwarding_outbox IS 'Outbox pattern for retryable forwarding events';



