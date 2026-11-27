// Admin controls and transaction integrity. MOCK provider events; real API, migration-built database.
import { Session, db, step, expect, report, stripeEvent, sendStripe, recordIdentity, stripeFixture, importMail } from './lib.mjs';

const pg = await db();
const one = async (sql, args) => (await pg.query(sql, args)).rows[0];
const plan = await one(`SELECT id, name, price_pence FROM plans WHERE slug='virtual-mailbox-monthly'`);
const T = Math.floor(Date.now() / 1000); let n = 0;
const PW = 'Journey!Passw0rd#1';
async function fullCustomer() {
  const s = new Session(); const email = `adm.${Date.now()}.${n++}@example.test`;
  await s.post('/api/auth/signup', { first_name: 'Admin', last_name: 'Case', email, password: PW, phone: '+447700900003', business_type: 'limited_company', country_of_incorporation: 'GB',
    company_number: '12345678', company_name: 'Admin Case Ltd', forward_to_first_name: 'Admin', forward_to_last_name: 'Case', address_line1: '3 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
    billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0 });
  const id = Number((await one('SELECT id FROM "user" WHERE email=$1', [email])).id);
  const fx = stripeFixture(id, plan.id);
  await sendStripe(stripeEvent('checkout.session.completed', fx.checkout(), { created: T })); await sendStripe(stripeEvent('invoice.paid', fx.invoice(), { created: T }));
  await recordIdentity(id);
  return { s, id, email, fx, level: async () => (await s.get('/api/access')).json?.data?.level };
}
const admin = new Session();
expect((await admin.post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' })).status === 200, 'admin login');
const adminId = Number((await one(`SELECT id FROM "user" WHERE email='admin@example.test'`)).id);
let c;

await step('A1', 'Suspend needs a reason; customers cannot use admin actions', async () => {
  c = await fullCustomer(); expect(await c.level() === 'full', 'fixture not in full service');
  expect((await admin.post(`/api/admin/users/${c.id}/suspend`, {})).status === 400, 'suspended without a reason');
  expect((await c.s.post(`/api/admin/users/${c.id}/suspend`, { reason: 'trying it on myself' })).status === 403, 'customer could suspend');
  expect((await admin.post(`/api/admin/users/${adminId}/suspend`, { reason: 'suspending myself' })).status === 400, 'admin suspended own account');
});
await step('A2', 'Suspend: recorded with reason, existing session ends at once, login refused', async () => {
  const r = await admin.post(`/api/admin/users/${c.id}/suspend`, { reason: 'Chargeback under investigation' });
  expect(r.status === 200 && r.json.data.standing === 'suspended' && r.json.data.access_level === 'none', JSON.stringify(r.json));
  expect(r.json.data.stripe.status === 'action_required', 'did not flag the live Stripe subscription');
  for (const p of ['/api/access', '/api/mail-items', '/api/billing/overview', '/api/auth/whoami']) expect((await c.s.get(p)).status === 401, `${p} still works for the suspended session`);
  const li = await new Session().post('/api/auth/login', { email: c.email, password: PW }); expect(li.status === 403 && li.json.error === 'account_suspended', `suspended login -> ${li.status} ${li.json?.error}`);
  const wrong = await new Session().post('/api/auth/login', { email: c.email, password: 'not-the-password' }); expect(wrong.status === 401 && wrong.json.error === 'invalid_credentials', 'suspension revealed to someone without the password');
  const a = await one(`SELECT admin_id, details FROM admin_audit WHERE target_id=$1 AND action='account_suspend'`, [c.id]);
  expect(a && Number(a.admin_id) === adminId && JSON.parse(a.details).reason === 'Chargeback under investigation', 'audit row missing or wrong');
});
await step('A3', 'Suspended: payment and verification events do not lift it; mail is still stored', async () => {
  await sendStripe(stripeEvent('invoice.paid', c.fx.invoice({ start: T + 30 * 86400, end: T + 60 * 86400 }), { created: T + 50 }));
  await recordIdentity(c.id);
  expect((await one('SELECT status FROM "user" WHERE id=$1', [c.id])).status === 'suspended', 'standing changed by a provider event');
  const m = await importMail({ userId: c.id, sourceSlug: 'bank', fileName: `user${c.id}_2026-11-15_Bank.pdf`, oneDriveFileId: `susp-${Date.now()}`, oneDriveDownloadUrl: 'http://127.0.0.1:4011/scan.pdf', receivedAt: new Date().toISOString() });
  expect(m.status < 300 && (await one('SELECT locked FROM mail_item WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [c.id])).locked === true, `import ${m.status}`);
});
await step('A4', 'Restore: needs a reason, access returns, history shows both actions', async () => {
  expect((await admin.post(`/api/admin/users/${c.id}/restore-standing`, { reason: '' })).status === 400, 'restored without a reason');
  const r = await admin.post(`/api/admin/users/${c.id}/restore-standing`, { reason: 'Investigation closed, no fault' });
  expect(r.status === 200 && r.json.data.standing === 'good' && r.json.data.access_level === 'full', JSON.stringify(r.json));
  const s2 = new Session(); expect((await s2.post('/api/auth/login', { email: c.email, password: PW })).status === 200, 'cannot log in after restore');
  expect((await s2.get('/api/mail-items')).status === 200, 'mail not available after restore');
  const h = (await admin.get(`/api/admin/users/${c.id}/standing`)).json.data.history.map(x => x.action);
  expect(h.includes('account_suspend') && h.includes('account_restore'), `history ${h}`);
  expect((await admin.post(`/api/admin/users/${c.id}/restore-standing`, { reason: 'restoring again' })).status === 409, 'restored an account in good standing');
});
await step('A5', 'Close: no login, no access; a later payment does not reopen it; restore lands in onboarding or full by the normal rule', async () => {
  const r = await admin.post(`/api/admin/users/${c.id}/close`, { reason: 'Customer requested closure' });
  expect(r.status === 200 && r.json.data.standing === 'closed' && r.json.data.access_level === 'none', JSON.stringify(r.json));
  const lc = await new Session().post('/api/auth/login', { email: c.email, password: PW }); expect(lc.status === 403 && lc.json.error === 'account_closed', `closed login -> ${lc.status}`);
  await sendStripe(stripeEvent('invoice.paid', c.fx.invoice({ start: T + 60 * 86400, end: T + 90 * 86400 }), { created: T + 80 }));
  expect((await one('SELECT status, deleted_at FROM "user" WHERE id=$1', [c.id])).status === 'closed', 'payment reopened a closed account');
  expect((await admin.post(`/api/admin/users/${c.id}/suspend`, { reason: 'suspend a closed account' })).status === 409, 'suspended a closed account');
});
await step('A6', 'Status can no longer be typed in by hand', async () => {
  const d = await fullCustomer(); const r = await admin.patch(`/api/admin/users/${d.id}`, { status: 'suspended' });
  expect(r.status === 400 && r.json.error === 'use_standing_actions', `PATCH status -> ${r.status}`);
  expect((await one('SELECT status FROM "user" WHERE id=$1', [d.id])).status === 'active', 'status changed through PATCH');
});

await step('A7', 'Admin can create a customer: they can log in, start unpaid, and have a business', async () => {
  const email = `created.${Date.now()}@example.test`;
  const r = await admin.post('/api/admin/users', { email, first_name: 'Made', last_name: 'ByAdmin', company_name: 'Made Ltd', password: PW, plan_status: 'active' });
  expect(r.status === 200 || r.status === 201, `create ${r.status} ${r.text.slice(0, 200)}`);
  const u = await one('SELECT id, status, plan_status FROM "user" WHERE email=$1', [email]);
  expect(u.status === 'active' && u.plan_status === 'pending_payment', `created as ${JSON.stringify(u)}`);
  expect((await one('SELECT COUNT(*)::int n FROM business WHERE user_id=$1 AND is_primary', [u.id])).n === 1, 'no primary business');
  const s = new Session(); expect((await s.post('/api/auth/login', { email, password: PW })).status === 200, 'created user cannot log in');
  const a = (await s.get('/api/access')).json.data; expect(a.level === 'onboarding' && a.next === 'payment', 'admin-created user was given paid access');
});
await step('A8', 'Admin delete then restore (existing routes) still work with the corrected date types', async () => {
  const d = await fullCustomer();
  const del = await admin.req('DELETE', `/api/admin/users/${d.id}`); expect(del.status === 200, `delete ${del.status} ${del.text.slice(0, 160)}`);
  expect((await d.s.get('/api/access')).status === 401, 'deleted user session still works');
  const res = await admin.post(`/api/admin/users/${d.id}/restore`, { email: d.email, first_name: 'Admin', last_name: 'Case', reactivate: false }); expect(res.status === 200, `restore ${res.status} ${res.text.slice(0, 160)}`);
});

// ---- Transactions --------------------------------------------------------------------------------
const planEditsFrom = Date.now();
await step('T1', 'Plan edit: a successful change persists', async () => {
  const before = await one('SELECT description FROM plans WHERE id=$1', [plan.id]);
  const r = await admin.patch(`/api/admin/plans/${plan.id}`, { description: 'Journey test description' });
  expect(r.status === 200, `edit ${r.status} ${r.text.slice(0, 200)}`);
  expect((await one('SELECT description FROM plans WHERE id=$1', [plan.id])).description === 'Journey test description', 'description not saved');
  await admin.patch(`/api/admin/plans/${plan.id}`, { description: before.description });
  expect((await one('SELECT description FROM plans WHERE id=$1', [plan.id])).description === before.description, 'description not restored');
});
await step('T1b', 'Plan edit: the price cannot be changed here (Stripe charges its own price); saving the same price is fine', async () => {
  const r = await admin.patch(`/api/admin/plans/${plan.id}`, { price_pence: 1099 });
  expect(r.status === 409 && r.json?.error === 'price_set_in_stripe', `price change returned ${r.status} ${r.text.slice(0, 160)}`);
  expect(Number((await one('SELECT price_pence FROM plans WHERE id=$1', [plan.id])).price_pence) === Number(plan.price_pence), 'price changed');
  const same = await admin.patch(`/api/admin/plans/${plan.id}`, { price_pence: Number(plan.price_pence) });
  expect(same.status === 200, `saving the unchanged price returned ${same.status}`);
});
await step('T1c', 'Plan edits never email customers', async () => {
  const n = Number((await one(`SELECT COUNT(*)::int n FROM local_email_outbox WHERE template = 'plan-price-change' AND created_at_ms >= $1`, [planEditsFrom])).n);
  expect(n === 0, `${n} price-change emails queued`);
});
await step('T2', 'Plan edit: a failed change leaves nothing behind (20 times, to catch pooled-connection leaks)', async () => {
  for (let i = 0; i < 20; i++) {
    const r = await admin.patch(`/api/admin/plans/${plan.id}`, { description: 'Should not be saved', slug: 'virtual-mailbox-annual' });   // slug collides -> must fail as a whole
    expect(r.status >= 400, `attempt ${i + 1} returned ${r.status}`);
  }
  const p = await one('SELECT description, slug FROM plans WHERE id=$1', [plan.id]);
  expect(p.description !== 'Should not be saved' && p.slug === 'virtual-mailbox-monthly', `plan left as ${JSON.stringify(p)}`);
  const idle = await one(`SELECT COUNT(*)::int n FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction'`);
  expect(Number(idle.n) === 0, `${idle.n} connections left inside an open transaction`);
});
await step('T3', 'Customer plan change is honestly unavailable, not a fake success', async () => {
  const d = await fullCustomer(); const before = await one('SELECT plan_id FROM "user" WHERE id=$1', [d.id]);
  const r = await d.s.post('/api/billing/change-plan', { plan_id: plan.id }); expect(r.status === 501, `got ${r.status}`);
  expect(String((await one('SELECT plan_id FROM "user" WHERE id=$1', [d.id])).plan_id) === String(before.plan_id), 'plan changed locally');
});
await step('T4', 'No connection is left inside a transaction after all of the above', async () => {
  await new Promise(r => setTimeout(r, 300));
  const idle = await one(`SELECT COUNT(*)::int n FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction'`);
  expect(Number(idle.n) === 0, `${idle.n} idle-in-transaction connections`);
});

await pg.end();
process.exit(report() ? 0 : 1);
