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
  // No clean-up: identity results are permanent records (identity_check cannot be deleted). The test database is disposable.
  afterAll(() => undefined);

  it('is off unless explicitly set to true, and without a provider online verification is unavailable', async () => {
    process.env.KYC_AUTO_APPROVE_FOR_TESTING = 'yes';
    const res = await request(app).post('/api/kyc/start').set('Authorization', `Bearer ${token}`).send({});
    expect(res.body.auto_approved).toBeUndefined();
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('identity_verification_unavailable');
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('sumsub');
    const status = await request(app).get('/api/kyc/status').set('Authorization', `Bearer ${token}`);
    expect(status.body.data).toMatchObject({ status: 'not_started', online_verification: false });
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
    const rec = await getPool().query(`SELECT method, outcome FROM identity_check WHERE user_id = $1`, [USER]);
    expect(rec.rows).toEqual([{ method: 'testing', outcome: 'verified' }]);
  });

  it('the former Sumsub webhook is gone and stores nothing', async () => {
    const before = (await getPool().query(`SELECT COUNT(*)::int AS n FROM verification_event`)).rows[0].n;
    const res = await request(app).post('/api/webhooks/sumsub').set('content-type', 'application/json').send(JSON.stringify({ type: 'applicantReviewed', externalUserId: String(USER), reviewResult: { reviewAnswer: 'GREEN' } }));
    expect(res.status).toBe(410);
    expect((await getPool().query(`SELECT COUNT(*)::int AS n FROM verification_event`)).rows[0].n).toBe(before);
  });
});
