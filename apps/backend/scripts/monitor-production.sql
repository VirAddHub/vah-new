-- Production Address System Monitoring
-- Run these queries in your Render PostgreSQL console

-- 1) Overall capacity by location
SELECT 
  l.id, 
  l.name,
  l.city,
  COUNT(*) FILTER (WHERE s.status='available') AS free,
  COUNT(*) FILTER (WHERE s.status='assigned') AS used,
  COUNT(*) AS total,
  ROUND(
    (COUNT(*) FILTER (WHERE s.status='assigned')::float / COUNT(*)) * 100, 
    2
  ) AS usage_percent
FROM public.location l
LEFT JOIN public.address_slot s ON s.location_id = l.id
GROUP BY l.id, l.name, l.city
ORDER BY l.id;

-- 2) Recent assignments (last 20)
SELECT 
  s.id, 
  s.mailbox_no, 
  s.assigned_to, 
  s.assigned_at,
  l.name AS location_name
FROM public.address_slot s
JOIN public.location l ON l.id = s.location_id
WHERE s.status='assigned'
ORDER BY s.assigned_at DESC NULLS LAST
LIMIT 20;

-- 3) Check for duplicate assignments (should be 0)
SELECT 
  assigned_to, 
  COUNT(*) as address_count,
  array_agg(mailbox_no) as mailboxes
FROM public.address_slot
WHERE status = 'assigned'
GROUP BY assigned_to
HAVING COUNT(*) > 1;

-- 4) Available slots by location (first 10)
SELECT 
  l.name,
  s.id,
  s.mailbox_no,
  s.created_at
FROM public.address_slot s
JOIN public.location l ON l.id = s.location_id
WHERE s.status = 'available'
ORDER BY l.id, s.id
LIMIT 10;

-- 5) System health check
SELECT 
  'Total Locations' as metric,
  COUNT(*)::text as value
FROM public.location
UNION ALL
SELECT 
  'Total Slots',
  COUNT(*)::text
FROM public.address_slot
UNION ALL
SELECT 
  'Available Slots',
  COUNT(*)::text
FROM public.address_slot
WHERE status = 'available'
UNION ALL
SELECT 
  'Assigned Slots',
  COUNT(*)::text
FROM public.address_slot
WHERE status = 'assigned';
