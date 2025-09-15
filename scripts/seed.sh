#!/usr/bin/env bash
set -euo pipefail

# Defaults for CI/local
: "${SQLITE_PATH:=./data/app.db}"

echo "🌱 Seeding database for testing..."
mkdir -p "$(dirname "$SQLITE_PATH")"

node - <<'NODE'
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = process.env.SQLITE_PATH || './data/app.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

function tableExists(name){ 
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}
function colExists(table, col){
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some(r => r.name === col);
}

db.pragma('journal_mode = WAL');
db.exec('BEGIN');

try {
  // --- Base tables (create if missing) ---
  if (!tableExists('user')) {
    db.exec(`
      CREATE TABLE user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        first_name TEXT,
        last_name TEXT,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )
    `);
  }

  if (!tableExists('plans')) {
    db.exec(`
      CREATE TABLE plans(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        currency TEXT DEFAULT 'GBP',
        interval TEXT DEFAULT 'month',
        amount_pence INTEGER,
        price_pence INTEGER
      )
    `);
  }

  // --- Columns added if missing ---
  if (!colExists('user','session_token')) {
    db.exec(`ALTER TABLE user ADD COLUMN session_token TEXT`);
  }
  if (!colExists('user','session_created_at')) {
    db.exec(`ALTER TABLE user ADD COLUMN session_created_at TEXT`);
  }
  if (!colExists('plans','slug')) {
    db.exec(`ALTER TABLE plans ADD COLUMN slug TEXT`);
  }

  // --- Useful indexes ---
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON user(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_session_token ON user(session_token)`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug)`);

  // --- Seed plans (idempotent) ---
  const ensurePlan = db.prepare(`
    INSERT INTO plans(name, description, currency, interval, amount_pence, price_pence, slug)
    VALUES (@name,@description,'GBP','month',@amt,@amt, lower(replace(@name,' ','-')))
    ON CONFLICT(slug) DO UPDATE SET
      description=excluded.description,
      amount_pence=excluded.amount_pence,
      price_pence=excluded.price_pence
  `);
  [
    { name: 'Basic',        description: 'Entry plan',      amt:  999 },
    { name: 'Professional', description: 'Pro features',    amt: 1999 },
    { name: 'Business',     description: 'All the things',  amt: 4999 },
  ].forEach(p => ensurePlan.run(p));

  // --- Admin user (idempotent) ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@virtualaddresshub.co.uk';
  const adminPass  = process.env.ADMIN_PASS  || 'Admin123!';
  const hash = bcrypt.hashSync(adminPass, 10);

  const existing = db.prepare(`SELECT id, role FROM user WHERE email=?`).get(adminEmail);
  if (!existing) {
    db.prepare(`
      INSERT INTO user(email,password_hash,role,first_name,last_name)
      VALUES (?,?,?,?,?)
    `).run(adminEmail, hash, 'admin', 'Admin', 'User');
  } else if (existing.role !== 'admin') {
    db.prepare(`UPDATE user SET role='admin' WHERE id=?`).run(existing.id);
  }

  db.exec('COMMIT');
  console.log(`✅ Seed complete → ${dbPath}`);
} catch (e) {
  db.exec('ROLLBACK');
  console.error('❌ Seed failed:', e);
  process.exit(1);
}
NODE
