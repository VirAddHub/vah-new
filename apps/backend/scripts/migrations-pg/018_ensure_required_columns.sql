-- Migration: Ensure all required columns exist
-- This migration ensures backwards compatibility by adding any missing columns

-- Ensure last_login_at exists (from migration 015)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_login_at bigint;
CREATE INDEX IF NOT EXISTS idx_user_last_login ON "user"(last_login_at);

-- Ensure last_active_at exists (from migration 011)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS last_active_at bigint;
CREATE INDEX IF NOT EXISTS idx_user_last_active ON "user"(last_active_at);

-- Ensure deleted_at exists (from migration 012)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deleted_at bigint;
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "user"(deleted_at);

-- Ensure admin_audit table exists with all required columns (from migration 012)
CREATE TABLE IF NOT EXISTS admin_audit (
    id bigserial PRIMARY KEY,
    admin_id bigint NOT NULL REFERENCES "user"(id),
    action text NOT NULL,
    target_type text,
    target_id bigint,
    details text,
    created_at bigint NOT NULL
);

-- Add target_type column if it doesn't exist (in case table was created before)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_audit'
        AND column_name = 'target_type'
    ) THEN
        ALTER TABLE admin_audit ADD COLUMN target_type text;
    END IF;
END $$;

-- Add target_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_audit'
        AND column_name = 'target_id'
    ) THEN
        ALTER TABLE admin_audit ADD COLUMN target_id bigint;
    END IF;
END $$;

-- Add details column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_audit'
        AND column_name = 'details'
    ) THEN
        ALTER TABLE admin_audit ADD COLUMN details text;
    END IF;
END $$;

-- Create indexes for admin audit queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit(target_type, target_id);

-- Clear incorrect last_active_at values (from migration 017)
-- Users who have never logged in should not show as active
UPDATE "user"
SET last_active_at = NULL
WHERE last_login_at IS NULL AND last_active_at IS NOT NULL;
