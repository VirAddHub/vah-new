const request = require('supertest');
const exported = require('../server');
const app = typeof exported === 'function' ? exported : (exported.app || exported.default);

describe('RBAC: non-admin cannot access admin endpoints', () => {
  test('normal user blocked from /api/admin/mail-items endpoints', async () => {
    const user = request.agent(app);
    const email = `rbac-${Date.now()}@example.com`;
    await user.post('/api/auth/signup').send({ email, password: 'Password123!' });

    const id = 1; // guard should reject before lookup
    const r1 = await user.get(`/api/admin/mail-items/${id}`);
    expect([401, 403]).toContain(r1.status);

    const r2 = await user.put(`/api/admin/mail-items/${id}`).send({ status: 'scanned' });
    expect([401, 403]).toContain(r2.status);

    const r3 = await user.post(`/api/admin/mail-items/${id}/log-physical-dispatch`).send({ tracking: 'X' });
    expect([401, 403]).toContain(r3.status);
  });
});
