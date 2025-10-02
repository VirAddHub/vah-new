-- 106_time_ms_not_null_defaults.sql
-- Enforce NOT NULL/defaults for forward-only writes

-- plans: make required columns NOT NULL with defaults
ALTER TABLE plans
  ALTER COLUMN created_at_ms SET NOT NULL,
  ALTER COLUMN updated_at_ms SET NOT NULL,
  ALTER COLUMN effective_at_ms SET NOT NULL,
  ALTER COLUMN created_at_ms SET DEFAULT ((EXTRACT(EPOCH FROM NOW())*1000)::BIGINT),
  ALTER COLUMN updated_at_ms SET DEFAULT ((EXTRACT(EPOCH FROM NOW())*1000)::BIGINT),
  ALTER COLUMN effective_at_ms SET DEFAULT ((EXTRACT(EPOCH FROM NOW())*1000)::BIGINT);

-- scan_tokens: make columns NOT NULL (no defaults, must be provided)
ALTER TABLE scan_tokens
  ALTER COLUMN created_at_ms SET NOT NULL,
  ALTER COLUMN expires_at_ms SET NOT NULL;

-- invoice_token: make columns NOT NULL (no defaults, must be provided)
ALTER TABLE invoice_token
  ALTER COLUMN created_at_ms SET NOT NULL,
  ALTER COLUMN expires_at_ms SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN plans.created_at IS 'DEPRECATED: Use created_at_ms instead. Legacy text format.';
COMMENT ON COLUMN plans.updated_at IS 'DEPRECATED: Use updated_at_ms instead. Legacy text format.';
COMMENT ON COLUMN plans.effective_at IS 'DEPRECATED: Use effective_at_ms instead. Legacy text format.';
COMMENT ON COLUMN plans.retired_at IS 'DEPRECATED: Use retired_at_ms instead. Legacy text format.';

COMMENT ON COLUMN scan_tokens.created_at IS 'DEPRECATED: Use created_at_ms instead. Legacy text format.';
COMMENT ON COLUMN scan_tokens.expires_at IS 'DEPRECATED: Use expires_at_ms instead. Legacy text format.';

COMMENT ON COLUMN invoice_token.created_at IS 'DEPRECATED: Use created_at_ms instead. May be text or timestamptz.';
COMMENT ON COLUMN invoice_token.expires_at IS 'DEPRECATED: Use expires_at_ms instead. May be text or timestamptz.';

COMMENT ON COLUMN mail_item.received_date IS 'DEPRECATED: Use received_at_ms instead. Legacy text format.';
COMMENT ON COLUMN mail_item.forwarded_date IS 'DEPRECATED: Use forwarded_at_ms instead. Legacy text format.';
