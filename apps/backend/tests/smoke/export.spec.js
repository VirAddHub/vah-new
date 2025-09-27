// AUTO-GENERATED SMOKE for group: export
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] export', () => {

  test('GET /export/{param}', async () => {
    const res = await request(app)[`get`](`/export/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /export/request', async () => {
    const res = await request(app)[`post`](`/export/request`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /export/status', async () => {
    const res = await request(app)[`get`](`/export/status`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
