-- Admin fixes for address management
-- Use these queries for support and maintenance

-- 1) Release a slot back to the pool
-- Replace $SLOT_ID with the actual slot ID
UPDATE public.address_slot
SET status='available', assigned_to=NULL, assigned_at=NULL
WHERE id = $SLOT_ID;

-- 2) Move a user to a specific slot (e.g., during support)
-- Replace $USER_ID and $TARGET_SLOT_ID with actual values
BEGIN;
-- free any current slot
UPDATE public.address_slot
SET status='available', assigned_to=NULL, assigned_at=NULL
WHERE assigned_to = $USER_ID AND status='assigned';

-- claim the desired slot
UPDATE public.address_slot
SET status='assigned', assigned_to=$USER_ID, assigned_at=NOW()
WHERE id = $TARGET_SLOT_ID AND status='available';
COMMIT;

-- 3) Find a user's current address
-- Replace $USER_ID with actual user ID
SELECT s.id, s.mailbox_no, s.assigned_at, l.name, l.line1, l.city, l.postcode
FROM public.address_slot s
JOIN public.location l ON l.id = s.location_id
WHERE s.assigned_to = $USER_ID AND s.status = 'assigned';

-- 4) List all available slots for a location
-- Replace $LOCATION_ID with actual location ID
SELECT id, mailbox_no, created_at
FROM public.address_slot
WHERE location_id = $LOCATION_ID AND status = 'available'
ORDER BY id
LIMIT 20;
