-- Migration: Add admin fields to forwarding system
-- Date: 2024-01-01 (example date)

-- Add admin management columns to forwarding_request
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS reviewed_at BIGINT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS reviewed_by INT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS processing_at BIGINT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS dispatched_at BIGINT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS delivered_at BIGINT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS cancelled_at BIGINT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS courier TEXT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS tracking_number TEXT NULL;
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL;

-- Add indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_forwarding_request_status ON forwarding_request(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_request_reviewed ON forwarding_request(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_forwarding_request_dispatched ON forwarding_request(dispatched_at);

-- Add foreign key constraint for reviewed_by (if user table exists)
-- ALTER TABLE forwarding_request ADD CONSTRAINT fk_forwarding_request_reviewed_by 
--   FOREIGN KEY (reviewed_by) REFERENCES "user"(id) ON DELETE SET NULL;

-- Note: The forwarding_outbox table can be kept but will not be used
-- No cron jobs or drain endpoints needed for admin-driven workflow



