import { api, healthCheck } from './_utils';

describe('health', () => {
  it('GET /api/healthz -> 200', async () => {
    const res = await healthCheck();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ ok: true }));
  });
});
