-- Migration: Remove the old "Digital Mailbox Plan" 
-- This plan was created by the seed script and is now retired

-- First, check if the plan exists and mark it as retired if it's still active
UPDATE plans 
SET active = false, 
    retired_at = NOW()::text,
    updated_at = NOW()::text
WHERE slug = 'digital_mailbox' 
  AND name = 'Digital Mailbox Plan'
  AND active = true;

-- Then delete the plan entirely (this will also cascade delete any related records)
DELETE FROM plans 
WHERE slug = 'digital_mailbox' 
  AND name = 'Digital Mailbox Plan';
