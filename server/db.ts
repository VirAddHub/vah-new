import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Resolve project root relative to this file location.
// Works for source (server/*) and compiled (dist/server/*).
const ROOT = path.resolve(__dirname, '..', '..');

// Allow override via SQLITE_PATH; resolve relative to project root if not absolute.
const configured = process.env.SQLITE_PATH;
const DB_PATH = configured
    ? (path.isAbsolute(configured) ? configured : path.join(ROOT, configured))
    : path.join(ROOT, 'data', 'app.db');

// Ensure the directory exists before creating the database
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Helpful log once at boot (can remove later)
if (process.env.DEBUG_DB || process.env.DEBUG_AUTH) {
    console.log('[db] using SQLite file:', DB_PATH);
}

const instance = new Database(DB_PATH, { fileMustExist: false });

// Safety PRAGMAS
instance.pragma("journal_mode = WAL");
instance.pragma("synchronous = NORMAL");
instance.pragma("foreign_keys = ON");
instance.pragma("busy_timeout = 5000"); // back off if another writer is busy

// ✅ Export in a way that supports BOTH styles safely:
//
//   const { db } = require('../db')   // preferred
//   const db = require('../db').db    // also ok
//   const db = require('../db')       // ALSO ok (default points to the same instance)

export const db = instance;
export default instance;