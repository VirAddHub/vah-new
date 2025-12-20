-- Migration: Add controllers declaration columns to user table
-- Created: 2025-12-20
-- Purpose: Store user's declaration about company directors/controllers for compliance

-- Add columns to user table
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS is_sole_controller BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS additional_controllers_count INTEGER NULL,
  ADD COLUMN IF NOT EXISTS controllers_declared_at TIMESTAMPTZ NULL;

-- Add CHECK constraint for data integrity
-- If is_sole_controller = true => additional_controllers_count must be NULL or 0
-- If is_sole_controller = false => additional_controllers_count can be NULL (unknown) OR >= 1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_controllers_declaration'
  ) THEN
    ALTER TABLE "user"
    ADD CONSTRAINT check_controllers_declaration CHECK (
      (is_sole_controller IS NULL) OR
      (is_sole_controller = true AND (additional_controllers_count IS NULL OR additional_controllers_count = 0)) OR
      (is_sole_controller = false AND (additional_controllers_count IS NULL OR additional_controllers_count >= 1))
    );
  END IF;
END $$;

-- Index for queries filtering by controllers declaration
CREATE INDEX IF NOT EXISTS idx_user_controllers_declared 
    ON "user"(controllers_declared_at) 
    WHERE controllers_declared_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN "user".is_sole_controller IS 
    'True if user is the only director/controller, false if there are others, NULL if not declared';
COMMENT ON COLUMN "user".additional_controllers_count IS 
    'Number of other directors/controllers (NULL if unknown or if user is sole controller)';
COMMENT ON COLUMN "user".controllers_declared_at IS 
    'Timestamp when the controllers declaration was made or last updated';

