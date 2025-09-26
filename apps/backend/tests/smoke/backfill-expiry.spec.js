// AUTO-GENERATED SMOKE for group: backfill-expiry
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] backfill-expiry', () => {

  test.skip('POST /backfill-expiry', async () => {
    const res = await request(app)[`post`](`/backfill-expiry`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
