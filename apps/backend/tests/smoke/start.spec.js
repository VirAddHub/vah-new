// AUTO-GENERATED SMOKE for group: start
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] start', () => {

  test('POST /start', async () => {
    // Safe to run: registration endpoint returns 400 (missing required fields) without a body
    const res = await request(app)[`post`](`/start`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
