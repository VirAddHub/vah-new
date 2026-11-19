import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getPool } from '../db';
import { generateInvoiceForPeriod } from '../../services/billing/invoiceService';
import { ensureInvoicePdfAndEmail } from '../../services/invoices';
import { logger } from '../../lib/logger';

const router = Router();

function requireCronSecret(req: Request, res: Response): string | null {
  const secret = (process.env.BILLING_CRON_SECRET || '').trim();
  if (!secret) {
    return 'BILLING_CRON_SECRET is not set';
  }

  const header =
    (req.headers['x-billing-cron-secret'] as string | undefined) ||
    (req.headers['x-cron-secret'] as string | undefined) ||
    undefined;

  const bearer = String(req.headers.authorization || '');
  const token = header || (bearer.startsWith('Bearer ') ? bearer.slice('Bearer '.length).trim() : '');

  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);
  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return 'unauthorized';
  }
  return null;
}

function addInterval(from: Date, interval: string): Date {
  const d = new Date(from);
  const v = String(interval || '').toLowerCase();
  if (v === 'year' || v === 'annual') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  // default monthly
  d.setMonth(d.getMonth() + 1);
  return d;
}

// POST /api/internal/billing/run (collect invoices by creating GoCardless payments) was removed
// with GoCardless. Stripe collects subscription payments itself.

/**
 * POST /api/internal/billing/generate-invoices
 *
 * Generates invoices for all active users at the end of their billing periods.
 * This runs at the end of each billing period (e.g., end of month) to:
 * 1. Generate invoices with all pending charges attached
 * 2. Send invoice emails to users
 * 3. Invoice status is 'issued' (not 'paid') until payment is confirmed
 *
 * This ensures invoices are sent promptly at period end, regardless of payment processing time.
 */
router.post('/billing/generate-invoices', async (req: Request, res: Response) => {
  const authErr = requireCronSecret(req, res);
  if (authErr) return res.status(401).json({ ok: false, error: authErr });

  const pool = getPool();
  const now = new Date();
  const generated: Array<{ user_id: number; invoice_id: number; amount_pence: number; charges_attached: number }> = [];
  const skipped: Array<{ user_id: number; reason: string }> = [];
  const errors: Array<{ user_id: number; error: string }> = [];

  // Get all active users with subscriptions
  const users = await pool.query(
    `
    SELECT DISTINCT
      u.id AS user_id,
      u.plan_id,
      p.interval AS billing_interval,
      u.plan_status
    FROM "user" u
    JOIN subscription s ON s.user_id = u.id
    LEFT JOIN plans p ON p.id = u.plan_id
    WHERE
      u.status = 'active'
      AND u.plan_status = 'active'
      AND s.status = 'active'
      AND (p.active = true OR p.active IS NULL)
    `
  );

  for (const row of users.rows) {
    const userId = Number(row.user_id);
    const billingInterval = String(row.billing_interval || 'month').toLowerCase();
    const interval = billingInterval === 'year' || billingInterval === 'annual' ? 'annual' : 'monthly';

    try {
      // Calculate billing period end date
      // For monthly: end of current month
      // For annual: end of current year
      let periodEnd: Date;
      let periodStart: Date;

      if (interval === 'annual') {
        periodEnd = new Date(now.getFullYear(), 11, 31); // Dec 31
        periodStart = new Date(now.getFullYear(), 0, 1); // Jan 1
      } else {
        // Monthly: end of current month
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      }

      // Format period dates to 'YYYY-MM-DD' strings (UTC safe)
      const periodStartStr = periodStart.toISOString().slice(0, 10);
      const periodEndStr = periodEnd.toISOString().slice(0, 10);

      // Always call generateInvoiceForPeriod even if invoice exists
      // This ensures charges are attached and amount_pence is recomputed correctly
      // generateInvoiceForPeriod is idempotent and will update existing invoice

      // Only generate invoice if we're at or past the period end date
      const periodEndTime = periodEnd.getTime();
      const nowTime = now.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Generate invoice if period ended (within 1 day tolerance for cron timing)
      if (nowTime < periodEndTime - oneDayMs) {
        skipped.push({ user_id: userId, reason: 'period_not_ended_yet' });
        continue;
      }

      // Generate invoice with all pending charges (recalculates amount even if invoice exists)
      const invoiceResult = await generateInvoiceForPeriod({
        userId,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        billingInterval: interval,
        currency: 'GBP',
        providerPaymentId: null, // No payment ID yet - invoice is 'issued', not 'paid'
      });

      // Finalise invoice: generate PDF + send invoice email ONCE (idempotent)
      try {
        const invoice = await ensureInvoicePdfAndEmail(invoiceResult.invoiceId);

        generated.push({
          user_id: userId,
          invoice_id: invoice.id,
          amount_pence: invoiceResult.totalChargesPence,
          charges_attached: invoiceResult.attachedCount,
        });

        logger.info('[billing] generated invoice', { invoiceId: invoice.id, userId, charges: invoiceResult.attachedCount });
      } catch (invoiceError: any) {
        errors.push({
          user_id: userId,
          error: `PDF/email generation failed: ${invoiceError?.message || invoiceError}`,
        });
        logger.error('[billing] failed to generate PDF/email', { userId, message: invoiceError?.message || String(invoiceError) });
      }
    } catch (error: any) {
      errors.push({
        user_id: userId,
        error: error?.message || String(error),
      });
      logger.error('[billing] error generating invoice', { userId, message: error?.message || String(error) });
    }
  }

  return res.json({
    ok: true,
    now: now.toISOString(),
    eligible: users.rows.length,
    generated_count: generated.length,
    skipped_count: skipped.length,
    errors_count: errors.length,
    generated,
    skipped,
    errors,
  });
});

export default router;

