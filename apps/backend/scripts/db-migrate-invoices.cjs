#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), 'data', 'app.db');

console.log('Running invoice migration...');

try {
    const db = new Database(DB_FILE);

    // Create invoices table
    db.exec(`
    CREATE TABLE IF NOT EXISTS invoice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      number TEXT NOT NULL,                    -- e.g. VAH-2025-000123
      gocardless_payment_id TEXT,
      amount_pence INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GBP',
      period_start TEXT NOT NULL,              -- ISO date
      period_end   TEXT NOT NULL,              -- ISO date
      pdf_path TEXT NOT NULL,                  -- local path or OneDrive id
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Create unique index on invoice number
    db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number ON invoice(number);
  `);

    // Create index on user_id
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_invoice_user ON invoice(user_id);
  `);

    // Create invoice tokens table
    db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_token (
      token TEXT PRIMARY KEY,                  -- random string
      invoice_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME
    );
  `);

    // Create index on expires_at
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_invoice_token_expires ON invoice_token(expires_at);
  `);

    console.log('✅ Invoice tables created successfully');

    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('invoice', 'invoice_token')").all();
    console.log('Created tables:', tables.map(t => t.name));

    db.close();

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}
