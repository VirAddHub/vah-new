import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Auth routes', () => {
  const app = createTestApp();

  describe('POST /api/auth/signup', () => {
    it('400 when email missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ password: 'Password123!' });
      expect(res.status).toBe(400);
    });

    it('400 when password missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('400 when body empty', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('200 or 401 when not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/auth/whoami', () => {
    it('401 when no token', async () => {
      const res = await request(app).get('/api/auth/whoami');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/reset-password/request', () => {
    it('200 with any email (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'anyone@example.com' });
      expect(res.status).toBe(200);
    });

    it('200 even when email does not exist (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/profile/reset-password-request (307 shim)', () => {
    it('307 redirects to /api/auth/reset-password/request', async () => {
      const res = await request(app)
        .post('/api/profile/reset-password-request')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(307);
      expect(res.headers.location).toContain('/api/auth/reset-password/request');
    });
  });

  describe('GET /api/csrf', () => {
    it('200 with csrf token', async () => {
      const res = await request(app).get('/api/csrf');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('csrfToken');
    });
  });
});
