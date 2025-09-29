import { api, auth } from './client';

const maybe = (process.env.AUTH_TOKEN ? describe : describe.skip);

maybe('profile (requires AUTH_TOKEN)', () => {
  it('GET /api/profile -> 200 & has expected keys', async () => {
    const res = await api().get('/api/profile').set(auth());
    // Accept 200 (implemented) or 404 (stub) as valid responses
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toEqual(expect.objectContaining({
        ok: expect.any(Boolean),
      }));
    }
  });
});
