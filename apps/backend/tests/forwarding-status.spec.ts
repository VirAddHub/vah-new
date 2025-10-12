// apps/backend/tests/forwarding-status.spec.ts
// Regression tests for status transitions

import request from 'supertest';
import { app } from '../src/server';
import { MAIL_STATUS, toCanonical, isTransitionAllowed } from '../src/modules/forwarding/mailStatus';

describe('Forwarding Status Transitions', () => {
  let adminToken: string;
  let testRequestId: number;

  beforeAll(async () => {
    // Setup admin authentication
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@test.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });
    
    adminToken = loginResponse.body.token;
    
    // Create a test forwarding request
    const createResponse = await request(app)
      .post('/api/forwarding/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mail_item_id: 1, // Assuming mail item exists
        method: 'standard',
        reason: 'Test request'
      });
    
    testRequestId = createResponse.body.data.id;
  });

  describe('Status Normalization', () => {
    it('should normalize lowercase statuses to canonical form', () => {
      expect(toCanonical('requested')).toBe(MAIL_STATUS.Requested);
      expect(toCanonical('processing')).toBe(MAIL_STATUS.Processing);
      expect(toCanonical('dispatched')).toBe(MAIL_STATUS.Dispatched);
      expect(toCanonical('delivered')).toBe(MAIL_STATUS.Delivered);
    });

    it('should handle mixed case statuses', () => {
      expect(toCanonical('Requested')).toBe(MAIL_STATUS.Requested);
      expect(toCanonical('PROCESSING')).toBe(MAIL_STATUS.Processing);
      expect(toCanonical('Dispatched')).toBe(MAIL_STATUS.Dispatched);
    });

    it('should throw error for invalid statuses', () => {
      expect(() => toCanonical('invalid')).toThrow('invalid_status');
      expect(() => toCanonical('')).toThrow('invalid_status');
    });
  });

  describe('Transition Validation', () => {
    it('should allow valid transitions', () => {
      expect(isTransitionAllowed(MAIL_STATUS.Requested, MAIL_STATUS.Processing)).toBe(true);
      expect(isTransitionAllowed(MAIL_STATUS.Processing, MAIL_STATUS.Dispatched)).toBe(true);
      expect(isTransitionAllowed(MAIL_STATUS.Dispatched, MAIL_STATUS.Delivered)).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isTransitionAllowed(MAIL_STATUS.Requested, MAIL_STATUS.Delivered)).toBe(false);
      expect(isTransitionAllowed(MAIL_STATUS.Processing, MAIL_STATUS.Requested)).toBe(false);
      expect(isTransitionAllowed(MAIL_STATUS.Delivered, MAIL_STATUS.Processing)).toBe(false);
    });
  });

  describe('API Status Updates', () => {
    it('should accept lowercase status in request body', async () => {
      const response = await request(app)
        .patch(`/api/admin/forwarding/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'start_processing' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(MAIL_STATUS.Processing);
    });

    it('should reject illegal transitions when STRICT_STATUS_GUARD=1', async () => {
      // Set strict guard
      process.env.STRICT_STATUS_GUARD = '1';

      const response = await request(app)
        .patch(`/api/admin/forwarding/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'mark_reviewed' }); // Trying to go back to Requested

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('illegal_transition');
      expect(response.body.message).toContain('Illegal transition');
    });

    it('should allow valid transitions when STRICT_STATUS_GUARD=1', async () => {
      process.env.STRICT_STATUS_GUARD = '1';

      const response = await request(app)
        .patch(`/api/admin/forwarding/requests/${testRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'mark_dispatched' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(MAIL_STATUS.Dispatched);
    });
  });

  describe('BFF Guard', () => {
    it('should block non-GET requests when BFF_READS_ONLY=1', async () => {
      process.env.BFF_READS_ONLY = '1';

      const response = await request(app)
        .post('/api/bff/forwarding/requests')
        .send({ test: 'data' });

      expect(response.status).toBe(410);
      expect(response.body.message).toBe('BFF writes disabled - use direct backend API');
    });

    it('should allow GET requests when BFF_READS_ONLY=1', async () => {
      process.env.BFF_READS_ONLY = '1';

      const response = await request(app)
        .get('/api/bff/forwarding/requests');

      expect(response.status).not.toBe(410);
    });
  });

  afterAll(async () => {
    // Cleanup
    process.env.STRICT_STATUS_GUARD = '0';
    process.env.BFF_READS_ONLY = '0';
  });
});
