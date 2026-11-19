// Staging smoke test for VirtualAddressHub. Runs INSIDE the staging API service (Render Shell),
// against the API on localhost and the staging database, with real Stripe sandbox calls.
//
//   VAH_STAGING_SMOKE=1 node apps/backend/tests/staging/staging-smoke.mjs start
//   VAH_STAGING_SMOKE=1 node apps/backend/tests/staging/staging-smoke.mjs status
//   VAH_STAGING_SMOKE=1 node apps/backend/tests/staging/staging-smoke.mjs customer <tag>   (signup + monthly checkout)
//   VAH_STAGING_SMOKE=1 node apps/backend/tests/staging/staging-smoke.mjs rate <tag>       (what the customer is shown)
//
// Safety:
// - Refuses to run unless VAH_STAGING_SMOKE=1, the Stripe key is a test-mode key and the
//   database is the staging database.
// - Uses one test customer, test@blackhole.postmarkapp.com: Postmark accepts mail to that address
//   and never delivers it. Nothing is deleted; the test account stays for inspection.
// - The test password is generated here and kept only in /tmp (mode 600). Secrets are read from
//   the service environment and never printed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client } = require('pg');

const API = `http://127.0.0.1:${process.env.PORT || 10000}`;
const ORIGIN = (process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
const EMAIL = 'test@blackhole.postmarkapp.com';
// Kept on the service's persistent disk when there is one, so it survives redeploys.
const STATE = fs.existsSync('/var/data') ? '/var/data/vah-staging-smoke.json' : '/tmp/vah-staging-smoke.json';
const STAGING_DB = 'vah_postgres_40zq';

if (process.env.VAH_STAGING_SMOKE !== '1') { console.error('REFUSING: set VAH_STAGING_SMOKE=1'); process.exit(2); }
if (!String(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_')) { console.error('REFUSING: Stripe key is not a test-mode key'); process.exit(2); }

// Same TLS settings as the API itself (dist build of src/lib/pgSslConfig.ts).
const { getPgSslOption } = require('../../dist/src/lib/pgSslConfig.js');
const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: getPgSslOption() });
await pg.connect();
const dbName = (await pg.query('SELECT current_database() AS d')).rows[0].d;
if (dbName !== STAGING_DB) { console.error(`REFUSING: database is ${dbName}`); process.exit(2); }
const one = async (sql, args) => (await pg.query(sql, args)).rows[0];

class Session {
  constructor() { this.cookies = new Map(); }
  store(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';'); const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim(), v = pair.slice(i + 1).trim();
      if (v === '' || /max-age=0|expires=thu, 01 jan 1970/i.test(line)) this.cookies.delete(k); else this.cookies.set(k, v);
    }
  }
  async req(method, path, body, extra = {}) {
    const write = !['GET', 'HEAD'].includes(method);
    if (write && !this.cookies.has('vah_csrf_token')) await this.req('GET', '/api/csrf');
    const headers = { origin: ORIGIN, accept: 'application/json', ...extra };
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (write && this.cookies.has('vah_csrf_token')) headers['x-csrf-token'] = decodeURIComponent(this.cookies.get('vah_csrf_token'));
    let payload; if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(API + path, { method, headers, body: payload, redirect: 'manual' });
    this.store(res);
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  }
  get(p) { return this.req('GET', p); }
  post(p, b = {}) { return this.req('POST', p, b); }
}

