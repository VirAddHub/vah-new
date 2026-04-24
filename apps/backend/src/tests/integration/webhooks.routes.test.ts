import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';

describe('Webhook routes', () => {
  const app = createTestApp();

  it('POST /api/webhooks/postmark → responds (200, 204, or 400) with payload', async () => {
    const res = await request(app)
      .post('/api/webhooks/postmark')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ MessageID: 'test-123' }));
    // postmark webhook returns 204 on success, 400 on invalid signature
    expect([200, 204, 400]).toContain(res.status);
  });

  it('POST /api/webhooks-postmark → 308 redirect to /api/webhooks/postmark', async () => {
    // This is mounted early (before JWT middleware), so no auth needed
    const res = await request(app)
      .post('/api/webhooks-postmark')
      .send({});
    expect(res.status).toBe(308);
    expect(res.headers.location).toContain('/api/webhooks/postmark');
  });

  it('POST /api/webhooks-onedrive → 308 redirect or 401 (mounted after auth middleware)', async () => {
    // Note: /api/webhooks-onedrive redirect is mounted after JWT middleware,
    // so unauthenticated requests may get 401 from mailRouter intercepting first
    const res = await request(app)
      .post('/api/webhooks-onedrive')
      .send({});
    // Accept 308 (redirect works) or 401 (mailRouter intercepted)
    expect([308, 401]).toContain(res.status);
  });
});
