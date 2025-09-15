#!/usr/bin/env node
/* scripts/seed.cjs */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  first_name TEXT,
  last_name TEXT,
  session_token TEXT,
  session_created_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  amount_pence INTEGER NOT NULL,
  price_pence INTEGER, -- older dumps used this; we'll keep both
  currency TEXT DEFAULT 'GBP',
  "interval" TEXT DEFAULT 'month',
  slug TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_user_session_token ON user(session_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
`);

const mkSlug = (name) => (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const upsertPlan = db.prepare(`
INSERT INTO plans (id,name,description,amount_pence,price_pence,currency,"interval",slug)
VALUES (@id,@name,@description,@amount_pence,@price_pence,@currency,@interval,@slug)
ON CONFLICT(id) DO UPDATE SET
 name=excluded.name,
 description=COALESCE(excluded.description,plans.description),
 amount_pence=excluded.amount_pence,
 price_pence=excluded.price_pence,
 currency=excluded.currency,
 "interval"=excluded."interval",
 slug=COALESCE(excluded.slug,plans.slug)
`);
[
  { id: 1, name: 'Basic',        description: 'Virtual address basic', amount_pence:  999, price_pence:  999, currency:'GBP', interval:'month' },
  { id: 2, name: 'Professional', description: 'For growing teams',     amount_pence: 1999, price_pence: 1999, currency:'GBP', interval:'month' },
  { id: 3, name: 'Business',     description: 'High volume',           amount_pence: 4999, price_pence: 4999, currency:'GBP', interval:'month' },
].forEach(p => upsertPlan.run({ ...p, slug: mkSlug(p.name) }));

const adminEmail = process.env.ADMIN_EMAIL || 'admin@virtualaddresshub.co.uk';
const adminPass  = process.env.ADMIN_PASSWORD || 'Admin123!';

const row = db.prepare('SELECT id FROM user WHERE email = ?').get(adminEmail);
const hash = bcrypt.hashSync(adminPass, 10);

if (!row) {
  db.prepare(`
    INSERT INTO user (email,password_hash,role,first_name,last_name,created_at)
    VALUES (?,?,?,?,?,datetime('now'))
  `).run(adminEmail, hash, 'admin', 'Admin', 'User');
  console.log(`👤 Created admin user: ${adminEmail}`);
} else {
  db.prepare('UPDATE user SET password_hash=?, role="admin", updated_at=datetime("now") WHERE email=?')
    .run(hash, adminEmail);
  console.log(`🔑 Updated admin password: ${adminEmail}`);
}

console.log(`✅ Seed complete → ${DB_PATH}`);