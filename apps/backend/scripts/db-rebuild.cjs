const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_URL || process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");
const OUT = DB_PATH.replace(/\.db$/, "") + ".rebuilt.db";

console.log("Rebuilding database:", DB_PATH);
console.log("Output file:", OUT);

try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`VACUUM INTO '${OUT}'`);
    db.close();

    // Backup old file and replace with rebuilt
    fs.renameSync(DB_PATH, DB_PATH + ".old");
    fs.renameSync(OUT, DB_PATH);

    // Clean up WAL files
    ["-wal", "-shm"].forEach(suffix => {
        const file = DB_PATH + suffix;
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log("Removed:", file);
        }
    });

    console.log("✅ Rebuilt DB from VACUUM INTO. Old file:", DB_PATH + ".old");
} catch (error) {
    console.error("❌ Database rebuild failed:", error.message);
    process.exit(1);
}
