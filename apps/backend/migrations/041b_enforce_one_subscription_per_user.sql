-- Migration: Enforce exactly one subscription row per user
-- Created: 2025-12-20
-- Purpose: Add unique constraint on subscription.user_id to prevent duplicate subscriptions

-- First, clean up any duplicate subscriptions (keep the most recent one per user)
DELETE FROM subscription s1
USING subscription s2
WHERE s1.user_id = s2.user_id
  AND s1.id < s2.id;

-- Add unique constraint
ALTER TABLE subscription
ADD CONSTRAINT subscription_user_unique UNIQUE (user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT subscription_user_unique ON subscription IS 
    'Ensures exactly one subscription row per user. Use UPSERT pattern (INSERT ... ON CONFLICT) for all subscription operations.';

