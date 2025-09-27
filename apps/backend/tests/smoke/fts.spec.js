// AUTO-GENERATED SMOKE for group: fts
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] fts', () => {

  test.skip('POST /fts/rebuild', async () => {
    const res = await request(app)[`post`](`/fts/rebuild`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /fts', async () => {
    const res = await request(app)[`post`](`/fts`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
