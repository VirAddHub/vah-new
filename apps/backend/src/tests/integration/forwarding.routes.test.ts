import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeUserToken } from '../helpers/authHelper';

describe('Forwarding routes', () => {
  const app = createTestApp();
  const token = makeUserToken();

  it('GET /api/forwarding/requests → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/forwarding/requests');
    expect(res.status).toBe(401);
  });

  it('GET /api/forwarding/requests/:id → 401 unauthenticated', async () => {
    const res = await request(app).get('/api/forwarding/requests/some-id');
    expect(res.status).toBe(401);
  });

  it('POST /api/forwarding/requests → 401 unauthenticated', async () => {
    const res = await request(app).post('/api/forwarding/requests').send({});
    expect(res.status).toBe(401);
  });
});
