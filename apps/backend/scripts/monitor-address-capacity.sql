-- Monitor address capacity and assignments
-- Run these queries to check system status

-- 1) How many free slots per location
SELECT l.name, l.id,
       COUNT(*) FILTER (WHERE s.status='available') AS free,
       COUNT(*) FILTER (WHERE s.status='assigned')  AS used,
       COUNT(*) FILTER (WHERE s.status='available') + COUNT(*) FILTER (WHERE s.status='assigned') AS total
FROM public.location l
LEFT JOIN public.address_slot s ON s.location_id = l.id
GROUP BY l.name, l.id
ORDER BY l.id;

-- 2) Show the last 20 assignments
SELECT s.id, s.mailbox_no, s.assigned_to, s.assigned_at, l.name
FROM public.address_slot s
JOIN public.location l ON l.id = s.location_id
WHERE s.status='assigned'
ORDER BY s.assigned_at DESC NULLS LAST
LIMIT 20;

-- 3) Check for any users with multiple addresses (should be 0)
SELECT assigned_to, COUNT(*) as address_count
FROM public.address_slot
WHERE status = 'assigned'
GROUP BY assigned_to
HAVING COUNT(*) > 1;
