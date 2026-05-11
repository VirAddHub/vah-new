// AUTO-GENERATED SMOKE for group: fts
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] fts', () => {

  test('POST /fts/rebuild', async () => {
    // Safe to run: internal admin endpoint returns 401/403 without a valid admin session
    const res = await request(app)[`post`](`/fts/rebuild`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /fts', async () => {
    // Safe to run: internal admin endpoint returns 401/403 without a valid admin session
    const res = await request(app)[`post`](`/fts`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
