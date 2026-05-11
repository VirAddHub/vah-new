// AUTO-GENERATED SMOKE for group: _param_
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] _param_', () => {

  test('POST /{param}/signed-url', async () => {
    // Safe to run: returns 404 (route not found) or 401 (auth required) without a session
    const res = await request(app)[`post`](`/test-id/signed-url`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
