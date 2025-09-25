-- Migration: Add soft delete functionality to users table
-- Run this on your PostgreSQL database

-- Add deleted_at column
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON "user"(deleted_at);

-- Create unique index for active emails only (prevents duplicate emails for active users)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_active
ON "user" (LOWER(email))
WHERE deleted_at IS NULL;

-- Create admin audit table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES "user"(id),
    action VARCHAR(100) NOT NULL,
    target_user_id INTEGER REFERENCES "user"(id),
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for admin audit queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at);
