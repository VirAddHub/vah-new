-- "One invoice per user per billing period" protects the internally generated invoices from being
-- created twice. Stripe invoices are already unique by stripe_invoice_id, and two genuine Stripe
-- invoices can share a period (for example cancelling and resubscribing on the same day). With the
-- old index the second one failed forever and its payment event could never be processed.
DROP INDEX IF EXISTS idx_invoices_user_period_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_period_unique
    ON invoices (user_id, period_start, period_end) WHERE stripe_invoice_id IS NULL;
