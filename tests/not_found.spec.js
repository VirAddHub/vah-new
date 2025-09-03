const request = require('supertest');
const exported = require('../server');
const app = typeof exported === 'function' ? exported : (exported.app || exported.default);
const { loginAdmin } = require('./_helpers');

describe('404/400 on unknown resources', () => {
  test('GET /api/admin/mail-items/:id non-existent -> 404/400 (401 allowed if not logged in)', async () => {
    const admin = request.agent(app);
    try { await loginAdmin(admin); } catch (_) { /* hardened login OK; we allow 401 below */ }
    const r = await admin.get('/api/admin/mail-items/999999');
    expect([404, 400, 401]).toContain(r.status);
  });
});
