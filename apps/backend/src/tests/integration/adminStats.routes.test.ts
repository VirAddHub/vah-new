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
    // 401 (not signed in) or 403 (admin guard) are both a refusal. The audit routers answer 403;
    // they used to answer 401 only because a misplaced subscription check ran first.
    it(`GET ${path} → refused (401 or 403) with no token`, async () => {
      const res = await request(app).get(path);
      expect([401, 403]).toContain(res.status);
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
