-- Migration: Update user table for business owners feature
-- Created: 2025-12-20
-- Purpose: Add owners_pending_info flag and make is_sole_controller NOT NULL

-- Make is_sole_controller NOT NULL (set existing NULLs to false for safety)
UPDATE "user" SET is_sole_controller = false WHERE is_sole_controller IS NULL;

ALTER TABLE "user"
  ALTER COLUMN is_sole_controller SET NOT NULL,
  ADD COLUMN IF NOT EXISTS owners_pending_info BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_owners_pending_info 
    ON "user"(owners_pending_info) 
    WHERE owners_pending_info = true;

-- Comments for documentation
COMMENT ON COLUMN "user".owners_pending_info IS 
    'True when user declared they are NOT sole controller but has not provided owner emails yet';

