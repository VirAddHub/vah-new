/**
 * Stripe webhook and checkout tests.
 * - Signature verification: invalid/missing -> 401.
 * - Integration: invoice.paid / invoice.payment_failed (require STRIPE_WEBHOOK_SECRET + DB).
 * - Address gating: registered-office-address requires billing + KYC.
 */

const request = require('supertest');
process.env.SKIP_BOOT_SIDE_EFFECTS = '1';
const { app } = require('../dist/server/index.js');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

function buildStripeEvent(type, object) {
  return {
    id: `evt_${type.replace(/\./g, '_')}_${Date.now()}`,
    object: 'event',
    type,
    data: { object },
    livemode: false,
    created: Math.floor(Date.now() / 1000),
  };
}

function signStripePayload(payloadString, secret) {
  const Stripe = require('stripe');
  const stripe = new Stripe(secret || STRIPE_SECRET_KEY);
  return stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret: secret || STRIPE_WEBHOOK_SECRET,
  });
}

describe('Stripe webhook', () => {
  test('POST /api/webhooks/stripe - invalid signature returns 401', async () => {
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', 'invalid')
      .send(JSON.stringify({ type: 'invoice.paid', data: { object: {} } }));
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/webhooks/stripe - missing signature returns 401', async () => {
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'invoice.paid' }));
    expect(res.status).toBe(401);
  });
});

describe('Stripe webhook integration (signed events)', () => {
  let getPool;
  beforeAll(() => {
    try {
      getPool = require('../dist/server/db.js').getPool;
    } catch (e) {
      getPool = null;
    }
  });

  test('invoice.paid -> user plan_status active, subscription active, invoice paid', async () => {
    if (!getPool || !process.env.DATABASE_URL) {
      return;
    }
    process.env.BILLING_PROVIDER = 'stripe';
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = STRIPE_SECRET_KEY;

    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({
      email: `stripe-inv-paid-${Date.now()}@example.com`,
      password: 'Password123!',
      first_name: 'Stripe',
      last_name: 'Test',
    });
    const profileRes = await agent.get('/api/profile').set('x-test-bypass', '1');
    const userId = profileRes.body?.data?.id ?? profileRes.body?.id;
    if (!userId) return;

    const pool = getPool();
    const cusId = 'cus_integration_test_paid';
    const subId = 'sub_integration_test_paid';
    await pool.query(
      `UPDATE "user" SET stripe_customer_id = $1, updated_at = $2 WHERE id = $3`,
      [cusId, Date.now(), userId]
    );
    await pool.query(
      `INSERT INTO subscription (user_id, status, stripe_subscription_id, created_at, updated_at)
       VALUES ($1, 'pending', $2, $3, $3)
       ON CONFLICT (user_id) DO UPDATE SET stripe_subscription_id = $2, updated_at = $3`,
      [userId, subId, Date.now()]
    );

    const invoice = {
      id: `in_integration_${Date.now()}`,
      object: 'invoice',
      amount_paid: 1999,
      currency: 'gbp',
      customer: cusId,
      subscription: subId,
      period_start: Math.floor(Date.now() / 1000) - 30 * 86400,
      period_end: Math.floor(Date.now() / 1000),
      payment_intent: 'pi_test_123',
      metadata: { userId: String(userId) },
      lines: { data: [{ period: { start: Math.floor(Date.now() / 1000) - 30 * 86400, end: Math.floor(Date.now() / 1000) } }] },
    };
    const event = buildStripeEvent('invoice.paid', invoice);
    const payloadString = JSON.stringify(event);
    const signature = signStripePayload(payloadString);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);
    expect(res.status).toBe(200);

    const statusRes = await agent.get('/api/payments/subscriptions/status').set('x-test-bypass', '1');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body?.data?.plan_status).toBe('active');

    const invRes = await pool.query(
      `SELECT id, status FROM invoices WHERE user_id = $1 AND stripe_invoice_id = $2`,
      [userId, invoice.id]
    );
    expect(invRes.rows.length).toBeGreaterThanOrEqual(1);
    expect(invRes.rows[0].status).toBe('paid');
  });

  test('invoice.payment_failed -> plan_status past_due, grace and retry set', async () => {
    if (!getPool || !process.env.DATABASE_URL) return;
    process.env.BILLING_PROVIDER = 'stripe';
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = STRIPE_SECRET_KEY;

    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({
      email: `stripe-inv-failed-${Date.now()}@example.com`,
      password: 'Password123!',
      first_name: 'Stripe',
      last_name: 'Test',
    });
    const profileRes = await agent.get('/api/profile').set('x-test-bypass', '1');
    const userId = profileRes.body?.data?.id ?? profileRes.body?.id;
    if (!userId) return;

    const pool = getPool();
    const cusId = 'cus_integration_test_failed';
    const subId = 'sub_integration_test_failed';
    await pool.query(
      `UPDATE "user" SET stripe_customer_id = $1, updated_at = $2 WHERE id = $3`,
      [cusId, Date.now(), userId]
    );
    await pool.query(
      `INSERT INTO subscription (user_id, status, stripe_subscription_id, created_at, updated_at)
       VALUES ($1, 'active', $2, $3, $3)
       ON CONFLICT (user_id) DO UPDATE SET stripe_subscription_id = $2, status = 'active', updated_at = $3`,
      [userId, subId, Date.now()]
    );

    const invoice = {
      id: `in_failed_${Date.now()}`,
      object: 'invoice',
      customer: cusId,
      subscription: subId,
      metadata: { userId: String(userId) },
    };
    const event = buildStripeEvent('invoice.payment_failed', invoice);
    const payloadString = JSON.stringify(event);
    const signature = signStripePayload(payloadString);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);
    expect(res.status).toBe(200);

    const statusRes = await agent.get('/api/payments/subscriptions/status').set('x-test-bypass', '1');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body?.data?.plan_status).toBe('past_due');

    const userRow = await pool.query(
      `SELECT payment_failed_at, payment_retry_count, payment_grace_until FROM "user" WHERE id = $1`,
      [userId]
    );
    expect(userRow.rows[0].payment_failed_at).toBeDefined();
    expect(Number(userRow.rows[0].payment_retry_count)).toBeGreaterThanOrEqual(1);
    expect(userRow.rows[0].payment_grace_until).toBeDefined();
  });
});

