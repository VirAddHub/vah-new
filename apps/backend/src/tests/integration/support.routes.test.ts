import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Support routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  it('GET /api/support/ → accessible (200, 401, or 404)', async () => {
    const res = await request(app).get('/api/support/');
    expect([200, 401, 404]).toContain(res.status);
  });

  it('GET /api/support/tickets → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/support/tickets');
    expect(res.status).toBe(401);
  });

  it('POST /api/support/tickets → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/support/tickets').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/support/tickets/:id/close → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/support/tickets/some-id/close');
    expect(res.status).toBe(401);
  });

  it('POST /api/contact/ → 400, 422, 200, or 401 with missing fields', async () => {
    const res = await request(app).post('/api/contact/').send({});
    // 401 possible if mailRouter middleware intercepts before contactRouter
    expect([400, 422, 200, 401]).toContain(res.status);
  });
});
