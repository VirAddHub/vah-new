-- Production Address System Seeding
-- Run this in your Render PostgreSQL console

-- 1) Create location (edit to your real address)
INSERT INTO public.location (name, line1, line2, city, postcode, country)
VALUES ('London HQ', '123 Example Street', NULL, 'London', 'EC1A 1AA', 'United Kingdom')
ON CONFLICT DO NOTHING
RETURNING id;

-- 2) Create 200 address slots (use the id from above, or assume 1)
WITH loc AS (SELECT 1::bigint AS id)
INSERT INTO public.address_slot (location_id, mailbox_no)
SELECT (SELECT id FROM loc), 'Suite ' || lpad(g::text, 3, '0')
FROM generate_series(1, 200) AS g
ON CONFLICT DO NOTHING;

-- 3) Verify seeding worked
SELECT 
  l.id, 
  l.name,
  COUNT(*) FILTER (WHERE s.status='available') AS free,
  COUNT(*) FILTER (WHERE s.status='assigned') AS used,
  COUNT(*) AS total
FROM public.location l
LEFT JOIN public.address_slot s ON s.location_id = l.id
GROUP BY l.id, l.name
ORDER BY l.id;
