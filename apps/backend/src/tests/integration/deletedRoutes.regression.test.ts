import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/createTestApp';
import { makeAdminToken } from '../helpers/authHelper';

const app = createTestApp();
// Use an admin token so auth middleware doesn't block us before the 404 handler
const adminToken = makeAdminToken();

describe('Deleted routes regression — must stay 404', () => {
  it('POST /api/profile/reset-password → 404', async () => {
    const res = await request(app)
      .post('/api/profile/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/ch-verification-reminders → 404', async () => {
    const res = await request(app)
      .get('/api/admin/ch-verification-reminders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/admin/ch-verification/proof/:userId → 404', async () => {
    const res = await request(app)
      .get('/api/admin/ch-verification/proof/test-user')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/legacy/mail-items/:id/download → 404', async () => {
    const res = await request(app)
      .get('/api/legacy/mail-items/123/download')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/address/debug → 404', async () => {
    const res = await request(app)
      .get('/api/address/debug')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
