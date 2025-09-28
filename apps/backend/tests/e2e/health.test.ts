import { api } from './client';

describe('health', () => {
  it('GET /api/healthz -> 200', async () => {
    const res = await api().get('/api/healthz');
    expect(res.status).toBe(200);
    // Optionally assert body shape if any:
    // expect(res.body).toEqual(expect.objectContaining({ ok: true }));
  });
});
