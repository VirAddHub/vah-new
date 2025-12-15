-- 118_add_subscription_customer_id.sql
-- Store GoCardless customer id on subscription rows (optional but useful for reconciliation).

ALTER TABLE subscription
  ADD COLUMN IF NOT EXISTS customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_customer_id
  ON subscription(customer_id);

