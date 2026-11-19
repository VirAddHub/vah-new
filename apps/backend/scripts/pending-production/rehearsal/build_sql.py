#!/usr/bin/env python3
"""Generates the Phase 1 Render SQL files from one set of checks, so the pre-check, the guard inside the
migration and the verification can never drift apart.

    python3 build_sql.py            # writes ../2026-11-18_phase1_render*.sql

Inputs: render_fingerprint_2026-11-18.txt (column fingerprint of every table on Render, taken read-only on
18 Nov 2026) and post_fingerprint.txt (the same fingerprint after the migration, from the rehearsal copy).
"""
import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent
PRE = dict(x.split('=') for x in (HERE / 'render_fingerprint_2026-11-18.txt').read_text().split())
POST = dict(x.split('=') for x in (HERE / 'post_fingerprint.txt').read_text().split()) if (HERE / 'post_fingerprint.txt').exists() else None
# Whole-schema fingerprints of index definitions, constraints (NOT NULL entries excluded: PostgreSQL 18 lists them,
# older versions do not; nullability is covered by the column fingerprint) and triggers. Taken read-only from Render
# on 18 Nov 2026 (282 indexes, 131 constraints, 1 trigger); the post values come from the rehearsal copy.
OBJ_PRE = {'idx': 'fc0437965cbb71aa7e0b16e8b8573fbf', 'con': 'a7de2267504b6f422c1cd0d67855d90d', 'trg': 'ce480cbc816118c5fc846d98ac56012d'}
OBJ_POST = dict(l.split('=') for l in (HERE / 'post_objects.txt').read_text().split()) if (HERE / 'post_objects.txt').exists() else None
OBJ_SQL = {
    'idx': """SELECT md5(string_agg(md5(indexdef), '' ORDER BY md5(indexdef) COLLATE "C")) FROM pg_indexes WHERE schemaname = 'public'""",
    'con': """SELECT md5(string_agg(h, '' ORDER BY h COLLATE "C")) FROM (SELECT md5(conrelid::regclass::text || ':' || conname || ':' || pg_get_constraintdef(oid)) AS h FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype <> 'n') x""",
    'trg': """SELECT md5(string_agg(md5(pg_get_triggerdef(oid)), '' ORDER BY 1)) FROM pg_trigger WHERE NOT tgisinternal""",
}
OBJ_LABEL = {'idx': 'index definitions', 'con': 'constraints', 'trg': 'triggers'}

def objects_check(expected: dict, label: str) -> str:
    out = f"\n  -- {label}: every index definition, constraint and trigger must match exactly."
    for k in ('idx', 'con', 'trg'):
        out += f"""
  SELECT ({OBJ_SQL[k]}) INTO v_def;
  IF v_def IS DISTINCT FROM '{expected[k]}' THEN
    problems := problems || format('{OBJ_LABEL[k]} differ from the expected set (fingerprint %s, expected {expected[k]})', v_def);
  END IF;"""
    return out

FINGERPRINT_SQL = """SELECT table_name AS t, left(md5(string_agg(column_name||':'||data_type||':'||is_nullable, ',' ORDER BY column_name)), 8) AS h
                 FROM information_schema.columns WHERE table_schema = 'public' GROUP BY table_name"""

EXPECTED_DB = 'vah_postgres_40zq'
TRACKED = [
    '20261115_01_notification_and_audit_tables.sql',
    '20261115_02_backfill_primary_business.sql',
    '20261115_03_stripe_entitlement.sql',
    '20261115_04_invoice_period_unique_for_internal_only.sql',
    '20261117_01_login_throttle.sql',
]

def sql_list(items):
    return 'ARRAY[' + ', '.join("'" + i.replace("'", "''") + "'" for i in items) + ']::text[]'

