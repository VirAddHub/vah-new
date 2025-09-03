const request = require('supertest');
const exported = require('../server');
const app = typeof exported === 'function' ? exported : (exported.app || exported.default);

describe('KYC upload is idempotent from client POV', () => {
  test('second upload does not auto-verify or fatally error', async () => {
    const user = request.agent(app);
    const email = `kyc2-${Date.now()}@example.com`;
    await user.post('/api/auth/signup').send({ email, password: 'Password123!' });

    const before = await user.get('/api/kyc/status');
    const beforeKyc = before.body?.data?.kyc_status || before.body?.kyc_status;

    const r1 = await user.post('/api/kyc/upload').send({ doc_type: 'passport' });
    expect([200, 201]).toContain(r1.status);

    const r2 = await user.post('/api/kyc/upload').send({ doc_type: 'passport' });

    if ([200, 201].includes(r2.status)) {
      const after = await user.get('/api/kyc/status');
      const afterKyc = after.body?.data?.kyc_status || after.body?.kyc_status;
      expect(afterKyc).toBe(beforeKyc);
    } else {
      expect([400, 401, 409, 429]).toContain(r2.status);
    }
  });
});
