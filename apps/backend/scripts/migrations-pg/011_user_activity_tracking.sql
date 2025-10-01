-- Migration: Add user activity tracking
-- Track when users were last active for online/offline status

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_active_at bigint;

-- Create index for efficient querying of active users
CREATE INDEX IF NOT EXISTS idx_user_last_active ON "user"(last_active_at);

-- Update existing users to set last_active_at to their updated_at
UPDATE "user" SET last_active_at = updated_at WHERE last_active_at IS NULL;
