-- 111_add_missing_columns.sql
-- Add missing columns that frontend expects

-- Email preferences on user table
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS email_pref_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_pref_product  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_pref_system   boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN "user".email_pref_marketing IS 'Marketing emails opt-in';
COMMENT ON COLUMN "user".email_pref_product  IS 'Product updates opt-in';
COMMENT ON COLUMN "user".email_pref_system   IS 'System notifications opt-in';

-- KYC fields
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS kyc_verified_at_ms bigint,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;

COMMENT ON COLUMN "user".kyc_verified_at_ms IS 'KYC verified timestamp in ms';
COMMENT ON COLUMN "user".kyc_rejection_reason IS 'Reason if KYC was rejected';

-- Billing cycle expected by code
ALTER TABLE plan
  ADD COLUMN IF NOT EXISTS billing_cycle text;

-- Backfill from existing interval column if present
UPDATE plan
SET billing_cycle = COALESCE(billing_cycle, billing_interval)
WHERE billing_cycle IS NULL;

-- Compatibility view for code paths that expect 'state' instead of 'status'
DROP VIEW IF EXISTS user_profile_view;
CREATE VIEW user_profile_view AS
SELECT
  u.id,
  u.email,
  u.status AS state,
  u.first_name,
  u.last_name,
  u.kyc_verified_at_ms,
  u.kyc_rejection_reason,
  u.email_pref_marketing,
  u.email_pref_product,
  u.email_pref_system
FROM "user" u;
