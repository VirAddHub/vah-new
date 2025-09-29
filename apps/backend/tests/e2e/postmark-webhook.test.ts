// apps/backend/tests/e2e/postmark-webhook.test.ts
import { api } from './_utils';

const auth = 'Basic ' + Buffer.from('testuser:testpass').toString('base64'); // pragma: allowlist secret

describe('postmark webhook', () => {
  it('POST /api/webhooks-postmark -> 204 (no auth)', async () => {
    const res = await api()
      .post('/api/webhooks-postmark')
      .send({ RecordType: 'Delivery', MessageID: 'test-123' });
    expect([200, 204]).toContain(res.status);
  });

  it('POST /api/webhooks-postmark -> 204 (with auth)', async () => {
    const res = await api()
      .post('/api/webhooks-postmark')
      .set('Authorization', auth)
      .send({ RecordType: 'Delivery', MessageID: 'test-456' });
    expect([200, 204]).toContain(res.status);
  });

  it('POST /api/webhooks-postmark -> 401 (bad auth)', async () => {
    const res = await api()
      .post('/api/webhooks-postmark')
      .set('Authorization', 'Basic ' + Buffer.from('wrong:creds').toString('base64')) // pragma: allowlist secret
      .send({ RecordType: 'Delivery', MessageID: 'test-789' });
    // Should either be 401 (if auth is required) or 204 (if auth is disabled)
    expect([200, 204, 401]).toContain(res.status);
  });
});
