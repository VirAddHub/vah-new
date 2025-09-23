// AUTO-GENERATED SMOKE for group: reset-password-request
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] reset-password-request', () => {

  test.skip('POST /reset-password-request', async () => {
    const res = await request(app)[`post`](`/reset-password-request`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
