import { api } from './_utils';
import crypto from 'crypto';

describe('password reset', () => {
  it('request -> receive 204; confirm -> 400 with invalid token', async () => {
    // 1) Request: always 204 (no enumeration)
    const email = `test+${crypto.randomBytes(3).toString('hex')}@example.com`; // pragma: allowlist secret
    const res1 = await api().post('/api/profile/reset-password-request').send({ email });
    expect(res1.status).toBe(204);

    // In real E2E you'd read token from mailbox or DB.
    // For this CI test, just assert endpoint shape and 204s.
    // Optionally: if NODE_ENV === test and a switch is on, expose a helper endpoint to fetch the latest token for the test address (guard with DEV_SEED_SECRET).

    // 2) Submit invalid token -> 400
    const res2 = await api().post('/api/profile/reset-password').send({ token: 'bad', password: 'Abc12345' }); // pragma: allowlist secret
    expect(res2.status).toBe(400);
  });

  it('POST /api/profile/reset-password-request with invalid email -> 204 (no enumeration)', async () => {
    const res = await api()
      .post('/api/profile/reset-password-request')
      .send({ email: 'nonexistent@example.com' }); // pragma: allowlist secret
    
    expect(res.status).toBe(204);
  });

  it('POST /api/profile/reset-password with weak password -> 400', async () => {
    const res = await api()
      .post('/api/profile/reset-password')
      .send({ 
        token: 'some-token', // pragma: allowlist secret
        password: 'weak' // pragma: allowlist secret
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('weak_password');
  });

  it('POST /api/profile/reset-password with missing fields -> 400', async () => {
    const res = await api()
      .post('/api/profile/reset-password')
      .send({ 
        password: 'NewPassword123' // pragma: allowlist secret
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing_fields');
  });
});
