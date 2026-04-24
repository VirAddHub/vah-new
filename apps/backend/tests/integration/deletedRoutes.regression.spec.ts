import request from 'supertest';
import app from '../../src/server';

describe('deleted routes regression guardrails', () => {
  it('POST /api/profile/reset-password returns 404', async () => {
    const res = await request(app).post('/api/profile/reset-password').send({});
    expect(res.status).toBe(404);
  });

  it('POST /api/payments/redirect-flows is not handled by stub', async () => {
    const res = await request(app).post('/api/payments/redirect-flows').send({});
    // Require auth from real route; stub would emit 501 + GOCARDLESS_NOT_CONFIGURED.
    expect(res.status).toBe(401);
    expect(res.body?.code).toBeUndefined();
    expect(res.body?.error).toBe('unauthenticated');
  });

  it('GET /api/admin/ch-verification-reminders returns 404', async () => {
    const res = await request(app).get('/api/admin/ch-verification-reminders');
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/ch-verification/proof/:userId returns 404', async () => {
    const res = await request(app).get('/api/admin/ch-verification/proof/1');
    expect(res.status).toBe(404);
  });

  it('GET /api/legacy/mail-items/:id/download returns 404', async () => {
    const res = await request(app).get('/api/legacy/mail-items/1/download');
    expect(res.status).toBe(404);
  });

  it('GET /api/address/debug returns 404', async () => {
    const res = await request(app).get('/api/address/debug');
    expect(res.status).toBe(404);
  });

  it('GET /api/healthz/ready is served and not duplicated', async () => {
    const res = await request(app).get('/api/healthz/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'ready' }));
  });

  it('legacy admin forwarding list path resolves only once', async () => {
    const res = await request(app).get('/api/admin/forwarding/requests');
    // Should be mounted only from the canonical admin-forwarding router with auth guard.
    expect([401, 403]).toContain(res.status);
  });
});

