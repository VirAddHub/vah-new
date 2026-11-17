// The eight-step customer journey, plus the access checks around it.
// Conditions: database built by `npm run migrate`, rate limits ON, no manual activation, no patched build.
// Run:  node apps/backend/tests/journey/journey.mjs   (API must be running: npm run local:start)
// Steps not yet implemented in the product are reported as PENDING with the commit that will deliver them.
import { Session, db, step, expect, pending, report, stripeEvent, sendStripe, sendSumsub, sumsubReview, importMail, setScanUrl, startPdfServer, TEST_PDF, stripeFixture } from './lib.mjs';

const stamp = Date.now();
const customer = {
  first_name: 'Journey', last_name: 'Customer', email: `journey.${stamp}@example.test`, password: 'Journey!Passw0rd#1', phone: '+447700900001',
  business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678', company_name: 'Journey Widgets Ltd',
  forward_to_first_name: 'Journey', forward_to_last_name: 'Customer', address_line1: '1 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
  billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0,
};
const pg = await db();
const one = async (sql, args) => (await pg.query(sql, args)).rows[0];
const visitor = new Session(), s = new Session();
let userId;

// ---- Step 1: register ------------------------------------------------------------------------
await step('1.1', 'Visitor can use the contact form', async () => {
  const r = await visitor.post('/api/contact', { name: 'A Visitor', email: 'visitor@example.test', subject: 'Hello', message: 'A question about the service.', inquiryType: 'general' });
  expect(r.status !== 401 && r.status !== 403, `contact returned ${r.status}`); return `HTTP ${r.status}`;
});
await step('1.2', 'Unknown API route returns 404, not 401', async () => {
  const r = await visitor.get('/api/this-route-does-not-exist'); expect(r.status === 404, `got ${r.status}`);
});
await step('1.3', 'Signup creates the account and a session', async () => {
  const r = await s.post('/api/auth/signup', customer);
  expect(r.status === 200 || r.status === 201, `signup ${r.status} ${r.text.slice(0, 160)}`);
  expect(s.cookies.has('vah_session'), 'no session cookie set');
  const u = await one('SELECT id, status, plan_status FROM "user" WHERE email=$1', [customer.email]);
  expect(u, 'user row missing'); userId = Number(u.id); return `user ${userId}, status ${u.status}`;
});
await step('1.4', 'Signup creates the primary business', async () => {
  const b = await one('SELECT company_name, is_primary, companies_house_number FROM business WHERE user_id=$1', [userId]);
  expect(b && b.is_primary === true, 'no primary business row'); expect(b.company_name === customer.company_name, `company name ${b.company_name}`);
});

// ---- Onboarding access for an unpaid customer -------------------------------------------------
await step('1.5', 'Unpaid: Stripe publishable key reachable', async () => { const r = await s.get('/api/payments/stripe/publishable-key'); expect(r.status === 200, `got ${r.status}`); });
await step('1.6', 'Unpaid: checkout is reachable (not blocked by the subscription check)', async () => {
  const plan = await one(`SELECT id FROM plans WHERE slug='virtual-mailbox-monthly'`);
  const r = await s.post('/api/payments/stripe/checkout-session-embedded', { plan_id: Number(plan.id), billing_period: 'monthly' });
  expect(r.status !== 401 && r.status !== 403, `blocked with ${r.status}`); return `HTTP ${r.status} (dummy Stripe key locally; real session needs test keys)`;
});
await step('1.7', 'Unpaid: can start identity verification', async () => { const r = await s.post('/api/kyc/start', {}); expect(![401, 403].includes(r.status), `blocked with ${r.status}`); return `HTTP ${r.status} (501 = Sumsub not configured locally)`; });
await step('1.8', 'Unpaid: support, billing overview and company search reachable', async () => {
  const a = await s.post('/api/support/tickets', { subject: 'Help', message: 'Journey test ticket body', category: 'general' });
  const b = await s.get('/api/billing/overview'); const c = await s.get('/api/companies-house/search?q=test');
  for (const [n, r] of [['support', a], ['billing', b], ['companies-house', c]]) expect(![401, 403].includes(r.status), `${n} blocked with ${r.status}`);
  return `support ${a.status}, billing ${b.status}, companies-house ${c.status}`;
});
await step('1.9', 'Unpaid: mail, tags, forwarding, address and certificate are refused', async () => {
  for (const p of ['/api/mail-items', '/api/tags', '/api/forwarding/requests', '/api/profile/registered-office-address', '/api/profile/certificate', '/api/mail-search/search?q=a', '/api/bff/mail/scan-url?mailItemId=1']) {
    const r = await s.get(p); expect(r.status === 403, `${p} returned ${r.status}`);
    if (r.json) expect(r.json.error === 'service_restricted' && r.json.missing?.includes('payment_required'), `${p}: ${r.text.slice(0, 120)}`);
  }
});
await step('1.10', 'Unpaid: access decision points to payment', async () => {
  const a = (await s.get('/api/access')).json?.data;
  expect(a?.level === 'onboarding' && a.next === 'payment', JSON.stringify(a)); expect(a.payment.entitled === false, 'entitled without paying');
});

