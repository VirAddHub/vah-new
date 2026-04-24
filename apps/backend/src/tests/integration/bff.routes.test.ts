import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('BFF routes', () => {
  const app = createTestApp();
  const token = makeUserToken();
  const adminToken = makeAdminToken();

  it('GET /api/bff/mail/scan-url → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/bff/mail/scan-url');
    expect(res.status).toBe(401);
  });

  it('GET /api/legacy/mail-items/:id/download → 404 (deleted)', async () => {
    const res = await request(app)
      .get('/api/legacy/mail-items/123/download')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
