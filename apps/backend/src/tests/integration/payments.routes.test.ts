import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Payments routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  it('GET /api/payments/subscriptions/status → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/payments/subscriptions/status');
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/subscriptions → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/payments/subscriptions').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/redirect-flows → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/payments/redirect-flows').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/payments/stripe/checkout-session-embedded → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/payments/stripe/checkout-session-embedded').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/payments/stripe/session-status → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/payments/stripe/session-status?session_id=test');
    expect(res.status).toBe(401);
  });

  it('GET /api/payments/stripe/publishable-key → 200 or 401', async () => {
    const res = await request(app).get('/api/payments/stripe/publishable-key');
    expect([200, 401]).toContain(res.status);
  });
});
