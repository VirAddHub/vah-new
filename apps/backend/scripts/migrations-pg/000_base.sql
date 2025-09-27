-- scripts/migrations-pg/000_base.sql
-- Consolidated Postgres schema for Virtual Address Hub
-- Compatible with existing SQLite schema and server expectations

-- users table (matches server.js expectations - singular 'user')
CREATE TABLE IF NOT EXISTS "user" (
  id               bigserial PRIMARY KEY,
  email            text UNIQUE NOT NULL,
  name             text,
  password         text,
  first_name       text,
  last_name        text,
  is_admin         boolean NOT NULL DEFAULT false,
  role             text NOT NULL DEFAULT 'user',
  kyc_status       text DEFAULT 'pending',
  plan_status      text DEFAULT 'active',
  plan_start_date  bigint,
  onboarding_step  text DEFAULT 'signup',
  email_verified   boolean DEFAULT false,
  email_verified_at bigint,
  status           text DEFAULT 'active',
  login_attempts   integer DEFAULT 0,
  locked_until     bigint,
  created_at       bigint NOT NULL,
  updated_at       bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);

-- mail core
CREATE TABLE IF NOT EXISTS mail_item (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  subject          text,
  sender_name      text,
  received_date    text,
  scan_file_url    text,
  file_size        bigint DEFAULT 0,
  forwarded_physically boolean DEFAULT false,
  notes            text,
  forwarded_date   text,
  forward_reason   text,
  scanned          boolean DEFAULT false,
  deleted          boolean DEFAULT false,
  tag              text,
  is_billable_forward boolean DEFAULT false,
  admin_note       text,
  deleted_by_admin boolean DEFAULT false,
  action_log       text,
  scanned_at       bigint,
  status           text DEFAULT 'received',
  requested_at     bigint,
  physical_receipt_timestamp bigint,
  physical_dispatch_timestamp bigint,
  tracking_number  text,
  updated_at       bigint,
  created_at       bigint NOT NULL,
  idempotency_key  text UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_mail_item_user ON mail_item(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_item_user_status ON mail_item(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at);
CREATE INDEX IF NOT EXISTS idx_mail_item_tag ON mail_item(tag);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_item_idempotency_key ON mail_item(idempotency_key);

-- scan tokens (single-use scan links)
CREATE TABLE IF NOT EXISTS scan_tokens (
  id               bigserial PRIMARY KEY,
  token            text UNIQUE NOT NULL,
  mail_item_id     bigint NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
  issued_to        bigint REFERENCES "user"(id),
  expires_at       text NOT NULL,
  used             boolean NOT NULL DEFAULT false,
  created_at       text NOT NULL DEFAULT (now()::text)
);
CREATE INDEX IF NOT EXISTS idx_scan_tokens_item ON scan_tokens(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_scan_tokens_exp ON scan_tokens(expires_at);

-- admin logs
CREATE TABLE IF NOT EXISTS admin_log (
  id               bigserial PRIMARY KEY,
  created_at       bigint NOT NULL,
  admin_user_id    bigint NOT NULL REFERENCES "user"(id),
  action_type      text NOT NULL,
  target_type      text,
  target_id        bigint,
  details          text,
  ip_address       text
);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_user ON admin_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created_at ON admin_log(created_at);

-- mail events
CREATE TABLE IF NOT EXISTS mail_event (
  id               bigserial PRIMARY KEY,
  created_at       bigint NOT NULL,
  mail_item        bigint NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
  actor_user       bigint REFERENCES "user"(id),
  event_type       text NOT NULL,
  details          text
);
CREATE INDEX IF NOT EXISTS idx_mail_event_mail_item ON mail_event(mail_item);
CREATE INDEX IF NOT EXISTS idx_mail_event_created_at ON mail_event(created_at);

-- activity logs
CREATE TABLE IF NOT EXISTS activity_log (
  id               bigserial PRIMARY KEY,
  created_at       bigint NOT NULL,
  user_id          bigint REFERENCES "user"(id),
  action           text NOT NULL,
  details          text,
  mail_item_id     bigint REFERENCES mail_item(id),
  ip_address       text,
  user_agent       text
);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- audit logs (for compliance)
CREATE TABLE IF NOT EXISTS audit_log (
  id               bigserial PRIMARY KEY,
  entity           text NOT NULL,
  entity_id        text,
  action           text NOT NULL,
  meta             jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- invoices / billing
CREATE TABLE IF NOT EXISTS invoice (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  invoice_number   text NOT NULL UNIQUE,
  amount_pence     bigint NOT NULL,
  period_start     text NOT NULL,
  period_end       text NOT NULL,
  pdf_path         text NOT NULL,
  status           text DEFAULT 'paid',
  created_at       bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoice_user ON invoice(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_created ON invoice(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoice(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_token (
  id               bigserial PRIMARY KEY,
  invoice_id       bigint NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  token            text UNIQUE NOT NULL,
  expires_at       text NOT NULL,
  used_at          text,
  created_at       bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoice_token_invoice ON invoice_token(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_token_expires ON invoice_token(expires_at);
CREATE INDEX IF NOT EXISTS idx_invoice_token_token ON invoice_token(token);

CREATE TABLE IF NOT EXISTS invoice_seq (
  id               bigserial PRIMARY KEY,
  year             bigint NOT NULL,
  sequence         bigint NOT NULL DEFAULT 0,
  created_at       bigint NOT NULL,
  updated_at       bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_seq_year ON invoice_seq(year);

-- plans / pricing
CREATE TABLE IF NOT EXISTS plans (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  description      text,
  price_pence      bigint NOT NULL CHECK(price_pence >= 0),
  interval         text NOT NULL CHECK(interval IN ('month','year')),
  currency         text NOT NULL DEFAULT 'GBP',
  features_json    text NOT NULL DEFAULT '[]',
  active           boolean NOT NULL DEFAULT false,
  vat_inclusive    boolean NOT NULL DEFAULT true,
  trial_days       bigint NOT NULL DEFAULT 0,
  sort             bigint NOT NULL DEFAULT 0,
  effective_at     text,
  retired_at       text,
  created_at       text NOT NULL DEFAULT (now()::text),
  updated_at       text NOT NULL DEFAULT (now()::text)
);
CREATE TABLE IF NOT EXISTS plan_price_history (
  id               bigserial PRIMARY KEY,
  plan_id          bigint NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  price_pence      bigint NOT NULL,
  currency         text NOT NULL DEFAULT 'GBP',
  effective_at     text NOT NULL DEFAULT (now()::text),
  note             text
);
CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON plans(active, sort, price_pence);

-- webhook logs
CREATE TABLE IF NOT EXISTS webhook_log (
  id               bigserial PRIMARY KEY,
  source           text,
  event_type       text,
  payload_json     text,
  created_at       bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_log(created_at);

-- password reset tokens
CREATE TABLE IF NOT EXISTS password_reset (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token            text UNIQUE NOT NULL,
  created_at       bigint NOT NULL,
  used_at          bigint
);

-- helpful search indexes (FTS-free)
CREATE INDEX IF NOT EXISTS idx_mail_items_subject ON mail_item(subject);
CREATE INDEX IF NOT EXISTS idx_mail_items_sender ON mail_item(sender_name);
CREATE INDEX IF NOT EXISTS idx_mail_items_received ON mail_item(received_date);
CREATE INDEX IF NOT EXISTS idx_mail_items_created ON mail_item(created_at);
