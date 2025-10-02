-- Migration: Add user activity tracking
-- Track when users were last active for online/offline status

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_active_at bigint;

-- Create index for efficient querying of active users
CREATE INDEX IF NOT EXISTS idx_user_last_active ON "user"(last_active_at);

-- Do NOT set last_active_at for existing users
-- They should remain NULL until they actually log in
-- This ensures the activity status is accurate
