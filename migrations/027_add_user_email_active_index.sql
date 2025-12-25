-- Add login-optimized email index for active (not soft-deleted) users
-- Note: CONCURRENTLY is required to avoid blocking writes on production tables.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_active
ON "user"(email)
WHERE deleted_at IS NULL;


