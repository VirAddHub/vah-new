/* scripts/migrate-sqlite.cjs */
const path = require('path');
const Database = require('better-sqlite3');
const { resolveDataDir } = require('../server/storage-paths');

const DATA_DIR = resolveDataDir();
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_FILE, { fileMustExist: false });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Simple migrations table
db.prepare(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

function has(name) { return !!db.prepare(`SELECT 1 FROM _migrations WHERE name=?`).get(name); }
function apply(name, sql) {
  if (has(name)) return;
  const trx = db.transaction(() => {
    db.exec(sql);
    db.prepare(`INSERT INTO _migrations (name) VALUES (?)`).run(name);
  });
  trx();
  console.log(`[migrate] applied: ${name}`);
}

// --- Minimal core schema (idempotent) ---
// Users table (name as singular 'user' to match server expectations)
apply('001_user', `
  CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    kyc_status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON user(email);
`);

// Mail items
apply('002_mail_items', `
  CREATE TABLE IF NOT EXISTS mail_item (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    received_date TEXT NOT NULL,
    sender_name TEXT,
    sender_address TEXT,
    subject TEXT,
    status TEXT DEFAULT 'received',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_mail_item_user ON mail_item(user_id);
  CREATE INDEX IF NOT EXISTS idx_mail_item_received ON mail_item(received_date);
`);

// Admin logs
apply('003_admin_logs', `
  CREATE TABLE IF NOT EXISTS admin_log (
    id INTEGER PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON admin_log(admin_id);
  CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_log(created_at);
`);

// Mail events
apply('004_mail_events', `
  CREATE TABLE IF NOT EXISTS mail_event (
    id INTEGER PRIMARY KEY,
    mail_item_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mail_item_id) REFERENCES mail_item(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_mail_event_mail_item ON mail_event(mail_item_id);
  CREATE INDEX IF NOT EXISTS idx_mail_event_created ON mail_event(created_at);
`);

// Activity logs
apply('005_activity_logs', `
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);
`);

// Invoices
apply('010_invoices', `
  CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount_pence INTEGER NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    status TEXT DEFAULT 'paid',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_invoice_user ON invoice(user_id);
  CREATE INDEX IF NOT EXISTS idx_invoice_created ON invoice(created_at);
  CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoice(invoice_number);
`);

// One-time tokens
apply('011_invoice_token', `
  CREATE TABLE IF NOT EXISTS invoice_token (
    id INTEGER PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_invoice_token_invoice ON invoice_token(invoice_id);
  CREATE INDEX IF NOT EXISTS idx_invoice_token_expires ON invoice_token(expires_at);
  CREATE INDEX IF NOT EXISTS idx_invoice_token_token ON invoice_token(token);
`);

// Invoice sequence for numbering
apply('012_invoice_sequence', `
  CREATE TABLE IF NOT EXISTS invoice_seq (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_seq_year ON invoice_seq(year);
`);

// Webhook log (optional but useful)
apply('013_webhook_log', `
  CREATE TABLE IF NOT EXISTS webhook_log (
    id INTEGER PRIMARY KEY,
    source TEXT,
    event_type TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_webhook_created ON webhook_log(created_at);
`);

// Plans table (updated with proper structure)
apply('014_plans', `
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price_pence INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
  CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(active);
`);

console.log('[migrate] done');
db.close();
