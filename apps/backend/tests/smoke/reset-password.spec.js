// AUTO-GENERATED SMOKE for group: reset-password
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] reset-password', () => {

  test('POST /reset-password', async () => {
    // Safe to run: returns 400 (missing required token/password fields) without a body
    const res = await request(app)[`post`](`/reset-password`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
