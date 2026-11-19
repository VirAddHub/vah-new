/* Local dummy seed. Idempotent. Refuses to run against a non-local database. */
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) || !/\/vah_local[^/]*$/.test(url.split('?')[0])) {
  console.error('REFUSING: seed only runs against a local vah_local database.'); process.exit(1);
}
const FEATURES = [
  "Use as Registered Office & Director's Service Address (Companies House + HMRC)",
  'Professional London business address for banking, invoices & websites',
  'Unlimited digital mail scanning — uploaded same day it arrives',
  'Secure online dashboard to read, download, archive or request actions',
  'HMRC & Companies House mail: digital scan + physical forwarding at no charge',
  'Cancel anytime. No setup fees or long-term contracts',
  'UK support — Mon-Fri, 9AM–6PM GMT',
];
const PLANS = [
  { name: 'Virtual Mailbox - Monthly', slug: 'virtual-mailbox-monthly', price: 999, interval: 'month', sort: 1, features: FEATURES },
  { name: 'Virtual Mailbox - Annual', slug: 'virtual-mailbox-annual', price: 8999, interval: 'year', sort: 2, features: [...FEATURES, 'Save 25% — equivalent to £7.50/month'] },
];
// Dummy accounts. Passwords are for local use only.
const ADMIN = { email: 'admin@example.test', password: 'Local!Admin#2026', first: 'Local', last: 'Admin' };
const DEMO = { email: 'demo.customer@example.test', password: 'Local!Customer#2026', first: 'Demo', last: 'Customer', company: 'Demo Widgets Ltd' };

(async () => {
  const c = new Client({ connectionString: url }); await c.connect();
  const now = Date.now();
  try {
    await c.query('BEGIN');
    for (const p of PLANS) {
      await c.query(
        `INSERT INTO plans (name, slug, description, price_pence, interval, currency, features_json, active, vat_inclusive, trial_days, sort)
         SELECT $1,$2,$3,$4,$5,'GBP',$6,true,true,0,$7 WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug=$2)`,
        [p.name, p.slug, 'London Business Address + Same-Day Digital Mail', p.price, p.interval, JSON.stringify(p.features), p.sort]);
    }
    // Legacy tiers that some migrations insert are not part of the product: keep them inactive locally.
    await c.query(`UPDATE plans SET active=false WHERE slug NOT IN ('virtual-mailbox-monthly','virtual-mailbox-annual') AND active`);
    const upsertUser = async (u, extra) => {
      const hash = await bcrypt.hash(u.password, 10);
      const r = await c.query('SELECT id FROM "user" WHERE email=$1', [u.email]);
      if (r.rows[0]) return r.rows[0].id;
      const cols = { email: u.email, password: hash, first_name: u.first, last_name: u.last, created_at: now, updated_at: now, is_sole_controller: true, ...extra };
      const k = Object.keys(cols);
      const ins = await c.query(`INSERT INTO "user" (${k.map(x => `"${x}"`).join(',')}) VALUES (${k.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id`, k.map(x => cols[x]));
      return ins.rows[0].id;
    };
    const adminId = await upsertUser(ADMIN, { is_admin: true, role: 'admin', status: 'active', plan_status: 'active', kyc_status: 'approved' });
    console.log(`admin     ${ADMIN.email} / ${ADMIN.password} (id ${adminId})`);
    if (process.env.SEED_DEMO_CUSTOMER === '1') {
      // WORKAROUND until Phase 1: the app cannot yet activate an account itself, so this customer is
      // activated directly in the database (same manual activation the audit used; see audit README caveat 1).
      const plan = (await c.query(`SELECT id, name FROM plans WHERE slug='virtual-mailbox-monthly'`)).rows[0];
      const id = await upsertUser(DEMO, { is_admin: false, role: 'user', status: 'active', plan_status: 'active', plan_id: plan.id, company_name: DEMO.company, kyc_status: 'pending' });
      await c.query(`INSERT INTO subscription (user_id, status, stripe_subscription_id, plan_name, cadence, created_at, updated_at)
                     SELECT $1,'active','sub_local_dummy_demo',$2,'monthly',$3,$3 WHERE NOT EXISTS (SELECT 1 FROM subscription WHERE user_id=$1)`, [id, plan.name, now]);
      await c.query(`INSERT INTO business (user_id, company_name, status, is_primary, monthly_price_pence, created_at, updated_at)
                     SELECT $1,$2,'active',true,999,$3,$3 WHERE NOT EXISTS (SELECT 1 FROM business WHERE user_id=$1)`, [id, DEMO.company, now]);
      console.log(`customer  ${DEMO.email} / ${DEMO.password} (id ${id})  [manually activated: workaround]`);
    }
    await c.query('COMMIT');
    console.log('Seed complete.');
  } catch (e) { await c.query('ROLLBACK'); console.error('Seed failed:', e.message); process.exitCode = 1; }
  finally { await c.end(); }
})();
