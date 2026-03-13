-- Store import source (e.g. from filename) for billing/KYC; tag remains user-selected (nullable until user picks).
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS source_slug text;
CREATE INDEX IF NOT EXISTS idx_mail_item_source_slug ON mail_item(source_slug) WHERE source_slug IS NOT NULL;
