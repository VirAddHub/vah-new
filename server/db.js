const Database = require("better-sqlite3");
const path = require("path");
const { resolveDataDir } = require('./storage-paths');

const DATA_DIR = resolveDataDir();
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_FILE, { fileMustExist: false });

// Safety PRAGMAS
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000"); // back off if another writer is busy

// Log resolved paths for debugging
console.log('[storage]', {
    DATA_DIR,
    DB_FILE,
    INVOICES_DIR: process.env.INVOICES_DIR || path.join(DATA_DIR, 'invoices')
});

module.exports = { db, DB_FILE, DATA_DIR };
module.exports.default = db;
