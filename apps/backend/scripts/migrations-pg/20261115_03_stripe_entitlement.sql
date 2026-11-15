-- Stripe entitlement and reliable event processing. Additive; safe to run twice.

-- Paid-through date of the last successfully paid invoice, and Stripe's cancel-at-period-end flag.
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS paid_through_ms BIGINT;
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- One invoice row per Stripe invoice, whatever is retried or delivered twice.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_stripe_invoice_id_unique
    ON invoices (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- Event log lifecycle: received -> processed | failed | unmatched | stale. Only 'processed',
-- 'unmatched' and 'stale' are final; anything else is processed again when the provider retries.
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS processed_at_ms BIGINT;
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS event_created_ms BIGINT;

-- Account standing: who changed it and why.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS standing_reason TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS standing_changed_at_ms BIGINT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS standing_changed_by BIGINT;
