import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Account businesses routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  it('GET /api/account/businesses → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/account/businesses');
    expect(res.status).toBe(401);
  });

  it('POST /api/account/businesses → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/account/businesses').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/account/businesses/:id → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/account/businesses/some-id');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/account/businesses/:id → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/account/businesses/some-id').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/account/businesses/:id/set-primary → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/account/businesses/some-id/set-primary');
    expect(res.status).toBe(401);
  });
});
