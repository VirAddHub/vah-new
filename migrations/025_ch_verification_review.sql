-- Migration: Add Companies House verification review workflow
-- Date: 2025-11-19
--
-- ⚠️  DUPLICATE NUMBER WARNING — DO NOT RENAME THIS FILE
-- This file shares sequence number 025 with 025_add_kyc_approved_timestamps.sql.
-- Both files have been applied to production (the migration runner tracks by filename,
-- not by sequence number, so both rows exist in the migrations table).
-- Renaming this file would make the runner re-apply it and fail with column-already-exists errors.
-- The correct long-term fix is: after verifying the production migrations table contains
-- *both* filenames, add a code comment here and in 025_add_kyc_approved_timestamps.sql
-- acknowledging the overlap, and ensure no future migration reuses number 025.

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
    END,
    ch_verification_submitted_at = CASE
        WHEN ch_verification_proof_url IS NOT NULL AND ch_verification_submitted_at IS NULL THEN NOW()
        ELSE ch_verification_submitted_at
    END
WHERE ch_verification_status = 'not_submitted';

CREATE INDEX IF NOT EXISTS idx_user_ch_verification_status ON "user"(ch_verification_status);
CREATE INDEX IF NOT EXISTS idx_user_ch_verification_submitted_at ON "user"(ch_verification_submitted_at);

