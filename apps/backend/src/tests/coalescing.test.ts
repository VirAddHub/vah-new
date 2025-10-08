// src/tests/coalescing.test.ts
// Test request coalescing functionality

import request from 'supertest';
import express from 'express';
import { adminMailItemsRouter } from '../server/routes/admin-mail-items';

// Mock the database
jest.mock('../server/db', () => ({
  getPool: () => ({
    query: jest.fn().mockResolvedValue({
      rows: [{ id: 1, subject: 'Test Mail' }],
    }),
  }),
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.user = { id: 6, email: 'admin@test.com', is_admin: true };
    next();
  },
}));

describe('Request Coalescing', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/api/admin', adminMailItemsRouter);
  });

  test('coalesces identical requests for same admin', async () => {
    const makeRequest = () =>
      request(app)
        .get('/api/admin/mail-items?status=received&page=1&page_size=20')
        .expect(200);

    // Fire 3 identical requests simultaneously
    const [response1, response2, response3] = await Promise.all([
      makeRequest(),
      makeRequest(),
      makeRequest(),
    ]);

    // All should succeed
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);

    // All should have cache headers
    expect(response1.headers['cache-control']).toBe('private, max-age=5');
    expect(response2.headers['cache-control']).toBe('private, max-age=5');
    expect(response3.headers['cache-control']).toBe('private, max-age=5');
  });

  test('different query params create different cache keys', async () => {
    const makeRequest = (page: number) =>
      request(app)
        .get(`/api/admin/mail-items?status=received&page=${page}&page_size=20`)
        .expect(200);

    // These should not be coalesced due to different page params
    const [response1, response2] = await Promise.all([
      makeRequest(1),
      makeRequest(2),
    ]);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  test('normalizes query parameter ordering', async () => {
    const makeRequest = (url: string) =>
      request(app)
        .get(url)
        .expect(200);

    // These should be coalesced despite different param ordering
    const [response1, response2] = await Promise.all([
      makeRequest('/api/admin/mail-items?status=received&page=1&page_size=20'),
      makeRequest('/api/admin/mail-items?page_size=20&page=1&status=received'),
    ]);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });
});