def fingerprint_check(expected: dict, label: str) -> str:
    return f"""
  -- {label}: every table's columns (name, type, nullability) must match exactly.
  exp := '{json.dumps(expected, sort_keys=True)}'::jsonb;
  SELECT jsonb_object_agg(t, h) INTO act FROM ({FINGERPRINT_SQL}) f;
  FOR k IN SELECT jsonb_object_keys(exp) LOOP
    IF act->>k IS DISTINCT FROM exp->>k THEN
      problems := problems || format('table %s: column fingerprint %s, expected %s', k, coalesce(act->>k, 'MISSING'), exp->>k);
    END IF;
  END LOOP;
  FOR k IN SELECT jsonb_object_keys(act) LOOP
    IF NOT exp ? k THEN problems := problems || format('unexpected table %s', k); END IF;
  END LOOP;"""

def index_is(name, definition):
    d = definition.replace("'", "''")
    return f"""
  IF coalesce((SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = '{name}'), 'MISSING') <> '{d}' THEN
    problems := problems || format('index {name}: %s', coalesce((SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = '{name}'), 'MISSING'));
  END IF;"""

def index_absent(name):
    return f"""
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = '{name}') THEN
    problems := problems || 'index {name} already exists';
  END IF;"""

def column_is(table, column, data_type, nullable, default):
    dflt = 'NULL' if default is None else "'" + default.replace("'", "''") + "'"
    return f"""
  v_type := NULL; v_null := NULL; v_def := NULL;
  SELECT data_type, is_nullable, column_default INTO v_type, v_null, v_def FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = '{table}' AND column_name = '{column}';
  IF v_type IS DISTINCT FROM '{data_type}' OR v_null IS DISTINCT FROM '{nullable}' OR v_def IS DISTINCT FROM {dflt} THEN
    problems := problems || format('column {table}.{column}: %s / %s / %s, expected {data_type} / {nullable} / %s',
                                   coalesce(v_type, 'MISSING'), coalesce(v_null, '-'), coalesce(v_def, 'no default'), coalesce({dflt}, 'no default'));
  END IF;"""

def wrap(name, body, ok_message, fail_prefix):
    # A bare string literal appended to text[] would be read as an array literal; `text '...'` makes it one element.
    body = body.replace("problems := problems || '", "problems := problems || text '")
    return f"""DO ${name}$
DECLARE
  problems text[] := '{{}}';
  exp jsonb; act jsonb; k text; n bigint; v_type text; v_null text; v_def text;
BEGIN{body}
  IF cardinality(problems) > 0 THEN
    RAISE EXCEPTION '{fail_prefix} (% problem(s)):%', cardinality(problems), E'\\n  - ' || array_to_string(problems, E'\\n  - ');
  END IF;
  RAISE NOTICE '{ok_message}';
END
${name}$;
"""

