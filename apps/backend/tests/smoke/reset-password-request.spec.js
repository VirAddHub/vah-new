// AUTO-GENERATED SMOKE for group: reset-password-request
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] reset-password-request', () => {

  test('POST /reset-password-request', async () => {
    // Safe to run: returns 400 (missing email field) without a body; no email is sent for invalid input
    const res = await request(app)[`post`](`/reset-password-request`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
