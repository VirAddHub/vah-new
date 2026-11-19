import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';
import * as db from '../../server/db';
import bcrypt from 'bcrypt';

describe('Auth routes', () => {
  const app = createTestApp();

  describe('POST /api/auth/signup', () => {
    it('400 when email missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ password: 'Password123!' });
      expect(res.status).toBe(400);
    });

    it('400 when password missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('400 when body empty', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('200 or 401 when not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/auth/whoami', () => {
    it('401 when no token', async () => {
      const res = await request(app).get('/api/auth/whoami');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/reset-password/request', () => {
    it('200 with any email (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'anyone@example.com' });
      expect(res.status).toBe(200);
    });

    it('200 even when email does not exist (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/profile/reset-password-request (307 shim)', () => {
    it('307 redirects to /api/auth/reset-password/request', async () => {
      const res = await request(app)
        .post('/api/profile/reset-password-request')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(307);
      expect(res.headers.location).toContain('/api/auth/reset-password/request');
    });
  });

  describe('GET /api/csrf', () => {
    it('200 with csrf token', async () => {
      const res = await request(app).get('/api/csrf');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('csrfToken');
    });
  });
});

// ---------------------------------------------------------------------------
// Sign-in throttling (replaces the M-1 account lockout, which let anyone lock a customer out
// with five wrong passwords). Real database; the end-to-end version is tests/journey/login-throttle.mjs.
// ---------------------------------------------------------------------------
describe('POST /api/auth/login — sign-in throttling', () => {
  const app = createTestApp();
  const pool = () => db.getPool();
  const PW = 'Correct!Horse#2026';
  let email: string;
  let userId: number;

  beforeEach(async () => {
    email = `throttle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const hash = await bcrypt.hash(PW, 4);
    const r = await pool().query(
      `INSERT INTO "user" (email, password, first_name, last_name, status, plan_status, created_at, updated_at, is_sole_controller)
       VALUES ($1, $2, 'T', 'U', 'active', 'active', $3, $3, true) RETURNING id`, [email, hash, Date.now()]);
    userId = Number(r.rows[0].id);
  });

  const login = (password: string, agent = request(app)) =>
    agent.post('/api/auth/login').set('X-Forwarded-For', '203.0.113.50').send({ email, password });

  it('returns 401 with the generic message for a wrong password (no enumeration)', async () => {
    const res = await login('wrong-password');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('blocks the same source after 5 failures, even with the right password, with a clear message', async () => {
    for (let i = 0; i < 5; i++) expect((await login('wrong')).status).toBe(401);
    const res = await login(PW);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('too_many_attempts');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('does not lock the account itself: user.locked_until stays empty', async () => {
    for (let i = 0; i < 6; i++) await login('wrong');
    const u = await pool().query('SELECT locked_until FROM "user" WHERE id = $1', [userId]);
    expect(u.rows[0].locked_until).toBeNull();
  });

  it('a recognised device can still sign in while its address is blocked for others', async () => {
    const agent = request.agent(app);
    const first = await login(PW, agent);
    expect(first.status).toBe(200);
    const device = (first.headers['set-cookie'] as unknown as string[]).find(c => c.startsWith('vah_device='));
    expect(device).toBeDefined();
    for (let i = 0; i < 5; i++) await login('wrong');            // a stranger, same address, no device cookie
    expect((await login(PW)).status).toBe(429);                    // the stranger is blocked
    const again = await request(app).post('/api/auth/login').set('X-Forwarded-For', '203.0.113.50')
      .set('Cookie', device!.split(';')[0]).send({ email, password: PW });
    expect(again.status).toBe(200);                                // the customer is not
  });

  it('a successful sign-in clears that source\'s failure count', async () => {
    for (let i = 0; i < 4; i++) await login('wrong');
    expect((await login(PW)).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await login('wrong')).status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
describe('POST /api/auth/reset-password/confirm — password policy (M-2)', () => {
  const app = createTestApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const weakCases = [
    { label: 'too short',          password: 'Ab1',           expectedFragment: '8 characters' },
    { label: 'no uppercase',       password: 'validpass1',    expectedFragment: 'uppercase' },
    { label: 'no lowercase',       password: 'VALIDPASS1',    expectedFragment: 'lowercase' },
    { label: 'no digit',           password: 'ValidPassword', expectedFragment: 'number' },
  ];

  for (const { label, password, expectedFragment } of weakCases) {
    it(`rejects weak password: ${label}`, async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token: 'some-token', password });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('password_too_weak');
      expect(res.body.message.toLowerCase()).toContain(expectedFragment.toLowerCase());
    });
  }

  it('passes complexity gate and proceeds to token lookup for a valid password', async () => {
    // A valid password should not be rejected by complexity — it proceeds to DB lookup.
    // With no DB mock the pool throws, which produces 500 (not 400), confirming the
    // complexity check was satisfied.
    const res = await request(app)
      .post('/api/auth/reset-password/confirm')
      .send({ token: 'some-token', password: 'ValidPass1' });

    // With a real test database the unknown token is correctly refused with 400 too, so the
    // status alone no longer tells the two apart: assert on the error code instead.
    expect(res.body.error).not.toBe('password_too_weak');
    expect(res.status).not.toBe(500);
  });
});
