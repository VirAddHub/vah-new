-- PostgreSQL Schema for Virtual Address Hub
-- Compatible with existing SQLite schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mail items table
CREATE TABLE IF NOT EXISTS mail_item (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  sender_name TEXT,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  scan_file_url TEXT,
  file_size INTEGER,
  storage_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  idempotency_key TEXT UNIQUE,
  notes TEXT
);

-- Scan tokens table (single-use, 15-min expiry)
CREATE TABLE IF NOT EXISTS scan_tokens (
  token TEXT PRIMARY KEY,
  mail_item_id INTEGER NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
  issued_to INTEGER REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin log table
CREATE TABLE IF NOT EXISTS admin_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT
);

-- Mail event table
CREATE TABLE IF NOT EXISTS mail_event (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mail_item INTEGER NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
  actor_user INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,
  details TEXT
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  mail_item_id INTEGER REFERENCES mail_item(id),
  ip_address TEXT,
  user_agent TEXT
);

-- === pricing plans (PostgreSQL) ===
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_pence INTEGER NOT NULL CHECK(price_pence>=0),
  interval TEXT NOT NULL CHECK(interval IN ('month','year')),
  currency TEXT NOT NULL DEFAULT 'GBP',
  features_json TEXT NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  vat_inclusive BOOLEAN NOT NULL DEFAULT TRUE,
  trial_days INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  effective_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plan_price_history (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  price_pence INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON plans(active, sort, price_pence);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mail_item_user_id ON mail_item(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_item_status ON mail_item(status);
CREATE INDEX IF NOT EXISTS idx_mail_item_received_date ON mail_item(received_date);
CREATE INDEX IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at);
CREATE INDEX IF NOT EXISTS idx_mail_item_idempotency_key ON mail_item(idempotency_key);

-- Search indexes (FTS-free)
CREATE INDEX IF NOT EXISTS idx_mail_items_subject ON mail_item(subject);
CREATE INDEX IF NOT EXISTS idx_mail_items_sender ON mail_item(sender_name);
CREATE INDEX IF NOT EXISTS idx_mail_items_received ON mail_item(received_date);
CREATE INDEX IF NOT EXISTS idx_mail_items_created ON mail_item(created_at);

-- Scan token indexes
CREATE INDEX IF NOT EXISTS idx_scan_tokens_item ON scan_tokens(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_scan_tokens_exp ON scan_tokens(expires_at);

-- Admin log indexes
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_user ON admin_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created_at ON admin_log(created_at);

-- Mail event indexes
CREATE INDEX IF NOT EXISTS idx_mail_event_mail_item ON mail_event(mail_item);
CREATE INDEX IF NOT EXISTS idx_mail_event_created_at ON mail_event(created_at);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
