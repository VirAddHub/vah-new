-- 108_add_gocardless_columns.sql
-- Add GoCardless payment integration columns to user table

-- Add GoCardless customer and mandate tracking columns
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS gocardless_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS gocardless_mandate_id TEXT,
    ADD COLUMN IF NOT EXISTS gocardless_redirect_flow_id TEXT;

-- Add indexes for GoCardless lookups
CREATE INDEX IF NOT EXISTS idx_user_gocardless_customer ON "user"(gocardless_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_gocardless_mandate ON "user"(gocardless_mandate_id);

-- Add comments
COMMENT ON COLUMN "user".gocardless_customer_id IS 'GoCardless customer ID for payment processing';
COMMENT ON COLUMN "user".gocardless_mandate_id IS 'GoCardless mandate ID for direct debit';
COMMENT ON COLUMN "user".gocardless_redirect_flow_id IS 'Temporary ID for GoCardless payment setup flow';
