-- Seed address data for production
-- Run this in your Render Postgres console or with psql

-- 1) Create a location (edit lines to your real address)
INSERT INTO public.location (name, line1, line2, city, postcode, country)
VALUES ('London HQ', '123 Example Street', NULL, 'London', 'EC1A 1AA', 'United Kingdom')
ON CONFLICT DO NOTHING
RETURNING id;

-- Note the id from above (assume 1). Then create 200 suites:
WITH loc AS (SELECT 1::bigint AS id)
INSERT INTO public.address_slot (location_id, mailbox_no)
SELECT (SELECT id FROM loc), 'Suite ' || lpad(g::text, 3, '0')
FROM generate_series(1, 200) AS g
ON CONFLICT DO NOTHING;

-- Quick sanity check
SELECT
  l.id AS location_id,
  l.name,
  COUNT(*) FILTER (WHERE s.status='available') AS available,
  COUNT(*) FILTER (WHERE s.status='assigned')  AS assigned
FROM public.location l
LEFT JOIN public.address_slot s ON s.location_id = l.id
GROUP BY l.id, l.name;
