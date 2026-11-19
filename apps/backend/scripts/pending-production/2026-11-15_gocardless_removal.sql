-- GoCardless removal for an EXISTING database (Render). DO NOT RUN without separate approval.
-- Fresh local/test databases do not need this: the baseline already has the new shape.
-- The application code now expects the column names in PART 2, so this must be applied to an
-- existing database before the new code is deployed against it.

-- ---------------------------------------------------------------------------------------------
-- PART 1: affected records. Read-only. Returns counts only, no customer details. Run this first.
-- ---------------------------------------------------------------------------------------------
SELECT status,
       COUNT(*)                                                       AS subscriptions,
       COUNT(*) FILTER (WHERE mandate_id IS NOT NULL)                 AS with_mandate,
       COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL)     AS with_stripe_subscription,
       COUNT(*) FILTER (WHERE mandate_id IS NULL AND stripe_subscription_id IS NULL) AS with_neither
FROM subscription GROUP BY status ORDER BY status;

SELECT COUNT(*) FILTER (WHERE gocardless_customer_id IS NOT NULL)      AS users_with_gc_customer,
       COUNT(*) FILTER (WHERE gocardless_mandate_id IS NOT NULL)       AS users_with_gc_mandate,
       COUNT(*) FILTER (WHERE gocardless_redirect_flow_id IS NOT NULL) AS users_with_gc_redirect_flow
FROM "user";

SELECT status, COUNT(*) AS invoices_with_gc_payment FROM invoices WHERE gocardless_payment_id IS NOT NULL GROUP BY status;
SELECT COUNT(*) AS gc_redirect_flows FROM gc_redirect_flow;
SELECT COUNT(*) AS gc_billing_request_flows FROM gc_billing_request_flow;
SELECT COUNT(*) AS audit_rows_with_gc_event FROM plan_status_event WHERE gocardless_event_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- PART 2: proposed change. Financial records are KEPT: invoices and audit rows are not deleted,
-- their GoCardless columns are renamed. Review against the real schema before use.
-- ---------------------------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE invoices          RENAME COLUMN gocardless_payment_id       TO provider_payment_id;
-- ALTER TABLE plan_status_event RENAME COLUMN gocardless_event_id         TO provider_event_id;
-- ALTER TABLE plan_status_event RENAME COLUMN gocardless_event_type       TO provider_event_type;
-- ALTER TABLE plan_status_event RENAME COLUMN gocardless_event_created_at TO provider_event_created_at;
-- ALTER TABLE subscription DROP CONSTRAINT IF EXISTS subscription_active_requires_mandate;
-- -- Any subscription still 'active' without a Stripe subscription must be resolved first (PART 1).
-- ALTER TABLE subscription ADD CONSTRAINT subscription_active_requires_stripe
--   CHECK (status <> 'active' OR stripe_subscription_id IS NOT NULL);
-- COMMIT;
--
-- Deliberately NOT proposed here (destructive; decide after reviewing PART 1):
--   dropping subscription.mandate_id, the gocardless_* columns on "user", gc_redirect_flow, gc_billing_request_flow.
--   The application no longer reads or writes any of them, so they can stay in place indefinitely.
