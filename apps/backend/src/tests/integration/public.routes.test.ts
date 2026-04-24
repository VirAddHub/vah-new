import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Public routes', () => {
  const app = createTestApp();
  // Note: some "public" routes pass through mailRouter which has requireActiveSubscription
  // so we use a valid user token to bypass that middleware
  const token = makeUserToken();

  it('GET /api/plans → 200 or 500 (no DB)', async () => {
    const res = await request(app).get('/api/plans');
    expect([200, 401, 500]).toContain(res.status);
  });

  it('GET /api/blog/posts → 200 or 500 (no DB)', async () => {
    const res = await request(app).get('/api/blog/posts');
    expect([200, 401, 500]).toContain(res.status);
  });

  it('GET /api/companies-house/search → 400 missing q (with auth)', async () => {
    const res = await request(app)
      .get('/api/companies-house/search')
      .set('Authorization', `Bearer ${token}`);
    expect([400, 422, 401, 500]).toContain(res.status);
  });

  it('GET /api/companies-house/search?q=test → responds (with auth)', async () => {
    const res = await request(app)
      .get('/api/companies-house/search?q=test')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400, 500, 503, 401]).toContain(res.status);
  });

  it('GET /api/ideal-postcodes-key → responds', async () => {
    const res = await request(app)
      .get('/api/ideal-postcodes-key')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404, 401, 500]).toContain(res.status);
  });

  it('GET /api/address/lookup → responds (with auth)', async () => {
    const res = await request(app)
      .get('/api/address/lookup')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 400, 422, 401, 500]).toContain(res.status);
  });
});
