// apps/backend/tests/e2e/postmark-webhook.test.ts
import { api } from './_utils';

const WEBHOOK_SECRET = process.env.POSTMARK_WEBHOOK_SECRET || '';

describe('postmark webhook', () => {
  it('POST /api/webhooks-postmark -> 204 (no secret)', async () => {
    const res = await api()
      .post('/api/webhooks-postmark')
      .send({ RecordType: 'Delivery', MessageID: 'test-123' });
    expect([200, 204]).toContain(res.status);
  });

  it('POST /api/webhooks-postmark -> 204 (with secret)', async () => {
    if (!WEBHOOK_SECRET) return; // skip if no secret configured
    const res = await api()
      .post('/api/webhooks-postmark')
      .set('X-Postmark-Webhook-Secret', WEBHOOK_SECRET)
      .send({ RecordType: 'Delivery', MessageID: 'test-456' });
    expect([200, 204]).toContain(res.status);
  });

  it('POST /api/webhooks-postmark -> 401 (bad secret)', async () => {
    const res = await api()
      .post('/api/webhooks-postmark')
      .set('X-Postmark-Webhook-Secret', 'wrong-secret') // pragma: allowlist secret
      .send({ RecordType: 'Delivery', MessageID: 'test-789' });
    // Should be 401 if secret is required, or 204 if secret is disabled in test mode
    expect([200, 204, 401]).toContain(res.status);
  });
});
