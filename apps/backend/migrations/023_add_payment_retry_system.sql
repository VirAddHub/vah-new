-- Migration: Add payment retry system with grace periods

-- Add payment retry tracking to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS payment_failed_at BIGINT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS payment_grace_until BIGINT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS account_suspended_at BIGINT;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_payment_issues ON "user"(payment_failed_at, payment_retry_count, account_suspended_at);

-- Add comments
COMMENT ON COLUMN "user".payment_failed_at IS 'Timestamp when payment first failed';
COMMENT ON COLUMN "user".payment_retry_count IS 'Number of payment retry attempts';
COMMENT ON COLUMN "user".payment_grace_until IS 'Grace period end timestamp (7 days from first failure)';
COMMENT ON COLUMN "user".account_suspended_at IS 'Timestamp when account was suspended (after grace period)';