# ---------------------------------------------------------------------------------------------------------
# Checks on the database as it must be BEFORE the change (read-only).
# ---------------------------------------------------------------------------------------------------------
PRE_BODY = f"""
  -- Right database. (A rehearsal on a local copy sets vah.rehearsal=on; Render never does.)
  IF current_database() <> '{EXPECTED_DB}' AND current_setting('vah.rehearsal', true) IS DISTINCT FROM 'on' THEN
    problems := problems || format('connected to database %s, expected {EXPECTED_DB}', current_database());
  END IF;
  IF current_setting('server_version_num')::int < 130000 THEN
    problems := problems || format('PostgreSQL %s is older than 13', current_setting('server_version'));
  END IF;
{fingerprint_check(PRE, 'Structure reviewed on 18 Nov 2026')}

  -- Objects this change replaces or relies on, exactly as reviewed.
{index_is('idx_invoices_user_period_unique', 'CREATE UNIQUE INDEX idx_invoices_user_period_unique ON public.invoices USING btree (user_id, period_start, period_end)')}
{index_is('idx_invoices_stripe_invoice_id', 'CREATE UNIQUE INDEX idx_invoices_stripe_invoice_id ON public.invoices USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL)')}
{index_is('idx_invoices_gocardless_payment_id', 'CREATE UNIQUE INDEX idx_invoices_gocardless_payment_id ON public.invoices USING btree (gocardless_payment_id) WHERE (gocardless_payment_id IS NOT NULL)')}
{index_is('subscription_user_unique', 'CREATE UNIQUE INDEX subscription_user_unique ON public.subscription USING btree (user_id)')}
{index_is('idx_invoices_seq_year', 'CREATE INDEX idx_invoices_seq_year ON public.invoices_seq USING btree (year)')}
{index_absent('idx_invoices_seq_year_new')}
{index_absent('idx_notification_user_created')}
{objects_check(OBJ_PRE, 'Indexes, constraints and triggers reviewed on 18 Nov 2026')}
{index_absent('idx_invoices_provider_payment_id')}
{index_absent('idx_notification_user_unread')}
  IF EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid
              WHERE c.relname = 'invoices_seq' AND i.indisunique AND NOT i.indisprimary) THEN
    problems := problems || 'invoices_seq already has a unique index other than its primary key';
  END IF;
  -- Check constraints on subscription: exactly the GoCardless mandate check.
  SELECT count(*) INTO n FROM pg_constraint WHERE conrelid = 'public.subscription'::regclass AND contype = 'c';
  IF n <> 1 OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscription'::regclass
                            AND conname = 'subscription_active_requires_mandate'
                            AND replace(pg_get_constraintdef(oid), ' NOT VALID', '') = 'CHECK (((status <> ''active''::text) OR (mandate_id IS NOT NULL)))') THEN
    problems := problems || format('subscription check constraints differ from the review (%s found)', n);
  END IF;
  -- None of the tracked migrations recorded yet.
  SELECT count(*) INTO n FROM migrations WHERE name = ANY ({sql_list(TRACKED)});
  IF n > 0 THEN problems := problems || format('%s of the Phase 1 migrations are already recorded in the migrations table', n); END IF;
  -- Data that would make the new unique index fail.
  SELECT count(*) INTO n FROM (SELECT year FROM invoices_seq GROUP BY year HAVING count(*) > 1) d;
  IF n > 0 THEN problems := problems || format('invoices_seq has %s duplicated year(s)', n); END IF;

  -- Information only (not a failure): what the data steps will touch.
  RAISE NOTICE 'customers without a business (will get one): %',
    (SELECT count(*) FROM "user" u WHERE NOT u.is_admin AND u.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id));
  RAISE NOTICE 'notification rows to convert to millisecond timestamps: %', (SELECT count(*) FROM notification);
  RAISE NOTICE 'active subscriptions without a Stripe subscription (will show Payment needed): %',
    (SELECT count(*) FROM subscription WHERE status = 'active' AND stripe_subscription_id IS NULL);"""

