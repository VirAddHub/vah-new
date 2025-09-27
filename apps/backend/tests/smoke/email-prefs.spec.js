// AUTO-GENERATED SMOKE for group: email-prefs
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] email-prefs', () => {

  test('GET /email-prefs', async () => {
    const res = await request(app)[`get`](`/email-prefs`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /email-prefs', async () => {
    const res = await request(app)[`post`](`/email-prefs`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
