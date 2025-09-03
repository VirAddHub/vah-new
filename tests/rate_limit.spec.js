const request = require('supertest');
const exported = require('../server');
const app = typeof exported === 'function' ? exported : (exported.app || exported.default);

describe('Rate limiting in test mode', () => {
  test('Burst on /api/healthz should NOT 429 in NODE_ENV=test', async () => {
    const N = 50;
    const results = await Promise.all(
      Array.from({ length: N }, () => request(app).get('/api/healthz'))
    );
    const statuses = results.map(r => r.status);
    const got429 = statuses.some(s => s === 429);
    expect(got429).toBe(false);
    expect(results.every(r => [200, 204].includes(r.status))).toBe(true);
  });
});
