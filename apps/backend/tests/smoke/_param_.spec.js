// AUTO-GENERATED SMOKE for group: _param_
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] _param_', () => {

  test.skip('POST /{param}/signed-url', async () => {
    const res = await request(app)[`post`](`/test-id/signed-url`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
