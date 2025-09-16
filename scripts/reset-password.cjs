#!/usr/bin/env node
// scripts/reset-password.cjs
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH =
    process.env.DB_PATH ||
    process.env.SQLITE_PATH ||
    path.join(process.cwd(), 'data', 'app.db');

// Ensure folder exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-password.cjs <email> <newPassword>');
    process.exit(1);
}

const db = new Database(DB_PATH);
const isoNow = new Date().toISOString();

// Introspect columns to be schema-flexible
const cols = new Set(
    db.prepare(`PRAGMA table_info(user)`).all().map(r => r.name)
);

const hasPasswordHash = cols.has('password_hash');
const hasPassword = cols.has('password');        // legacy/alt column
const hasUpdatedAt = cols.has('updated_at');
const hasSessionToken = cols.has('session_token');
const hasSessionCreatedAt = cols.has('session_created_at');

// Add missing columns if they don't exist (schema drift protection)
if (!hasPasswordHash && !hasPassword) {
    console.log('Adding missing password_hash column...');
    db.exec("ALTER TABLE user ADD COLUMN password_hash TEXT");
    cols.add('password_hash');
}

if (!hasUpdatedAt) {
    console.log('Adding missing updated_at column...');
    db.exec("ALTER TABLE user ADD COLUMN updated_at TEXT");
    cols.add('updated_at');
}

if (!hasSessionToken) {
    console.log('Adding missing session_token column...');
    db.exec("ALTER TABLE user ADD COLUMN session_token TEXT");
    cols.add('session_token');
}

if (!hasSessionCreatedAt) {
    console.log('Adding missing session_created_at column...');
    db.exec("ALTER TABLE user ADD COLUMN session_created_at TEXT");
    cols.add('session_created_at');
}

// Make sure user exists
const existing = db.prepare(`SELECT id, email FROM user WHERE email = ? LIMIT 1`).get(email);
if (!existing) {
    console.error(`User not found: ${email}`);
    process.exit(1);
}

// Hash
const hash = bcrypt.hashSync(newPassword, 10);

// Build UPDATE statements safely (no now())
const tx = db.transaction(() => {
    // Use password_hash if available, otherwise fall back to password
    const passwordColumn = cols.has('password_hash') ? 'password_hash' : 'password';

    if (cols.has('updated_at')) {
        db.prepare(`UPDATE user SET ${passwordColumn} = ?, updated_at = ? WHERE email = ?`)
            .run(hash, isoNow, email);
    } else {
        db.prepare(`UPDATE user SET ${passwordColumn} = ? WHERE email = ?`)
            .run(hash, email);
    }

    // Clear any session (optional)
    if (cols.has('session_token')) {
        db.prepare(`UPDATE user SET session_token = NULL WHERE email = ?`).run(email);
    }
    if (cols.has('session_created_at')) {
        db.prepare(`UPDATE user SET session_created_at = NULL WHERE email = ?`).run(email);
    }
});

tx();

console.log(`✅ Password reset for ${email}`);
console.log(`DB: ${DB_PATH}`);