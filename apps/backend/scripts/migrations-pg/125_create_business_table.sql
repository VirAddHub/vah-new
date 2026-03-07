-- 125_create_business_table.sql
-- Multi-business support: one user can own multiple businesses.
-- Each business has its own company name, CH number, and (later) mail/verification.

CREATE TABLE IF NOT EXISTS business (
  id                bigserial PRIMARY KEY,
  user_id           bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company_name      text NOT NULL,
  trading_name      text,
  companies_house_number text,
  status            text NOT NULL DEFAULT 'active',
  is_primary        boolean NOT NULL DEFAULT false,
  monthly_price_pence int NOT NULL DEFAULT 999,
  created_at        bigint NOT NULL,
  updated_at        bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_business_user_id ON business(user_id);
CREATE INDEX IF NOT EXISTS idx_business_user_primary ON business(user_id, is_primary) WHERE is_primary = true;

COMMENT ON TABLE business IS 'Business entities under a user account; each has its own name, CH number, and (via business_id) mail/verification';
COMMENT ON COLUMN business.monthly_price_pence IS 'Display price for this business: first = 999, then -100 each, floor 599';
COMMENT ON COLUMN business.is_primary IS 'Exactly one per user; used as default context in UI';
