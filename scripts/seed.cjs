/* scripts/seed.cjs */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'app.db');

const db = new Database(DB_FILE, { fileMustExist: false });

// Check if we already have data
const userCount = db.prepare('SELECT COUNT(*) as count FROM user').get().count;
const planCount = db.prepare('SELECT COUNT(*) as count FROM plans').get().count;

if (userCount > 0 && planCount > 0) {
    console.log('[seed] Database already has data, skipping seed');
    db.close();
    process.exit(0);
}

console.log('[seed] Seeding initial data...');

// Seed plans
const plans = [
    {
        name: 'Basic',
        price_pence: 999, // £9.99
        features: 'Virtual address, mail forwarding, basic support',
        is_active: 1
    },
    {
        name: 'Professional',
        price_pence: 1999, // £19.99
        features: 'Virtual address, mail forwarding, priority support, document scanning',
        is_active: 1
    },
    {
        name: 'Business',
        price_pence: 4999, // £49.99
        features: 'Virtual address, mail forwarding, premium support, document scanning, multiple addresses',
        is_active: 1
    }
];

const insertPlan = db.prepare(`
  INSERT OR IGNORE INTO plans (name, price_pence, features, is_active)
  VALUES (?, ?, ?, ?)
`);

plans.forEach(plan => {
    insertPlan.run(plan.name, plan.price_pence, plan.features, plan.is_active);
    console.log(`[seed] Added plan: ${plan.name}`);
});

// Seed a default admin user (only if no users exist)
if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'Password123!';
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    const insertUser = db.prepare(`
    INSERT INTO user (email, first_name, last_name, password_hash, role, kyc_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    insertUser.run(
        'admin@virtualaddresshub.co.uk',
        'Admin',
        'User',
        passwordHash,
        'admin',
        'approved'
    );

    console.log('[seed] Added admin user: admin@virtualaddresshub.co.uk');
    console.log(`[seed] Admin password: ${adminPassword}`);
}

console.log('[seed] Done');
db.close();
