const request = require('supertest');
const { app } = require('../server');
const { loginAdmin } = require('./_helpers');

describe('Admin mail controls', () => {
  const adminAgent = request.agent(app);
  const userAgent = request.agent(app);

  let userId, mailId;

  beforeAll(async () => {
    await userAgent
      .post('/api/auth/signup')
      .send({ email: 'am1@example.com', password: 'Password123!' });

    const p = await userAgent.get('/api/profile');
    userId = p.body.id; // adjust to p.body.data.id if your API wraps data

    const a = await loginAdmin(adminAgent);
    expect(a.status).toBe(200);

    const created = await adminAgent.post('/api/admin/mail-items').send({
      user_id: userId,
      subject: 'Admin Created',
      sender_name: 'ACME',
    });
    expect(created.status).toBe(201);
    mailId = created.body.data.id;
  });

  test('GET /api/admin/mail-items/:id -> ETag then 304 with If-None-Match', async () => {
    const r1 = await adminAgent.get(`/api/admin/mail-items/${mailId}`);
    expect(r1.status).toBe(200);
    const etag = r1.headers.etag;
    expect(etag).toBeTruthy();

    const r2 = await adminAgent
      .get(`/api/admin/mail-items/${mailId}`)
      .set('If-None-Match', etag);
    expect(r2.status).toBe(304);
  });

  test('PUT /api/admin/mail-items/:id -> set status=scanned', async () => {
    const r = await adminAgent
      .put(`/api/admin/mail-items/${mailId}`)
      .send({ status: 'scanned' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('scanned');
  });

  test('POST /api/admin/mail-items/:id/log-physical-dispatch -> ok', async () => {
    const r = await adminAgent
      .post(`/api/admin/mail-items/${mailId}/log-physical-dispatch`)
      .send({ tracking_number: 'RN123456789GB' });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });
});
