// Stripe event reliability: duplicates, retries, concurrency, ordering, renewal failure, recovery,
// cancellation, resubscription. MOCK tests: events are built and signed locally, not sent by Stripe.
// Run with the API up:  node apps/backend/tests/journey/stripe-events.mjs
import { Session, db, step, expect, report, stripeEvent, sendStripe, sendSumsub, sumsubReview, stripeFixture, uid } from './lib.mjs';

const pg = await db();
const one = async (sql, args) => (await pg.query(sql, args)).rows[0];
const plan = await one(`SELECT id, name FROM plans WHERE slug='virtual-mailbox-monthly'`);
const annual = await one(`SELECT id, name FROM plans WHERE slug='virtual-mailbox-annual'`);
const T = Math.floor(Date.now() / 1000);
let n = 0;

/** A fresh signed-up customer (through the real signup route). Optionally verified through a simulated Sumsub approval. */
async function newCustomer({ verified = true } = {}) {
  const s = new Session(); const email = `evt.${Date.now()}.${n++}@example.test`;
  const r = await s.post('/api/auth/signup', { first_name: 'Event', last_name: 'Tester', email, password: 'Journey!Passw0rd#1', phone: '+447700900002',
    business_type: 'limited_company', country_of_incorporation: 'GB', company_number: '12345678', company_name: 'Event Test Ltd',
    forward_to_first_name: 'Event', forward_to_last_name: 'Tester', address_line1: '2 Test Street', city: 'London', postcode: 'SW1A 1AA', forward_country: 'GB',
    billing: 'monthly', price: '9.99', isSoleController: true, additionalControllersCount: 0 });
  if (r.status >= 300) throw new Error(`signup ${r.status} ${r.text.slice(0, 120)}`);
  const id = Number((await one('SELECT id FROM "user" WHERE email=$1', [email])).id);
  if (verified) await sendSumsub(sumsubReview(id, 'GREEN'));
  return { s, id, email, access: async () => (await s.get('/api/access')).json?.data, sub: () => one('SELECT * FROM subscription WHERE user_id=$1', [id]) };
}
const pay = async (c, fx, o = {}) => { for (const e of [stripeEvent('checkout.session.completed', fx.checkout(), { created: T }), stripeEvent('invoice.paid', fx.invoice(o), { created: T })]) { const r = await sendStripe(e); if (r.status !== 200) throw new Error(`${e.type} ${r.status}`); } };
const count = async (table, id) => Number((await one(`SELECT COUNT(*)::int n FROM ${table} WHERE user_id=$1`, [id])).n);

await step('E1', 'Same event delivered twice: one subscription, one invoice, one email', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id);
  await sendStripe(stripeEvent('checkout.session.completed', fx.checkout(), { created: T }));
  const paid = stripeEvent('invoice.paid', fx.invoice(), { created: T });
  const a = await sendStripe(paid), b = await sendStripe(paid);
  expect(a.status === 200 && b.status === 200 && b.json?.duplicate === true, `first ${a.status}, second ${b.status} ${JSON.stringify(b.json)}`);
  expect(await count('invoices', c.id) === 1 && await count('subscription', c.id) === 1, 'duplicate rows created');
  const mails = Number((await one(`SELECT COUNT(*)::int n FROM local_email_outbox WHERE to_email=$1 AND template = 'invoice-sent'`, [c.email])).n);
  expect(mails === 1, `${mails} invoice emails (expected exactly 1)`);
});

await step('E2', 'Ten concurrent deliveries of one event do the work once', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id);
  await sendStripe(stripeEvent('checkout.session.completed', fx.checkout(), { created: T }));
  const paid = stripeEvent('invoice.paid', fx.invoice(), { created: T });
  const rs = await Promise.all(Array.from({ length: 10 }, () => sendStripe(paid)));
  expect(rs.every(r => r.status === 200), `statuses ${rs.map(r => r.status)}`);
  expect(await count('invoices', c.id) === 1, `${await count('invoices', c.id)} invoices`);
  expect(Number((await one(`SELECT attempts FROM webhook_log WHERE external_event_id=$1`, [paid.id])).attempts) === 1, 'work was done more than once');
});

await step('E3', 'A failed attempt stays retryable and the retry completes it', async () => {
  const c = await newCustomer(); const tmp = await one(`INSERT INTO plans (name, slug, description, price_pence, interval, currency, features_json, active, vat_inclusive, trial_days, sort)
    VALUES ('Temp', $1, 't', 999, 'month', 'GBP', '[]', false, true, 0, 99) RETURNING id`, [uid('tmp')]);
  const fx = stripeFixture(c.id, tmp.id); const e = stripeEvent('checkout.session.completed', fx.checkout(), { created: T });
  const first = await sendStripe(e); expect(first.status === 500, `first attempt ${first.status}`);
  expect((await one(`SELECT status FROM webhook_log WHERE external_event_id=$1`, [e.id])).status === 'failed', 'not marked failed');
  expect(!(await c.sub()), 'a failed attempt left a subscription behind');
  await pg.query('UPDATE plans SET active=true WHERE id=$1', [tmp.id]);   // the fault clears
  const retry = await sendStripe(e); expect(retry.status === 200 && !retry.json?.duplicate, `retry ${retry.status} ${JSON.stringify(retry.json)}`);
  expect((await c.sub())?.status === 'active', 'retry did not activate');
  await pg.query('UPDATE plans SET active=false WHERE id=$1', [tmp.id]);
});

