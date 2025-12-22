import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { gcCreatePayment } from '../../lib/gocardless';
import { generateInvoiceForPeriod } from '../../services/billing/invoiceService';
import { createInvoiceForPayment } from '../../services/invoices';

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
 * Creates GoCardless payments for due active subscriptions.
 * Webhooks (payments.confirmed/failed) handle invoicing + status updates.
 */
router.post('/billing/run', async (req: Request, res: Response) => {
  const authErr = requireCronSecret(req, res);
  if (authErr) return res.status(401).json({ ok: false, error: authErr });

  const pool = getPool();
  const now = Date.now();
  const created: Array<{ user_id: number; plan_id: number; payment_id: string }> = [];
  const skipped: Array<{ user_id: number; reason: string }> = [];

  // Eligible subs: active + mandate present + user active + plan present/active
  const subs = await pool.query(
    `
    SELECT
      s.user_id,
      s.mandate_id,
      u.plan_id,
      p.price_pence,
      p.interval
    FROM subscription s
    JOIN "user" u ON u.id = s.user_id
    JOIN plans p ON p.id = u.plan_id
    WHERE
      s.status = 'active'
      AND s.mandate_id IS NOT NULL
      AND COALESCE(s.mandate_id,'') <> ''
      AND u.plan_status = 'active'
      AND u.plan_id IS NOT NULL
      AND p.active = true
      AND p.retired_at IS NULL
    `
  );

  for (const row of subs.rows) {
    const userId = Number(row.user_id);
    const mandateId = String(row.mandate_id || '');
    const planId = Number(row.plan_id);
    const pricePence = Number(row.price_pence);
    const interval = String(row.interval || 'month');

    if (!mandateId) {
      skipped.push({ user_id: userId, reason: 'missing_mandate' });
      continue;
    }
    if (!planId || !Number.isFinite(planId)) {
      skipped.push({ user_id: userId, reason: 'missing_plan' });
      continue;
    }
    if (!Number.isFinite(pricePence) || pricePence <= 0) {
      skipped.push({ user_id: userId, reason: 'invalid_price' });
      continue;
    }

    // Determine whether due based on last paid invoice
    const lastInv = await pool.query(
      `SELECT created_at FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const lastCreated = lastInv.rows?.[0]?.created_at ? Number(lastInv.rows[0].created_at) : null;
    const dueAt = lastCreated ? addInterval(new Date(lastCreated), interval).getTime() : now;

    if (lastCreated && now < dueAt) {
      skipped.push({ user_id: userId, reason: 'not_due_yet' });
      continue;
    }

    try {
      const payment = await gcCreatePayment({
        amountPence: pricePence,
        currency: 'GBP',
        mandateId,
        metadata: { user_id: String(userId), plan_id: String(planId) },
      });
      created.push({ user_id: userId, plan_id: planId, payment_id: payment.payment_id });
    } catch (e: any) {
      skipped.push({ user_id: userId, reason: `payment_create_failed:${String(e?.message || e)}` });
    }
  }

  return res.json({
    ok: true,
    now,
    eligible: subs.rows.length,
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

      // Generate PDF and send email (regenerates PDF if missing or amount changed)
      // This ensures PDF exists even if invoice was created before PDF generation flow
      try {
        const invoice = await createInvoiceForPayment({
          userId,
          gocardlessPaymentId: undefined, // No payment ID yet
          amountPence: invoiceResult.totalChargesPence,
          currency: 'GBP',
          periodStart,
          periodEnd,
        });

        generated.push({
          user_id: userId,
          invoice_id: invoice.id,
          amount_pence: invoiceResult.totalChargesPence,
          charges_attached: invoiceResult.attachedCount,
        });

        console.log(`[billing] Generated invoice ${invoice.id} for user ${userId} with ${invoiceResult.attachedCount} charges`);
      } catch (invoiceError: any) {
        errors.push({
          user_id: userId,
          error: `PDF/email generation failed: ${invoiceError?.message || invoiceError}`,
        });
        console.error(`[billing] Failed to generate PDF/email for user ${userId}:`, invoiceError);
      }
    } catch (error: any) {
      errors.push({
        user_id: userId,
        error: error?.message || String(error),
      });
      console.error(`[billing] Error generating invoice for user ${userId}:`, error);
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

