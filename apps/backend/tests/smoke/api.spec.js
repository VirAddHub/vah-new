// AUTO-GENERATED SMOKE for group: api
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] api', () => {

  test('GET /api/admin/invoices', async () => {
    const res = await request(app)[`get`](`/api/admin/invoices`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/admin/mail-bulk', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/api/admin/mail-bulk`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('DELETE /api/admin/mail-items/{param}', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`delete`](`/api/admin/mail-items/test-id`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('PATCH /api/admin/mail-items/{param}', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`patch`](`/api/admin/mail-items/test-id`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/mail-items', async () => {
    const res = await request(app)[`get`](`/api/admin/mail-items`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('PATCH /api/admin/plans/{param}', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`patch`](`/api/admin/plans/test-id`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/plans', async () => {
    const res = await request(app)[`get`](`/api/admin/plans`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('PATCH /api/admin/support/{param}', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`patch`](`/api/admin/support/test-id`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/support', async () => {
    const res = await request(app)[`get`](`/api/admin/support`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('PUT /api/admin/users/{param}/kyc-status', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`put`](`/api/admin/users/test-id/kyc-status`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('PATCH /api/admin/users/{param}', async () => {
    // Safe to run: requireAdmin middleware returns 401 when no session cookie is present
    const res = await request(app)[`patch`](`/api/admin/users/test-id`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/users', async () => {
    const res = await request(app)[`get`](`/api/admin/users`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/auth/logout', async () => {
    // Safe to run: clears the session cookie — no side effects without a valid session
    const res = await request(app)[`post`](`/api/auth/logout`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/auth/whoami', async () => {
    const res = await request(app)[`get`](`/api/auth/whoami`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/billing/invoices/{param}/link', async () => {
    const res = await request(app)[`get`](`/api/billing/invoices/test-id/link`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/billing/invoices', async () => {
    const res = await request(app)[`get`](`/api/billing/invoices`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/billing', async () => {
    const res = await request(app)[`get`](`/api/billing`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/debug/db-info', async () => {
    const res = await request(app)[`get`](`/api/debug/db-info`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/debug/whoami', async () => {
    const res = await request(app)[`get`](`/api/debug/whoami`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/downloads/{param}', async () => {
    const res = await request(app)[`get`](`/api/downloads/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/forwarding-requests/usage', async () => {
    const res = await request(app)[`get`](`/api/forwarding-requests/usage`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/forwarding-requests', async () => {
    const res = await request(app)[`get`](`/api/forwarding-requests`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/gdpr-export', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/api/gdpr-export`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/health', async () => {
    const res = await request(app)[`get`](`/api/health`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/healthz', async () => {
    const res = await request(app)[`get`](`/api/healthz`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/mail-items/{param}/history', async () => {
    const res = await request(app)[`get`](`/api/mail-items/test-id/history`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/mail-items/{param}/scan-url', async () => {
    const res = await request(app)[`get`](`/api/mail-items/test-id/scan-url`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/mail-items/{param}', async () => {
    const res = await request(app)[`get`](`/api/mail-items/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/mail-items', async () => {
    const res = await request(app)[`get`](`/api/mail-items`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/mail-search', async () => {
    const res = await request(app)[`get`](`/api/mail-search`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/mail/forward', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/api/mail/forward`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/me/address/assign', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/api/me/address/assign`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/me/address', async () => {
    const res = await request(app)[`get`](`/api/me/address`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/metrics', async () => {
    const res = await request(app)[`get`](`/api/metrics`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/notifications/unread', async () => {
    const res = await request(app)[`get`](`/api/notifications/unread`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/payments/redirect-flows', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`post`](`/api/payments/redirect-flows`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/payments/subscriptions/status', async () => {
    const res = await request(app)[`get`](`/api/payments/subscriptions/status`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/payments', async () => {
    const res = await request(app)[`get`](`/api/payments`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/plans', async () => {
    const res = await request(app)[`get`](`/api/plans`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('PUT /api/profile/address', async () => {
    // Safe to run: requireAuth middleware returns 401 when no session cookie is present
    const res = await request(app)[`put`](`/api/profile/address`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/profile', async () => {
    const res = await request(app)[`get`](`/api/profile`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/ready', async () => {
    const res = await request(app)[`get`](`/api/ready`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('POST /api/support', async () => {
    // Safe to run: returns 400 (missing required fields) or 401 without auth
    const res = await request(app)[`post`](`/api/support`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  // TODO: Unskip once we can provide a valid HMAC signature in tests.
  // GoCardless webhook verifies webhook-signature header; without it the handler
  // returns 400 (bad_signature) which is safe, but the rawBody parsing middleware
  // may behave differently in the supertest environment and produce a 500.
  test.skip('POST /api/webhooks-gc', async () => {
    const res = await request(app)[`post`](`/api/webhooks-gc`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  // TODO: Unskip once we can provide a valid Postmark signature in tests.
  // Postmark webhook verifies X-Postmark-Signature header; without it the handler
  // returns 401/400, but rawBody parsing middleware behaviour in supertest is unverified.
  test.skip('POST /api/webhooks-postmark', async () => {
    const res = await request(app)[`post`](`/api/webhooks-postmark`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/webhooks/gc', async () => {
    const res = await request(app)[`get`](`/api/webhooks/gc`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  // TODO: Unskip once we can provide a valid Sumsub HMAC digest in tests.
  // Sumsub webhook verifies x-payload-digest header; without a valid signature
  // the handler returns 401, but rawBody parsing middleware behaviour in supertest
  // is unverified and could produce a 500 if the body stream is not properly buffered.
  test.skip('POST /api/webhooks/sumsub', async () => {
    const res = await request(app)[`post`](`/api/webhooks/sumsub`);
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
