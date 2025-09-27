#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_FILE || path.join(process.cwd(), "data", "app.db");
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function columns(table) {
    return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}
function has(table, col) { return columns(table).includes(col); }

db.transaction(() => {
    // Ensure slug column
    if (!has("plans", "slug")) {
        db.prepare(`ALTER TABLE plans ADD COLUMN slug TEXT`).run();
    }
    // Backfill slug from name if empty
    const rows = db.prepare(`SELECT id, name, slug FROM plans`).all();
    const slugify = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    for (const r of rows) {
        if (!r.slug || !r.slug.trim()) {
            db.prepare(`UPDATE plans SET slug = ? WHERE id = ?`).run(slugify(r.name), r.id);
        }
    }
    // Unique index on slug
    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug_unique ON plans(slug)`).run();

    // Ensure price_pence exists; backfill from price if present
    const cols = columns("plans");
    const hasPricePence = cols.includes("price_pence");
    const hasPrice = cols.includes("price");
    if (!hasPricePence) {
        db.prepare(`ALTER TABLE plans ADD COLUMN price_pence INTEGER`).run();
        if (hasPrice) {
            db.prepare(`UPDATE plans SET price_pence = price WHERE price_pence IS NULL`).run();
        } else {
            db.prepare(`UPDATE plans SET price_pence = 0 WHERE price_pence IS NULL`).run();
        }
    }
    // Helpful composite index
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_plans_active_sort ON plans(active, sort, price_pence)`).run();
})();

console.log("✅ Plans migration complete (slug, price_pence, indexes).");
