// Temporary testing switch KYC_AUTO_APPROVE_FOR_TESTING (config/testingSwitches.ts).
import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';
import { getPool } from '../../server/db';
import { getAccess } from '../../server/services/access';

const USER = 30003; // own throwaway user so other test files are unaffected

describe('KYC auto-approve testing switch', () => {
  const app = createTestApp();
  const token = makeUserToken({ id: USER, email: 'kyc-switch@example.com' });

  afterEach(() => { delete process.env.KYC_AUTO_APPROVE_FOR_TESTING; });
  beforeAll(async () => {
    const now = Date.now();
    await getPool().query(
      `INSERT INTO "user" (id, email, password, first_name, last_name, is_admin, role, status, plan_status, kyc_status, is_sole_controller, created_at, updated_at)
       VALUES ($1, 'kyc-switch@example.com', 'x', 'Kyc', 'Switch', false, 'user', 'active', 'pending_payment', 'not_started', true, $2, $2)
       ON CONFLICT (id) DO NOTHING`, [USER, now]);
  });
  afterAll(async () => {
    await getPool().query(`DELETE FROM verification_event WHERE subject_id = $1`, [USER]).catch(() => undefined);
    await getPool().query(`DELETE FROM "user" WHERE id = $1`, [USER]);
  });

  it('is off unless explicitly set to true', async () => {
    process.env.KYC_AUTO_APPROVE_FOR_TESTING = 'yes';
    const res = await request(app).post('/api/kyc/start').set('Authorization', `Bearer ${token}`).send({});
    expect(res.body.auto_approved).toBeUndefined();
    const u = await getPool().query(`SELECT kyc_status FROM "user" WHERE id = $1`, [USER]);
    expect(u.rows[0].kyc_status).not.toBe('approved');
  });

  it('approves identity straight away when on', async () => {
    process.env.KYC_AUTO_APPROVE_FOR_TESTING = 'true';
    const res = await request(app).post('/api/kyc/start').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, auto_approved: true });
    const access = await getAccess(USER);
    expect(access?.verification.primaryApproved).toBe(true);
  });
});
