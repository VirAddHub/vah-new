/* eslint-disable no-console */
const Database = require('better-sqlite3');
const { resolveDbPath } = require('./lib/db-path.cjs');

const REQUIRED_TABLES = [
    'user',
    'mail_item',
    'admin_log',
    'mail_event',
    'activity_log',
    'plans',
    'audit_log',
    'password_reset',
];

(function main() {
    const dbPath = resolveDbPath();
    console.log('[seed] db:', dbPath);

    const db = new Database(dbPath);

    // Guard 1: required tables exist
    const existing = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all()
        .map((r) => r.name);

    const missing = REQUIRED_TABLES.filter((t) => !existing.includes(t));
    if (missing.length) {
        console.error('❌ Seed aborted: missing tables after migrations:', missing);
        console.error('   Run: npm run migrate');
        process.exit(1);
    }

    // Guard 2: schema version sanity (optional)
    const [{ user_version }] = db.pragma('user_version', { simple: false });
    if (!user_version || Number.isNaN(user_version)) {
        console.warn('[seed] Warning: user_version is not set; continuing anyway.');
    } else {
        console.log(`[seed] schema version: ${user_version}`);
    }

    // Begin idempotent seeding
    db.exec('BEGIN');
    try {
        // ── Plans (idempotent UPSERT) ────────────────────────────────
        db.prepare(`
      INSERT INTO plans (id, slug, name, description, price_pence, currency, active, interval)
      VALUES (1, 'digital_mailbox', 'Digital Mailbox Plan', 'Basic digital mailbox service', 999, 'GBP', 1, 'month')
      ON CONFLICT(id) DO UPDATE SET
        slug=excluded.slug,
        name=excluded.name,
        description=excluded.description,
        price_pence=excluded.price_pence,
        currency=excluded.currency,
        active=excluded.active,
        interval=excluded.interval;
    `).run();

        // ── Example admin user (uncomment & adapt if desired) ───────
        // db.prepare(`
        //   INSERT INTO user (id, email, password_hash, is_admin, created_at)
        //   VALUES (1, 'admin@example.com', '$2b$10$replace_me', 1, strftime('%s','now')*1000)
        //   ON CONFLICT(id) DO NOTHING;
        // `).run();

        db.exec('COMMIT');
        console.log('✅ Seed completed successfully');
    } catch (err) {
        db.exec('ROLLBACK');
        if (err instanceof Error) {
            console.error('Seed error:', err.message);
            console.error(err.stack);
        } else {
            console.error('Seed error (non-Error):', err);
        }
        process.exit(1);
    }
})();