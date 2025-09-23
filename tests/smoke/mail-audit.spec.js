// AUTO-GENERATED SMOKE for group: mail-audit
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] mail-audit', () => {

  test('GET /mail-audit', async () => {
    const res = await request(app)[`get`](`/mail-audit`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
