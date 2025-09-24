-- PostgreSQL Schema Creation Script for Virtual Address Hub
-- This script creates the complete database schema for the application
-- Run this script to set up your PostgreSQL database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Users table (matches server.js expectations - singular 'user')
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
  updated_at       bigint NOT NULL,
  -- Additional fields from original schema
  forwarding_address text,
  one_drive_folder_url text,
  kyc_updated_at   bigint,
  company_name     text,
  companies_house_number text,
  sumsub_applicant_id text,
  sumsub_review_status text,
  sumsub_last_updated bigint,
  sumsub_rejection_reason text,
  sumsub_webhook_payload text
);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_status ON "user"(status);
CREATE INDEX IF NOT EXISTS idx_user_kyc_status ON "user"(kyc_status);
CREATE INDEX IF NOT EXISTS idx_user_plan_status ON "user"(plan_status);

-- ============================================================================
-- MAIL MANAGEMENT
-- ============================================================================

-- Mail items table
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

-- Mail item indexes
CREATE INDEX IF NOT EXISTS idx_mail_item_user ON mail_item(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_item_user_status ON mail_item(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at);
CREATE INDEX IF NOT EXISTS idx_mail_item_tag ON mail_item(tag);
CREATE INDEX IF NOT EXISTS idx_mail_item_status ON mail_item(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_item_idempotency_key ON mail_item(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_mail_items_subject ON mail_item(subject);
CREATE INDEX IF NOT EXISTS idx_mail_items_sender ON mail_item(sender_name);
CREATE INDEX IF NOT EXISTS idx_mail_items_received ON mail_item(received_date);
CREATE INDEX IF NOT EXISTS idx_mail_items_created ON mail_item(created_at);

-- Scan tokens (single-use scan links)
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
CREATE INDEX IF NOT EXISTS idx_scan_tokens_token ON scan_tokens(token);

-- Mail events
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
CREATE INDEX IF NOT EXISTS idx_mail_event_actor ON mail_event(actor_user);

-- ============================================================================
-- ADDRESS MANAGEMENT
-- ============================================================================

-- Physical locations
CREATE TABLE IF NOT EXISTS location (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL,
  line1      text NOT NULL,
  line2      text,
  city       text NOT NULL,
  postcode   text NOT NULL,
  country    text NOT NULL DEFAULT 'United Kingdom',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Address slots (individual mailboxes)
CREATE TABLE IF NOT EXISTS address_slot (
  id             bigserial PRIMARY KEY,
  location_id    bigint NOT NULL REFERENCES location(id) ON DELETE RESTRICT,
  mailbox_no     text NOT NULL,       -- e.g. "Suite 021"
  status         text NOT NULL DEFAULT 'available', -- available|reserved|assigned
  assigned_to    bigint,              -- users.id (nullable until assigned)
  assigned_at    timestamptz,
  reserved_until timestamptz,         -- optional for future reservations
  created_at     timestamptz NOT NULL DEFAULT NOW()
);

-- Address slot indexes
CREATE INDEX IF NOT EXISTS address_slot_available_idx
  ON address_slot (status, location_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS user_active_address_unique
  ON address_slot (assigned_to)
  WHERE status = 'assigned';

-- ============================================================================
-- BILLING & INVOICING
-- ============================================================================

-- Invoices
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
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status);

-- Invoice tokens (for secure access)
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

-- Invoice sequence (for generating invoice numbers)
CREATE TABLE IF NOT EXISTS invoice_seq (
  id               bigserial PRIMARY KEY,
  year             bigint NOT NULL,
  sequence         bigint NOT NULL DEFAULT 0,
  created_at       bigint NOT NULL,
  updated_at       bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_seq_year ON invoice_seq(year);

-- Subscription plans
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

CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON plans(active, sort, price_pence);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- Plan price history
CREATE TABLE IF NOT EXISTS plan_price_history (
  id               bigserial PRIMARY KEY,
  plan_id          bigint NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  price_pence      bigint NOT NULL,
  currency         text NOT NULL DEFAULT 'GBP',
  effective_at     text NOT NULL DEFAULT (now()::text),
  note             text
);

CREATE INDEX IF NOT EXISTS idx_plan_price_history_plan ON plan_price_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_price_history_effective ON plan_price_history(effective_at);

-- Payment records
CREATE TABLE IF NOT EXISTS payment (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  gocardless_customer_id TEXT,
  subscription_id TEXT,
  status TEXT,
  invoice_url TEXT,
  mandate_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_user ON payment(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(status);

-- Forwarding requests
CREATE TABLE IF NOT EXISTS forwarding_request (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  "user" INT REFERENCES "user"(id) ON DELETE CASCADE,
  mail_item INT REFERENCES mail_item(id) ON DELETE CASCADE,
  requested_at BIGINT,
  status TEXT,
  payment INT REFERENCES payment(id) ON DELETE SET NULL,
  is_billable BOOLEAN,
  billed_at BIGINT,
  destination_name TEXT,
  destination_address TEXT,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_forwarding_req_user ON forwarding_request("user");
CREATE INDEX IF NOT EXISTS idx_forwarding_req_status ON forwarding_request(status);

-- ============================================================================
-- LOGGING & AUDIT
-- ============================================================================

-- Admin logs
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
CREATE INDEX IF NOT EXISTS idx_admin_log_action_type ON admin_log(action_type);

-- Activity logs
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
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- Audit logs (for compliance)
CREATE TABLE IF NOT EXISTS audit_log (
  id               bigserial PRIMARY KEY,
  entity           text NOT NULL,
  entity_id        text,
  action           text NOT NULL,
  meta             jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_log (
  id               bigserial PRIMARY KEY,
  source           text,
  event_type       text,
  payload_json     text,
  created_at       bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_log(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_source ON webhook_log(source);
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON webhook_log(event_type);

-- ============================================================================
-- EXPORT & GDPR
-- ============================================================================

-- Export jobs (for GDPR exports)
CREATE TABLE IF NOT EXISTS export_job (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  finished_at     timestamptz,                      -- alias for completed_at
  status          text NOT NULL DEFAULT 'pending',  -- pending|running|done|failed
  type            text,                             -- 'gdpr_v1', etc.
  kind            text,                             -- alternative naming
  params          jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_path       text,
  file_size       bigint,
  error           text,                             -- error message
  error_message   text,                             -- alias for error
  user_id         bigint,                           -- for GDPR exports
  token           text,                             -- for download access
  expires_at      bigint                            -- for cleanup
);

CREATE INDEX IF NOT EXISTS export_job_status_idx ON export_job (status);
CREATE INDEX IF NOT EXISTS export_job_type_idx ON export_job (type);
CREATE INDEX IF NOT EXISTS export_job_kind_idx ON export_job (kind);
CREATE INDEX IF NOT EXISTS export_job_user_id_idx ON export_job (user_id);
CREATE INDEX IF NOT EXISTS export_job_token_idx ON export_job (token);
CREATE INDEX IF NOT EXISTS export_job_expires_at_idx ON export_job (expires_at);
CREATE INDEX IF NOT EXISTS export_job_status_type_idx ON export_job (status, type);

-- Add status check constraint
ALTER TABLE export_job
  ADD CONSTRAINT export_job_status_chk
  CHECK (status IN ('pending','running','done','failed'));

-- ============================================================================
-- AUTHENTICATION & SECURITY
-- ============================================================================

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset (
  id               bigserial PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token            text UNIQUE NOT NULL,
  created_at       bigint NOT NULL,
  used_at          bigint
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_created ON password_reset(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = EXTRACT(EPOCH FROM NOW())::bigint;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user table
CREATE TRIGGER update_user_updated_at 
    BEFORE UPDATE ON "user" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mail_item table
CREATE TRIGGER update_mail_item_updated_at 
    BEFORE UPDATE ON mail_item 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default plans
INSERT INTO plans (name, slug, description, price_pence, interval, currency, features_json, active, vat_inclusive, trial_days, sort) VALUES
('Basic', 'basic', 'Essential virtual address service', 999, 'month', 'GBP', '["Virtual address", "Mail scanning", "Email notifications"]', true, true, 7, 1),
('Professional', 'professional', 'Advanced features for professionals', 1999, 'month', 'GBP', '["Everything in Basic", "Priority scanning", "Physical forwarding", "Dedicated support"]', true, true, 14, 2),
('Business', 'business', 'Complete solution for businesses', 4999, 'month', 'GBP', '["Everything in Professional", "Multiple addresses", "API access", "Custom branding"]', true, true, 30, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- GRANTS & PERMISSIONS
-- ============================================================================

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL schema created successfully!';
    RAISE NOTICE 'Tables created: user, mail_item, scan_tokens, mail_event, location, address_slot, invoice, invoice_token, invoice_seq, plans, plan_price_history, payment, forwarding_request, admin_log, activity_log, audit_log, webhook_log, export_job, password_reset';
    RAISE NOTICE 'Default plans inserted: Basic, Professional, Business';
    RAISE NOTICE 'Schema is ready for use!';
END $$;
