// The eight-step customer journey, plus the access checks around it.
// Conditions: database built by `npm run migrate`, rate limits ON, no manual activation, no patched build.
// Run:  node apps/backend/tests/journey/journey.mjs   (API must be running: npm run local:start)
// Steps not yet implemented in the product are reported as PENDING with the commit that will deliver them.
import { Session, db, step, expect, pending, report } from './lib.mjs';

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
await step('1.9', 'Unpaid: mail and forwarding are refused with 403', async () => {
  const m = await s.get('/api/mail-items'), f = await s.get('/api/forwarding/requests'), t = await s.get('/api/tags');
  expect(m.status === 403 && f.status === 403 && t.status === 403, `mail ${m.status}, forwarding ${f.status}, tags ${t.status}`);
  expect(m.json?.error === 'subscription_required', `error code ${m.json?.error}`);
});

// ---- Steps 2-8 ---------------------------------------------------------------------------------
await step('2', 'Pay in Stripe test mode', async () => pending('needs Stripe test keys for a real session; request shape test arrives with commit 8'));
await step('3', 'Payment event activates the right account and subscription', async () => pending('commits 7 and 8 (Stripe event safety and activation)'));
await step('4.1', 'Unpaid customer can log out and log back in', async () => {
  await s.post('/api/auth/logout'); const again = new Session();
  const r = await again.post('/api/auth/login', { email: customer.email, password: customer.password });
  if (r.status === 401) pending('commit 9 (login for unpaid accounts); today login requires status=active');
  expect(r.status === 200, `login ${r.status}`);
});
await step('4.2', 'Paid customer logs out and back in to the dashboard', async () => pending('after commit 8'));
await step('5', 'Required verification completes (simulated Sumsub events)', async () => pending('needs approved access model: commits 10 and 12'));
await step('6', 'Test mail received and scan opened', async () => pending('after commit 8; scan served by the test PDF server'));
await step('7', 'Forwarding requested with correct address fields', async () => pending('commit 14'));
await step('8', 'Admin processes the request; customer sees each status', async () => pending('after step 7'));

await pg.end();
process.exit(report() ? 0 : 1);
