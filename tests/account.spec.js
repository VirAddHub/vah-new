const request = require('supertest');
const { app } = require('../server');

describe('Account basics: password reset, profile update, address, plans', () => {
  const agent = request.agent(app);
  const email = 'acct1@example.com';
  const pass = 'Password123!';

  beforeAll(async () => {
    await agent.post('/api/auth/signup').send({ email, password: pass, first_name: 'A', last_name: 'One' });
  });

  test('POST /api/profile -> update profile fields', async () => {
    const res = await agent.post('/api/profile').send({
      first_name: 'Alpha',
      last_name: 'One',
      company_name: 'Test Co',
      forwarding_address: '221B Baker St, London'
    });
    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe('Alpha');
    expect(res.body.company_name).toBe('Test Co');
  });

  test('PUT /api/profile/address -> updates forwarding address', async () => {
    const res = await agent.put('/api/profile/address').send({
      forwarding_address: '10 Downing St, London'
    });
    expect(res.status).toBe(200);
    expect(res.body.forwarding_address).toMatch(/Downing/);
  });

  test('POST /api/profile/reset-password-request -> returns ok and debug token (test env)', async () => {
    const res = await request(app).post('/api/profile/reset-password-request').send({ email });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.debug_token).toBe('string');
    const r2 = await request(app).post('/api/profile/reset-password').send({
      token: res.body.debug_token,
      new_password: 'NewPassword123!'
    });
    expect(r2.status).toBe(200);
    expect(r2.body.ok).toBe(true);
  });

  test('POST /api/auth/login -> works with new password', async () => {
    const r = await request(app).post('/api/auth/login').send({ email, password: 'NewPassword123!' });
    expect(r.status).toBe(200);
  });

  test('GET /api/plans -> returns array (possibly empty)', async () => {
    const r = await request(app).get('/api/plans');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });
});
