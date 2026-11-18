-- =============================================================================================
-- Phase 1 schema changes for the EXISTING Render database (vah-postgres).
-- Written from a read-only review of that database on 18 Nov 2026 (structure and counts only).
-- Run by a person, in order, AFTER a backup (see 2026-11-18_phase1_render.md). Never run by deploys.
-- Do not use the migration runner on Render: its tracking table is incomplete there.
-- =============================================================================================

-- ---------------------------------------------------------------------------------------------
-- PART 1: pre-checks. Read-only. Compare with the numbers in the runbook; stop if they differ a lot.
-- ---------------------------------------------------------------------------------------------
SELECT json_build_object(
  'notification_rows',          (SELECT count(*) FROM notification),
  'invoices_seq_dup_years',     (SELECT count(*) FROM (SELECT year FROM invoices_seq GROUP BY year HAVING count(*) > 1) d),
  'invoices_total',             (SELECT count(*) FROM invoices),
  'invoices_dup_periods',       (SELECT count(*) FROM (SELECT 1 FROM invoices WHERE stripe_invoice_id IS NULL GROUP BY user_id, period_start, period_end HAVING count(*) > 1) d),
  'active_subs',                (SELECT count(*) FROM subscription WHERE status = 'active'),
  'active_subs_without_stripe', (SELECT count(*) FROM subscription WHERE status = 'active' AND stripe_subscription_id IS NULL),
  'users_without_business',     (SELECT count(*) FROM "user" u WHERE NOT is_admin AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id)),
  'has_user_suspended_at',      (SELECT count(*) FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'suspended_at'),
  'has_login_throttle',         (SELECT count(*) FROM information_schema.tables WHERE table_name = 'login_throttle')
) AS precheck;
-- Expected on 18 Nov: notification_rows 0, invoices_seq_dup_years 0, invoices_total 0, invoices_dup_periods 0,
-- active_subs 7, active_subs_without_stripe 6, users_without_business 1, has_user_suspended_at 0, has_login_throttle 0.

-- ---------------------------------------------------------------------------------------------
-- PART 2: the change. One transaction: either all of it applies or none of it does.
-- Additive except where marked RENAME / TYPE / DROP CONSTRAINT / DROP INDEX (all reversible, see PART 4).
-- ---------------------------------------------------------------------------------------------
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Account standing (admin suspend / restore / close) and the access check.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS suspended_at           timestamptz;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS standing_reason        text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS standing_changed_at_ms bigint;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS standing_changed_by    bigint;

-- Stripe entitlement.
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS paid_through_ms      bigint;
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE subscription ADD COLUMN IF NOT EXISTS stripe_customer_id   text;
-- DROP CONSTRAINT: this check makes every Stripe activation fail (Stripe subscriptions have no mandate).
ALTER TABLE subscription DROP CONSTRAINT IF EXISTS subscription_active_requires_mandate;

-- Webhook event processing (retries, ordering).
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS attempts         integer NOT NULL DEFAULT 0;
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS last_error       text;
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS processed_at_ms  bigint;
ALTER TABLE webhook_log ADD COLUMN IF NOT EXISTS event_created_ms bigint;

-- RENAME: GoCardless columns keep their (empty) history under provider-neutral names.
ALTER TABLE invoices          RENAME COLUMN gocardless_payment_id       TO provider_payment_id;
ALTER TABLE plan_status_event RENAME COLUMN gocardless_event_id         TO provider_event_id;
ALTER TABLE plan_status_event RENAME COLUMN gocardless_event_type       TO provider_event_type;
ALTER TABLE plan_status_event RENAME COLUMN gocardless_event_created_at TO provider_event_created_at;
ALTER INDEX IF EXISTS idx_invoices_gocardless_payment_id RENAME TO idx_invoices_provider_payment_id;

-- DROP INDEX + recreate: one internal invoice per user and period; Stripe invoices are unique by their own id.
DROP INDEX IF EXISTS idx_invoices_user_period_unique;
CREATE UNIQUE INDEX idx_invoices_user_period_unique ON invoices (user_id, period_start, period_end) WHERE stripe_invoice_id IS NULL;

-- Invoice numbering uses ON CONFLICT (year), which needs this index (missing today; the table is empty).
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_seq_year ON invoices_seq (year);

