-- Migration: Add constraint that active subscription requires mandate
-- Created: 2025-12-20
-- Purpose: Prevent impossible states (active subscription without mandate)

-- First, fix any existing invalid states (set to pending if active without mandate)
UPDATE subscription
SET status = 'pending'
WHERE status = 'active' AND mandate_id IS NULL;

-- Add constraint
ALTER TABLE subscription
ADD CONSTRAINT subscription_active_requires_mandate 
    CHECK (status <> 'active' OR mandate_id IS NOT NULL);

-- Comments for documentation
COMMENT ON CONSTRAINT subscription_active_requires_mandate ON subscription IS 
    'Ensures that a subscription cannot be active without a mandate. This prevents impossible states that lead to confusion.';

