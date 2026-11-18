-- Reshape a baseline-built database into the shape the Render database has today (from the read-only review).
DROP TABLE IF EXISTS login_throttle, mail_audit, forward_audit, verification_event, local_email_outbox CASCADE;
ALTER TABLE "user" DROP COLUMN IF EXISTS suspended_at, DROP COLUMN IF EXISTS standing_reason, DROP COLUMN IF EXISTS standing_changed_at_ms,
  DROP COLUMN IF EXISTS standing_changed_by, DROP COLUMN IF EXISTS is_staff, DROP COLUMN IF EXISTS expires_at, DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE "user" ADD COLUMN gocardless_customer_id text, ADD COLUMN gocardless_mandate_id text, ADD COLUMN gocardless_redirect_flow_id text;
ALTER TABLE subscription DROP COLUMN paid_through_ms, DROP COLUMN cancel_at_period_end, DROP COLUMN stripe_customer_id, ADD COLUMN mandate_id text;
ALTER TABLE subscription DROP CONSTRAINT IF EXISTS subscription_active_requires_stripe;
ALTER TABLE subscription ADD CONSTRAINT subscription_active_requires_mandate CHECK (status <> 'active' OR mandate_id IS NOT NULL) NOT VALID;
ALTER TABLE webhook_log DROP COLUMN attempts, DROP COLUMN last_error, DROP COLUMN processed_at_ms, DROP COLUMN event_created_ms, DROP COLUMN IF EXISTS error, DROP COLUMN IF EXISTS type;
DROP INDEX IF EXISTS idx_notification_user_unread;
ALTER TABLE notification DROP COLUMN meta, DROP COLUMN read_at;
ALTER TABLE notification ALTER COLUMN created_at DROP NOT NULL, ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at/1000.0), ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN read DROP NOT NULL;
ALTER TABLE invoices RENAME COLUMN provider_payment_id TO gocardless_payment_id;
ALTER INDEX IF EXISTS idx_invoices_provider_payment_id RENAME TO idx_invoices_gocardless_payment_id;
DROP INDEX IF EXISTS invoices_stripe_invoice_id_unique;
DROP INDEX IF EXISTS idx_invoices_user_period_unique;
CREATE UNIQUE INDEX idx_invoices_user_period_unique ON invoices (user_id, period_start, period_end);
ALTER TABLE plan_status_event RENAME COLUMN provider_event_id TO gocardless_event_id;
ALTER TABLE plan_status_event RENAME COLUMN provider_event_type TO gocardless_event_type;
ALTER TABLE plan_status_event RENAME COLUMN provider_event_created_at TO gocardless_event_created_at;
DROP INDEX IF EXISTS idx_invoices_seq_year;
ALTER TABLE invoices_seq DROP CONSTRAINT IF EXISTS invoices_seq_year_key;
CREATE TABLE gc_redirect_flow (id bigserial PRIMARY KEY, user_id bigint NOT NULL, flow_id text NOT NULL, session_token text, plan_id bigint NOT NULL, status text NOT NULL DEFAULT 'created', created_at_ms bigint NOT NULL, completed_at_ms bigint);
CREATE TABLE gc_billing_request_flow (id bigserial PRIMARY KEY, user_id bigint NOT NULL, billing_request_id text NOT NULL, billing_request_flow_id text, customer_id text, plan_id bigint NOT NULL, status text NOT NULL DEFAULT 'created', created_at_ms bigint NOT NULL, completed_at_ms bigint);
ALTER TABLE admin_audit ALTER COLUMN action TYPE varchar, ALTER COLUMN admin_id TYPE integer, ALTER COLUMN id TYPE integer, ALTER COLUMN created_at DROP NOT NULL, ADD COLUMN meta jsonb, ADD COLUMN target_user_id integer;
ALTER TABLE mail_item ALTER COLUMN item_id TYPE bigint USING NULLIF(item_id,'')::bigint;
ALTER TABLE forwarding_request DROP COLUMN IF EXISTS item_id;
ALTER TABLE forwarding_charge ADD COLUMN invoice_id integer, ADD COLUMN mail_item_id integer, ADD COLUMN user_id integer;
ALTER TABLE invoice_token ALTER COLUMN created_at_ms SET NOT NULL, ALTER COLUMN expires_at_ms SET NOT NULL;
ALTER TABLE scan_tokens ALTER COLUMN created_at_ms SET NOT NULL, ALTER COLUMN expires_at_ms SET NOT NULL;
ALTER TABLE plans ALTER COLUMN created_at_ms SET NOT NULL, ALTER COLUMN effective_at_ms SET NOT NULL, ALTER COLUMN updated_at_ms SET NOT NULL;
DELETE FROM migrations WHERE name IN ('20261115_01_notification_and_audit_tables.sql','20261115_02_backfill_primary_business.sql','20261115_03_stripe_entitlement.sql','20261115_04_invoice_period_unique_for_internal_only.sql','20261117_01_login_throttle.sql');
-- Plans: the Render copy has NOT NULL millisecond columns with defaults.
ALTER TABLE plans ALTER COLUMN created_at_ms SET DEFAULT ((EXTRACT(epoch FROM now()) * 1000))::bigint,
                  ALTER COLUMN effective_at_ms SET DEFAULT ((EXTRACT(epoch FROM now()) * 1000))::bigint,
                  ALTER COLUMN updated_at_ms SET DEFAULT ((EXTRACT(epoch FROM now()) * 1000))::bigint;
-- Tables that exist only in the reconstructed baseline.
DROP TABLE IF EXISTS blog_categories, invoice, invoice_seq, payment, users CASCADE;
-- blog_posts and the migration tables as they are on Render.
DROP TABLE IF EXISTS blog_posts CASCADE;
CREATE TABLE blog_posts (
  id serial PRIMARY KEY, slug varchar NOT NULL, title text NOT NULL, description text, content text NOT NULL,
  excerpt text, cover text, tags text[] DEFAULT '{}'::text[], status varchar DEFAULT 'draft', noindex boolean DEFAULT false,
  og_title text, og_desc text, author_name text DEFAULT 'Liban Adan', author_title text DEFAULT 'Founder, VirtualAddressHub',
  author_image text DEFAULT '/images/authors/liban.jpg', date timestamptz NOT NULL DEFAULT now(), updated timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
DROP TABLE IF EXISTS migrations;
CREATE TABLE migrations (id serial PRIMARY KEY, name varchar NOT NULL, applied_at timestamp DEFAULT now());
INSERT INTO migrations (name) VALUES ('017_fix_activity_status.sql'), ('110_rename_invoice_to_invoices.sql'), ('20251007_fix_missing_schema.sql');
CREATE TABLE IF NOT EXISTS _migrations (id serial PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
ALTER INDEX IF EXISTS subscription_user_id_unique RENAME TO subscription_user_unique;
