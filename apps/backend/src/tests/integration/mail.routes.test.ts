import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Mail routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  const protectedGetRoutes = [
    '/api/mail-items',
    '/api/tags',
    '/api/files/',
    '/api/notifications/',
    '/api/email-prefs/',
  ];

  protectedGetRoutes.forEach((path) => {
    it(`GET ${path} → 401 unauthenticated`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    });
  });

  it('GET /api/mail-items/:id → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/mail-items/some-id');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/mail-items/:id → 401 unauthenticated', async () => {
    const res = await request(app).patch('/api/mail-items/some-id').send({});
    expect(res.status).toBe(401);
  });

  it('DELETE /api/mail-items/:id → 401 unauthenticated', async () => {
    const res = await request(app).delete('/api/mail-items/some-id');
    expect(res.status).toBe(401);
  });

  it('POST /api/tags/rename → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/tags/rename').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/email-prefs/ → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/email-prefs/').send({});
    expect(res.status).toBe(401);
  });
});
