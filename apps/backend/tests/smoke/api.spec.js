// AUTO-GENERATED SMOKE for group: api
const request = require('supertest');
const app = require('../../dist/server/index.js');

describe('[smoke] api', () => {

  test('GET /api/admin/invoices', async () => {
    const res = await request(app)[`get`](`/api/admin/invoices`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /api/admin/mail-bulk', async () => {
    const res = await request(app)[`post`](`/api/admin/mail-bulk`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('DELETE /api/admin/mail-items/{param}', async () => {
    const res = await request(app)[`delete`](`/api/admin/mail-items/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('PATCH /api/admin/mail-items/{param}', async () => {
    const res = await request(app)[`patch`](`/api/admin/mail-items/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/mail-items', async () => {
    const res = await request(app)[`get`](`/api/admin/mail-items`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('PATCH /api/admin/plans/{param}', async () => {
    const res = await request(app)[`patch`](`/api/admin/plans/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/plans', async () => {
    const res = await request(app)[`get`](`/api/admin/plans`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('PATCH /api/admin/support/{param}', async () => {
    const res = await request(app)[`patch`](`/api/admin/support/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/support', async () => {
    const res = await request(app)[`get`](`/api/admin/support`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('PUT /api/admin/users/{param}/kyc-status', async () => {
    const res = await request(app)[`put`](`/api/admin/users/test-id/kyc-status`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('PATCH /api/admin/users/{param}', async () => {
    const res = await request(app)[`patch`](`/api/admin/users/test-id`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/admin/users', async () => {
    const res = await request(app)[`get`](`/api/admin/users`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /api/auth/logout', async () => {
    const res = await request(app)[`post`](`/api/auth/logout`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
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

  test.skip('POST /api/gdpr-export', async () => {
    const res = await request(app)[`post`](`/api/gdpr-export`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
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

  test.skip('POST /api/mail/forward', async () => {
    const res = await request(app)[`post`](`/api/mail/forward`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /api/me/address/assign', async () => {
    const res = await request(app)[`post`](`/api/me/address/assign`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
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

  test.skip('POST /api/payments/redirect-flows', async () => {
    const res = await request(app)[`post`](`/api/payments/redirect-flows`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
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

  test.skip('PUT /api/profile/address', async () => {
    const res = await request(app)[`put`](`/api/profile/address`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
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

  test.skip('POST /api/support', async () => {
    const res = await request(app)[`post`](`/api/support`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /api/webhooks-gc', async () => {
    const res = await request(app)[`post`](`/api/webhooks-gc`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /api/webhooks-postmark', async () => {
    const res = await request(app)[`post`](`/api/webhooks-postmark`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test('GET /api/webhooks/gc', async () => {
    const res = await request(app)[`get`](`/api/webhooks/gc`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });

  test.skip('POST /api/webhooks/sumsub', async () => {
    const res = await request(app)[`post`](`/api/webhooks/sumsub`);
    // Allow 200-405; many endpoints require auth/body; this is just reachability
    expect([200, 201, 202, 204, 400, 401, 403, 404, 405]).toContain(res.status);
  });
});