await step('E4', 'Events in any order end in the same state (invoice first, checkout last)', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id);
  for (const e of [stripeEvent('invoice.paid', fx.invoice(), { created: T }), stripeEvent('customer.subscription.created', fx.sub('incomplete'), { created: T }), stripeEvent('checkout.session.completed', fx.checkout(), { created: T })]) {
    const r = await sendStripe(e); expect(r.status === 200, `${e.type} ${r.status}`);
  }
  const sub = await c.sub(); expect(sub.status === 'active' && sub.plan_name === plan.name, JSON.stringify(sub.status));
  expect((await c.access()).level === 'full', 'not full after out-of-order activation');
});

await step('E5', 'An older "past due" cannot overwrite a newer "active"', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id); await pay(c, fx);
  await sendStripe(stripeEvent('customer.subscription.updated', fx.sub('active'), { created: T + 100 }));
  const r = await sendStripe(stripeEvent('customer.subscription.updated', fx.sub('past_due'), { created: T + 50 }));
  expect(r.status === 200, `got ${r.status}`); expect((await c.sub()).status === 'active', 'stale event applied');
});

await step('E6', 'Renewal fails after the paid period: service is restricted, login and billing still work', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id);
  await pay(c, fx, { start: T - 31 * 86400, end: T - 60 });                       // the period already paid for has ended
  expect((await c.access()).level === 'full', 'not full before the failure');
  await sendStripe(stripeEvent('invoice.payment_failed', fx.invoice(), { created: T + 10 }));
  const a = await c.access(); expect(a.level === 'onboarding' && a.next === 'billing' && a.missing.includes('payment_overdue'), JSON.stringify(a));
  expect((await c.s.get('/api/mail-items')).status === 403, 'mail open while overdue');
  expect((await c.s.get('/api/billing/overview')).status === 200, 'billing blocked while overdue');
  const again = new Session(); expect((await again.post('/api/auth/login', { email: c.email, password: 'Journey!Passw0rd#1' })).status === 200, 'cannot log in while overdue');
  c.fx = fx; globalThis.overdue = c;
});

await step('E7', 'Payment recovered: full service returns at once', async () => {
  const c = globalThis.overdue; await sendStripe(stripeEvent('invoice.paid', c.fx.invoice({ start: T, end: T + 30 * 86400 }), { created: T + 20 }));
  const a = await c.access(); expect(a.level === 'full' && a.payment.state === 'active', JSON.stringify(a));
  expect(await count('invoices', c.id) === 2, 'renewal invoice missing');
});

await step('E8', 'Renewal fails inside a period already paid for: service continues until that period ends', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id); await pay(c, fx, { start: T, end: T + 5 * 86400 });
  await sendStripe(stripeEvent('invoice.payment_failed', fx.invoice(), { created: T + 10 }));
  const a = await c.access(); expect(a.payment.state === 'past_due' && a.level === 'full', JSON.stringify(a.payment));
});

await step('E9', 'Cancel at period end: service continues, end date recorded; then it ends', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id); await pay(c, fx);
  await sendStripe(stripeEvent('customer.subscription.updated', fx.sub('active', { cancel_at_period_end: true }), { created: T + 10 }));
  let a = await c.access(); expect(a.level === 'full' && a.payment.cancelAtPeriodEnd === true && a.payment.paidThroughMs > Date.now(), JSON.stringify(a.payment));
  await sendStripe(stripeEvent('customer.subscription.deleted', fx.sub('canceled'), { created: T + 20 }));
  a = await c.access(); expect(a.level === 'onboarding' && a.missing.includes('subscription_cancelled') && a.next === 'billing', JSON.stringify(a));
  c.fx = fx; globalThis.cancelled = c;
});

await step('E10', 'Cancelled is final: a late event for the same subscription does not reactivate', async () => {
  const c = globalThis.cancelled;
  for (const e of [stripeEvent('invoice.paid', c.fx.invoice(), { created: T + 30 }), stripeEvent('customer.subscription.updated', c.fx.sub('active'), { created: T + 40 })]) {
    const r = await sendStripe(e); expect(r.status === 200, `${e.type} ${r.status}`);
  }
  expect((await c.sub()).status === 'cancelled' && (await c.access()).level === 'onboarding', 'cancelled subscription came back');
});

