// Granting and removing admin access from the admin area (PATCH /api/admin/users/:id is_admin).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeAdminToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';
import { currentSessionVersion } from '../../lib/sessionVersion';

const ADMIN = 9999;          // fixture admin from globalSetup
const TARGET = 30001;        // throwaway account created here

describe('admin access control', () => {
  const app = createTestApp();
  const adminToken = makeAdminToken();

  beforeAll(async () => {
    const now = Date.now();
    await getPool().query(
      `INSERT INTO "user" (id, email, password, first_name, last_name, is_admin, role, status, plan_status, kyc_status, is_sole_controller, created_at, updated_at)
       VALUES ($1, 'grant-target@example.com', 'x', 'Grant', 'Target', false, 'user', 'active', 'pending_payment', 'not_started', true, $2, $2)
       ON CONFLICT (id) DO NOTHING`, [TARGET, now]);
  });
  afterAll(async () => {
    await getPool().query(`DELETE FROM admin_audit WHERE target_id = $1`, [TARGET]).catch(() => undefined);
    await getPool().query(`DELETE FROM "user" WHERE id = $1`, [TARGET]);
  });

  it('makes an account an admin, keeps role in step, signs it out and records it', async () => {
    const before = await currentSessionVersion(TARGET);
    const res = await request(app).patch(`/api/admin/users/${TARGET}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ is_admin: true });
    expect(res.status).toBe(200);
    const u = await getPool().query(`SELECT is_admin, role FROM "user" WHERE id = $1`, [TARGET]);
    expect(u.rows[0]).toMatchObject({ is_admin: true, role: 'admin' });
    expect(await currentSessionVersion(TARGET)).toBe(before + 1);
    const audit = await getPool().query(`SELECT 1 FROM admin_audit WHERE target_id = $1 AND admin_id = $2`, [TARGET, ADMIN]);
    expect(audit.rows.length).toBeGreaterThan(0);
  });

  it('removes admin access again', async () => {
    const res = await request(app).patch(`/api/admin/users/${TARGET}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ is_admin: false });
    expect(res.status).toBe(200);
    const u = await getPool().query(`SELECT is_admin, role FROM "user" WHERE id = $1`, [TARGET]);
    expect(u.rows[0]).toMatchObject({ is_admin: false, role: 'user' });
  });

  it('will not let an admin change their own admin access', async () => {
    const res = await request(app).patch(`/api/admin/users/${ADMIN}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ is_admin: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('cannot_change_own_admin');
    const u = await getPool().query(`SELECT is_admin FROM "user" WHERE id = $1`, [ADMIN]);
    expect(u.rows[0].is_admin).toBe(true);
  });
});

describe('creating an admin account', () => {
  const app = createTestApp();
  const adminToken = makeAdminToken();
  const EMAIL = 'new-admin@example.com';

  afterAll(async () => {
    const r = await getPool().query(`SELECT id FROM "user" WHERE email = $1`, [EMAIL]);
    for (const row of r.rows) {
      await getPool().query(`DELETE FROM admin_audit WHERE target_id = $1`, [row.id]).catch(() => undefined);
      await getPool().query(`DELETE FROM business WHERE user_id = $1`, [row.id]).catch(() => undefined);
      await getPool().query(`DELETE FROM "user" WHERE id = $1`, [row.id]);
    }
  });

  it('needs a first and last name', async () => {
    const res = await request(app).post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`).send({ account_type: 'admin', email: EMAIL });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name_required');
  });

  it('creates an admin with no business, a usable password link, and an audit entry', async () => {
    const res = await request(app).post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ account_type: 'admin', email: EMAIL, first_name: 'New', last_name: 'Admin', password: 'Ignored-Pass1' });
    expect(res.status).toBe(201);
    const id = res.body.data.id;
    const u = await getPool().query(
      `SELECT is_admin, role, reset_token_lookup_hash IS NOT NULL AS has_lookup FROM "user" WHERE id = $1`, [id]);
    expect(u.rows[0]).toMatchObject({ is_admin: true, role: 'admin' });
    const biz = await getPool().query(`SELECT 1 FROM business WHERE user_id = $1`, [id]);
    expect(biz.rows.length).toBe(0);
    const audit = await getPool().query(`SELECT 1 FROM admin_audit WHERE target_id = $1 AND action = 'create_admin'`, [id]);
    expect(audit.rows.length).toBe(1);
  });

  it('issues password links the reset page accepts', async () => {
    const { issuePasswordLink } = await import('../../server/services/passwordSetupLink');
    const r = await getPool().query(`SELECT id FROM "user" WHERE email = $1`, [EMAIL]);
    const token = await issuePasswordLink(r.rows[0].id, 60);
    const res = await request(app).post('/api/auth/reset-password/confirm').send({ token, password: 'Chosen-Pass1' });
    expect(res.status).toBe(200);
    // single use
    const again = await request(app).post('/api/auth/reset-password/confirm').send({ token, password: 'Chosen-Pass2' });
    expect(again.status).toBe(400);
  });
});
