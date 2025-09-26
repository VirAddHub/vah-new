const request = require('supertest');
const { app } = require('../server');

describe('Payments: redirect flow (mock) + cancel + status', () => {
  const agent = request.agent(app);
  const email = 'pay1@example.com';
  const pass = 'Password123!';

  beforeAll(async () => {
    await agent.post('/api/auth/signup').send({ email, password: pass });
  });

  test('POST /api/payments/redirect-flows -> returns mock redirect_url', async () => {
    const r = await agent.post('/api/payments/redirect-flows').send({});
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.data.redirect_flow_id).toBeTruthy();

    const r2 = await agent.post(`/api/payments/redirect-flows/${r.body.data.redirect_flow_id}/complete`).send({});
    expect(r2.status).toBe(200);
  });

  test('GET /api/payments/subscriptions/status -> returns plan_status', async () => {
    const r = await agent.get('/api/payments/subscriptions/status');
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveProperty('plan_status');
  });

  test('POST /api/payments/subscriptions { cancel } -> ok', async () => {
    const r = await agent.post('/api/payments/subscriptions').send({ action: 'cancel' });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });
});
