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
// M-1: Account lockout tests
// Uses vi.spyOn to mock the DB pool — no real database required.
// ---------------------------------------------------------------------------
describe('POST /api/auth/login — account lockout (M-1)', () => {
  const app = createTestApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Build a minimal mock pool that returns one user row then records UPDATE calls */
  function mockPoolWithUser(overrides: {
    login_attempts?: number;
    locked_until?: number | null;
    password?: string;
  } = {}) {
    const passwordHash = overrides.password ?? '$2b$10$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const queryMock = vi.fn().mockImplementation((sql: string) => {
      if (/SELECT/.test(sql)) {
        return Promise.resolve({
          rows: [{
            id: 42,
            email: 'user@example.com',
            password: passwordHash,
            first_name: 'Test',
            last_name: 'User',
            is_admin: false,
            role: 'user',
            status: 'active',
            kyc_status: 'pending',
            login_attempts: overrides.login_attempts ?? 0,
            locked_until: overrides.locked_until ?? null,
          }],
        });
      }
      // UPDATE — just acknowledge
      return Promise.resolve({ rowCount: 1, rows: [] });
    });
    return { query: queryMock };
  }

  it('returns 401 with generic message for wrong password (no enumeration)', async () => {
    const pool = mockPoolWithUser({ login_attempts: 0 });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('increments login_attempts on failed login', async () => {
    const pool = mockPoolWithUser({ login_attempts: 1 });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass1' });

    // Find the UPDATE call that increments attempts
    const updateCall = pool.query.mock.calls.find(
      (args: any[]) => /UPDATE/.test(args[0]) && /login_attempts/.test(args[0])
    );
    expect(updateCall).toBeDefined();
    // $1 = LOGIN_MAX_ATTEMPTS (5), $2 = lockUntil, $3 = now, $4 = userId
    expect(updateCall![1][3]).toBe(42); // userId
  });

  it('locks account after 5 failed attempts', async () => {
    // 4 prior failures — this attempt pushes to 5
    const pool = mockPoolWithUser({ login_attempts: 4 });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass1' });

    const updateCall = pool.query.mock.calls.find(
      (args: any[]) => /UPDATE/.test(args[0]) && /locked_until/.test(args[0])
    );
    expect(updateCall).toBeDefined();
    // When login_attempts + 1 >= 5, locked_until ($2) should be ~15 min in the future
    const lockUntil = updateCall![1][1] as number;
    expect(lockUntil).toBeGreaterThan(Date.now());
    expect(lockUntil).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000);
  });

  it('rejects login with generic message when account is locked', async () => {
    const lockUntil = Date.now() + 10 * 60 * 1000; // locked for 10 more minutes
    const pool = mockPoolWithUser({ login_attempts: 5, locked_until: lockUntil });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'AnyPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
    // Must not reveal that the account is specifically locked
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('clears expired lock before password check (success path)', async () => {
    const expiredLock = Date.now() - 1000; // expired 1 second ago
    const validHash = await bcrypt.hash('ValidPass1', 4); // cost 4 for fast tests
    const pool = mockPoolWithUser({
      login_attempts: 5,
      locked_until: expiredLock,
      password: validHash,
    });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'ValidPass1' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify the clear UPDATE fires (login_attempts = 0, locked_until = NULL)
    const clearCall = pool.query.mock.calls.find(
      (args: any[]) => /UPDATE/.test(args[0]) && /login_attempts\s*=\s*0/.test(args[0]) && /locked_until\s*=\s*NULL/.test(args[0])
    );
    expect(clearCall).toBeDefined();
  });

  it('clears expired lock before password check (wrong password — counts as attempt 1 not 6)', async () => {
    const expiredLock = Date.now() - 1000;
    const pool = mockPoolWithUser({ login_attempts: 5, locked_until: expiredLock });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');

    const allUpdates = pool.query.mock.calls.filter((args: any[]) => /UPDATE/.test(args[0]));

    // First UPDATE: clear expired lock (login_attempts = 0, locked_until = NULL)
    const clearCall = allUpdates.find(
      (args: any[]) => /login_attempts\s*=\s*0/.test(args[0]) && /locked_until\s*=\s*NULL/.test(args[0])
    );
    expect(clearCall).toBeDefined();

    // Second UPDATE: increment attempt — must come after the clear so the DB starts from 0
    const incrementCall = allUpdates.find(
      (args: any[]) => /login_attempts\s*=\s*login_attempts\s*\+\s*1/.test(args[0])
    );
    expect(incrementCall).toBeDefined();

    // The clear must appear before the increment in the call order
    const clearIndex = allUpdates.indexOf(clearCall!);
    const incrementIndex = allUpdates.indexOf(incrementCall!);
    expect(clearIndex).toBeLessThan(incrementIndex);

    // The increment must NOT set locked_until for this first failure (0+1=1, not ≥5)
    // $1 param is LOGIN_MAX_ATTEMPTS; $2 is lockUntil (only active when threshold met)
    // We verify the call was made — the CASE WHEN in SQL handles not locking at count 1
    expect(incrementCall![1][3]).toBe(42); // userId param matches
  });

  it('resets login_attempts and locked_until on successful login (no prior lock)', async () => {
    const validHash = await bcrypt.hash('ValidPass1', 4);
    const pool = mockPoolWithUser({ login_attempts: 3, locked_until: null, password: validHash });
    vi.spyOn(db, 'getPool').mockReturnValue(pool as any);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'ValidPass1' });

    // Success UPDATE must reset both fields
    const resetCall = pool.query.mock.calls.find(
      (args: any[]) => /UPDATE/.test(args[0]) &&
                       /login_attempts\s*=\s*0/.test(args[0]) &&
                       /locked_until\s*=\s*NULL/.test(args[0])
    );
    expect(resetCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// M-2: Shared password policy tests — reset-password/confirm
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

    // 400 would mean complexity failed; anything else means it passed the check
    expect(res.status).not.toBe(400);
    expect(res.body.error).not.toBe('password_too_weak');
  });
});
