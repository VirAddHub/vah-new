const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../server');

// envs used in tests
const BOOTSTRAP_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@test.local';
const BOOTSTRAP_PASS = process.env.TEST_ADMIN_PASSWORD || 'Password123!';
const JWT_COOKIE = process.env.JWT_COOKIE || 'vah_session';
const JWT_SECRET = process.env.JWT_SECRET || 'testing-secret';

describe('Health', () => {
  test('GET /api/healthz -> 200', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
  });
});

describe('Auth + Profile', () => {
  const agent = request.agent(app);

  test('POST /api/auth/signup -> creates session cookie (or log in if already exists)', async () => {
    const email = 'u1@example.com';
    const password = 'Password123!';

    let res = await agent.post('/api/auth/signup').send({
      email,
      password,
      first_name: 'U1',
      last_name: 'Test'
    });

    if (res.status === 409) {
      res = await agent.post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(201);
    }

    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.join(';')).toMatch(/vah_session=/);
  });

  test('GET /api/profile -> returns current user', async () => {
    const res = await agent.get('/api/profile');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('u1@example.com');
  });

  test('POST /api/auth/logout -> clears cookie', async () => {
    const res = await agent.post('/api/auth/logout');
    expect([204, 200]).toContain(res.status);
  });

  test('POST /api/auth/login -> sets cookie', async () => {
    const res = await agent.post('/api/auth/login').send({
      email: 'u1@example.com',
      password: 'Password123!'
    });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.join(';')).toMatch(/vah_session=/);
  });
});

describe('Auth guard', () => {
  test('GET /api/mail-items without cookie -> 401', async () => {
    const res = await request(app).get('/api/mail-items');
    expect(res.status).toBe(401);
  });
});

describe('Admin guard', () => {
  const userAgent = request.agent(app);

  test('Create normal user (or log in if already exists)', async () => {
    let r = await userAgent.post('/api/auth/signup').send({
      email: 'u2@example.com',
      password: 'Password123!'
    });

    if (r.status === 409) {
      r = await userAgent.post('/api/auth/login').send({
        email: 'u2@example.com',
        password: 'Password123!'
      });
      expect(r.status).toBe(200);
    } else {
      expect(r.status).toBe(201);
    }
  });

  test('Admin can list users; normal user receives 403', async () => {
    // normal user -> 403
    const r1 = await userAgent.get('/api/admin/users');
    expect(r1.status).toBe(403);

    // 🔑 Mint an admin JWT and send it as the cookie (no flaky login path)
    const adminToken = jwt.sign(
      { id: 9999, is_admin: true }, // id doesn't matter for this endpoint
      JWT_SECRET,
      { expiresIn: '10m', issuer: 'virtualaddresshub', audience: 'vah-users' }
    );

    const r2 = await request(app)
      .get('/api/admin/users')
      .set('Cookie', [`${JWT_COOKIE}=${adminToken}`]);

    expect(r2.status).toBe(200);
    expect(Array.isArray(r2.body.data)).toBe(true);
  });
});
