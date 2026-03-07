-- 128_mail_item_business_id_not_null.sql
-- Run after 127 backfill. Ensures all mail has a business_id then makes the column required.
-- New mail is always created with business_id (see webhooks-onedrive, internalMailImport).

-- Safety: backfill any remaining nulls to user's primary business (idempotent with 127)
UPDATE mail_item m
SET business_id = (
  SELECT b.id FROM business b WHERE b.user_id = m.user_id AND b.is_primary = true LIMIT 1
)
WHERE m.business_id IS NULL
  AND EXISTS (SELECT 1 FROM business b WHERE b.user_id = m.user_id AND b.is_primary = true);

-- Now require business_id (fails if any nulls remain - fix those users first)
ALTER TABLE mail_item ALTER COLUMN business_id SET NOT NULL;

COMMENT ON COLUMN mail_item.business_id IS 'Required: business this mail belongs to (set on create, backfilled in 127/128)';
