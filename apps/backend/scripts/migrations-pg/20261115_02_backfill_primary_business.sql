-- Every non-admin user needs a primary business: mail items must belong to one.
-- Signup now creates it; this backfills accounts created before that change.
-- Insert only. Safe to run twice (skips users who already have any business).
INSERT INTO business (user_id, company_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at)
SELECT u.id,
       COALESCE(NULLIF(TRIM(u.company_name), ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
       NULLIF(TRIM(u.company_number), ''),
       'active', true, 999,
       (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
FROM "user" u
WHERE COALESCE(u.is_admin, false) = false
  AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id);
