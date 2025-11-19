-- Helper snippet to mark manual CH verification migrations as applied.
-- Only run on environments where 025 and 026 were applied manually.

INSERT INTO migrations (name, applied_at)
VALUES
    ('025_ch_verification_review.sql', now()),
    ('026_backfill_ch_verification_columns.sql', now())
ON CONFLICT (name) DO NOTHING;

