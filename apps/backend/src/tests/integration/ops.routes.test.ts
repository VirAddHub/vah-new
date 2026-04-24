import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';

const app = createTestApp();

describe('Ops/health routes', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/healthz returns 200', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
  });

  it('GET /api/healthz/status-guard returns 200', async () => {
    const res = await request(app).get('/api/healthz/status-guard');
    expect(res.status).toBe(200);
  });

  it('GET /api/healthz/metrics returns 200', async () => {
    const res = await request(app).get('/api/healthz/metrics');
    expect(res.status).toBe(200);
  });

  it('GET /api/healthz/ready returns 200', async () => {
    const res = await request(app).get('/api/healthz/ready');
    expect(res.status).toBe(200);
  });

  it('GET /api/healthz/live returns 200', async () => {
    const res = await request(app).get('/api/healthz/live');
    expect(res.status).toBe(200);
  });

  it('GET /api/__version returns 200 with version info', async () => {
    const res = await request(app).get('/api/__version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nodeEnv');
  });

  it('GET /api/metrics/ returns 200 or 401', async () => {
    const res = await request(app).get('/api/metrics/');
    expect([200, 401]).toContain(res.status);
  });

  it('GET /api/csrf returns 200 with csrf token', async () => {
    const res = await request(app).get('/api/csrf');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csrfToken');
  });
});
