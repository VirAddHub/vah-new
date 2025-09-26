#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_FILE || path.join(process.cwd(), 'data', 'app.db');
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function columnExists(table, col) {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.some(r => r.name === col);
}

db.transaction(() => {
    if (!columnExists('user', 'kyc_status')) {
        db.prepare(`ALTER TABLE user ADD COLUMN kyc_status TEXT NOT NULL DEFAULT 'approved'`).run();
    }
    db.prepare(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      category TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
})();

console.log('✅ db-migrate-kyc: ensured users.kyc_status + support_tickets table.');
