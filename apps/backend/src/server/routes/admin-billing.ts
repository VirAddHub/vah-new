// apps/backend/src/server/routes/admin-billing.ts
// Admin billing management endpoints

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { requireAdmin } from '../../middleware/auth';
import { generateInvoiceForPeriod, repairOrphanCharges } from '../../services/billing/invoiceService';
import { getPool } from '../../lib/db';

const router = Router();

// Rate limiting for admin billing endpoints
const adminBillingLimiter = rateLimit({
  windowMs: 10_000, // 10 seconds
  limit: 20, // 20 requests per 10 seconds
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req as any).user;
    return u?.id ? `admin-billing:${u.id}` : ipKeyGenerator(req.ip ?? '');
  },
  handler: (_req, res) => {
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * POST /api/admin/billing/generate-invoice
 * Manually generate invoice for a user's billing period
 * 
 * Body: {
 *   user_id: number,
 *   period_start: 'YYYY-MM-DD',
 *   period_end: 'YYYY-MM-DD',
 *   billing_interval: 'monthly' | 'annual',
 *   currency?: 'GBP' (optional, defaults to GBP)
 * }
 */
const generateInvoiceSchema = z.object({
  user_id: z.number().int().positive(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  billing_interval: z.enum(['monthly', 'annual']),
  currency: z.string().optional().default('GBP'),
});

router.post('/generate-invoice', adminBillingLimiter, async (req: Request, res: Response) => {
  try {
    const validation = generateInvoiceSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: validation.error.issues.map((e) => e.message).join(', '),
      });
    }

    const { user_id, period_start, period_end, billing_interval, currency } = validation.data;

    // Validate period_start < period_end
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    if (startDate >= endDate) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_period',
        message: 'period_start must be before period_end',
      });
    }

    const result = await generateInvoiceForPeriod({
      userId: user_id,
      periodStart: period_start,
      periodEnd: period_end,
      billingInterval: billing_interval,
      currency,
    });

    return res.status(200).json({
      ok: true,
      data: {
        invoice_id: result.invoiceId,
        amount_pence: result.invoiceAmountPence,
        attached_count: result.attachedCount,
        total_charges_pence: result.totalChargesPence,
      },
    });
  } catch (error: any) {
    console.error('[admin-billing] Error generating invoice:', error);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: error?.message || 'Failed to generate invoice',
    });
  }
});

/**
 * POST /api/admin/billing/repair-orphan-charges
 * Repair charges marked as 'billed' but with no invoice_id
 * Sets status back to 'pending' and clears billed_at
 * 
 * Returns: { ok: true, data: { updated_count: number } }
 */
router.post('/repair-orphan-charges', adminBillingLimiter, async (req: Request, res: Response) => {
  try {
    const updatedCount = await repairOrphanCharges();

    return res.status(200).json({
      ok: true,
      data: {
        updated_count: updatedCount,
      },
    });
  } catch (error: any) {
    console.error('[admin-billing] Error repairing orphan charges:', error);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: error?.message || 'Failed to repair orphan charges',
    });
  }
});

/**
 * POST /api/admin/billing/recalculate-invoice
 * Recalculate invoice amount from attached charges and regenerate PDF
 * 
 * Body: { invoice_id: number }
 * 
 * Returns: { ok: true, data: { invoice_id, amount_pence, pdf_generated } }
 */
const recalculateInvoiceSchema = z.object({
  invoice_id: z.number().int().positive(),
});

router.post('/recalculate-invoice', adminBillingLimiter, async (req: Request, res: Response) => {
  try {
    const validation = recalculateInvoiceSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: validation.error.issues.map((e) => e.message).join(', '),
      });
    }

    const { invoice_id } = validation.data;
    const pool = getPool();

    // Get invoice details
    const invoiceResult = await pool.query(
      `SELECT id, user_id, period_start, period_end, billing_interval, currency, pdf_path
       FROM invoices WHERE id = $1`,
      [invoice_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'invoice_not_found',
        message: `Invoice ${invoice_id} not found`,
      });
    }

    const invoice = invoiceResult.rows[0];

    // Recalculate amount from attached charges
    const chargesSum = await pool.query<{ total_pence: number }>(
      `
      SELECT COALESCE(SUM(amount_pence), 0)::bigint AS total_pence
      FROM charge
      WHERE invoice_id = $1
        AND status = 'billed'
      `,
      [invoice_id]
    );

    const totalChargesPence = Number(chargesSum.rows[0]?.total_pence || 0);

    // Update invoice amount
    await pool.query(
      `UPDATE invoices 
       SET amount_pence = $1, currency = COALESCE($2, 'GBP')
       WHERE id = $3`,
      [totalChargesPence, invoice.currency, invoice_id]
    );

    // Regenerate PDF if it doesn't exist or if amount changed
    let pdfGenerated = false;
    if (!invoice.pdf_path || totalChargesPence !== invoice.amount_pence) {
      try {
        const { createInvoiceForPayment } = await import('../../services/invoices');
        const periodStart = new Date(invoice.period_start);
        const periodEnd = new Date(invoice.period_end);
        
        await createInvoiceForPayment({
          userId: invoice.user_id,
          gocardlessPaymentId: null,
          amountPence: totalChargesPence,
          currency: invoice.currency || 'GBP',
          periodStart,
          periodEnd,
        });
        pdfGenerated = true;
      } catch (pdfError: any) {
        console.error(`[admin-billing] Failed to regenerate PDF for invoice ${invoice_id}:`, pdfError);
        // Continue - amount is updated even if PDF fails
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        invoice_id,
        amount_pence: totalChargesPence,
        pdf_generated: pdfGenerated,
      },
    });
  } catch (error: any) {
    console.error('[admin-billing] Error recalculating invoice:', error);
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      message: error?.message || 'Failed to recalculate invoice',
    });
  }
});

export default router;

