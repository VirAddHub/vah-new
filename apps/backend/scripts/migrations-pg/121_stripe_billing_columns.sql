-- 121_stripe_billing_columns.sql
-- Add Stripe billing columns (additive; GoCardless columns remain).

-- USER: Stripe customer and default payment method
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_default_payment_method_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_stripe_customer ON "user"(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- SUBSCRIPTION: Stripe subscription id
ALTER TABLE subscription
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_stripe_subscription_id ON subscription(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- INVOICES: Stripe invoice and payment intent (idempotent / dedupe)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent ON invoices(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON COLUMN "user".stripe_customer_id IS 'Stripe customer ID when BILLING_PROVIDER=stripe';
COMMENT ON COLUMN "user".stripe_default_payment_method_id IS 'Stripe default payment method ID';
COMMENT ON COLUMN subscription.stripe_subscription_id IS 'Stripe subscription ID when BILLING_PROVIDER=stripe';
COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe invoice ID for idempotent webhook handling';
COMMENT ON COLUMN invoices.stripe_payment_intent_id IS 'Stripe payment intent ID when paid via Stripe';

-- webhook_log: dedupe Stripe (and other) events by external event id
ALTER TABLE webhook_log
  ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_log_provider_external_id
  ON webhook_log(provider, external_event_id)
  WHERE provider IS NOT NULL AND external_event_id IS NOT NULL;
