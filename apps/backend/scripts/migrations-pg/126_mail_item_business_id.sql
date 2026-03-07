-- 126_mail_item_business_id.sql
-- Link mail items to a business (nullable until backfill; then required for new mail).

ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS business_id bigint REFERENCES business(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mail_item_business_id ON mail_item(business_id) WHERE business_id IS NOT NULL;

COMMENT ON COLUMN mail_item.business_id IS 'Business this mail belongs to; when set, used for filtering by active business';
