// AUTO-GENERATED SMOKE for group: search
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] search', () => {

  test('GET /search/test', async () => {
    const res = await request(app)[`get`](`/search/test`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /search', async () => {
    const res = await request(app)[`get`](`/search`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
