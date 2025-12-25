import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { gcCreatePayment } from '../../lib/gocardless';
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

  if (!token || token !== secret) {
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

/**
 * POST /api/internal/billing/run
 *
 * Creates GoCardless payments for invoices that are ready to be collected.
 * This should be scheduled to run at end-of-period (after invoices are generated).
 *
 * Idempotent: will not create another payment if invoices.gocardless_payment_id is already set.
 */
router.post('/billing/run', async (req: Request, res: Response) => {
  const authErr = requireCronSecret(req, res);
  if (authErr) return res.status(401).json({ ok: false, error: authErr });

  const pool = getPool();
  const now = Date.now();
  const created: Array<{ user_id: number; invoice_id: number; payment_id: string }> = [];
  const skipped: Array<{ user_id: number; reason: string }> = [];

  // Find invoices that should be collected:
  // - issued (not yet paid)
  // - period ended
  // - no GC payment linked yet
  // - user + subscription active and has mandate
  const invoicesToCollect = await pool.query(
    `
    SELECT
      i.id AS invoice_id,
      i.user_id,
      i.amount_pence,
      i.currency,
      i.period_end,
      s.mandate_id
    FROM invoices i
    JOIN subscription s ON s.user_id = i.user_id
    JOIN "user" u ON u.id = i.user_id
    WHERE
      i.status = 'issued'
      AND (i.gocardless_payment_id IS NULL OR i.gocardless_payment_id = '')
      AND i.period_end::date <= (NOW()::date)
      AND s.status = 'active'
      AND s.mandate_id IS NOT NULL
      AND COALESCE(s.mandate_id,'') <> ''
      AND u.plan_status = 'active'
    ORDER BY i.id ASC
    LIMIT 500
    `
  );

  for (const row of invoicesToCollect.rows) {
    const invoiceId = Number(row.invoice_id);
    const userId = Number(row.user_id);
    const mandateId = String(row.mandate_id || '');
    const amountPence = Number(row.amount_pence || 0);
    const currency = String(row.currency || 'GBP');

    if (!mandateId) {
      skipped.push({ user_id: userId, reason: 'missing_mandate' });
      continue;
    }
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      skipped.push({ user_id: userId, reason: 'invalid_invoice_amount' });
      continue;
    }

    try {
      const payment = await gcCreatePayment({
        amountPence,
        currency,
        mandateId,
        metadata: { user_id: String(userId), invoice_id: String(invoiceId) },
      });

      await pool.query(
        `UPDATE invoices SET gocardless_payment_id = $1 WHERE id = $2`,
        [payment.payment_id, invoiceId]
      );

      created.push({ user_id: userId, invoice_id: invoiceId, payment_id: payment.payment_id });
    } catch (e: any) {
      skipped.push({ user_id: userId, reason: `payment_create_failed:${String(e?.message || e)}` });
    }
  }

  return res.json({
    ok: true,
    now,
    eligible: invoicesToCollect.rows.length,
    created_count: created.length,
    skipped_count: skipped.length,
    created,
    skipped,
  });
});

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
        gocardlessPaymentId: null, // No payment ID yet - invoice is 'issued', not 'paid'
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

