/* Runs scripts/db-schema.sql against SQLite.
 * Uses DATABASE_URL or defaults to ./data/app.db
 */
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "app.db");
const SQL_PATH = path.join(process.cwd(), "scripts", "db-schema.sql");

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async () => {
    ensureDir(path.dirname(DB_PATH));
    const sql = fs.readFileSync(SQL_PATH, "utf8");

    let db, usingBetter = false;
    try {
        const BetterSqlite3 = require("better-sqlite3");
        db = new BetterSqlite3(DB_PATH);
        usingBetter = true;
        db.exec(sql);
        db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`);
        console.log(`✅ DB init (better-sqlite3) OK → ${DB_PATH}`);
    } catch {
        const sqlite3 = require("sqlite3").verbose();
        db = new sqlite3.Database(DB_PATH);
        await new Promise((res, rej) => db.exec(sql, (err) => err ? rej(err) : res()));
        await new Promise((res, rej) => db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`,
            (err) => err ? rej(err) : res()));
        console.log(`✅ DB init (sqlite3) OK → ${DB_PATH}`);
        db.close();
    }
})();
