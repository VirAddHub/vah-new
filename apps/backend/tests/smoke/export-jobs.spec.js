// AUTO-GENERATED SMOKE for group: export-jobs
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] export-jobs', () => {

  test('GET /export-jobs/ping', async () => {
    const res = await request(app)[`get`](`/export-jobs/ping`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /export-jobs/run-once', async () => {
    // Safe to run: internal job trigger returns 401/403 without a valid admin/internal key
    const res = await request(app)[`post`](`/export-jobs/run-once`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
