// AUTO-GENERATED SMOKE for group: mark-read
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] mark-read', () => {

  test('POST /mark-read', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/mark-read`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
