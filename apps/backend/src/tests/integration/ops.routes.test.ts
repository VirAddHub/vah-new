import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import * as db from '../../server/db';

const app = createTestApp();

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('GET /api/healthz/ready returns 200 when DB check succeeds', async () => {
    vi.spyOn(db, 'getPool').mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [{ readiness_check: 1 }] }),
    } as any);

    const res = await request(app).get('/api/healthz/ready');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      status: 'ready',
      checks: { db: 'ok' },
    });
  });

  it('GET /api/healthz/ready returns 503 when DB check fails', async () => {
    vi.spyOn(db, 'getPool').mockReturnValue({
      query: vi.fn().mockRejectedValue(new Error('db down')),
    } as any);

    const res = await request(app).get('/api/healthz/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      ok: false,
      status: 'not_ready',
      checks: { db: 'down' },
      error: 'database_unavailable',
    });
  });

  it('GET /api/healthz/live returns 200', async () => {
    vi.spyOn(db, 'getPool').mockImplementation(() => {
      throw new Error('db should not be used for live');
    });

    const res = await request(app).get('/api/healthz/live');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'alive');
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