-- In-app notifications: the code writes meta, read_at and millisecond created_at.
-- TYPE: created_at timestamptz -> bigint milliseconds (table has 0 rows today; existing rows would be converted).
ALTER TABLE notification ADD COLUMN IF NOT EXISTS meta    text;
ALTER TABLE notification ADD COLUMN IF NOT EXISTS read_at bigint;
ALTER TABLE notification ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE notification ALTER COLUMN created_at TYPE bigint USING (EXTRACT(EPOCH FROM created_at) * 1000)::bigint;
UPDATE notification SET created_at = (EXTRACT(EPOCH FROM now()) * 1000)::bigint WHERE created_at IS NULL;
ALTER TABLE notification ALTER COLUMN created_at SET NOT NULL;
UPDATE notification SET read = false WHERE read IS NULL;
ALTER TABLE notification ALTER COLUMN read SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_user_created ON notification (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_unread  ON notification (user_id) WHERE read_at IS NULL;

-- New tables (all empty).
CREATE TABLE IF NOT EXISTS login_throttle (
  key              text    PRIMARY KEY,
  failures         integer NOT NULL DEFAULT 0,
  first_failure_at bigint  NOT NULL,
  locked_until     bigint
);
CREATE INDEX IF NOT EXISTS idx_login_throttle_first_failure_at ON login_throttle (first_failure_at);

CREATE TABLE IF NOT EXISTS mail_audit (
  id          bigserial PRIMARY KEY,
  item_id     bigint NOT NULL,
  user_id     bigint,
  action      text NOT NULL,
  before_json text,
  after_json  text,
  created_at  bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mail_audit_item_created ON mail_audit (item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forward_audit (
  id           serial PRIMARY KEY,
  mail_item_id integer NOT NULL,
  user_id      integer NOT NULL,
  result       text NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fwd_audit_mail_created ON forward_audit (mail_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_event (
  id           bigserial PRIMARY KEY,
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'business_owner')),
  subject_id   bigint NOT NULL,
  event_type   text NOT NULL,
  payload_json jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_event_created_at ON verification_event (created_at);
CREATE INDEX IF NOT EXISTS idx_verification_event_subject    ON verification_event (subject_type, subject_id);

-- Data: every customer needs a primary business (1 account today). Insert only.
INSERT INTO business (user_id, company_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at)
SELECT u.id,
       COALESCE(NULLIF(TRIM(u.company_name), ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
       NULLIF(TRIM(u.company_number), ''), 'active', true, 999,
       (EXTRACT(EPOCH FROM now()) * 1000)::bigint, (EXTRACT(EPOCH FROM now()) * 1000)::bigint
FROM "user" u
WHERE COALESCE(u.is_admin, false) = false AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id);

-- Record what this pack covers so the repository migrations are not applied a second time.
INSERT INTO migrations (name)
SELECT n FROM unnest(ARRAY[
  '20261115_01_notification_and_audit_tables.sql', '20261115_02_backfill_primary_business.sql',
  '20261115_03_stripe_entitlement.sql', '20261115_04_invoice_period_unique_for_internal_only.sql',
  '20261117_01_login_throttle.sql',
  -- renumbered copies of 017/103/105, which Render already has:
  '131_fix_activity_status.sql', '132_time_ms_invoice_token_fixed.sql', '133_time_ms_webhook_export_address_fixed.sql'
]) AS n
WHERE NOT EXISTS (SELECT 1 FROM migrations m WHERE m.name = n);

COMMIT;

-- ---------------------------------------------------------------------------------------------
-- PART 3: verification. Read-only. Every value should be true.
-- ---------------------------------------------------------------------------------------------
SELECT json_build_object(
  'user_standing_cols',  (SELECT count(*) = 4 FROM information_schema.columns WHERE table_name = 'user' AND column_name IN ('suspended_at','standing_reason','standing_changed_at_ms','standing_changed_by')),
  'subscription_cols',   (SELECT count(*) = 3 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name IN ('paid_through_ms','cancel_at_period_end','stripe_customer_id')),
  'mandate_check_gone',  NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_active_requires_mandate'),
  'webhook_cols',        (SELECT count(*) = 4 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name IN ('attempts','last_error','processed_at_ms','event_created_ms')),
  'provider_cols',       (SELECT count(*) = 4 FROM information_schema.columns WHERE column_name IN ('provider_payment_id','provider_event_id','provider_event_type','provider_event_created_at')),
  'notification_ms',     (SELECT data_type = 'bigint' FROM information_schema.columns WHERE table_name = 'notification' AND column_name = 'created_at'),
  'new_tables',          (SELECT count(*) = 4 FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('login_throttle','mail_audit','forward_audit','verification_event')),
  'seq_year_unique',     EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invoices_seq_year'),
  'every_user_business', NOT EXISTS (SELECT 1 FROM "user" u WHERE NOT is_admin AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id))
) AS verify;

-- ---------------------------------------------------------------------------------------------
-- PART 4: rollback (only if the deploy is rolled back too). Restores the previous shape; the new
-- tables and columns are dropped with whatever they collected since.
-- ---------------------------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE invoices          RENAME COLUMN provider_payment_id       TO gocardless_payment_id;
-- ALTER TABLE plan_status_event RENAME COLUMN provider_event_id         TO gocardless_event_id;
-- ALTER TABLE plan_status_event RENAME COLUMN provider_event_type       TO gocardless_event_type;
-- ALTER TABLE plan_status_event RENAME COLUMN provider_event_created_at TO gocardless_event_created_at;
-- ALTER INDEX IF EXISTS idx_invoices_provider_payment_id RENAME TO idx_invoices_gocardless_payment_id;
-- DROP INDEX IF EXISTS idx_invoices_user_period_unique;
-- CREATE UNIQUE INDEX idx_invoices_user_period_unique ON invoices (user_id, period_start, period_end);
-- ALTER TABLE subscription ADD CONSTRAINT subscription_active_requires_mandate CHECK (status <> 'active' OR mandate_id IS NOT NULL) NOT VALID;
-- DROP INDEX IF EXISTS idx_notification_user_unread, idx_notification_user_created;
-- ALTER TABLE notification ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at / 1000.0),
--                          ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN created_at DROP NOT NULL, ALTER COLUMN read DROP NOT NULL;
-- ALTER TABLE notification DROP COLUMN meta, DROP COLUMN read_at;
-- DROP TABLE IF EXISTS login_throttle, mail_audit, forward_audit, verification_event;
-- (Added columns on "user", subscription, webhook_log and the invoices_seq index are harmless to the old code and can stay.)
-- DELETE FROM migrations WHERE name LIKE '20261115_%' OR name LIKE '20261117_%' OR name IN ('131_fix_activity_status.sql','132_time_ms_invoice_token_fixed.sql','133_time_ms_webhook_export_address_fixed.sql');
-- COMMIT;
