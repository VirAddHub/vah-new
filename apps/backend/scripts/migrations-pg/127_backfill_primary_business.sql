-- 127_backfill_primary_business.sql
-- For each user, create one primary business from existing user-level company fields
-- and link their mail items to that business. Idempotent: skip users who already have a primary business.

INSERT INTO business (user_id, company_name, trading_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.company_name), ''), 'My business')::text,
  NULL,
  u.companies_house_number,
  'active',
  true,
  999,
  COALESCE(u.created_at, (floor(extract(epoch from now()) * 1000))::bigint),
  (floor(extract(epoch from now()) * 1000))::bigint
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM business b WHERE b.user_id = u.id AND b.is_primary = true
);

-- Link existing mail to the user's primary business
UPDATE mail_item m
SET business_id = (
  SELECT b.id FROM business b WHERE b.user_id = m.user_id AND b.is_primary = true LIMIT 1
)
WHERE m.business_id IS NULL
  AND EXISTS (SELECT 1 FROM business b WHERE b.user_id = m.user_id AND b.is_primary = true);

COMMENT ON COLUMN mail_item.business_id IS 'Business this mail belongs to; backfilled in 127 for existing users';
