// apps/backend/src/services/billing/__tests__/invoiceService.test.ts
/**
 * Tests for automated invoice generation with charge attachment
 */

import { getPool } from '../../../lib/db';
import { generateInvoiceForPeriod, repairOrphanCharges } from '../invoiceService';

// Test setup: use a test database or mock pool
// For now, these are integration tests that require a real DB connection

describe('InvoiceService', () => {
  const pool = getPool();
  let testUserId: number;
  const testPeriodStart = '2025-01-01';
  const testPeriodEnd = '2025-01-31';

  beforeAll(async () => {
    // Create a test user
    const userRes = await pool.query(
      `INSERT INTO "user" (email, password, first_name, last_name, status, plan_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ['test-billing@example.com', 'hashed-password', 'Test', 'User', 'active', 'active', Date.now()]
    );
    testUserId = userRes.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup: delete test user and related data
    await pool.query('DELETE FROM charge WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM invoices WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM "user" WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clean up charges and invoices before each test
    await pool.query('DELETE FROM charge WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM invoices WHERE user_id = $1', [testUserId]);
  });

  describe('generateInvoiceForPeriod', () => {
    it('should create invoice with no charges when period has no pending charges', async () => {
      const result = await generateInvoiceForPeriod({
        userId: testUserId,
        periodStart: testPeriodStart,
        periodEnd: testPeriodEnd,
        billingInterval: 'monthly',
      });

      expect(result.invoiceId).toBeGreaterThan(0);
      expect(result.attachedCount).toBe(0);
      expect(result.totalChargesPence).toBe(0);
      expect(result.invoiceAmountPence).toBe(0);

      // Verify invoice exists in DB
      const invoice = await pool.query(
        'SELECT * FROM invoices WHERE id = $1',
        [result.invoiceId]
      );
      expect(invoice.rows).toHaveLength(1);
      expect(invoice.rows[0].amount_pence).toBe(0);
      expect(invoice.rows[0].period_start).toBe(testPeriodStart);
      expect(invoice.rows[0].period_end).toBe(testPeriodEnd);
    });

    it('should attach pending charges in period and compute invoice amount', async () => {
      // Create test charges with service_date in period
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id
        )
        VALUES
          ($1, 200, 'GBP', 'forwarding_fee', 'Test charge 1', $2, 'pending', 'forwarding_request', 1),
          ($1, 200, 'GBP', 'forwarding_fee', 'Test charge 2', $2, 'pending', 'forwarding_request', 2)`,
        [testUserId, testPeriodStart]
      );

      const result = await generateInvoiceForPeriod({
        userId: testUserId,
        periodStart: testPeriodStart,
        periodEnd: testPeriodEnd,
        billingInterval: 'monthly',
      });

      expect(result.invoiceId).toBeGreaterThan(0);
      expect(result.attachedCount).toBe(2);
      expect(result.totalChargesPence).toBe(400);
      expect(result.invoiceAmountPence).toBe(400);

      // Verify charges are marked as billed
      const charges = await pool.query(
        'SELECT * FROM charge WHERE user_id = $1 AND invoice_id = $2',
        [testUserId, result.invoiceId]
      );
      expect(charges.rows).toHaveLength(2);
      charges.rows.forEach((charge) => {
        expect(charge.status).toBe('billed');
        expect(charge.invoice_id).toBe(result.invoiceId);
        expect(charge.billed_at).not.toBeNull();
      });

      // Verify invoice amount is correct
      const invoice = await pool.query(
        'SELECT * FROM invoices WHERE id = $1',
        [result.invoiceId]
      );
      expect(invoice.rows[0].amount_pence).toBe(400);
    });

    it('should not attach charges outside the period', async () => {
      // Create charges: one in period, one outside
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id
        )
        VALUES
          ($1, 200, 'GBP', 'forwarding_fee', 'In period', $2, 'pending', 'forwarding_request', 1),
          ($1, 200, 'GBP', 'forwarding_fee', 'Outside period', $3, 'pending', 'forwarding_request', 2)`,
        [testUserId, testPeriodStart, '2025-02-01'] // Feb 1 is outside Jan period
      );

      const result = await generateInvoiceForPeriod({
        userId: testUserId,
        periodStart: testPeriodStart,
        periodEnd: testPeriodEnd,
        billingInterval: 'monthly',
      });

      expect(result.attachedCount).toBe(1);
      expect(result.totalChargesPence).toBe(200);

      // Verify only one charge is billed
      const billedCharges = await pool.query(
        'SELECT * FROM charge WHERE user_id = $1 AND status = $2',
        [testUserId, 'billed']
      );
      expect(billedCharges.rows).toHaveLength(1);

      // Verify the other charge is still pending
      const pendingCharges = await pool.query(
        'SELECT * FROM charge WHERE user_id = $1 AND status = $2',
        [testUserId, 'pending']
      );
      expect(pendingCharges.rows).toHaveLength(1);
      expect(pendingCharges.rows[0].service_date).toBe('2025-02-01');
    });

    it('should be idempotent: calling twice for same period updates existing invoice', async () => {
      // Create a charge
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id
        )
        VALUES ($1, 200, 'GBP', 'forwarding_fee', 'Test', $2, 'pending', 'forwarding_request', 1)`,
        [testUserId, testPeriodStart]
      );

      const result1 = await generateInvoiceForPeriod({
        userId: testUserId,
        periodStart: testPeriodStart,
        periodEnd: testPeriodEnd,
        billingInterval: 'monthly',
      });

      // Add another charge
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id
        )
        VALUES ($1, 200, 'GBP', 'forwarding_fee', 'Test 2', $2, 'pending', 'forwarding_request', 2)`,
        [testUserId, testPeriodStart]
      );

      const result2 = await generateInvoiceForPeriod({
        userId: testUserId,
        periodStart: testPeriodStart,
        periodEnd: testPeriodEnd,
        billingInterval: 'monthly',
      });

      // Should return same invoice ID
      expect(result2.invoiceId).toBe(result1.invoiceId);
      // Should attach the new charge
      expect(result2.attachedCount).toBe(1); // Only the new one
      expect(result2.totalChargesPence).toBe(400); // Both charges
    });

    it('should not attach charges that are already billed', async () => {
      // Create an invoice and a billed charge
      const invoiceRes = await pool.query(
        `INSERT INTO invoices (user_id, invoice_number, amount_pence, period_start, period_end, status, created_at, number, billing_interval, currency)
         VALUES ($1, 'TEST-001', 200, $2, $3, 'issued', $4, '001', 'monthly', 'GBP')
         RETURNING id`,
        [testUserId, testPeriodStart, testPeriodEnd, Date.now()]
      );
      const existingInvoiceId = invoiceRes.rows[0].id;

      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id, invoice_id
        )
        VALUES ($1, 200, 'GBP', 'forwarding_fee', 'Already billed', $2, 'billed', 'forwarding_request', 1, $3)`,
        [testUserId, testPeriodStart, existingInvoiceId]
      );

      // Create a new pending charge
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id
        )
        VALUES ($1, 200, 'GBP', 'forwarding_fee', 'Pending', $2, 'pending', 'forwarding_request', 2)`,
        [testUserId, testPeriodStart]
      );

      const result = await generateInvoiceForPeriod({
        userId: testUserId,
        periodStart: testPeriodStart,
        periodEnd: testPeriodEnd,
        billingInterval: 'monthly',
      });

      // Should attach only the pending charge
      expect(result.attachedCount).toBe(1);
      // Total should include both charges (one already billed, one newly attached)
      expect(result.totalChargesPence).toBe(400);
    });
  });

  describe('repairOrphanCharges', () => {
    it('should repair charges marked as billed but with no invoice_id', async () => {
      // Create orphaned billed charges
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id, billed_at
        )
        VALUES
          ($1, 200, 'GBP', 'forwarding_fee', 'Orphan 1', $2, 'billed', 'forwarding_request', 1, NOW()),
          ($1, 200, 'GBP', 'forwarding_fee', 'Orphan 2', $2, 'billed', 'forwarding_request', 2, NOW())`,
        [testUserId, testPeriodStart]
      );

      const updatedCount = await repairOrphanCharges();

      expect(updatedCount).toBe(2);

      // Verify charges are now pending
      const charges = await pool.query(
        'SELECT * FROM charge WHERE user_id = $1 AND status = $2',
        [testUserId, 'pending']
      );
      expect(charges.rows).toHaveLength(2);
      charges.rows.forEach((charge) => {
        expect(charge.invoice_id).toBeNull();
        expect(charge.billed_at).toBeNull();
      });
    });

    it('should not affect charges with invoice_id', async () => {
      // Create invoice
      const invoiceRes = await pool.query(
        `INSERT INTO invoices (user_id, invoice_number, amount_pence, period_start, period_end, status, created_at, number, billing_interval, currency)
         VALUES ($1, 'TEST-002', 200, $2, $3, 'issued', $4, '002', 'monthly', 'GBP')
         RETURNING id`,
        [testUserId, testPeriodStart, testPeriodEnd, Date.now()]
      );
      const invoiceId = invoiceRes.rows[0].id;

      // Create properly billed charge
      await pool.query(
        `INSERT INTO charge (
          user_id, amount_pence, currency, type, description,
          service_date, status, related_type, related_id, invoice_id, billed_at
        )
        VALUES ($1, 200, 'GBP', 'forwarding_fee', 'Proper', $2, 'billed', 'forwarding_request', 1, $3, NOW())`,
        [testUserId, testPeriodStart, invoiceId]
      );

      const updatedCount = await repairOrphanCharges();

      expect(updatedCount).toBe(0);

      // Verify charge is still billed
      const charge = await pool.query(
        'SELECT * FROM charge WHERE user_id = $1',
        [testUserId]
      );
      expect(charge.rows[0].status).toBe('billed');
      expect(charge.rows[0].invoice_id).toBe(invoiceId);
    });
  });
});