await step('E11', 'Resubscribing with a new Stripe subscription restores service without re-verifying', async () => {
  const c = globalThis.cancelled, fx2 = stripeFixture(c.id, annual.id, 'annual'); fx2.customer = c.fx.customer;
  for (const e of [stripeEvent('checkout.session.completed', { ...fx2.checkout(), customer: c.fx.customer }, { created: T + 60 }), stripeEvent('invoice.paid', { ...fx2.invoice(), customer: c.fx.customer }, { created: T + 60 })]) {
    const r = await sendStripe(e); expect(r.status === 200, `${e.type} ${r.status}`);
  }
  const sub = await c.sub(); expect(sub.status === 'active' && sub.cadence === 'annual' && sub.plan_name === annual.name, `${sub.status} ${sub.cadence}`);
  expect((await c.access()).level === 'full' && await count('subscription', c.id) === 1, 'not restored, or a second subscription row exists');
  // and the old subscription ending late must not cancel the new one
  await sendStripe(stripeEvent('customer.subscription.deleted', c.fx.sub('canceled'), { created: T + 70 }));
  expect((await c.sub()).status === 'active', 'old subscription cancelled the new one');
});

await step('E12', "One customer's payment cannot activate another customer's account", async () => {
  const payer = await newCustomer(), victim = await newCustomer(); const fx = stripeFixture(payer.id, plan.id); await pay(payer, fx);
  const forged = stripeFixture(victim.id, plan.id); const e = stripeEvent('checkout.session.completed', { ...forged.checkout(), customer: fx.customer }, { created: T });
  const r = await sendStripe(e); expect(r.status === 200, `got ${r.status}`);
  expect((await one(`SELECT status FROM webhook_log WHERE external_event_id=$1`, [e.id])).status === 'unmatched', 'not recorded as unmatched');
  expect(!(await victim.sub()), 'the other account was activated');
});

await step('E13', 'A plan that was not paid for is refused (annual plan id, monthly period)', async () => {
  const c = await newCustomer(); const fx = stripeFixture(c.id, annual.id, 'monthly');
  const r = await sendStripe(stripeEvent('checkout.session.completed', fx.checkout(), { created: T }));
  expect(r.status === 500 && !(await c.sub()), `status ${r.status}`);
});

await step('E14', 'Payment never unlocks verification, suspension or closure', async () => {
  const unverified = await newCustomer({ verified: false }); await pay(unverified, stripeFixture(unverified.id, plan.id));
  expect((await unverified.access()).level === 'onboarding', 'payment bypassed verification');
  const c = await newCustomer();
  const adminS = new Session(); await adminS.post('/api/auth/login', { email: 'admin@example.test', password: 'Local!Admin#2026' });
  expect((await adminS.post(`/api/admin/users/${c.id}/suspend`, { reason: 'event test: suspended before payment' })).status === 200, 'could not suspend');
  await pay(c, stripeFixture(c.id, plan.id));
  expect((await one('SELECT status FROM "user" WHERE id=$1', [c.id])).status === 'suspended', 'payment changed account standing');
  expect((await c.s.get('/api/access')).status === 401, 'suspended session still works');
  const again = new Session(); expect((await again.post('/api/auth/login', { email: c.email, password: 'Journey!Passw0rd#1' })).status === 403, 'suspended account can log in');
});

await step('E15', 'A failed first card leaves the account simply unpaid', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id);
  await sendStripe(stripeEvent('customer.subscription.created', fx.sub('incomplete'), { created: T }));
  await sendStripe(stripeEvent('invoice.payment_failed', fx.invoice(), { created: T }));
  const a = await c.access(); expect(a.payment.entitled === false && a.next === 'payment', JSON.stringify(a.payment));
});

await step('E16', 'Unknown event types are recorded and acknowledged', async () => {
  const e = stripeEvent('customer.tax_id.created', { id: uid('txi'), object: 'tax_id' }); const r = await sendStripe(e);
  expect(r.status === 200 && (await one(`SELECT status FROM webhook_log WHERE external_event_id=$1`, [e.id])).status === 'processed', `got ${r.status}`);
});

await step('E17', 'Two different Stripe invoices for the same period are both recorded', async () => {
  const c = await newCustomer(), fx = stripeFixture(c.id, plan.id); await pay(c, fx, { start: T, end: T + 30 * 86400 });
  const r = await sendStripe(stripeEvent('invoice.paid', fx.invoice({ start: T, end: T + 30 * 86400 }), { created: T + 5 }));
  expect(r.status === 200, `second invoice ${r.status}`); expect(await count('invoices', c.id) === 2, `${await count('invoices', c.id)} invoices`);
});

await step('E18', 'invoice.paid and subscription.created arriving together keep the paid-through date', async () => {
  // Seen on staging with real Stripe sandbox deliveries 70 ms apart.
  for (let i = 0; i < 5; i++) {
    const c = await newCustomer(), fx = stripeFixture(c.id, plan.id);
    const rs = await Promise.all([sendStripe(stripeEvent('invoice.paid', fx.invoice(), { created: T })), sendStripe(stripeEvent('customer.subscription.created', fx.sub('active'), { created: T }))]);
    expect(rs.every(r => r.status === 200), `statuses ${rs.map(r => r.status)}`);
    const sub = await c.sub();
    expect(sub?.status === 'active' && Number(sub.paid_through_ms) > Date.now(), `run ${i}: ${JSON.stringify({ status: sub?.status, paid_through_ms: sub?.paid_through_ms })}`);
    expect(await count('invoices', c.id) === 1 && await count('subscription', c.id) === 1, 'duplicate rows');
  }
});

await pg.end();
process.exit(report() ? 0 : 1);
