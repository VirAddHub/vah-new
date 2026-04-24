import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('Admin mail routes', () => {
  const app = createTestApp();
  const userToken = makeUserToken();
  const adminToken = makeAdminToken();

  const routes = [
    { method: 'get', path: '/api/admin/mail-items' },
    { method: 'get', path: '/api/admin/mail-items/some-id' },
    { method: 'put', path: '/api/admin/mail-items/some-id' },
    { method: 'post', path: '/api/admin/mail-items/some-id/log-physical-dispatch' },
    { method: 'post', path: '/api/admin/mail-items/some-id/mark-destroyed' },
    { method: 'post', path: '/api/admin/mail-items/bulk' },
  ];

  routes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} → 401 with no token`, async () => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${path} → 403 or 500 with user token`, async () => {
      const res = await (request(app) as any)[method](path)
        .set('Authorization', `Bearer ${userToken}`);
      expect([403, 500]).toContain(res.status);
    });
  });
});
