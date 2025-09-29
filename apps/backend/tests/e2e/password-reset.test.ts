import { api } from './_utils';

describe('Password Reset Flow', () => {
  it('POST /api/profile/reset-password-request -> 204 (always returns success)', async () => {
    const res = await api()
      .post('/api/profile/reset-password-request')
      .send({ email: 'test@example.com' }); // pragma: allowlist secret
    
    expect(res.status).toBe(204);
  });

  it('POST /api/profile/reset-password-request with invalid email -> 204 (no enumeration)', async () => {
    const res = await api()
      .post('/api/profile/reset-password-request')
      .send({ email: 'nonexistent@example.com' }); // pragma: allowlist secret
    
    expect(res.status).toBe(204);
  });

  it('POST /api/profile/reset-password with invalid token -> 400', async () => {
    const res = await api()
      .post('/api/profile/reset-password')
      .send({ 
        token: 'invalid-token', // pragma: allowlist secret
        newPassword: 'NewPassword123' // pragma: allowlist secret
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_or_expired_token');
  });

  it('POST /api/profile/reset-password with weak password -> 400', async () => {
    const res = await api()
      .post('/api/profile/reset-password')
      .send({ 
        token: 'some-token', // pragma: allowlist secret
        newPassword: 'weak' // pragma: allowlist secret
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('weak_password');
  });

  it('POST /api/profile/reset-password with missing token -> 400', async () => {
    const res = await api()
      .post('/api/profile/reset-password')
      .send({ 
        newPassword: 'NewPassword123' // pragma: allowlist secret
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_token');
  });
});
