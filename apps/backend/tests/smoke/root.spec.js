// AUTO-GENERATED SMOKE for group: root
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] root', () => {

  test('GET /', async () => {
    const res = await request(app)[`get`](`/`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /', async () => {
    const res = await request(app)[`post`](`/`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
