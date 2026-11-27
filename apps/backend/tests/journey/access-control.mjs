// Who can see what. Two full-service customers (A and B), one restricted customer, an administrator
// and an anonymous visitor, each trying A's records: mail, scans, downloads, forwarding, invoices,
// businesses, Companies House proof and admin actions. Mock provider events (not provider-sandbox).
import { Session, db, step, expect, report, stripeEvent, sendStripe, recordIdentity, importMail, setScanUrl, startPdfServer, stripeFixture, TEST_PDF } from './lib.mjs';

const PW = 'Journey!Passw0rd#1';
const stamp = Date.now().toString(36);
const pg = await db();
const one = async (sql, args) => (await pg.query(sql, args)).rows[0];
const plan = await one(`SELECT id FROM plans WHERE slug='virtual-mailbox-monthly'`);
const pdf = await startPdfServer(4013);

async function customer(tag, { pay = true, verify = true } = {}) {
  const s = new Session(); const email = `ac.${tag}.${stamp}@example.test`;
  const r = await s.post('/api/auth/signup', {
    email, password: PW, first_name: 'Access', last_name: tag, business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678', company_name: `AC ${tag} Ltd`,
    forward_to_first_name: 'Access', forward_to_last_name: tag, address_line1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
    billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0 });
  if (r.status >= 300) throw new Error(`signup ${tag} ${r.status}`);
  const id = Number((await one('SELECT id FROM "user" WHERE email=$1', [email])).id);
  if (pay) { const fx = stripeFixture(id, plan.id, 'monthly'); for (const e of [stripeEvent('checkout.session.completed', fx.checkout()), stripeEvent('customer.subscription.created', fx.sub('active')), stripeEvent('invoice.paid', fx.invoice())]) await sendStripe(e); }
  if (verify) await recordIdentity(id);
  const m = await importMail({ userId: id, sourceSlug: 'hmrc', fileName: `user${id}_2026-11-17_HMRC.pdf`, oneDriveFileId: `ac-${tag}-${stamp}`, oneDriveDownloadUrl: pdf.url, receivedAt: new Date().toISOString() });
  const mailId = Number((await one('SELECT id FROM mail_item WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [id])).id);
  await setScanUrl(mailId, pdf.url);
  const business = Number((await one('SELECT id FROM business WHERE user_id=$1 AND is_primary', [id])).id);
  const invoice = (await one('SELECT id FROM invoices WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [id]))?.id;
  return { s, id, email, mailId, business, invoice: invoice ? Number(invoice) : null, importStatus: m.status };
}

const A = await customer('a'), B = await customer('b'), R = await customer('r', { verify: false });
const admin = new Session(); await admin.post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' });
const anon = new Session();
let fwdId;
await step('X0', 'Set-up: A is in full service and can use everything', async () => {
  expect((await A.s.get(`/api/mail-items/${A.mailId}`)).status === 200, 'A cannot read own mail');
  const scan = await A.s.get(`/api/bff/mail/scan-url?mailItemId=${A.mailId}`); expect(scan.status === 200 && scan.text.startsWith('%PDF'), `A scan ${scan.status}`);
  const f = await A.s.post('/api/forwarding/requests', { mail_item_id: A.mailId }); expect(f.status < 300, `A forward ${f.status}`);
  fwdId = Number((await one('SELECT id FROM forwarding_request WHERE mail_item_id=$1', [A.mailId])).id);
  expect(A.invoice, 'A has no invoice'); expect((await A.s.get(`/api/billing/invoices/${A.invoice}`)).status === 200, 'A cannot read own invoice');
});

const denied = s => s === 401 || s === 403 || s === 404;
const tries = who => [
  ['mail item', () => who.get(`/api/mail-items/${A.mailId}`)],
  ['scan link', () => who.get(`/api/mail-items/${A.mailId}/scan-url`)],
  ['scan (website)', () => who.get(`/api/bff/mail/scan-url?mailItemId=${A.mailId}`)],
  ['download', () => who.get(`/api/mail-items/${A.mailId}/download`)],
  ['edit mail', () => who.patch(`/api/mail-items/${A.mailId}`, { tag: 'mine' })],
  ['forward A’s mail', () => who.post('/api/forwarding/requests', { mail_item_id: A.mailId })],
  ['forwarding request', () => who.get(`/api/forwarding/requests/${fwdId}`)],
  ['invoice', () => who.get(`/api/billing/invoices/${A.invoice}`)],
  ['invoice PDF', () => who.get(`/api/billing/invoices/${A.invoice}/download`)],
  ['business', () => who.get(`/api/account/businesses/${A.business}`)],
  ['switch to A’s business', () => who.post(`/api/account/businesses/${A.business}/set-primary`)],
  ['rename A’s business', () => who.patch(`/api/account/businesses/${A.business}`, { company_name: 'Taken Ltd' })],
];
for (const [label, who] of [['B (another customer)', B.s], ['anonymous visitor', anon]]) {
  await step(label === 'anonymous visitor' ? 'X2' : 'X1', `${label} cannot read or change any of A's records`, async () => {
    const bad = [];
    for (const [what, fn] of tries(who)) { const r = await fn(); if (!denied(r.status) || r.text.includes('%PDF')) bad.push(`${what}: ${r.status}`); }
    expect(bad.length === 0, bad.join('; '));
    const fwdCount = Number((await one('SELECT COUNT(*)::int n FROM forwarding_request WHERE mail_item_id=$1', [A.mailId])).n);
    expect(fwdCount === 1, `forwarding requests for A's item: ${fwdCount}`);
    const biz = await one('SELECT user_id, company_name, is_primary FROM business WHERE id=$1', [A.business]);
    expect(Number(biz.user_id) === A.id && biz.is_primary && biz.company_name !== 'Taken Ltd', `A's business changed: ${JSON.stringify(biz)}`);
    return `${tries(who).length} attempts refused`;
  });
}
await step('X3', 'B filtering the mail list by A’s business sees none of A’s mail', async () => {
  const r = await B.s.get(`/api/mail-items?business_id=${A.business}`);
  expect(!JSON.stringify(r.json ?? '').includes(`"id":${A.mailId}`) && !JSON.stringify(r.json ?? '').includes(`"id":"${A.mailId}"`), `status ${r.status} listed A's mail`);
  return `status ${r.status}`;
});
await step('X4', 'A restricted customer (paid, not verified) cannot open their own mail, scans or forwarding', async () => {
  const bad = [];
  for (const [what, p] of [['list', '/api/mail-items'], ['item', `/api/mail-items/${R.mailId}`], ['scan link', `/api/mail-items/${R.mailId}/scan-url`], ['download', `/api/mail-items/${R.mailId}/download`], ['scan (website)', `/api/bff/mail/scan-url?mailItemId=${R.mailId}`]]) {
    const r = await R.s.get(p); if (r.status !== 403 || r.text.includes('%PDF')) bad.push(`${what}: ${r.status}`);
  }
  const f = await R.s.post('/api/forwarding/requests', { mail_item_id: R.mailId }); if (f.status !== 403) bad.push(`forward: ${f.status}`);
  expect(bad.length === 0, bad.join('; '));
});
await step('X5', 'A restricted customer can still see billing, invoices and their next step', async () => {
  const acc = (await R.s.get('/api/access')).json?.data; expect(acc?.next === 'verification' && acc.mailWaiting >= 1, JSON.stringify(acc));
  expect((await R.s.get('/api/billing/overview')).status === 200, 'billing overview blocked');
  expect((await R.s.get('/api/billing/invoices')).status === 200, 'invoices blocked');
});
await step('X6', 'Customers cannot use administrator functions', async () => {
  const bad = [];
  for (const [what, fn] of [
    ['user list', () => A.s.get('/api/admin/users')],
    ['standing', () => A.s.get(`/api/admin/users/${B.id}/standing`)],
    ['suspend', () => A.s.post(`/api/admin/users/${B.id}/suspend`, { reason: 'not allowed here' })],
    ['forwarding queue', () => A.s.get('/api/admin/forwarding/requests')],
    ['mark dispatched', () => A.s.patch(`/api/admin/forwarding/requests/${fwdId}`, { action: 'mark_dispatched' })],
    ['CH proof', () => A.s.get(`/api/admin/ch-verification/${B.id}/proof`)],
    ['CH approve', () => A.s.post(`/api/admin/ch-verification/${A.id}/approve`, {})],
    ['plans', () => A.s.patch(`/api/admin/plans/${plan.id}`, { price_pence: 1 })],
    ['invoices', () => A.s.get('/api/admin/invoices')],
  ]) { const r = await fn(); if (r.status !== 403 && r.status !== 401) bad.push(`${what}: ${r.status}`); }
  expect(bad.length === 0, bad.join('; '));
  const b = await one('SELECT status FROM "user" WHERE id=$1', [B.id]); expect(b.status === 'active', 'B was changed');
});
await step('X7', 'An administrator can review any account', async () => {
  expect((await admin.get(`/api/admin/users/${A.id}/standing`)).status === 200, 'admin cannot read standing');
  expect((await admin.get('/api/admin/forwarding/requests')).status === 200, 'admin cannot read the queue');
});
pdf.close(); await pg.end();
process.exit(report() ? 0 : 1);
