const request = require('supertest');
const { app } = require('../server');
const { loginAdmin } = require('./_helpers');

describe('Mail (user flow)', () => {
  const userAgent = request.agent(app);
  const adminAgent = request.agent(app);

  let userId;
  let mailId;

  beforeAll(async () => {
    const s = await userAgent
      .post('/api/auth/signup')
      .send({ email: 'mu1@example.com', password: 'Password123!' });
    expect([201, 409]).toContain(s.status);

    const p = await userAgent.get('/api/profile');
    expect(p.status).toBe(200);
    userId = p.body.id; // change to p.body.data.id if your API wraps responses

    const a = await loginAdmin(adminAgent);
    expect(a.status).toBe(200);

    const created = await adminAgent.post('/api/admin/mail-items').send({
      user_id: userId,
      subject: 'Test Letter',
      sender_name: 'Sender Inc',
      notes: 'Be nice',
    });
    expect(created.status).toBe(201);
    mailId = created.body.data.id;
  });

  test('GET /api/mail-items lists the item', async () => {
    const r = await userAgent.get('/api/mail-items');
    expect(r.status).toBe(200);
    expect(r.body.data.some((x) => x.id === mailId)).toBe(true);
  });

  test('GET /api/mail-items/:id -> ok', async () => {
    const r = await userAgent.get(`/api/mail-items/${mailId}`);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(mailId);
  });

  test('POST /api/mail-items/:id/tag -> sets tag', async () => {
    const r = await userAgent
      .post(`/api/mail-items/${mailId}/tag`)
      .send({ tag: 'important' });
    expect(r.status).toBe(200);
    expect(r.body.data.tag).toBe('important');
  });

  test('GET /api/mail-items/:id/history -> returns events', async () => {
    const r = await userAgent.get(`/api/mail-items/${mailId}/history`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  test('DELETE /api/mail-items/:id -> archive; restore works', async () => {
    const del = await userAgent.delete(`/api/mail-items/${mailId}`);
    expect(del.status).toBe(200);

    const list = await userAgent.get('/api/mail-items');
    expect(list.status).toBe(200);
    expect(list.body.data.find((x) => x.id === mailId)).toBeFalsy();

    const restore = await userAgent
      .post(`/api/mail-items/${mailId}/restore`)
      .send({});
    expect(restore.status).toBe(200);

    const list2 = await userAgent.get('/api/mail-items');
    expect(list2.status).toBe(200);
    expect(list2.body.data.find((x) => x.id === mailId)).toBeTruthy();
  });
});
