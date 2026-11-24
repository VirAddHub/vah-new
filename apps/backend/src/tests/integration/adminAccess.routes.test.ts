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
