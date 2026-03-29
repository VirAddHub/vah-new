-- Webhook POST /api/webhooks/sumsub and POST /api/kyc/sync-from-sumsub update these columns.
-- Older PostgreSQL databases may only have sumsub_applicant_id (or lack Sumsub audit fields entirely).

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS sumsub_applicant_id TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS sumsub_review_status TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS sumsub_last_updated BIGINT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS sumsub_rejection_reason TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS sumsub_webhook_payload TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;
