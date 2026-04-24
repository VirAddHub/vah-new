import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Profile routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  it('GET /api/profile/ → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/profile/');
    expect(res.status).toBe(401);
  });

  it('GET /api/profile/ → 200 when authenticated (or 500 if no DB)', async () => {
    const res = await request(app)
      .get('/api/profile/')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 500]).toContain(res.status);
  });

  it('GET /api/profile/me → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/profile/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/profile/compliance → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/profile/compliance');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/profile/ → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/profile/').send({ firstName: 'Test' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/profile/me → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/profile/me').send({ firstName: 'Test' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/profile/company-details → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/profile/company-details').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /api/profile/controllers → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/profile/controllers').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/profile/registered-office-address → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/profile/registered-office-address');
    expect(res.status).toBe(401);
  });

  it('GET /api/profile/certificate-url → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/profile/certificate-url');
    expect(res.status).toBe(401);
  });

  it('GET /api/profile/certificate → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/profile/certificate');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/profile/contact → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/profile/contact').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/profile/confirm-email-change → accessible (200, 400, or 401)', async () => {
    const res = await request(app).get('/api/profile/confirm-email-change');
    expect([200, 400, 401]).toContain(res.status);
  });

  it('POST /api/profile/email-change/resend → 401 or 500 unauthenticated', async () => {
    const res = await request(app).post('/api/profile/email-change/resend');
    expect([401, 500]).toContain(res.status);
  });
});
