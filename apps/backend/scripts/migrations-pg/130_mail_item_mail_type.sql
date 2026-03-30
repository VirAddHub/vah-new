-- AI-derived mail classification from OneDrive ingest (worker → webhook)
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS mail_type text;
COMMENT ON COLUMN mail_item.mail_type IS 'Optional: letter/bill/etc. from ingest-time AI (gpt-4o-mini)';
