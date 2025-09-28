import { api, auth } from './client';

const maybe = (process.env.AUTH_TOKEN ? describe : describe.skip);

maybe('profile (requires AUTH_TOKEN)', () => {
  it('GET /api/profile -> 200 & has expected keys', async () => {
    const res = await api().get('/api/profile').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      ok: expect.any(Boolean),
    }));
  });
});
