/* eslint-disable no-console */
const Database = require('better-sqlite3');
const { resolveDbPath } = require('./lib/db-path.cjs');

const CANDIDATES = {
  user: ['user', 'users'],
  mail_item: ['mail_item', 'mail_items'],
  admin_log: ['admin_log', 'admin_logs', 'audit_log', 'audit_logs'],
  mail_event: ['mail_event', 'mail_events'],
  activity_log: ['activity_log', 'activity_logs'],
  plans: ['plans', 'plan', 'pricing_plans'],

  // Optional groups: warn if missing, do not abort
  password_reset: ['password_reset', 'password_resets', 'reset_tokens', 'reset_password'],
};

const CORE_GROUPS = ['user', 'mail_item', 'admin_log', 'mail_event', 'activity_log', 'plans'];
const OPTIONAL_GROUPS = ['password_reset'];

(function main() {
  const dbPath = resolveDbPath();
  console.log('[seed] db:', dbPath);

  const db = new Database(dbPath);

  // discover tables
  const existingArr = db
    .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view')`)
    .all()
    .map((r) => r.name);
  const existing = new Set(existingArr);
  // console.log('[seed] existing tables:', existingArr); // uncomment if needed

  function pickTable(group) {
    for (const name of CANDIDATES[group] || []) {
      if (existing.has(name)) return name;
    }
    return null;
  }

  // verify core groups exist (any candidate name is accepted)
  const tableMap = {};
  const coreMissing = [];
  for (const g of CORE_GROUPS) {
    const found = pickTable(g);
    if (!found) coreMissing.push(`${g} (candidates: ${CANDIDATES[g].join(', ')})`);
    else tableMap[g] = found;
  }

  if (coreMissing.length) {
    console.error('❌ Seed aborted: required tables not found:\n  - ' + coreMissing.join('\n  - '));
    console.error('   Existing tables:', existingArr);
    console.error('   Run migrations or align table names.');
    process.exit(1);
  }

  // warn for optional groups
  const optionalMissing = [];
  for (const g of OPTIONAL_GROUPS) {
    const found = pickTable(g);
    if (!found) optionalMissing.push(`${g} (optional)`);
    else tableMap[g] = found;
  }
  if (optionalMissing.length) {
    console.warn('[seed] Optional tables missing:', optionalMissing.join(', '));
  }

  // Begin idempotent seed
  db.exec('BEGIN');
  try {
    // ── plans upsert (use detected table) ─────────────────────────
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