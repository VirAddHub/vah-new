#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS invoice_seq (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    last_seq INTEGER NOT NULL,
    UNIQUE(year)
  );
  ALTER TABLE invoice ADD COLUMN invoice_number TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number ON invoice(invoice_number);
`);

function ensureYear(year) {
    const row = db.prepare(`SELECT * FROM invoice_seq WHERE year = ?`).get(year);
    if (!row) db.prepare(`INSERT INTO invoice_seq(year,last_seq) VALUES (?,0)`).run(year);
}

function pad(n, width = 6) {
    return String(n).padStart(width, '0');
}
function buildNumber(year, seq) {
    return `VAH-${year}-${pad(seq)}`;
}

const invoices = db.prepare(`SELECT id, created_at, invoice_number FROM invoice ORDER BY id`).all();
const nowYear = new Date().getFullYear();
ensureYear(nowYear);

let updated = 0;
const getYear = ms => new Date(ms || Date.now()).getFullYear();

for (const inv of invoices) {
    if (inv.invoice_number) continue;
    const y = getYear(inv.created_at);
    ensureYear(y);
    const row = db.prepare(`SELECT last_seq FROM invoice_seq WHERE year = ?`).get(y);
    const next = row.last_seq + 1;
    const number = buildNumber(y, next);
    const tx = db.transaction(() => {
        db.prepare(`UPDATE invoice SET invoice_number = ? WHERE id = ?`).run(number, inv.id);
        db.prepare(`UPDATE invoice_seq SET last_seq = ? WHERE year = ?`).run(next, y);
    });
    tx();
    updated++;
}

console.log(`Added invoice_number to ${updated} invoices.`);
