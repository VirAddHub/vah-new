#!/usr/bin/env node
/* scripts/seed.cjs */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 1) Ensure baseline exists (fail fast if someone tries to seed pre-migration)
const userExists = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='user'"
).get();
const plansExists = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='plans'"
).get();

if (!userExists || !plansExists) {
    console.error("❌ Seed aborted: run migrations before seeding.");
    process.exit(1);
}

// 2) Choose correct price column (amount_pence vs price_pence)
const hasAmountPence = db.prepare(
    "SELECT 1 FROM pragma_table_info('plans') WHERE name='amount_pence'"
).get();
const hasPricePence = db.prepare(
    "SELECT 1 FROM pragma_table_info('plans') WHERE name='price_pence'"
).get();

if (!hasAmountPence && !hasPricePence) {
    console.error("❌ Seed aborted: plans table has neither amount_pence nor price_pence");
    process.exit(1);
}
const priceCol = hasAmountPence ? "amount_pence" : "price_pence";

// 3) Upsert helper (SQLite 3.24+)
const upsertPlan = db.prepare(`
  INSERT INTO plans (name, slug, description, ${priceCol}, active)
  VALUES (@name, @slug, @description, @price, 1)
  ON CONFLICT(slug) DO UPDATE SET
    name=excluded.name,
    description=excluded.description,
    ${priceCol}=excluded.${priceCol},
    active=1,
    updated_at=CURRENT_TIMESTAMP
`);

const plans = [
    { name: "Basic", slug: "basic", description: "Starter plan", price: 990 },
    { name: "Professional", slug: "professional", description: "For growing teams", price: 2990 },
    { name: "Business", slug: "business", description: "For companies", price: 5990 },
];

db.transaction(() => {
    for (const p of plans) upsertPlan.run(p);
})();

// 4) Admin user upsert (password_hash preferred, fallback to password)
const hasPasswordHash = db.prepare(
    "SELECT 1 FROM pragma_table_info('user') WHERE name='password_hash'"
).get();

const ensureUser = hasPasswordHash
    ? db.prepare(`
      INSERT INTO user (email, password_hash, role)
      VALUES (@email, @password_hash, 'admin')
      ON CONFLICT(email) DO UPDATE SET
        password_hash=excluded.password_hash,
        role='admin',
        updated_at=CURRENT_TIMESTAMP
    `)
    : db.prepare(`
      INSERT INTO user (email, password, role)
      VALUES (@email, @password, 'admin')
      ON CONFLICT(email) DO UPDATE SET
        password=excluded.password,
        role='admin',
        updated_at=CURRENT_TIMESTAMP
    `);

const adminEmail = "admin@virtualaddresshub.co.uk";
const adminPassHash = bcrypt.hashSync("Admin123!", 10);

ensureUser.run(
    hasPasswordHash
        ? { email: adminEmail, password_hash: adminPassHash }
        : { email: adminEmail, password: "Admin123!" }
);

console.log("✅ Seed complete");