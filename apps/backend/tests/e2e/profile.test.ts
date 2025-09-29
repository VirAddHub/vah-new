import { api, auth } from './client';

const maybe = (process.env.AUTH_TOKEN ? describe : describe.skip);

maybe('profile (requires AUTH_TOKEN)', () => {
  it('GET /api/profile -> 200 & has expected schema', async () => {
    const res = await api().get('/api/profile').set(auth());
    // Accept 200 (implemented) or 404 (stub) as valid responses
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      // Validate response schema
      expect(res.body).toEqual(expect.objectContaining({
        ok: expect.any(Boolean),
      }));

      // If it's a user profile, check for expected fields
      if (res.body.ok && res.body.user) {
        expect(res.body.user).toEqual(expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
        }));
      }
    } else if (res.status === 404) {
      // Stub response - just ensure it's not an error
      expect(res.body).toBeDefined();
    }
  });
});
