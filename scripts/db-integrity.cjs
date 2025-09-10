const path = require("node:path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_URL || process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");

console.log("Checking database integrity:", DB_PATH);

try {
    const db = new Database(DB_PATH);

    const quick = db.prepare("PRAGMA quick_check;").get();
    console.log("quick_check:", quick);

    const rows = db.prepare("PRAGMA integrity_check;").all();
    console.log("integrity_check:", rows);

    db.close();
    console.log("✅ Database integrity check completed");
} catch (error) {
    console.error("❌ Database integrity check failed:", error.message);
    process.exit(1);
}
