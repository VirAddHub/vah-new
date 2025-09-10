import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH = process.env.DATABASE_URL || process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");

export const db = new Database(DB_PATH, { fileMustExist: false });

// Safety PRAGMAs
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000"); // back off if another writer is busy

export default db;
