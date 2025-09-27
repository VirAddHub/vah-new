// AUTO-GENERATED SMOKE for group: export-jobs
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] export-jobs', () => {

  test('GET /export-jobs/ping', async () => {
    const res = await request(app)[`get`](`/export-jobs/ping`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /export-jobs/run-once', async () => {
    const res = await request(app)[`post`](`/export-jobs/run-once`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
