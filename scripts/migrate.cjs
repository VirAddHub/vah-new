#!/usr/bin/env node
// scripts/migrate.cjs - Run database migrations
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || 
                process.env.DB_PATH || 
                process.env.SQLITE_PATH || 
                path.join(process.cwd(), 'data', 'app.db');

// Ensure directory exists
require('fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Import and run migrations
const { runMigrations, rollbackMigrations } = require('../lib/migrate.js');

const command = process.argv[2];

try {
  if (command === 'rollback') {
    const count = parseInt(process.argv[3]) || 1;
    console.log(`Rolling back ${count} migration(s)...`);
    rollbackMigrations(db, count);
  } else {
    console.log('Running migrations...');
    runMigrations(db);
  }
  
  console.log('✅ Migration completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