# ---------------------------------------------------------------------------------------------------------
# Checks on the database as it must be AFTER the change.
# ---------------------------------------------------------------------------------------------------------
NOW_MS = '((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint'
COLUMNS = [
    ('user', 'suspended_at', 'timestamp with time zone', 'YES', None),
    ('user', 'standing_reason', 'text', 'YES', None),
    ('user', 'standing_changed_at_ms', 'bigint', 'YES', None),
    ('user', 'standing_changed_by', 'bigint', 'YES', None),
    ('subscription', 'paid_through_ms', 'bigint', 'YES', None),
    ('subscription', 'cancel_at_period_end', 'boolean', 'NO', 'false'),
    ('subscription', 'stripe_customer_id', 'text', 'YES', None),
    ('webhook_log', 'attempts', 'integer', 'NO', '0'),
    ('webhook_log', 'last_error', 'text', 'YES', None),
    ('webhook_log', 'processed_at_ms', 'bigint', 'YES', None),
    ('webhook_log', 'event_created_ms', 'bigint', 'YES', None),
    ('invoices', 'provider_payment_id', 'text', 'YES', None),
    ('invoices', 'gocardless_payment_id', 'text', 'YES', None),           # kept for the previous release
    ('plan_status_event', 'provider_event_id', 'text', 'YES', None),
    ('plan_status_event', 'provider_event_type', 'text', 'YES', None),
    ('plan_status_event', 'provider_event_created_at', 'timestamp with time zone', 'YES', None),
    ('plan_status_event', 'gocardless_event_id', 'text', 'YES', None),     # kept for the previous release
    ('notification', 'meta', 'text', 'YES', None),
    ('notification', 'read_at', 'bigint', 'YES', None),
    ('notification', 'created_at', 'bigint', 'NO', None),
    ('notification', 'read', 'boolean', 'NO', 'false'),
    ('login_throttle', 'key', 'text', 'NO', None),
    ('login_throttle', 'failures', 'integer', 'NO', '0'),
    ('login_throttle', 'first_failure_at', 'bigint', 'NO', None),
    ('login_throttle', 'locked_until', 'bigint', 'YES', None),
    ('mail_audit', 'item_id', 'bigint', 'NO', None),
    ('mail_audit', 'created_at', 'bigint', 'NO', None),
    ('forward_audit', 'mail_item_id', 'integer', 'NO', None),
    ('forward_audit', 'created_at', 'timestamp with time zone', 'NO', 'now()'),
    ('verification_event', 'subject_type', 'text', 'NO', None),
    ('verification_event', 'payload_json', 'jsonb', 'YES', None),
    ('verification_event', 'created_at', 'timestamp with time zone', 'NO', 'now()'),
]
INDEXES = {
    'idx_invoices_user_period_unique': 'CREATE UNIQUE INDEX idx_invoices_user_period_unique ON public.invoices USING btree (user_id, period_start, period_end) WHERE (stripe_invoice_id IS NULL)',
    'idx_invoices_stripe_invoice_id': 'CREATE UNIQUE INDEX idx_invoices_stripe_invoice_id ON public.invoices USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL)',
    'idx_invoices_gocardless_payment_id': 'CREATE UNIQUE INDEX idx_invoices_gocardless_payment_id ON public.invoices USING btree (gocardless_payment_id) WHERE (gocardless_payment_id IS NOT NULL)',
    'idx_invoices_provider_payment_id': 'CREATE UNIQUE INDEX idx_invoices_provider_payment_id ON public.invoices USING btree (provider_payment_id) WHERE (provider_payment_id IS NOT NULL)',
    'idx_invoices_seq_year': 'CREATE UNIQUE INDEX idx_invoices_seq_year ON public.invoices_seq USING btree (year)',
    'subscription_user_unique': 'CREATE UNIQUE INDEX subscription_user_unique ON public.subscription USING btree (user_id)',
    'idx_notification_user_created': 'CREATE INDEX idx_notification_user_created ON public.notification USING btree (user_id, created_at DESC)',
    'idx_notification_created_at': 'CREATE INDEX idx_notification_created_at ON public.notification USING btree (created_at DESC)',
    'idx_notification_user_read': 'CREATE INDEX idx_notification_user_read ON public.notification USING btree (user_id, read)',
    'idx_notification_user_unread': 'CREATE INDEX idx_notification_user_unread ON public.notification USING btree (user_id) WHERE (read_at IS NULL)',
    'login_throttle_pkey': 'CREATE UNIQUE INDEX login_throttle_pkey ON public.login_throttle USING btree (key)',
    'idx_login_throttle_first_failure_at': 'CREATE INDEX idx_login_throttle_first_failure_at ON public.login_throttle USING btree (first_failure_at)',
    'mail_audit_pkey': 'CREATE UNIQUE INDEX mail_audit_pkey ON public.mail_audit USING btree (id)',
    'idx_mail_audit_item_created': 'CREATE INDEX idx_mail_audit_item_created ON public.mail_audit USING btree (item_id, created_at DESC)',
    'forward_audit_pkey': 'CREATE UNIQUE INDEX forward_audit_pkey ON public.forward_audit USING btree (id)',
    'fwd_audit_mail_created': 'CREATE INDEX fwd_audit_mail_created ON public.forward_audit USING btree (mail_item_id, created_at DESC)',
    'verification_event_pkey': 'CREATE UNIQUE INDEX verification_event_pkey ON public.verification_event USING btree (id)',
    'idx_verification_event_created_at': 'CREATE INDEX idx_verification_event_created_at ON public.verification_event USING btree (created_at)',
    'idx_verification_event_subject': 'CREATE INDEX idx_verification_event_subject ON public.verification_event USING btree (subject_type, subject_id)',
}

