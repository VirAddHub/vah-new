/* eslint-disable no-console */
const Database = require('better-sqlite3');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { resolveDbPath } = require('./lib/db-path.cjs');

function usage() {
  console.log('Usage: node scripts/reset-password.cjs <email> <newPassword>');
  console.log('Or set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables');
  process.exit(1);
}

const [, , email, newPassword] = process.argv;
const finalEmail = email || process.env.TEST_ADMIN_EMAIL;
const finalPassword = newPassword || process.env.TEST_ADMIN_PASSWORD;

if (!finalEmail || !finalPassword) usage();

const dbPath = resolveDbPath();
console.log('[reset-password] db:', dbPath);

const db = new Database(dbPath);

// --- helpers ---
function hasColumn(table, col) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
    return cols.includes(col);
}

function ensureColumn(table, colDef) {
    const [col] = colDef.split(/\s+/);
    if (!hasColumn(table, col)) {
        console.log(`[reset-password] adding missing column ${table}.${col} ...`);
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
    }
}

// --- ensure required columns exist (safe, idempotent) ---
db.exec('BEGIN');
try {
    ensureColumn('user', 'password_hash TEXT');
    ensureColumn('user', 'session_token TEXT');
    ensureColumn('user', 'session_created_at INTEGER');
    db.exec('COMMIT');
} catch (err) {
    db.exec('ROLLBACK');
    console.error('Schema check/add failed:', err instanceof Error ? err.message : err);
    process.exit(1);
}

// --- upsert user ---
const nowMs = Date.now();
const sessionToken = crypto.randomBytes(32).toString('hex');
const passwordHash = bcrypt.hashSync(finalPassword, 10);

// try fetch existing user
        const existing = db.prepare('SELECT * FROM user WHERE email = ?').get(finalEmail);

db.exec('BEGIN');
try {
    if (!existing) {
        console.log('[reset-password] user not found, creating admin user...');
        db.prepare(`
          INSERT INTO user (email, password_hash, is_admin, created_at, updated_at, session_token, session_created_at)
          VALUES (?, ?, 1, ?, ?, ?, ?)
        `).run(finalEmail, passwordHash, nowMs, nowMs, sessionToken, nowMs);
    } else {
        db.prepare(`
      UPDATE user
      SET password_hash = ?, session_token = ?, session_created_at = ?, updated_at = ?
      WHERE email = ?
    `).run(passwordHash, sessionToken, nowMs, nowMs, finalEmail);
    }
    db.exec('COMMIT');
} catch (err) {
    db.exec('ROLLBACK');
    console.error('Upsert failed:', err instanceof Error ? err.message : err);
    process.exit(1);
}

// verify and print
const user = db.prepare('SELECT id, email, is_admin, session_token, session_created_at FROM user WHERE email = ?').get(finalEmail);
console.log('✅ Password reset complete.');
console.log('   user:', { id: user.id, email: user.email, is_admin: !!user.is_admin });
console.log('   session_token:', user.session_token);
console.log('   session_created_at:', user.session_created_at);