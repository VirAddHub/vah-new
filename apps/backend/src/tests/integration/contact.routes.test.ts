// POST /api/contact contract. Ported from tests/api.contact.contract.test.ts (which needed a running server).
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';

const app = createTestApp();
const send = (body: Record<string, unknown>, ip: string) =>
  request(app).post('/api/contact').set('X-Forwarded-For', ip).send(body);

describe('POST /api/contact', () => {
  it('answers in JSON for a complete message', async () => {
    const res = await send({ name: 'Contract', email: 'contract@example.com', subject: 'Hello', message: 'Contract test', inquiryType: 'general', website: '' }, '203.0.113.81');
    expect([200, 202]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('rejects the honeypot field being filled (spam)', async () => {
    const res = await send({ name: 'Spam Bot', email: 'spam@example.com', subject: 'Spam', message: 'Spam message', website: 'http://spam.example' }, '203.0.113.82');
    expect([400, 422]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('rejects missing required fields', async () => {
    const res = await send({ name: 'Test User', email: 'test@example.com', website: '' }, '203.0.113.83');
    expect([400, 422]).toContain(res.status);
  });
});
