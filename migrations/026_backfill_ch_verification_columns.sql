-- Migration: Ensure Companies House verification review columns exist
-- Date: 2025-11-19

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS ch_verification_status TEXT NOT NULL DEFAULT 'not_submitted',
    ADD COLUMN IF NOT EXISTS ch_verification_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ch_verification_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ch_verification_reviewer_id INTEGER,
    ADD COLUMN IF NOT EXISTS ch_verification_notes TEXT;

-- Backfill status based on existing data
UPDATE "user"
SET ch_verification_status = CASE
        WHEN companies_house_verified = true THEN 'approved'
        WHEN ch_verification_proof_url IS NOT NULL THEN 'submitted'
        ELSE 'not_submitted'
    END
WHERE ch_verification_status IS NULL OR ch_verification_status = 'not_submitted';

-- Set submitted timestamp if missing but proof exists
UPDATE "user"
SET ch_verification_submitted_at = NOW()
WHERE ch_verification_proof_url IS NOT NULL
  AND ch_verification_submitted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_ch_verification_status ON "user"(ch_verification_status);
CREATE INDEX IF NOT EXISTS idx_user_ch_verification_submitted_at ON "user"(ch_verification_submitted_at);

