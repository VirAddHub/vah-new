import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getPool } from '../db';
import { gcCreateReauthoriseLink, gcCreateUpdateBankLink } from '../../lib/gocardless';
import { TimestampUtils } from '../../lib/timestamp-utils';

/**
 * Get sum of pending forwarding fees for a user
 * Returns 0 if charge table doesn't exist or on error
 */
async function getPendingForwardingFees(userId: number): Promise<number> {
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount_pence), 0) as total_pence
       FROM charge
       WHERE user_id = $1
         AND status = 'pending'
         AND type = 'forwarding_fee'`,
      [userId]
    );
    return Number(result.rows[0]?.total_pence || 0);
  } catch (error: any) {
    // Table doesn't exist yet or query failed - return 0 gracefully
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return 0;
    }
    console.error('[getPendingForwardingFees] Error:', error);
    return 0;
  }
}

export async function getBillingOverview(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const pool = getPool();

  try {
    // Get subscription row for user_id
    const subResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price_pence, p.interval as plan_interval
      FROM subscription s
      LEFT JOIN plans p ON s.plan_name = p.name
      WHERE s.user_id=$1 ORDER BY s.id DESC LIMIT 1
    `, [userId]);

    const sub = subResult.rows[0] || null;

    // Get latest invoice row for user_id
    const latestInvoiceResult = await pool.query(`
      SELECT 
        id,
        invoice_number,
        amount_pence,
        status,
        period_start,
        period_end,
        created_at
      FROM invoices
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    const latestInvoice = latestInvoiceResult.rows[0] || null;

    // Get user plan_status (for backward compatibility)
    const userResult = await pool.query(`
      SELECT plan_status, payment_failed_at, payment_retry_count, payment_grace_until, account_suspended_at,
             gocardless_mandate_id, gocardless_redirect_flow_id
      FROM "user" WHERE id=$1
    `, [userId]);
    const user = userResult.rows[0];

    // Determine account status
    let accountStatus = 'active';
    let gracePeriodInfo: { days_left: number; retry_count: number; grace_until: number } | null = null;

    if (user?.account_suspended_at) {
      accountStatus = 'suspended';
    } else if (user?.payment_failed_at) {
      const now = Date.now();
      const graceUntil = user.payment_grace_until;

      if (graceUntil && now < graceUntil) {
        accountStatus = 'grace_period';
        const daysLeft = Math.ceil((graceUntil - now) / (24 * 60 * 60 * 1000));
        gracePeriodInfo = {
          days_left: daysLeft,
          retry_count: user.payment_retry_count || 0,
          grace_until: graceUntil
        };
      } else {
        accountStatus = 'past_due';
      }
    }

    // Build response with subscription and latest invoice
    res.json({
      ok: true,
      data: {
        plan_status: user?.plan_status || null,
        subscription: sub ? {
          status: sub.status || null,
          cadence: sub.cadence || sub.plan_interval || 'monthly',
          next_charge_at: sub.next_charge_at || null,
          mandate_id: sub.mandate_id || null,
          customer_id: sub.customer_id || null,
        } : null,
        latest_invoice: latestInvoice ? {
          id: latestInvoice.id,
          invoice_number: latestInvoice.invoice_number,
          amount_pence: latestInvoice.amount_pence,
          status: latestInvoice.status,
          period_start: latestInvoice.period_start,
          period_end: latestInvoice.period_end,
          created_at: latestInvoice.created_at,
        } : null,
        // Legacy fields for backward compatibility
        plan: sub?.plan_name || 'Digital Mailbox Plan',
        cadence: sub?.plan_interval || sub?.cadence || 'monthly',
        status: sub?.status || 'active',
        account_status: accountStatus,
        grace_period: gracePeriodInfo,
        next_charge_at: sub?.next_charge_at ?? null,
        mandate_status: sub?.mandate_id ? 'active' : 'missing',
        has_mandate: !!user?.gocardless_mandate_id,
        has_redirect_flow: !!user?.gocardless_redirect_flow_id,
        redirect_flow_id: user?.gocardless_redirect_flow_id ?? null,
        current_price_pence: latestInvoice?.amount_pence || sub?.price_pence || 0,
        pending_forwarding_fees_pence: await getPendingForwardingFees(userId),
      }
    });
  } catch (error) {
    console.error('[getBillingOverview] error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch billing overview' });
  }
}

export async function listInvoices(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.page_size ?? 12);
  const off = (page - 1) * pageSize;
  const pool = getPool();

  const rowsResult = await pool.query(`
    SELECT 
      id, 
      invoice_number,
      created_at as date, 
      period_start,
      period_end,
      amount_pence, 
      currency,
      status, 
      pdf_path
    FROM invoices 
    WHERE user_id=$1
    ORDER BY created_at DESC LIMIT $2 OFFSET $3
  `, [userId, pageSize, off]);

  const rows = rowsResult.rows;

  const items = rows.map((r: any) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    date: r.date,
    period_start: r.period_start,
    period_end: r.period_end,
    amount_pence: r.amount_pence,
    currency: r.currency || 'GBP',
    status: r.status,
    pdf_url: r.pdf_path || null,
  }));

  res.json({ ok: true, data: { items, page, page_size: pageSize } });
}

export async function downloadInvoicePdf(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const invoiceId = Number(req.params.id);
  const pool = getPool();

  if (!invoiceId || Number.isNaN(invoiceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_invoice_id' });
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, invoice_number, pdf_path FROM invoices WHERE id=$1 AND user_id=$2 LIMIT 1`,
      [invoiceId, userId]
    );
    const inv = result.rows[0];
    if (!inv) return res.status(404).json({ ok: false, error: 'not_found' });
    if (!inv.pdf_path) return res.status(404).json({ ok: false, error: 'pdf_not_available' });

    const baseDir = process.env.INVOICES_DIR
      ? path.resolve(process.env.INVOICES_DIR)
      : path.join(process.cwd(), 'data', 'invoices');

    const rel = String(inv.pdf_path).replace(/^\/+/, ''); // strip leading slash
    // Expected: invoices/YYYY/userId/invoice-123.pdf
    const fullPath = path.join(baseDir, rel.replace(/^invoices\//, ''));

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, error: 'file_not_found' });
    }

    const filename = inv.invoice_number
      ? `${inv.invoice_number}.pdf`
      : `invoice-${invoiceId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(fullPath).pipe(res);
  } catch (error: any) {
    console.error('[downloadInvoicePdf] error:', error);
    return res.status(500).json({ ok: false, error: 'download_failed' });
  }
}

export async function postUpdateBank(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const link = await gcCreateUpdateBankLink(userId);
    res.json({ ok: true, data: link });
  } catch (error) {
    console.error('[postUpdateBank] error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create update bank link' });
  }
}

export async function postReauthorise(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const link = await gcCreateReauthoriseLink(userId);
    res.json({ ok: true, data: link });
  } catch (error) {
    console.error('[postReauthorise] error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create reauthorization link' });
  }
}

export async function postRetryPayment(req: Request, res: Response) {
  // Stub: schedule a retry on latest failed payment (implement via GC API)
  res.json({ ok: true, data: { queued: true } });
}

export async function postChangePlan(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const { plan_id } = req.body ?? {};
    const pool = getPool();

    if (!plan_id || isNaN(Number(plan_id))) {
      return res.status(400).json({ ok: false, error: 'Invalid plan_id' });
    }

    // Verify the plan exists and is active
    const planCheck = await pool.query(
      'SELECT id, name, interval, price_pence FROM plans WHERE id = $1 AND active = true',
      [plan_id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Plan not found or inactive' });
    }

    const plan = planCheck.rows[0];

    // Start transaction to ensure consistency
    await pool.query('BEGIN');

    try {
      // Update user's plan
      await pool.query(
        'UPDATE "user" SET plan_id = $1, updated_at = $2 WHERE id = $3',
        [plan_id, TimestampUtils.forTableField('user', 'updated_at'), userId]
      );

      // UPSERT subscription record (exactly one per user)
      const cadence = plan.interval === 'year' ? 'annual' : 'monthly';
      await pool.query(
        `INSERT INTO subscription (user_id, plan_name, cadence, status, updated_at)
         VALUES ($1, $2, $3, 'pending', NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           plan_name = EXCLUDED.plan_name,
           cadence = EXCLUDED.cadence,
           updated_at = NOW()`,
        [userId, plan.name, cadence]
      );

      // Log the plan change for audit purposes
      await pool.query(
        `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'plan_change', 'user', $2, $3, $4)`,
        [userId, userId, JSON.stringify({
          old_plan_id: null, // Could be enhanced to track previous plan
          new_plan_id: plan_id,
          plan_name: plan.name,
          plan_interval: plan.interval,
          price_pence: plan.price_pence
        }), TimestampUtils.forTableField('admin_audit', 'created_at')]
      );

      await pool.query('COMMIT');

      console.log(`[postChangePlan] User ${userId} changed to plan: ${plan.name} (${plan.interval})`);

      res.json({
        ok: true,
        data: {
          plan_id: Number(plan_id),
          plan_name: plan.name,
          interval: plan.interval,
          price_pence: plan.price_pence,
          message: 'Plan updated successfully. Billing will be updated on the next cycle.'
        }
      });
    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('[postChangePlan] error:', error);
    res.status(500).json({ ok: false, error: 'Failed to change plan' });
  }
}

export async function postCancelAtPeriodEnd(req: Request, res: Response) {
  // Stub: mark cancel_at_period_end in GC and persist
  res.json({ ok: true, data: { cancels_on: null } });
}
