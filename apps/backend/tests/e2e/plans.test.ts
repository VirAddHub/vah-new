import { api } from './client';

describe('plans', () => {
  it('GET /api/plans -> 2xx & returns array', async () => {
    const res = await api().get('/api/plans');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    // Accept either array of plans or object with plans field:
    const data = Array.isArray(res.body) ? res.body : res.body?.data;
    expect(Array.isArray(data)).toBe(true);
  });
});
