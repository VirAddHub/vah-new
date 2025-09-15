#!/usr/bin/env node
// Usage:
//   node scripts/reset-password.cjs admin@virtualaddresshub.co.uk NewPass123!
// Requires: better-sqlite3, bcryptjs (no native build needed)

const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

// Resolve DB exactly like server/db.js now does
const ROOT = path.resolve(__dirname, '..');
const configured = process.env.SQLITE_PATH; // optional
const sqlitePath = configured
    ? (path.isAbsolute(configured) ? configured : path.join(ROOT, configured))
    : path.join(ROOT, 'data', 'app.db'); // <- your canonical path

const [, , emailArg, passArg] = process.argv;
const email = (emailArg || '').trim().toLowerCase();
const password = passArg || 'Admin123!';

if (!email) {
    console.error('Usage: node scripts/reset-password.cjs <email> [newPassword]');
    process.exit(1);
}

const db = new Database(sqlitePath);
const user = db.prepare('SELECT id, email FROM user WHERE lower(email)=?').get(email);
if (!user) {
    console.error('No such user:', email, 'in', sqlitePath);
    process.exit(2);
}

const hash = bcrypt.hashSync(password, 10);
db.prepare('UPDATE user SET password_hash = ? WHERE id = ?').run(hash, user.id);
console.log(`✅ Updated password for ${user.email} in ${sqlitePath}`);
