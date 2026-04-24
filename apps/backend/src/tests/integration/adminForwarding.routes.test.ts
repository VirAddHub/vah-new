import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('Admin forwarding routes', () => {
  const app = createTestApp();
  const userToken = makeUserToken();
  const adminToken = makeAdminToken();

  const routes = [
    { method: 'get', path: '/api/admin/forwarding/stats' },
    { method: 'get', path: '/api/admin/forwarding/requests' },
    { method: 'patch', path: '/api/admin/forwarding/requests/some-id' },
    { method: 'post', path: '/api/admin/forwarding/requests/some-id/status' },
    { method: 'delete', path: '/api/admin/forwarding/requests/some-id' },
    { method: 'post', path: '/api/admin/forwarding/requests/some-id/lock' },
    { method: 'post', path: '/api/admin/forwarding/requests/some-id/unlock' },
    { method: 'post', path: '/api/admin/forwarding/requests/some-id/force-unlock' },
    { method: 'get', path: '/api/admin/forwarding/locks' },
    { method: 'get', path: '/api/admin/forwarding/requests/some-id/debug-status' },
  ];

  routes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} → 401 no token`, async () => {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${path} → 403 or 500 with user token`, async () => {
      const res = await (request(app) as any)[method](path)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});
      expect([403, 500]).toContain(res.status);
    });
  });
});