const results = [];
async function step(id, name, fn) {
  try { results.push({ id, name, ok: true, note: (await fn()) || '' }); }
  catch (e) { results.push({ id, name, ok: false, note: e.message }); }
}
const expect = (c, m) => { if (!c) throw new Error(m); };
function report() {
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.name}  ${r.note}`);
  const f = results.filter(r => !r.ok).length; console.log(`\n${results.length - f} passed, ${f} failed`); return f === 0;
}
const state = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const save = s => { fs.writeFileSync(STATE, JSON.stringify(s), { mode: 0o600 }); fs.chmodSync(STATE, 0o600); };

async function login(s, st) {
  const r = await s.post('/api/auth/login', { email: EMAIL, password: st.password });
  expect(r.status === 200, `login ${r.status} ${r.text.slice(0, 120)}`);
}

const cmd = process.argv[2];
const s = new Session();

if (cmd === 'start') {
  const st = state();
  await step('S1', 'API health', async () => { const r = await s.get('/api/healthz'); expect(r.status === 200, `healthz ${r.status}`); return r.text.slice(0, 80); });
  await step('S2', 'Unknown route is 404', async () => { const r = await s.get('/api/this-route-does-not-exist'); expect(r.status === 404, `got ${r.status}`); });
  await step('S3', 'Signup (or login if the test account exists)', async () => {
    const existing = await one('SELECT id FROM "user" WHERE lower(email)=$1', [EMAIL]);
    if (existing && st.password) { await login(s, st); return `existing user ${existing.id}`; }
    expect(!existing, 'test account exists but its password is not in /tmp; not touching it');
    st.password = crypto.randomBytes(18).toString('base64url') + '!A1'; save(st); // generated at run time, kept only in /tmp
    const r = await s.post('/api/auth/signup', {
      first_name: 'Staging', last_name: 'Smoketest', email: EMAIL, password: st.password, phone: '+447700900123',
      company_name: 'Staging Smoke Test Ltd', business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678',
      forward_to_first_name: 'Staging', forward_to_last_name: 'Smoketest',
      address_line1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
      billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0,
    });
    expect(r.status === 200 || r.status === 201, `signup ${r.status} ${r.text.slice(0, 200)}`);
    const u = await one('SELECT id FROM "user" WHERE lower(email)=$1', [EMAIL]); st.userId = Number(u.id); save(st);
    return `user ${st.userId}`;
  });
  const u = await one('SELECT id, stripe_customer_id FROM "user" WHERE lower(email)=$1', [EMAIL]);
  st.userId = u ? Number(u.id) : undefined; save(st);
  await step('S4', 'Signup created the primary business', async () => {
    const b = await one('SELECT is_primary FROM business WHERE user_id=$1 AND is_primary', [st.userId]); expect(b, 'no primary business');
  });
  await step('S5', 'Unpaid: mail, forwarding, address and certificate refused', async () => {
    for (const p of ['/api/mail-items', '/api/forwarding/requests', '/api/profile/registered-office-address', '/api/profile/certificate']) {
      const r = await s.get(p); expect(r.status === 403, `${p} -> ${r.status}`);
    }
  });
  await step('S6', 'Unpaid: access decision points to payment', async () => {
    const a = (await s.get('/api/access')).json?.data; expect(a && a.payment?.entitled === false, JSON.stringify(a).slice(0, 200)); return `level=${a.level} next=${a.next}`;
  });
  await step('S7', 'Mail for a restricted customer is stored and held (real import endpoint)', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
    const srv = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'application/pdf' }); r.end(pdf); });
    await new Promise(ok => srv.listen(4021, '127.0.0.1', ok));
    try {
      const body = { userId: st.userId, sourceSlug: 'hmrc', fileName: `user${st.userId}_2026-11-19_HMRC.pdf`, oneDriveFileId: `staging-smoke-${Date.now()}`, oneDriveDownloadUrl: 'http://127.0.0.1:4021/scan.pdf', receivedAt: new Date().toISOString() };
      const r = await fetch(API + '/api/internal/from-onedrive', { method: 'POST', headers: { 'content-type': 'application/json', 'x-mail-import-secret': process.env.MAIL_IMPORT_WEBHOOK_SECRET || '' }, body: JSON.stringify(body) });
      expect(r.status === 200 || r.status === 201, `import ${r.status}`);
    } finally { srv.close(); }
    const m = await one('SELECT id FROM mail_item WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [st.userId]); expect(m, 'mail not stored'); st.mailId = Number(m.id); save(st);
    for (const p of ['/api/mail-items', `/api/mail-items/${st.mailId}`, `/api/mail-items/${st.mailId}/download`]) {
      const x = await s.get(p); expect(x.status === 403 && !x.text.includes('%PDF'), `${p} -> ${x.status}`);
    }
    const a = (await s.get('/api/access')).json?.data; expect(!JSON.stringify(a).toLowerCase().includes('hmrc'), 'access response names the sender');
    return `mail ${st.mailId} held, mailWaiting=${a?.mailWaiting}`;
  });
  await step('S8', 'Stripe webhook rejects a bad signature', async () => {
    const t = Math.floor(Date.now() / 1000);
    const r = await fetch(API + '/api/webhooks/stripe', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${t},v1=${'0'.repeat(64)}` }, body: JSON.stringify({ id: 'evt_fake', type: 'invoice.paid', data: { object: {} } }) });
    expect(r.status === 400 || r.status === 401, `got ${r.status}`); return `HTTP ${r.status}`;
  });
  for (const period of ['monthly', 'annual']) {
    await step(period === 'monthly' ? 'S9' : 'S10', `Stripe sandbox ${period} checkout session`, async () => {
      const r = await s.post('/api/payments/stripe/checkout-session', { plan_id: period === 'annual' ? 2 : 3, billing_period: period });
      expect(r.status === 200, `checkout ${r.status} ${r.text.slice(0, 160)}`);
      const id = r.json?.data?.sessionId || r.json?.data?.id || (String(r.json?.data?.url || r.json?.url || '').match(/cs_test_[A-Za-z0-9]+/) || [])[0];
      expect(id && id.startsWith('cs_test_'), `no test session id in ${r.text.slice(0, 160)}`);
      st[`${period}Session`] = id; save(st); return id;
    });
  }
  await step('S11', 'Billing portal session', async () => {
    const r = await s.post('/api/billing/portal', {}); expect(r.status === 200 && /^https:\/\/billing\.stripe\.com\//.test(r.json?.data?.url || ''), `portal ${r.status} ${r.text.slice(0, 120)}`);
  });
  await step('S12', 'Cancel endpoint does not pretend to cancel', async () => { const r = await s.post('/api/billing/cancel', {}); expect(r.status === 501, `got ${r.status}`); });
  const c = await one('SELECT stripe_customer_id FROM "user" WHERE id=$1', [st.userId]);
  console.log(`USER=${st.userId} CUSTOMER=${c?.stripe_customer_id} MONTHLY=${st.monthlySession} ANNUAL=${st.annualSession}`);
  const ok = report(); await pg.end(); process.exit(ok ? 0 : 1);
}

