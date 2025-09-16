/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { resolveDbPath } = require('./lib/db-path.cjs');

console.log('Running SQLite migrations...');

const dbPath = resolveDbPath();
console.log('[migrate] db:', dbPath);

const db = new Database(dbPath);

// First, apply the base schema
const baseSchemaPath = path.join(__dirname, 'db-schema.sql');
if (fs.existsSync(baseSchemaPath)) {
  console.log('[migrate] applying base schema...');
  const baseSchema = fs.readFileSync(baseSchemaPath, 'utf8');
  db.exec(baseSchema);
  console.log('[migrate] base schema applied');
  
  // Debug: show what tables were created
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
  console.log('[migrate] tables created:', tables.map(t => t.name));
}

// Then load *.sql from migrations in lexical order (001_, 002_, ...)
const migrationsDir = path.join(__dirname, '..', 'migrations');
let files = [];
if (fs.existsSync(migrationsDir)) {
  files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  console.log(`[migrate] found ${files.length} migration files in ${migrationsDir}`);
} else {
  console.log(`[migrate] migrations directory not found: ${migrationsDir}`);
}

let maxVersion = 0;
db.exec('BEGIN');
try {
  for (const file of files) {
    const version = parseInt(file.match(/^\d+/)?.[0] || '0', 10);
    const name = file.replace(/\.sql$/, '');
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    console.log('[migrate] applied:', name);
    if (version > maxVersion) maxVersion = version;
  }
  // record a monotonic version marker so seed can verify (optional)
  db.pragma(`user_version = ${maxVersion}`);
  db.exec('COMMIT');
  console.log('[migrate] done');
  
  // Debug: show final table list
  const finalTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
  console.log('[migrate] final tables:', finalTables.map(t => t.name));
  
  console.log('✅ Migration completed successfully');
} catch (err) {
  db.exec('ROLLBACK');
  if (err instanceof Error) {
    console.error('Migration error:', err.message);
    console.error(err.stack);
  } else {
    console.error('Migration error (non-Error):', err);
  }
  process.exit(1);
}