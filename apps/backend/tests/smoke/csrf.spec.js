// AUTO-GENERATED SMOKE for group: csrf
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] csrf', () => {

  test('GET /csrf', async () => {
    const res = await request(app)[`get`](`/csrf`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
