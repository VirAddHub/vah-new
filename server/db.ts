import Database from 'better-sqlite3';
import { resolveDbPath } from './dbPath';

// ...

const dbFile = resolveDbPath(process.env.DATABASE_URL);
console.info('info: Using SQLite database file', {
    service: 'vah-backend',
    path: dbFile,
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
});

const instance = new Database(dbFile, { fileMustExist: false });

// Make SQLite more resilient
try {
  instance.pragma('busy_timeout = 5000');     // wait up to 5s on lock
  instance.pragma('journal_mode = WAL');      // robust journaling for concurrent readers
  instance.pragma('synchronous = NORMAL');    // good balance for WAL
} catch (e) {
  // non-fatal; just log
  console.warn('SQLite PRAGMAs failed to apply:', e);
}

// OPTIONAL: disable any "runtime migration" logic here.
// If you have code that scans and "applies" JS migrations at boot, remove/guard it:
// if (process.env.RUNTIME_MIGRATIONS === 'on') { ... }  // default should be off.

// Hard guard: if core tables are missing, guide the operator to prepare the DB
const rows = instance.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
const names = new Set(rows.map(r => r.name));
const missing: string[] = [];
for (const t of ['user', 'mail_item', 'admin_log', 'mail_event', 'activity_log']) {
    if (!names.has(t) && !names.has(t + 's')) missing.push(t);
}
if (missing.length) {
    console.error('❌ DB schema missing tables:', missing);
    console.error('Run: npm run db:init');
    process.exit(1);
}

// ✅ Export in a way that supports BOTH styles safely:
//
//   const { db } = require('../db')   // preferred
//   const db = require('../db').db    // also ok
//   const db = require('../db')       // ALSO ok (default points to the same instance)

export const db = instance;
export default instance;