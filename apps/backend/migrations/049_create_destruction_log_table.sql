-- Migration: Create destruction_log table for HMRC AML and GDPR compliance
-- Date: 2025-01-XX
-- Purpose: Proper audit trail for mail destruction with all required compliance fields
--
-- IMPORTANT NOTES:
-- - This migration creates a new destruction_log table with proper compliance fields
-- - Existing mail_item records with physical_destruction_date but no destruction_log record
--   will need to be re-processed through the mark-destroyed endpoint to ensure compliance
-- - The UNIQUE constraint on mail_item_id prevents duplicate destruction records
-- - All future destructions will be logged through the destruction_log table

-- Create destruction_log table
CREATE TABLE IF NOT EXISTS destruction_log (
    id SERIAL PRIMARY KEY,
    mail_item_id INTEGER NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    user_display_name TEXT NOT NULL, -- Customer name or company name (never internal staff)
    receipt_date DATE NOT NULL, -- Date mail was received
    eligibility_date DATE NOT NULL, -- Date when destruction became eligible (receipt_date + retention_days)
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Actual timestamp when destruction was logged
    destruction_status TEXT NOT NULL DEFAULT 'completed' CHECK (destruction_status IN ('scheduled', 'completed')),
    
    -- Actor identification (MANDATORY - no "Unknown" allowed)
    actor_type TEXT NOT NULL CHECK (actor_type IN ('admin', 'system')),
    action_source TEXT NOT NULL CHECK (action_source IN ('admin_ui', 'scheduled_job', 'api')),
    staff_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL, -- NULL only for system actions
    staff_name TEXT NOT NULL CHECK (staff_name != 'Unknown' AND staff_name != ''), -- Full name (never "Unknown")
    staff_initials TEXT NOT NULL CHECK (staff_initials != 'UN' AND staff_initials != ''), -- Initials (never "UN")
    
    notes TEXT NOT NULL, -- Factual explanation of WHY destruction occurred
    destruction_method TEXT NOT NULL DEFAULT 'Cross-cut shredder',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate destruction records for the same mail item
    CONSTRAINT unique_mail_item_destruction UNIQUE (mail_item_id),
    
    -- Ensure admin actions have staff_user_id
    CONSTRAINT admin_action_requires_staff_user CHECK (
        (actor_type = 'admin' AND staff_user_id IS NOT NULL) OR
        (actor_type = 'system' AND staff_user_id IS NULL)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_destruction_log_mail_item ON destruction_log(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_destruction_log_user ON destruction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_destruction_log_recorded_at ON destruction_log(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_destruction_log_status ON destruction_log(destruction_status);
CREATE INDEX IF NOT EXISTS idx_destruction_log_eligibility_date ON destruction_log(eligibility_date);
CREATE INDEX IF NOT EXISTS idx_destruction_log_actor_type ON destruction_log(actor_type);
CREATE INDEX IF NOT EXISTS idx_destruction_log_staff_user ON destruction_log(staff_user_id) WHERE staff_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE destruction_log IS 'Audit trail for physical mail destruction. Required for HMRC AML and GDPR compliance. Every record must be attributable to a specific admin or system actor.';
COMMENT ON COLUMN destruction_log.eligibility_date IS 'Date when destruction became eligible (receipt_date + retention_days). Destruction should not occur before this date.';
COMMENT ON COLUMN destruction_log.actor_type IS 'Type of actor: "admin" (manual action by authenticated admin) or "system" (automated job).';
COMMENT ON COLUMN destruction_log.action_source IS 'Source of the action: "admin_ui" (admin dashboard), "scheduled_job" (automated), or "api" (programmatic).';
COMMENT ON COLUMN destruction_log.staff_user_id IS 'ID of admin user who performed destruction. NULL only for system actions.';
COMMENT ON COLUMN destruction_log.staff_name IS 'Full name of staff who performed/authorized destruction. Must be "System (Automated)" for system actions, or admin full name for manual actions. NEVER "Unknown".';
COMMENT ON COLUMN destruction_log.staff_initials IS 'Initials of staff (e.g., "SYS" for system, "JD" for John Doe). NEVER "UN".';
COMMENT ON COLUMN destruction_log.notes IS 'Factual explanation of WHY destruction occurred (e.g., "30-day retention expired with no forwarding request").';

