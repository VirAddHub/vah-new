#!/usr/bin/env node
/* scripts/reset-password.cjs */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const [, , email, newPass] = process.argv;
if (!email || !newPass) {
    console.error('Usage: node scripts/reset-password.cjs <email> <password>');
    process.exit(1);
}

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
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
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
`);

const hash = bcrypt.hashSync(newPass, 10);
const existing = db.prepare('SELECT id FROM user WHERE email = ?').get(email);

if (existing) {
    db.prepare('UPDATE user SET password_hash=?, updated_at=datetime("now") WHERE email=?')
        .run(hash, email);
    console.log(`🔑 Password updated for ${email}`);
} else {
    db.prepare('INSERT INTO user (email,password_hash,role,created_at) VALUES (?,?, "admin", datetime("now"))')
        .run(email, hash);
    console.log(`👤 User created + password set for ${email}`);
}