def post_body(check_tracking: bool) -> str:
    body = ''
    if POST:
        body += fingerprint_check(POST, 'Structure after the change')
    if OBJ_POST:
        body += objects_check(OBJ_POST, 'Indexes, constraints and triggers after the change')
    body += '\n  -- Columns added or changed: type, nullability and default.'
    body += ''.join(column_is(*c) for c in COLUMNS)
    body += '\n  -- Indexes, including every uniqueness rule the code relies on.'
    body += ''.join(index_is(n, d) for n, d in INDEXES.items())
    body += f"""
  -- Constraints.
  FOR k IN SELECT unnest(ARRAY['login_throttle', 'mail_audit', 'forward_audit', 'verification_event']) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = format('public.%I', k)::regclass AND contype = 'p') THEN
      problems := problems || format('table %s has no primary key', k);
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.verification_event'::regclass AND contype = 'c'
                 AND pg_get_constraintdef(oid) = 'CHECK ((subject_type = ANY (ARRAY[''user''::text, ''business_owner''::text])))') THEN
    problems := problems || 'verification_event subject_type check is missing or different';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.subscription'::regclass AND contype = 'c') THEN
    problems := problems || 'subscription still has a check constraint (the mandate check blocks Stripe activations)';
  END IF;
  -- Data.
  SELECT count(*) INTO n FROM "user" u WHERE NOT u.is_admin AND u.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id);
  IF n > 0 THEN problems := problems || format('%s customer(s) still without a business', n); END IF;
  SELECT count(*) INTO n FROM (SELECT year FROM invoices_seq GROUP BY year HAVING count(*) > 1) d;
  IF n > 0 THEN problems := problems || 'invoices_seq has duplicated years'; END IF;"""
    if check_tracking:
        body += f"""
  -- Migration tracking: each Phase 1 migration recorded exactly once.
  FOR k IN SELECT unnest({sql_list(TRACKED)}) LOOP
    SELECT count(*) INTO n FROM migrations WHERE name = k;
    IF n <> 1 THEN problems := problems || format('migrations table: %s recorded %s time(s)', k, n); END IF;
  END LOOP;"""
    return body

PRE_DO = wrap('precheck', PRE_BODY, 'PRECHECK PASSED', 'PRECHECK FAILED: nothing was changed')
VERIFY_IN_TX = wrap('verify_before_commit', post_body(False), 'CHANGES VERIFIED inside the transaction', 'VERIFICATION FAILED: the transaction will be rolled back')
VERIFY_DO = wrap('verify', post_body(True), 'VERIFY PASSED', 'VERIFY FAILED')

HEADER = """-- Generated by rehearsal/build_sql.py. Edit the generator, not this file.
-- Run only with psql, as described in 2026-11-18_phase1_render.md:
--   psql -X -v ON_ERROR_STOP=1 "<connection>" -f <this file>; echo "exit code: $?"
-- Exit code 0 = success. Anything else = stopped; read the message above it.
\\set ON_ERROR_STOP on
\\set ON_ERROR_ROLLBACK off
\\set QUIET on
\\pset pager off
"""

# ---------------------------------------------------------------------------------------------------------
PRECHECK = HEADER + """
-- PRE-CHECK. Read-only: runs in a READ ONLY transaction and is always rolled back. Changes nothing.
-- Stops (exit code 3) and lists every difference if the database is not exactly as reviewed on 18 Nov 2026.
BEGIN TRANSACTION READ ONLY;
""" + PRE_DO + """ROLLBACK;
\\echo 'PRECHECK PASSED: the database matches the review. Next: take the backup, then run the migration file.'
"""

