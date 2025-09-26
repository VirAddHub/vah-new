#!/usr/bin/env node
/* Seed default pricing plans (SQLite path: data/app.db) */
const path = require("path");
const { existsSync, mkdirSync } = require("fs");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_FILE || path.join(process.cwd(), "data", "app.db");
if (!existsSync(path.dirname(dbPath))) mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const upsert = db.prepare(`
  INSERT INTO plans (name, slug, description, price_pence, interval, currency, features_json, active, sort)
  VALUES (@name, @slug, @description, @price_pence, @interval, @currency, @features_json, @active, @sort)
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name,
    description=excluded.description,
    price_pence=excluded.price_pence,
    interval=excluded.interval,
    currency=excluded.currency,
    features_json=excluded.features_json,
    active=excluded.active,
    sort=excluded.sort,
    updated_at=CURRENT_TIMESTAMP
`);

const seed = [
    {
        name: "Starter",
        slug: "starter",
        description: "Perfect for individuals",
        price_pence: 999, // £9.99
        interval: "month",
        currency: "GBP",
        features_json: JSON.stringify([
            "Registered Office & Director's Address",
            "Unlimited digital scanning",
            "Email notifications",
            "Basic support",
        ]),
        active: 1,
        sort: 0,
    },
];

const tx = db.transaction(() => {
    seed.forEach((row) => {
        upsert.run(row);
        // add initial price history if missing
        const plan = db.prepare(`SELECT id FROM plans WHERE slug=?`).get(row.slug);
        const exists = db
            .prepare(`SELECT 1 FROM plan_price_history WHERE plan_id=? LIMIT 1`)
            .get(plan.id);
        if (!exists) {
            db.prepare(
                `INSERT INTO plan_price_history (plan_id, price_pence, currency, note)
         VALUES (?,?,?,?)`
            ).run(plan.id, row.price_pence, row.currency, "seed");
        }
    });
});
tx();
console.log("✅ plans seeded:", seed.map((s) => s.name).join(", "));
