-- Migration: Normalize forwarding request status values
-- Date: 2025-10-13
-- Purpose: Convert old capitalized status values to new normalized lowercase format

-- Update status values to match new normalized format
UPDATE forwarding_request 
SET status = 'requested' 
WHERE LOWER(status) = 'requested';

UPDATE forwarding_request 
SET status = 'in_progress' 
WHERE LOWER(status) IN ('processing', 'in progress', 'in-progress');

UPDATE forwarding_request 
SET status = 'dispatched' 
WHERE LOWER(status) = 'dispatched';

UPDATE forwarding_request 
SET status = 'cancelled' 
WHERE LOWER(status) IN ('cancelled', 'canceled');

-- Verify the changes
SELECT status, COUNT(*) as count 
FROM forwarding_request 
GROUP BY status 
ORDER BY status;
