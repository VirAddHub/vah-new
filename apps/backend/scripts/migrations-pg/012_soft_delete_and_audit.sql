-- Migration: Add soft delete and admin audit tracking

-- Add deleted_at column to user table for soft deletes
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS deleted_at bigint;

-- Create index for filtering out deleted users
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "user"(deleted_at);

-- Create admin audit table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit (
    id bigserial PRIMARY KEY,
    admin_id bigint NOT NULL REFERENCES "user"(id),
    action text NOT NULL,
    target_type text,
    target_id bigint,
    details text,
    created_at bigint NOT NULL
);

-- Create indexes for admin audit queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at);

-- Create composite index for target queries (only if both columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit' 
        AND column_name = 'target_type'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit' 
        AND column_name = 'target_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit(target_type, target_id);
    END IF;
END $$;
