import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('Admin CH verification routes', () => {
  const app = createTestApp();
  const userToken = makeUserToken();
  const adminToken = makeAdminToken();

  it('GET /api/admin/ch-verification/submissions → 401 no token', async () => {
    const res = await request(app).get('/api/admin/ch-verification/submissions');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/ch-verification/submissions → 403 or 500 with user token', async () => {
    const res = await request(app)
      .get('/api/admin/ch-verification/submissions')
      .set('Authorization', `Bearer ${userToken}`);
    expect([403, 500]).toContain(res.status);
  });

  it('POST /api/admin/ch-verification/:userId/approve → 401 no token', async () => {
    const res = await request(app).post('/api/admin/ch-verification/some-user/approve');
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/ch-verification/:userId/reject → 401 no token', async () => {
    const res = await request(app).post('/api/admin/ch-verification/some-user/reject');
    expect(res.status).toBe(401);
  });

  // Confirm deleted routes still return 404 (even with admin token)
  it('GET /api/admin/ch-verification-reminders → 404', async () => {
    const res = await request(app)
      .get('/api/admin/ch-verification-reminders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/ch-verification/proof/:userId → 404', async () => {
    const res = await request(app)
      .get('/api/admin/ch-verification/proof/some-user')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
