PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

/* ---------- user (matches server.js expectations) ---------- */
CREATE TABLE IF NOT EXISTS user (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password      TEXT,
  first_name    TEXT,
  last_name     TEXT,
  is_admin      INTEGER DEFAULT 0,
  role          TEXT DEFAULT 'user',
  kyc_status    TEXT DEFAULT 'pending',
  plan_status   TEXT DEFAULT 'active',
  plan_start_date INTEGER,
  onboarding_step TEXT DEFAULT 'signup',
  email_verified INTEGER DEFAULT 0,
  email_verified_at INTEGER,
  status        TEXT DEFAULT 'active',
  login_attempts INTEGER DEFAULT 0,
  locked_until  INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

/* ---------- mail_item (matches server.js expectations) ---------- */
CREATE TABLE IF NOT EXISTS mail_item (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  subject          TEXT,
  sender_name      TEXT,
  received_date    TEXT,
  scan_file_url    TEXT,
  file_size        INTEGER DEFAULT 0,
  forwarded_physically INTEGER DEFAULT 0,
  notes            TEXT,
  forwarded_date   TEXT,
  forward_reason   TEXT,
  scanned          INTEGER DEFAULT 0,
  deleted          INTEGER DEFAULT 0,
  tag              TEXT,
  is_billable_forward INTEGER DEFAULT 0,
  admin_note       TEXT,
  deleted_by_admin INTEGER DEFAULT 0,
  action_log       TEXT,
  scanned_at       INTEGER,
  status           TEXT DEFAULT 'received',
  requested_at     INTEGER,
  physical_receipt_timestamp INTEGER,
  physical_dispatch_timestamp INTEGER,
  tracking_number  TEXT,
  updated_at       INTEGER,
  created_at       INTEGER NOT NULL,
  idempotency_key  TEXT UNIQUE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mail_item_user ON mail_item(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_item_user_status ON mail_item(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at);
CREATE INDEX IF NOT EXISTS idx_mail_item_tag ON mail_item(tag);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_item_idempotency_key ON mail_item(idempotency_key);

/* ---------- scan_tokens (single-use scan links) ---------- */
CREATE TABLE IF NOT EXISTS scan_tokens (
  token         TEXT PRIMARY KEY,
  mail_item_id  INTEGER NOT NULL,
  issued_to     INTEGER,                 -- nullable; bind if you want
  expires_at    TEXT NOT NULL,
  used          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (mail_item_id) REFERENCES mail_item(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_scan_tokens_item ON scan_tokens(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_scan_tokens_exp ON scan_tokens(expires_at);

/* ---------- admin_log (for admin actions) ---------- */
CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  admin_user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT
);

/* ---------- mail_event (for mail item events) ---------- */
CREATE TABLE IF NOT EXISTS mail_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  mail_item INTEGER NOT NULL,
  actor_user INTEGER,
  event_type TEXT NOT NULL,
  details TEXT,
  FOREIGN KEY(mail_item) REFERENCES mail_item(id) ON DELETE CASCADE
);

/* ---------- activity_log (for user activities) ---------- */
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  mail_item_id INTEGER,
  ip_address TEXT,
  user_agent TEXT
);

/* ---- mail_items search indexes (FTS-free) ---- */
CREATE INDEX IF NOT EXISTS idx_mail_items_subject   ON mail_item(subject);
CREATE INDEX IF NOT EXISTS idx_mail_items_sender    ON mail_item(sender_name);
CREATE INDEX IF NOT EXISTS idx_mail_items_received  ON mail_item(received_date);
CREATE INDEX IF NOT EXISTS idx_mail_items_created   ON mail_item(created_at);
