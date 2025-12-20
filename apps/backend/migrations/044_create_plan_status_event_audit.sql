-- Migration: Create plan_status_event audit table
-- Created: 2025-12-20
-- Purpose: Audit trail for every plan status change

CREATE TABLE IF NOT EXISTS plan_status_event (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    subscription_id BIGINT NULL REFERENCES subscription(id) ON DELETE SET NULL,
    old_status TEXT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL, -- 'webhook_mandate_active', 'webhook_payment_failed', 'webhook_mandate_revoked', etc.
    gocardless_event_id TEXT NULL,
    gocardless_event_type TEXT NULL, -- 'mandates.active', 'payments.failed', etc.
    gocardless_event_created_at TIMESTAMPTZ NULL,
    metadata JSONB NULL, -- Additional context (customer_id, mandate_id, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_plan_status_event_user_id 
    ON plan_status_event(user_id);

CREATE INDEX IF NOT EXISTS idx_plan_status_event_created_at 
    ON plan_status_event(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_status_event_gocardless_event_id 
    ON plan_status_event(gocardless_event_id) 
    WHERE gocardless_event_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE plan_status_event IS 
    'Audit trail for every plan status change. Every time plan_status changes, a row is inserted here.';
COMMENT ON COLUMN plan_status_event.reason IS 
    'Human-readable reason for the status change (e.g., "webhook_mandate_active", "webhook_payment_failed")';
COMMENT ON COLUMN plan_status_event.gocardless_event_id IS 
    'ID of the GoCardless webhook event that triggered this change (if applicable)';

