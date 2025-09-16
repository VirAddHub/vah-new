/* eslint-disable no-console */
const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const { resolveDbPath } = require('./lib/db-path.cjs');

const CANDIDATES = {
  user: ['user', 'users'],
  mail_item: ['mail_item', 'mail_items'],
  admin_log: ['admin_log', 'admin_logs', 'audit_log', 'audit_logs'],
  mail_event: ['mail_event', 'mail_events'],
  activity_log: ['activity_log', 'activity_logs'],
  plans: ['plans', 'plan', 'pricing_plans'],
};

const CORE_GROUPS = ['user', 'mail_item', 'admin_log', 'mail_event', 'activity_log', 'plans'];
const OPTIONAL_GROUPS = []; // add names like 'password_reset' if you want warnings, not hard-fail

function getExistingTables(db) {
  return db
    .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view')`)
    .all()
    .map((r) => r.name);
}

function discover(db) {
  const existingArr = getExistingTables(db);
  const existing = new Set(existingArr);
  const tableMap = {};
  const coreMissing = [];
  for (const g of CORE_GROUPS) {
    const candidates = CANDIDATES[g] || [];
    const found = candidates.find((n) => existing.has(n)) || null;
    if (!found) coreMissing.push(`${g} (candidates: ${candidates.join(', ')})`);
    else tableMap[g] = found;
  }
  const optionalMissing = [];
  for (const g of OPTIONAL_GROUPS) {
    const candidates = CANDIDATES[g] || [];
    const found = candidates.find((n) => existing.has(n)) || null;
    if (!found) optionalMissing.push(`${g} (candidates: ${candidates.join(', ')})`);
    else tableMap[g] = found;
  }
  return { existingArr, tableMap, coreMissing, optionalMissing };
}

(function main() {
  const dbPath = resolveDbPath();
  console.log('[seed] db:', dbPath);
  let db = new Database(dbPath);

  // First pass: check state
  let { existingArr, tableMap, coreMissing, optionalMissing } = discover(db);

  // If DB is empty or core tables missing, auto-run migrations once
  if (existingArr.length === 0 || coreMissing.length) {
    console.warn(
      '[seed] Core tables missing or empty DB detected. Running migrations now (one-time)...'
    );
    try {
      execSync('node scripts/migrate.cjs', { stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Failed to run migrations from seed:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
    // Reconnect and re-discover after migrate
    db.close();
    db = new Database(dbPath);
    ({ existingArr, tableMap, coreMissing, optionalMissing } = discover(db));
  }

  // If still missing after migrate, hard fail with details
  if (coreMissing.length) {
    console.error('❌ Seed aborted: required tables not found AFTER migrate:\n  - ' + coreMissing.join('\n  - '));
    console.error('   Existing tables:', existingArr);
    console.error('   Align migration table names or adjust CANDIDATES in seed.cjs.');
    process.exit(1);
  }

  if (optionalMissing.length) {
    console.warn('[seed] Optional tables missing:', optionalMissing.join(', '));
  }

  // Begin idempotent seed
  db.exec('BEGIN');
  try {
    // ── plans upsert (uses detected table name) ──────────────────
    const plansTable = tableMap.plans;
    db.prepare(`
      INSERT INTO ${plansTable} (id, slug, name, description, price_pence, currency, active, interval)
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