-- Migration: Add stale webhook protection to subscription table
-- Created: 2025-12-20
-- Purpose: Prevent out-of-order webhook events from overwriting newer state

ALTER TABLE subscription
ADD COLUMN IF NOT EXISTS last_event_created_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS last_event_id TEXT NULL;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscription_last_event_created_at 
    ON subscription(last_event_created_at) 
    WHERE last_event_created_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN subscription.last_event_created_at IS 
    'Timestamp of the most recent GoCardless webhook event that updated this subscription. Used to prevent stale/out-of-order events from overwriting newer state.';
COMMENT ON COLUMN subscription.last_event_id IS 
    'ID of the most recent GoCardless webhook event that updated this subscription. Used for audit and debugging.';

