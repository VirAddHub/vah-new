const request = require('supertest');
const { app } = require('../server');
const { loginAdmin } = require('./_helpers');

describe('Reports (CSV) & Webhooks', () => {
  const adminAgent = request.agent(app);
  const userAgent = request.agent(app);
  let userId;

  beforeAll(async () => {
    await userAgent
      .post('/api/auth/signup')
      .send({ email: 'rw1@example.com', password: 'Password123!' });

    const p = await userAgent.get('/api/profile');
    userId = p.body.id; // use p.body.data.id if your API wraps responses

    const a = await loginAdmin(adminAgent);
    expect(a.status).toBe(200);
  });

  test('CSV reports return text/csv', async () => {
    const users = await adminAgent.get('/api/admin/reports/users/csv');
    expect(users.status).toBe(200);
    expect(users.headers['content-type']).toMatch(/text\/csv/);

    const mail = await adminAgent.get('/api/admin/reports/mail-items/csv');
    expect(mail.status).toBe(200);
    expect(mail.headers['content-type']).toMatch(/text\/csv/);

    const fwd = await adminAgent.get('/api/admin/reports/forwarding-log/csv');
    expect(fwd.status).toBe(200);
    expect(fwd.headers['content-type']).toMatch(/text\/csv/);
  });

  test('POST /api/webhooks/gocardless -> updates plan_status', async () => {
    const r = await request(app).post('/api/webhooks/gocardless').send({
      payment: { user_id: userId, status: 'confirmed', amount: 999, currency: 'GBP' },
    });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);

    const status = await userAgent.get('/api/payments/subscriptions/status');
    expect(status.status).toBe(200);
    expect(status.body.data.plan_status).toBe('active');
  });

  test('POST /api/webhooks/sumsub -> sets kyc to verified', async () => {
    const r = await request(app).post('/api/webhooks/sumsub').send({
      user_id: userId,
      applicant_id: 'app_123',
      review_status: 'approved',
    });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);

    const k = await userAgent.get('/api/kyc/status');
    expect(k.status).toBe(200);
    expect(k.body.data.kyc_status).toBe('verified');
  });
});
