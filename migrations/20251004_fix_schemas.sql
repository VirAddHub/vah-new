-- 20251004_fix_schemas.sql
-- Purpose: add missing columns & backfill so API queries stop 500'ing.
-- Safe to re-run (uses IF NOT EXISTS + guarded updates).

BEGIN;

---------------------------------------------
-- A) plans.billing_interval (add + backfill)
---------------------------------------------
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS billing_interval text;

-- Backfill from existing columns (common: plans.interval or subscriptions.interval)
UPDATE plans
SET billing_interval = COALESCE(billing_interval, interval, 'month')
WHERE billing_interval IS NULL;

-- Optional: constrain allowed values (skip if you prefer free text)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plans_billing_interval_chk'
  ) THEN
    ALTER TABLE plans
      ADD CONSTRAINT plans_billing_interval_chk
      CHECK (billing_interval IN ('day','week','month','year'));
  END IF;
END$$;

-- Optional: make NOT NULL once backfilled everywhere
-- ALTER TABLE plans ALTER COLUMN billing_interval SET NOT NULL;

---------------------------------------------------
-- B) mail_item.description (add + backfill)
--    (frontend expects description; many DBs only had subject)
---------------------------------------------------
ALTER TABLE mail_item
  ADD COLUMN IF NOT EXISTS description text;

-- Prefer existing description, else subject, else a default
UPDATE mail_item
SET description = COALESCE(description, subject, 'Mail Item')
WHERE description IS NULL;

-- Optional: if you also want a NOT NULL guarantee later:
-- ALTER TABLE mail_items ALTER COLUMN description SET NOT NULL;

---------------------------------------------------
-- C) user.email_bounced_at (add to user table)
---------------------------------------------------
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS email_bounced_at timestamptz;

COMMIT;
