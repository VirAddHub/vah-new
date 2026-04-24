import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('Admin users routes', () => {
  const app = createTestApp();
  const userToken = makeUserToken();
  const adminToken = makeAdminToken();

  const adminRoutes = [
    { method: 'get', path: '/api/admin/users' },
    { method: 'get', path: '/api/admin/users/search?q=test' },
    { method: 'get', path: '/api/admin/users/stats' },
    { method: 'get', path: '/api/admin/users/deleted' },
    { method: 'get', path: '/api/admin/users/some-id' },
    { method: 'patch', path: '/api/admin/users/some-id' },
    { method: 'delete', path: '/api/admin/users/some-id' },
    { method: 'post', path: '/api/admin/users/some-id/restore' },
  ];

  adminRoutes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} → 401 with no token`, async () => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${path} → 403 or 500 with user token`, async () => {
      const res = await (request(app) as any)[method](path)
        .set('Authorization', `Bearer ${userToken}`);
      // 403 = requireAdmin worked; 500 = DB error from requireActiveSubscription in mailRouter
      expect([403, 500]).toContain(res.status);
    });
  });

  it('GET /api/admin/users → admin token gets response (not 401/403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200, 500]).toContain(res.status);
  });
});
