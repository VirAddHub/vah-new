import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { gcCreatePayment } from '../../lib/gocardless';

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

export default router;

