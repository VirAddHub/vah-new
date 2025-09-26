const request = require('supertest');
const { app } = require('../server');
const { loginAdmin } = require('./_helpers');

describe('KYC + Support', () => {
  const userAgent = request.agent(app);
  const adminAgent = request.agent(app);

  beforeAll(async () => {
    await userAgent
      .post('/api/auth/signup')
      .send({ email: 'ks1@example.com', password: 'Password123!' });

    const a = await loginAdmin(adminAgent);
    expect(a.status).toBe(200);
  });

  test('POST /api/kyc/upload -> returns sdk token; GET /api/kyc/status -> returns data', async () => {
    const r = await userAgent.post('/api/kyc/upload').send({});
    expect(r.status).toBe(200);
    expect(r.body.data.sdk_access_token).toMatch(/sumsub_token_/);

    const r2 = await userAgent.get('/api/kyc/status');
    expect(r2.status).toBe(200);
    expect(r2.body.data).toHaveProperty('kyc_status');
  });

  test('Support ticket open/close flow', async () => {
    const open = await userAgent.post('/api/support/tickets').send({
      subject: 'Help please',
      message: 'Something is wrong',
    });
    expect(open.status).toBe(201);
    const ticketId = open.body.data.ticket_id;
    expect(ticketId).toBeTruthy();

    const close = await adminAgent
      .post(`/api/admin/support/tickets/${ticketId}/close`)
      .send({ note: 'Resolved' });
    expect(close.status).toBe(200);
    expect(close.body.ok).toBe(true);
  });
});