CHANGES = """
-- 1. Account standing (admin suspend / restore / close) and the access check.
ALTER TABLE "user" ADD COLUMN suspended_at           timestamptz;
ALTER TABLE "user" ADD COLUMN standing_reason        text;
ALTER TABLE "user" ADD COLUMN standing_changed_at_ms bigint;
ALTER TABLE "user" ADD COLUMN standing_changed_by    bigint;

-- 2. Stripe entitlement. The GoCardless mandate check would reject every Stripe activation.
ALTER TABLE subscription ADD COLUMN paid_through_ms      bigint;
ALTER TABLE subscription ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE subscription ADD COLUMN stripe_customer_id   text;
ALTER TABLE subscription DROP CONSTRAINT subscription_active_requires_mandate;

-- 3. Webhook event processing (retries, ordering).
ALTER TABLE webhook_log ADD COLUMN attempts         integer NOT NULL DEFAULT 0;
ALTER TABLE webhook_log ADD COLUMN last_error       text;
ALTER TABLE webhook_log ADD COLUMN processed_at_ms  bigint;
ALTER TABLE webhook_log ADD COLUMN event_created_ms bigint;

-- 4. Provider-neutral payment columns. ADDED next to the GoCardless columns (not renamed), so the
--    previous release keeps working if the deploy is rolled back. The old columns are empty and
--    can be removed in a later, separate change.
ALTER TABLE invoices          ADD COLUMN provider_payment_id       text;
ALTER TABLE plan_status_event ADD COLUMN provider_event_id         text;
ALTER TABLE plan_status_event ADD COLUMN provider_event_type       text;
ALTER TABLE plan_status_event ADD COLUMN provider_event_created_at timestamptz;
CREATE UNIQUE INDEX idx_invoices_provider_payment_id ON invoices (provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- 5. One internal invoice per user and period; Stripe invoices are unique by their own id.
--    Built under a temporary name first, so the rule is never missing.
CREATE UNIQUE INDEX idx_invoices_user_period_unique_new ON invoices (user_id, period_start, period_end) WHERE stripe_invoice_id IS NULL;
DROP INDEX idx_invoices_user_period_unique;
ALTER INDEX idx_invoices_user_period_unique_new RENAME TO idx_invoices_user_period_unique;

-- 6. Invoice numbering uses ON CONFLICT (year), which needs a UNIQUE rule. Render has a plain index of the
--    same name; the unique one is built first under a temporary name, then takes over the name.
CREATE UNIQUE INDEX idx_invoices_seq_year_new ON invoices_seq (year);
DROP INDEX idx_invoices_seq_year;
ALTER INDEX idx_invoices_seq_year_new RENAME TO idx_invoices_seq_year;

-- 7. In-app notifications: meta, read_at and millisecond created_at (what both releases write).
ALTER TABLE notification ADD COLUMN meta    text;
ALTER TABLE notification ADD COLUMN read_at bigint;
ALTER TABLE notification ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE notification ALTER COLUMN created_at TYPE bigint USING (EXTRACT(EPOCH FROM created_at) * 1000)::bigint;
UPDATE notification SET created_at = (EXTRACT(EPOCH FROM now()) * 1000)::bigint WHERE created_at IS NULL;
ALTER TABLE notification ALTER COLUMN created_at SET NOT NULL;
UPDATE notification SET read = false WHERE read IS NULL;
ALTER TABLE notification ALTER COLUMN read SET NOT NULL;
CREATE INDEX idx_notification_user_created ON notification (user_id, created_at DESC);
CREATE INDEX idx_notification_user_unread ON notification (user_id) WHERE read_at IS NULL;

-- 8. New tables.
CREATE TABLE login_throttle (
  key              text    PRIMARY KEY,
  failures         integer NOT NULL DEFAULT 0,
  first_failure_at bigint  NOT NULL,
  locked_until     bigint
);
CREATE INDEX idx_login_throttle_first_failure_at ON login_throttle (first_failure_at);

CREATE TABLE mail_audit (
  id          bigserial PRIMARY KEY,
  item_id     bigint NOT NULL,
  user_id     bigint,
  action      text NOT NULL,
  before_json text,
  after_json  text,
  created_at  bigint NOT NULL
);
CREATE INDEX idx_mail_audit_item_created ON mail_audit (item_id, created_at DESC);

CREATE TABLE forward_audit (
  id           serial PRIMARY KEY,
  mail_item_id integer NOT NULL,
  user_id      integer NOT NULL,
  result       text NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fwd_audit_mail_created ON forward_audit (mail_item_id, created_at DESC);

CREATE TABLE verification_event (
  id           bigserial PRIMARY KEY,
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'business_owner')),
  subject_id   bigint NOT NULL,
  event_type   text NOT NULL,
  payload_json jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_event_created_at ON verification_event (created_at);
CREATE INDEX idx_verification_event_subject    ON verification_event (subject_type, subject_id);

-- 9. Data: every customer needs a primary business. Insert only.
INSERT INTO business (user_id, company_name, companies_house_number, status, is_primary, monthly_price_pence, created_at, updated_at)
SELECT u.id,
       COALESCE(NULLIF(TRIM(u.company_name), ''), NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
       NULLIF(TRIM(u.company_number), ''), 'active', true, 999,
       (EXTRACT(EPOCH FROM now()) * 1000)::bigint, (EXTRACT(EPOCH FROM now()) * 1000)::bigint
FROM "user" u
WHERE COALESCE(u.is_admin, false) = false AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM business b WHERE b.user_id = u.id);
"""

