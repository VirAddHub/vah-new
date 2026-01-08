-- Migration: Add attribution fields and constraints to destruction_log table
-- Date: 2025-01-XX
-- Purpose: Ensure every destruction record is attributable to a real admin or system actor
--          Prevents "Unknown" from being written to the database

-- Add new attribution fields
ALTER TABLE destruction_log
ADD COLUMN IF NOT EXISTS actor_type TEXT,
ADD COLUMN IF NOT EXISTS action_source TEXT,
ADD COLUMN IF NOT EXISTS staff_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL;

-- First, fix any existing "Unknown" values before adding constraints
-- If there are records with "Unknown", convert them to system attribution
-- (since we can't retroactively determine admin identity)
UPDATE destruction_log
SET staff_name = 'System (Automated)',
    staff_initials = 'SYS'
WHERE staff_name = 'Unknown' OR staff_initials = 'UN';

-- Update existing records to have default values (if any exist)
-- Since we can't retroactively determine admin IDs, set existing records as 'system' type
-- This is safer than assuming they were admin actions without staff_user_id
UPDATE destruction_log
SET actor_type = 'system',
    action_source = 'admin_ui',  -- Legacy records assumed to be from admin UI
    staff_user_id = NULL
WHERE actor_type IS NULL;

-- Now make fields NOT NULL with defaults
ALTER TABLE destruction_log
ALTER COLUMN actor_type SET NOT NULL,
ALTER COLUMN actor_type SET DEFAULT 'admin',
ALTER COLUMN action_source SET NOT NULL,
ALTER COLUMN action_source SET DEFAULT 'admin_ui';

-- Add CHECK constraints to prevent "Unknown"
ALTER TABLE destruction_log
ADD CONSTRAINT check_staff_name_not_unknown 
    CHECK (staff_name != 'Unknown' AND staff_name != '');

ALTER TABLE destruction_log
ADD CONSTRAINT check_staff_initials_not_un 
    CHECK (staff_initials != 'UN' AND staff_initials != '');

-- Add CHECK constraints for actor_type and action_source
ALTER TABLE destruction_log
ADD CONSTRAINT check_actor_type 
    CHECK (actor_type IN ('admin', 'system'));

ALTER TABLE destruction_log
ADD CONSTRAINT check_action_source 
    CHECK (action_source IN ('admin_ui', 'scheduled_job', 'api'));

-- Add constraint: Admin actions must have staff_user_id, system actions must have NULL
ALTER TABLE destruction_log
ADD CONSTRAINT admin_action_requires_staff_user 
    CHECK (
        (actor_type = 'admin' AND staff_user_id IS NOT NULL) OR
        (actor_type = 'system' AND staff_user_id IS NULL)
    );

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_destruction_log_actor_type ON destruction_log(actor_type);
CREATE INDEX IF NOT EXISTS idx_destruction_log_staff_user ON destruction_log(staff_user_id) WHERE staff_user_id IS NOT NULL;

-- Update comments
COMMENT ON COLUMN destruction_log.actor_type IS 'Type of actor: "admin" (manual action by authenticated admin) or "system" (automated job).';
COMMENT ON COLUMN destruction_log.action_source IS 'Source of the action: "admin_ui" (admin dashboard), "scheduled_job" (automated), or "api" (programmatic).';
COMMENT ON COLUMN destruction_log.staff_user_id IS 'ID of admin user who performed destruction. NULL only for system actions.';
COMMENT ON COLUMN destruction_log.staff_name IS 'Full name of staff who performed/authorized destruction. Must be "System (Automated)" for system actions, or admin full name for manual actions. NEVER "Unknown".';
COMMENT ON COLUMN destruction_log.staff_initials IS 'Initials of staff (e.g., "SYS" for system, "JD" for John Doe). NEVER "UN".';
COMMENT ON TABLE destruction_log IS 'Audit trail for physical mail destruction. Required for HMRC AML and GDPR compliance. Every record must be attributable to a specific admin or system actor.';

