import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('Admin billing routes', () => {
  const app = createTestApp();
  const userToken = makeUserToken();

  const routes = [
    { method: 'get', path: '/api/admin/invoices' },
    { method: 'get', path: '/api/admin/invoices/some-id' },
    { method: 'get', path: '/api/admin/invoices/some-id/download' },
    { method: 'post', path: '/api/admin/generate-invoice' },
    { method: 'post', path: '/api/admin/recalculate-invoice' },
    { method: 'post', path: '/api/admin/repair-orphan-charges' },
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
