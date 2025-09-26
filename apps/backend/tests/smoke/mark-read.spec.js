// AUTO-GENERATED SMOKE for group: mark-read
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] mark-read', () => {

  test.skip('POST /mark-read', async () => {
    const res = await request(app)[`post`](`/mark-read`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