TRACKING = f"""
-- 10. Record the migrations whose changes are now present (verified above; see the runbook for the mapping).
--     131, 132 and 133 are NOT recorded: Render's tracking table does not match the repository's history.
INSERT INTO migrations (name) SELECT unnest({sql_list(TRACKED)});
"""

MIGRATE = HEADER + f"""
-- MIGRATION. One transaction. Stops at the first error, and nothing is kept unless every check passes.
-- 1) re-runs the pre-check; 2) applies the change; 3) verifies it; 4) records it; 5) commits.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
""" + PRE_DO + CHANGES + VERIFY_IN_TX + TRACKING + """COMMIT;
\\echo 'MIGRATION COMMITTED. Next: run 2026-11-18_phase1_render_verify.sql and check its exit code is 0.'
"""

VERIFY = HEADER + """
-- VERIFY. Read-only. Run after the migration. Exit code 0 and "VERIFY PASSED" means the database is ready.
BEGIN TRANSACTION READ ONLY;
""" + VERIFY_DO + """ROLLBACK;
\\echo 'VERIFY PASSED: tables, columns, types, constraints, unique rules, indexes and tracking are as required.'
"""

ROLLBACK_CHECK = HEADER + """
-- APP ROLLBACK CHECK. Read-only; changes nothing.
-- The migration only adds and widens, so the previous release (b33b5ff8) runs on the migrated database
-- and an app rollback needs NO database change. Nothing here deletes data written after the deploy.
-- This report lists records the previous release would not interpret the same way.
BEGIN TRANSACTION READ ONLY;
\\echo 'Columns the previous release needs (all should be true):'
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'gocardless_payment_id')            AS invoices_gocardless_payment_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plan_status_event' AND column_name = 'gocardless_event_id')     AS plan_status_event_gocardless_cols,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'mandate_id')                  AS subscription_mandate_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'locked_until')                         AS user_locked_until;
\\echo 'Records written by Phase 1 that the previous release reads differently:'
SELECT
  (SELECT count(*) FROM "user" WHERE suspended_at IS NOT NULL OR status IN ('suspended', 'closed'))        AS suspended_or_closed_accounts,
  (SELECT count(*) FROM subscription WHERE status = 'active' AND mandate_id IS NULL)                       AS stripe_only_active_subscriptions,
  (SELECT count(*) FROM subscription WHERE status = 'past_due' OR cancel_at_period_end)                     AS past_due_or_ending_subscriptions,
  (SELECT count(*) FROM invoices WHERE provider_payment_id IS NOT NULL OR stripe_invoice_id IS NOT NULL)   AS stripe_invoices,
  (SELECT count(*) FROM plan_status_event WHERE provider_event_id IS NOT NULL)                             AS provider_audit_rows,
  (SELECT count(*) FROM login_throttle WHERE locked_until > (EXTRACT(EPOCH FROM now()) * 1000)::bigint)    AS sign_in_locks_ignored_by_previous_release;
ROLLBACK;
"""

for name, text in [('2026-11-18_phase1_render_precheck.sql', PRECHECK), ('2026-11-18_phase1_render.sql', MIGRATE),
                   ('2026-11-18_phase1_render_verify.sql', VERIFY), ('2026-11-18_phase1_render_rollback_check.sql', ROLLBACK_CHECK)]:
    (OUT / name).write_text(text)
    print('wrote', name, '(post fingerprint included)' if POST and name != '2026-11-18_phase1_render_precheck.sql' else '')
