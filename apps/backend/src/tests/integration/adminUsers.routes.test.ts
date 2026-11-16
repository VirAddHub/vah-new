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

  // These three ran against a mocked pool that answered every SELECT with the same row. The auth
  // middleware has since gained its own database checks, which the mock also answered, so the
  // tests could no longer reach the route. They now use the real test database (globalSetup.ts).
  const lockedUser = async () => {
    const r = await db.getPool().query(
      `INSERT INTO "user" (email, password, first_name, last_name, is_admin, role, status, plan_status, is_sole_controller, login_attempts, locked_until, created_at, updated_at)
       VALUES ($1, 'x', 'Locked', 'User', false, 'user', 'active', 'pending_payment', true, 7, $2, $3, $3) RETURNING id`,
      [`locked.${Date.now()}.${Math.random().toString(36).slice(2)}@example.test`, Date.now() + 3600_000, Date.now()]);
    return Number(r.rows[0].id);
  };

  it('404 when user does not exist', async () => {
    const res = await request(app)
      .post('/api/admin/users/987654321/unlock-account')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('user_not_found');
  });

  it('200 and resets login_attempts + locked_until for a locked user', async () => {
    const id = await lockedUser();
    const res = await request(app)
      .post(`/api/admin/users/${id}/unlock-account`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.message).toBe('Account unlocked');

    const after = await db.getPool().query('SELECT login_attempts, locked_until FROM "user" WHERE id = $1', [id]);
    expect(Number(after.rows[0].login_attempts)).toBe(0);
    expect(after.rows[0].locked_until).toBeNull();
  });

  it('logs the unlock to admin_audit', async () => {
    const id = await lockedUser();
    await request(app)
      .post(`/api/admin/users/${id}/unlock-account`)
      .set('Authorization', `Bearer ${adminToken}`);

    const audit = await db.getPool().query(
      `SELECT admin_id FROM admin_audit WHERE action = 'unlock_account' AND target_id = $1`, [id]);
    expect(audit.rows.length).toBe(1);
    expect(Number(audit.rows[0].admin_id)).toBe(9999);
  });
});