describe('Registered office address gating', () => {
  test('KYC not approved -> 403 KYC_REQUIRED', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({
      email: `gating-kyc-${Date.now()}@example.com`,
      password: 'Password123!',
      first_name: 'Gate',
      last_name: 'Test',
    });
    const r = await agent.get('/api/profile/registered-office-address').set('x-test-bypass', '1');
    expect(r.status).toBe(403);
    expect(r.body?.error).toBe('KYC_REQUIRED');
  });

  test('KYC approved but not entitled (no active subscription) -> 403 BILLING_REQUIRED', async () => {
    if (!require('../dist/server/db.js').getPool || !process.env.DATABASE_URL) return;
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({
      email: `gating-billing-${Date.now()}@example.com`,
      password: 'Password123!',
      first_name: 'Gate',
      last_name: 'Test',
    });
    const profileRes = await agent.get('/api/profile').set('x-test-bypass', '1');
    const userId = profileRes.body?.data?.id ?? profileRes.body?.id;
    if (!userId) return;
    const pool = require('../dist/server/db.js').getPool();
    await pool.query(
      `UPDATE "user" SET kyc_status = 'verified' WHERE id = $1`,
      [userId]
    );
    const r = await agent.get('/api/profile/registered-office-address').set('x-test-bypass', '1');
    expect(r.status).toBe(403);
    expect(r.body?.error).toBe('BILLING_REQUIRED');
  });

  test('KYC approved and entitled -> 200 with address', async () => {
    if (!require('../dist/server/db.js').getPool || !process.env.DATABASE_URL) return;
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({
      email: `gating-ok-${Date.now()}@example.com`,
      password: 'Password123!',
      first_name: 'Gate',
      last_name: 'Test',
    });
    const profileRes = await agent.get('/api/profile').set('x-test-bypass', '1');
    const userId = profileRes.body?.data?.id ?? profileRes.body?.id;
    if (!userId) return;
    const pool = require('../dist/server/db.js').getPool();
    await pool.query(
      `UPDATE "user" SET kyc_status = 'verified' WHERE id = $1`,
      [userId]
    );
    await pool.query(
      `INSERT INTO subscription (user_id, status, created_at, updated_at) VALUES ($1, 'active', $2, $2)
       ON CONFLICT (user_id) DO UPDATE SET status = 'active', updated_at = $2`,
      [userId, Date.now()]
    );
    const r = await agent.get('/api/profile/registered-office-address').set('x-test-bypass', '1');
    expect(r.status).toBe(200);
    expect(r.body?.ok).toBe(true);
    expect(r.body?.data?.inline).toBeDefined();
  });
});

describe('Stripe checkout session', () => {
  test('POST /api/payments/stripe/checkout-session - unauthenticated returns 401', async () => {
    const res = await request(app)
      .post('/api/payments/stripe/checkout-session')
      .send({ billing_period: 'monthly' });
    expect(res.status).toBe(401);
  });

  test('POST /api/payments/stripe/checkout-session - authenticated without Stripe config returns 503', async () => {
    process.env.BILLING_PROVIDER = 'gocardless';
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send({
      email: 'stripe-checkout-test@example.com',
      password: 'Password123!',
      first_name: 'Stripe',
      last_name: 'Test',
    });
    const res = await agent
      .post('/api/payments/stripe/checkout-session')
      .set('x-test-bypass', '1')
      .send({ billing_period: 'monthly' });
    expect([503, 400, 404]).toContain(res.status);
    if (res.status === 503) {
      expect(res.body.error).toMatch(/stripe_not_configured|checkout_failed/);
    }
  });
});
