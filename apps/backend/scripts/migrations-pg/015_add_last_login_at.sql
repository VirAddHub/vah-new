-- Migration: Add last_login_at column to track actual login times

-- Add last_login_at column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_login_at bigint;

-- Create index for efficient querying of login times
CREATE INDEX IF NOT EXISTS idx_user_last_login ON "user"(last_login_at);

-- Update existing users to set last_login_at to their created_at if they have last_active_at
UPDATE "user" SET last_login_at = created_at WHERE last_active_at IS NOT NULL AND last_login_at IS NULL;
