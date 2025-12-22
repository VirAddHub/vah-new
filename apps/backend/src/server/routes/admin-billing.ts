// apps/backend/src/server/routes/admin-billing.ts
// Admin billing management endpoints

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { requireAdmin } from '../../middleware/auth';
import { generateInvoiceForPeriod, repairOrphanCharges } from '../../services/billing/invoiceService';

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

export default router;

