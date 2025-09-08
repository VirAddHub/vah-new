// Test script to debug mail search
const Database = require('better-sqlite3');
const { setDb } = require("./lib/db");

// Initialize database
const db = new Database('var/local/vah.db');
setDb(db);

console.log("Testing mail search directly...");

// Test 1: Check if data exists
console.log("1. Check mail_item data:");
const allItems = db.prepare("SELECT id, user_id, subject FROM mail_item WHERE user_id = 1").all();
console.log("Items for user 1:", allItems.length);
allItems.forEach(item => console.log(`  ${item.id}: ${item.subject}`));

// Test 2: Test the exact query from the route
console.log("\n2. Test LIKE query:");
const userId = 1;
const where = ["m.user_id = ?"];
const args = [userId];
where.push("(m.deleted IS NULL OR m.deleted = 0)");

const sql = `
SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted
FROM mail_item m
WHERE ${where.join(" AND ")}
ORDER BY m.created_at DESC
LIMIT ? OFFSET ?`;

const likeArgs = [...args, 5, 0];
console.log("SQL:", sql);
console.log("Args:", likeArgs);

const items = db.prepare(sql).all(...likeArgs);
console.log("Results:", items.length);
items.forEach(item => console.log(`  ${item.id}: ${item.subject}`));

// Test 3: Test FTS query
console.log("\n3. Test FTS query:");
const ftsSql = `
SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted,
       bm25(mail_item_fts) AS score
FROM mail_item_fts
JOIN mail_item m ON m.id = mail_item_fts.rowid
WHERE mail_item_fts MATCH ? AND ${where.join(" AND ")}
ORDER BY score ASC, m.created_at DESC
LIMIT ? OFFSET ?`;

const ftsArgs = ["HMRC", ...args, 5, 0];
console.log("FTS SQL:", ftsSql);
console.log("FTS Args:", ftsArgs);

try {
    const ftsItems = db.prepare(ftsSql).all(...ftsArgs);
    console.log("FTS Results:", ftsItems.length);
    ftsItems.forEach(item => console.log(`  ${item.id}: ${item.subject}`));
} catch (e) {
    console.log("FTS Error:", e.message);
}
