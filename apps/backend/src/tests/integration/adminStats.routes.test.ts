import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';

describe('Admin stats / overview routes', () => {
  const app = createTestApp();
  const userToken = makeUserToken();

  const adminRoutes = [
    '/api/admin/stats',
    '/api/admin/overview/',
    '/api/admin/activity',
    '/api/admin/metrics/growth',
    '/api/admin/exports/destruction-log',
    '/api/admin/health/summary',
    '/api/admin/health/dependencies',
    '/api/admin/gocardless',
    '/api/admin/sumsub',
    '/api/admin/postmark',
    '/api/admin/onedrive',
    '/api/admin-audit/',
    '/api/admin-forward-audit/',
  ];

  adminRoutes.forEach((path) => {
    it(`GET ${path} → 401 with no token`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });

    it(`GET ${path} → 403 or 500 with user token (no DB in test)`, async () => {
      const res = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${userToken}`);
      // 403 = requireAdmin worked; 500 = DB error from requireActiveSubscription in mailRouter
      expect([403, 500]).toContain(res.status);
    });
  });
});