// ---- Step 4 (first half): an unpaid customer can leave and come back ---------------------------
await step('4.1', 'Unpaid customer can log out and log back in', async () => {
  await s.post('/api/auth/logout'); expect((await s.get('/api/auth/whoami')).status === 401, 'still signed in after logout');
  const r = await s.post('/api/auth/login', { email: customer.email, password: customer.password });
  expect(r.status === 200, `login ${r.status} ${r.text.slice(0, 120)}`);
});

// ---- Mail that arrives before the customer is eligible -----------------------------------------
const pdf = await startPdfServer();
let heldMailId;
await step('R.1', 'Mail arriving for a restricted customer is stored and held', async () => {
  const r = await importMail({ userId, sourceSlug: 'hmrc', fileName: `user${userId}_2026-11-15_HMRC.pdf`, oneDriveFileId: `held-${stamp}`, oneDriveDownloadUrl: pdf.url, receivedAt: new Date().toISOString() });
  expect(r.status === 200 || r.status === 201, `import ${r.status} ${JSON.stringify(r.json).slice(0, 160)}`);
  const m = await one('SELECT id, locked FROM mail_item WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]);
  expect(m, 'mail item not stored'); heldMailId = Number(m.id); await setScanUrl(heldMailId, pdf.url);
  return `item ${heldMailId}, locked=${m.locked}`;
});
await step('R.2', 'Restricted: only a count is shown; list, item, scan, download and forwarding refused', async () => {
  const a = (await s.get('/api/access')).json?.data; expect(a?.mailWaiting === 1, `mailWaiting=${a?.mailWaiting}`);
  expect(!JSON.stringify(a).toLowerCase().includes('hmrc'), 'access response leaks mail detail');
  for (const p of ['/api/mail-items', `/api/mail-items/${heldMailId}`, `/api/mail-items/${heldMailId}/scan-url`, `/api/mail-items/${heldMailId}/download`, `/api/bff/mail/scan-url?mailItemId=${heldMailId}`]) {
    const r = await s.get(p); expect(r.status === 403, `${p} returned ${r.status}`); expect(!r.text.includes('%PDF'), `${p} returned file bytes`);
  }
  const f = await s.post('/api/forwarding/requests', { mail_item_id: heldMailId }); expect(f.status === 403, `official-mail forwarding allowed while restricted: ${f.status}`);
});
await step('R.3', 'Restricted: the email says only that mail is waiting', async () => {
  const e = await one(`SELECT subject, body, template FROM local_email_outbox WHERE to_email=$1 ORDER BY id DESC LIMIT 1`, [customer.email]);
  expect(e, 'no email in the local outbox'); expect(e.subject === 'You have mail waiting', `subject: ${e.subject}`);
  const text = `${e.subject} ${e.body}`.toLowerCase();
  for (const word of ['hmrc', 'companies house', '.pdf', 'scan.pdf', 'sender']) expect(!text.includes(word), `email mentions "${word}"`);
});

// ---- Steps 2 and 3: payment --------------------------------------------------------------------
const plan = await one(`SELECT id, name FROM plans WHERE slug='virtual-mailbox-monthly'`);
const fx = stripeFixture(0, 0); let stripe;
await step('2', 'Pay in Stripe test mode (real checkout)', async () => pending('PROVIDER SANDBOX: needs your Stripe test keys in local/backend.env; step 3 simulates the events Stripe would send'));
await step('3.1', 'Payment events are rejected without a valid signature', async () => {
  const r = await sendStripe(stripeEvent('invoice.paid', fx.invoice()), { badSignature: true }); expect(r.status === 401, `got ${r.status}`);
});
await step('3.2', 'Payment events activate the right subscription and plan', async () => {
  stripe = stripeFixture(userId, plan.id, 'monthly');
  const bystander = await one(`SELECT id FROM "user" WHERE email='admin@example.test'`);
  for (const e of [stripeEvent('checkout.session.completed', stripe.checkout()), stripeEvent('customer.subscription.created', stripe.sub('active')), stripeEvent('invoice.paid', stripe.invoice())]) {
    const r = await sendStripe(e); expect(r.status === 200, `${e.type} -> ${r.status}`);
  }
  const sub = await one('SELECT status, stripe_subscription_id, plan_name, cadence, paid_through_ms FROM subscription WHERE user_id=$1', [userId]);
  expect(sub?.status === 'active' && sub.stripe_subscription_id === stripe.subscription, `subscription ${JSON.stringify(sub)}`);
  expect(sub.plan_name === plan.name && sub.cadence === 'monthly' && Number(sub.paid_through_ms) > Date.now(), 'plan, cadence or paid-through wrong');
  const u = await one('SELECT status, plan_id, plan_status FROM "user" WHERE id=$1', [userId]);
  expect(Number(u.plan_id) === Number(plan.id) && u.plan_status === 'active', `user ${JSON.stringify(u)}`);
  expect(u.status === 'active', 'account standing was changed by a payment');
  expect(Number((await one('SELECT COUNT(*)::int n FROM invoices WHERE user_id=$1', [userId])).n) === 1, 'expected exactly one invoice');
  expect(Number((await one('SELECT COUNT(*)::int n FROM subscription WHERE user_id=$1', [bystander.id])).n) === 0, 'another account was touched');
});
await step('3.3', 'Paid but unverified: still restricted, next step is verification', async () => {
  const a = (await s.get('/api/access')).json?.data;
  expect(a.payment.entitled === true && a.level === 'onboarding' && a.next === 'verification', JSON.stringify(a));
  expect((await s.get('/api/mail-items')).status === 403, 'payment alone opened the mail');
  expect((await s.get(`/api/bff/mail/scan-url?mailItemId=${heldMailId}`)).status === 403, 'payment alone opened a scan');
});
await step('4.2', 'Paid customer logs out and back in; lands on the right next step', async () => {
  await s.post('/api/auth/logout'); const r = await s.post('/api/auth/login', { email: customer.email, password: customer.password });
  expect(r.status === 200, `login ${r.status}`); const w = (await s.get('/api/auth/whoami')).json;
  expect((w?.data?.access ?? w?.data?.user?.access)?.next === 'verification', 'whoami does not carry the access decision');
});

// ---- Step 5: verification (simulated Sumsub events) --------------------------------------------
await step('5.1', 'Verification events are rejected without a valid signature', async () => {
  expect((await sendSumsub(sumsubReview(userId, 'GREEN'), { badSignature: true })).status === 401, 'bad signature accepted');
});
await step('5.2', 'Identity rejected with retry: still restricted', async () => {
  const r = await sendSumsub(sumsubReview(userId, 'RED', { reviewRejectType: 'RETRY', rejectLabels: ['DOCUMENT_PAGE_MISSING'] })); expect(r.status === 200, `got ${r.status}`);
  const a = (await s.get('/api/access')).json?.data; expect(a.level === 'onboarding' && !a.verification.primaryApproved, JSON.stringify(a.verification));
});
await step('5.3', 'Identity approved: full service opens', async () => {
  expect((await sendSumsub(sumsubReview(userId, 'GREEN'))).status === 200, 'event refused');
  const a = (await s.get('/api/access')).json?.data; expect(a.level === 'full' && a.next === 'mail' && a.missing.length === 0, JSON.stringify(a));
});

// ---- Step 6: mail received and opened ----------------------------------------------------------
await step('6.1', 'Held mail is released: it now appears in the inbox', async () => {
  const r = await s.get('/api/mail-items'); expect(r.status === 200, `list ${r.status}`);
  expect((r.json.items || []).some(i => Number(i.id) === heldMailId), 'held item not in the list');
});
let mailId;
await step('6.2', 'New mail is received for the right business', async () => {
  const r = await importMail({ userId, sourceSlug: 'bank', fileName: `user${userId}_2026-11-15_Bank.pdf`, oneDriveFileId: `new-${stamp}`, oneDriveDownloadUrl: pdf.url, receivedAt: new Date().toISOString() });
  expect(r.status === 200 || r.status === 201, `import ${r.status}`);
  const m = await one('SELECT m.id, b.is_primary FROM mail_item m JOIN business b ON b.id = m.business_id WHERE m.user_id=$1 ORDER BY m.id DESC LIMIT 1', [userId]);
  expect(m?.is_primary === true, 'not attached to the primary business'); mailId = Number(m.id);
  expect((await setScanUrl(mailId, pdf.url)).status === 200, 'worker could not set the scan link');
});
await step('6.3', 'Customer opens the scan and receives the PDF', async () => {
  const d = await s.get(`/api/mail-items/${mailId}`); expect(d.status === 200, `detail ${d.status}`);
  const r = await s.get(`/api/bff/mail/scan-url?mailItemId=${mailId}`);
  expect(r.status === 200 && r.text.startsWith('%PDF') && r.text.length === TEST_PDF.length, `scan ${r.status}, ${r.text.length} bytes`);
  // The route the website actually uses for the scan view and download:
  const w = await s.get(`/api/mail-items/${mailId}/download?disposition=inline`);
  expect(w.status === 200 && w.text.startsWith('%PDF'), `website scan route ${w.status}`);
});
await step('6.4', 'Another customer cannot open it', async () => {
  const other = new Session(); await other.post('/api/auth/signup', { ...customer, email: `other.${stamp}@example.test`, company_name: 'Other Ltd' });
  const r = await other.get(`/api/bff/mail/scan-url?mailItemId=${mailId}`); expect(r.status === 403 && !r.text.includes('%PDF'), `got ${r.status}`);
});

// ---- Step 7: forwarding ------------------------------------------------------------------------
let fwdId;
await step('7.1', 'Forwarding is requested with the address in the right fields', async () => {
  const r = await s.post('/api/forwarding/requests', { mail_item_id: mailId }); expect(r.status === 200 || r.status === 201, `create ${r.status} ${r.text.slice(0, 200)}`);
  const f = await one('SELECT id, to_name, address1, address2, city, postal, country, status FROM forwarding_request WHERE mail_item_id=$1', [mailId]);
  expect(f, 'no forwarding_request row'); fwdId = Number(f.id);
  expect(f.to_name === 'Journey Customer' && f.address1 === '1 Test Street' && f.city === 'London' && f.postal.replace(/\s/g, '') === 'SW1A1AA', JSON.stringify(f));
  return `request ${fwdId}, status ${f.status}`;
});
await step('7.2', 'A duplicate request for the same item is not created twice', async () => {
  await s.post('/api/forwarding/requests', { mail_item_id: mailId });
  expect(Number((await one('SELECT COUNT(*)::int n FROM forwarding_request WHERE mail_item_id=$1', [mailId])).n) === 1, 'duplicate forwarding request');
});

// ---- Step 8: admin processing ------------------------------------------------------------------
const admin = new Session();
await step('8.1', 'Admin sees the request in the queue', async () => {
  expect((await admin.post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' })).status === 200, 'admin login failed');
  const q = await admin.get('/api/admin/forwarding/requests'); expect(q.status === 200, `queue ${q.status}`);
  expect(JSON.stringify(q.json).includes(`"id":${fwdId}`) || JSON.stringify(q.json).includes(`"id":"${fwdId}"`), 'request not in the admin queue');
});
await step('8.2', 'Each status the admin sets is the status the customer sees', async () => {
  const seen = [];
  for (const action of ['mark_reviewed', 'start_processing', 'mark_dispatched']) {
    const r = await admin.patch(`/api/admin/forwarding/requests/${fwdId}`, { action, courier: 'Royal Mail', tracking_number: 'RM123456789GB' });
    expect(r.status === 200, `${action} -> ${r.status} ${r.text.slice(0, 160)}`);
    const adminStatus = (await one('SELECT status FROM forwarding_request WHERE id=$1', [fwdId])).status;
    const c = await s.get(`/api/forwarding/requests/${fwdId}`); expect(c.status === 200, `customer view ${c.status}`);
    const customerStatus = c.json?.data?.status ?? c.json?.status ?? c.json?.data?.request?.status;
    expect(String(customerStatus).toLowerCase() === String(adminStatus).toLowerCase(), `${action}: admin=${adminStatus} customer=${customerStatus}`); seen.push(adminStatus);
  }
  return seen.join(' -> ');
});
await step('8.3', 'A customer cannot reach the admin queue', async () => { expect((await s.get('/api/admin/forwarding/requests')).status === 403, 'customer reached admin'); });

pdf.close();
await pg.end();
process.exit(report() ? 0 : 1);