if (cmd === 'status') {
  const st = state(); await login(s, st);
  const a = (await s.get('/api/access')).json?.data;
  const sub = await one('SELECT status, cadence, plan_name, stripe_subscription_id, paid_through_ms, cancel_at_period_end FROM subscription WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [st.userId]);
  const u = await one('SELECT plan_status, plan_id, status FROM "user" WHERE id=$1', [st.userId]);
  const inv = await one('SELECT COUNT(*)::int n, COUNT(DISTINCT stripe_invoice_id)::int d FROM invoices WHERE user_id=$1', [st.userId]);
  const subs = await one('SELECT COUNT(*)::int n FROM subscription WHERE user_id=$1', [st.userId]);
  const hooks = (await pg.query(`SELECT event_type, status, COUNT(*)::int n, MAX(attempts) a FROM webhook_log WHERE (provider='stripe' OR source='stripe') AND created_at > (extract(epoch FROM now()) * 1000 - 7200000) GROUP BY event_type, status ORDER BY event_type`).catch(() => ({ rows: [] }))).rows;
  const mail = await s.get('/api/mail-items');
  console.log(JSON.stringify({ access: { level: a?.level, next: a?.next, entitled: a?.payment?.entitled, mailWaiting: a?.mailWaiting }, user: u, subscription: sub && { ...sub, paid_through: sub.paid_through_ms ? new Date(Number(sub.paid_through_ms)).toISOString() : null }, subscriptionRows: subs.n, invoices: inv, mailListStatus: mail.status, webhooks: hooks }, null, 1));
  await pg.end(); process.exit(0);
}

// ---- Price checks: one extra test customer per tag, at whatever price Checkout offers now ----------
const tagEmail = tag => `vah-${String(tag).replace(/[^a-z0-9]/gi, '').toLowerCase()}@blackhole.postmarkapp.com`;
if (cmd === 'customer') {
  const tag = process.argv[3]; if (!tag) { console.error('usage: customer <tag>'); process.exit(2); }
  const email = tagEmail(tag); const all = state(); const st = all[email] || {};
  const c = new Session();
  const existing = await one('SELECT id FROM "user" WHERE lower(email)=$1', [email]);
  if (existing) { expect(st.password, `account ${email} exists without a stored password`); const r = await c.post('/api/auth/login', { email, password: st.password }); expect(r.status === 200, `login ${r.status}`); }
  else {
    st.password = crypto.randomBytes(18).toString('base64url') + '!A1'; all[email] = st; save(all); // generated at run time, kept only on the server
    const r = await c.post('/api/auth/signup', { first_name: 'Price', last_name: `Check ${tag}`, email, password: st.password, phone: '+447700900124',
      company_name: `Price Check ${tag} Ltd`, business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678',
      forward_to_first_name: 'Price', forward_to_last_name: 'Check', address_line1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
      billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0 });
    expect(r.status === 200 || r.status === 201, `signup ${r.status} ${r.text.slice(0, 160)}`);
  }
  const plans = await c.get('/api/plans');
  const monthly = (plans.json?.data || []).find(p => p.interval === 'month');
  const r = await c.post('/api/payments/stripe/checkout-session', { plan_id: Number(monthly?.id), billing_period: 'monthly' });
  expect(r.status === 200, `checkout ${r.status} ${r.text.slice(0, 160)}`);
  const session = (String(r.json?.data?.url || '').match(/cs_test_[A-Za-z0-9]+/) || [])[0];
  const u = await one('SELECT id, stripe_customer_id FROM "user" WHERE lower(email)=$1', [email]);
  console.log(JSON.stringify({ tag, user: Number(u.id), customer: u.stripe_customer_id, shown_monthly_pence: monthly?.price_pence, shown_source: monthly?.price_source, shown_price_id: monthly?.stripe_price_id, checkout_session: session }));
  await pg.end(); process.exit(0);
}
if (cmd === 'rate') {
  const email = tagEmail(process.argv[3] || ''); const st = state()[email];
  expect(st?.password, `no stored account for ${email}`);
  const c = new Session(); const r = await c.post('/api/auth/login', { email, password: st.password }); expect(r.status === 200, `login ${r.status}`);
  const o = (await c.get('/api/billing/overview')).json?.data;
  const sub = await one('SELECT s.status, s.cadence, s.stripe_subscription_id FROM subscription s JOIN "user" u ON u.id = s.user_id WHERE lower(u.email)=$1', [email]);
  console.log(JSON.stringify({ email, shown_price_pence: o?.current_price_pence, price_source: o?.current_price_source, cadence: o?.cadence, next_billing_date: o?.next_billing_date, db_subscription: sub }));
  await pg.end(); process.exit(0);
}

console.error('usage: start | status | customer <tag> | rate <tag>'); await pg.end(); process.exit(2);
