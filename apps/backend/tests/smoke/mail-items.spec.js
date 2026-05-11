// AUTO-GENERATED SMOKE for group: mail-items
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] mail-items', () => {

  test('PATCH /mail-items/{param}', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`patch`](`/mail-items/test-id`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /mail-items/bulk', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/mail-items/bulk`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
