import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Business owners routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  it('GET /api/business-owners/ → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/business-owners/');
    expect(res.status).toBe(401);
  });

  it('POST /api/business-owners/ → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/business-owners/').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/business-owners/:id/resend → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/business-owners/some-id/resend');
    expect(res.status).toBe(401);
  });
});
