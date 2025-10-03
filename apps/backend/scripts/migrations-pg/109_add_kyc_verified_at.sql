-- 109_add_kyc_verified_at.sql
-- Add KYC verification timestamp column

-- Add kyc_verified_at column (using BIGINT milliseconds for consistency)
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS kyc_verified_at BIGINT;

-- Add index for KYC queries
CREATE INDEX IF NOT EXISTS idx_user_kyc_verified_at ON "user"(kyc_verified_at);

-- Add comment
COMMENT ON COLUMN "user".kyc_verified_at IS 'Timestamp (ms) when KYC verification was completed';

-- Set kyc_verified_at for users already marked as verified
-- Only set if kyc_status is 'verified' and kyc_verified_at is not already set
UPDATE "user"
SET kyc_verified_at = updated_at
WHERE kyc_status = 'verified'
  AND kyc_verified_at IS NULL
  AND updated_at IS NOT NULL;
