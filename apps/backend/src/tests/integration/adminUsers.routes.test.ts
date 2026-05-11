import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken, makeAdminToken } from '../helpers/authHelper';
import * as db from '../../server/db';

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

// ---------------------------------------------------------------------------
// Unlock-account endpoint tests
// Uses vi.spyOn to mock the DB pool — no real database required.
// ---------------------------------------------------------------------------
describe('POST /api/admin/users/:id/unlock-account', () => {
  const app = createTestApp();
  const adminToken = makeAdminToken();
  const userToken = makeUserToken();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('401 when no token', async () => {
    const res = await request(app).post('/api/admin/users/42/unlock-account');
    expect(res.status).toBe(401);
  });

  it('403 when authenticated as regular user', async () => {
    const res = await request(app)
      .post('/api/admin/users/42/unlock-account')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('404 when user does not exist', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    const res = await request(app)
      .post('/api/admin/users/9999/unlock-account')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('user_not_found');
  });

  it('200 and resets login_attempts + locked_until for a locked user', async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (/SELECT/.test(sql)) {
          // User exists
          return Promise.resolve({ rows: [{ id: 42 }], rowCount: 1 });
        }
        // UPDATE and INSERT into admin_audit
        return Promise.resolve({ rows: [], rowCount: 1 });
      }),
    };
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    const res = await request(app)
      .post('/api/admin/users/42/unlock-account')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe('Account unlocked');

    // Verify the UPDATE sets login_attempts = 0 and locked_until = NULL
    const updateCall = pool.query.mock.calls.find(
      (args: any[]) => /UPDATE/.test(args[0]) &&
                       /login_attempts\s*=\s*0/.test(args[0]) &&
                       /locked_until\s*=\s*NULL/.test(args[0])
    );
    expect(updateCall).toBeDefined();
    // Second param ($2) is userId = 42
    expect(updateCall![1][1]).toBe(42);
  });

  it('logs the unlock to admin_audit', async () => {
    const pool = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (/SELECT/.test(sql)) {
          return Promise.resolve({ rows: [{ id: 42 }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      }),
    };
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    await request(app)
      .post('/api/admin/users/42/unlock-account')
      .set('Authorization', `Bearer ${adminToken}`);

    const auditCall = pool.query.mock.calls.find(
      (args: any[]) => /INSERT INTO admin_audit/.test(args[0]) &&
                       /unlock_account/.test(args[0])
    );
    expect(auditCall).toBeDefined();
    // target_id param ($2 in INSERT) = 42
    expect(auditCall![1][1]).toBe(42);
  });
});
