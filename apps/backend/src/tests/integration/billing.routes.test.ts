import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Billing routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  const protectedRoutes = [
    { method: 'get', path: '/api/billing/overview' },
    { method: 'get', path: '/api/billing/invoices' },
    { method: 'get', path: '/api/billing/invoices/some-id/download' },
    { method: 'post', path: '/api/billing/update-bank' },
    { method: 'post', path: '/api/billing/reauthorise' },
    { method: 'post', path: '/api/billing/payment-methods/setup-intent' },
    { method: 'post', path: '/api/billing/change-plan' },
  ];

  protectedRoutes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} → 401 unauthenticated`, async () => {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(401);
    });
  });
});
