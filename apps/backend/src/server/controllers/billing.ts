import type { Request, Response } from 'express';
import { getPool } from '../db';
import { gcCreateReauthoriseLink, gcCreateUpdateBankLink } from '../../lib/gocardless';

export async function getBillingOverview(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const pool = getPool();

  try {
    // Get subscription and user plan info
    const subResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.price_pence, p.interval as plan_interval
      FROM subscription s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id=$1 ORDER BY s.id DESC LIMIT 1
    `, [userId]);

    const sub = subResult.rows[0];

    // Get user payment status
    const userResult = await pool.query(`
      SELECT payment_failed_at, payment_retry_count, payment_grace_until, account_suspended_at
      FROM "user" WHERE id=$1
    `, [userId]);
    const user = userResult.rows[0];

    const usageMonth = new Date();
    usageMonth.setDate(1);
    usageMonth.setHours(0, 0, 0, 0);
    const yyyymm = `${usageMonth.getFullYear()}-${String(usageMonth.getMonth() + 1).padStart(2, '0')}`;

    const usageResult = await pool.query(`
      SELECT COALESCE(SUM(amount_pence),0) as amount_pence, COALESCE(SUM(qty),0) as qty
      FROM usage_charges WHERE user_id=$1 AND period_yyyymm=$2
    `, [userId, yyyymm]);

    const usage = usageResult.rows[0];

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

    res.json({
      ok: true,
      data: {
        plan: sub?.plan_name ?? 'Digital Mailbox Plan',
        cadence: sub?.plan_interval ?? 'monthly',
        status: sub?.status ?? 'active',
        account_status: accountStatus,
        grace_period: gracePeriodInfo,
        next_charge_at: sub?.next_charge_at ?? null,
        mandate_status: sub?.mandate_id ? 'active' : 'missing',
        current_price_pence: sub?.price_pence ?? 0,
        usage: { qty: usage?.qty ?? 0, amount_pence: usage?.amount_pence ?? 0 }
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
    SELECT id, created_at as date, amount_pence, status, invoice_url, pdf_token
    FROM invoices WHERE user_id=$1
    ORDER BY created_at DESC LIMIT $2 OFFSET $3
  `, [userId, pageSize, off]);

  const rows = rowsResult.rows;

  const items = rows.map((r: any) => ({
    id: r.id,
    date: r.date,
    amount_pence: r.amount_pence,
    status: r.status,
    pdf_url: r.invoice_url || (r.pdf_token ? `/api/invoices/${r.pdf_token}` : null),
  }));

  res.json({ ok: true, data: { items, page, page_size: pageSize } });
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
      'SELECT id, name, interval FROM plans WHERE id = $1 AND active = true',
      [plan_id]
    );

    if (planCheck.rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'Plan not found or inactive' });
    }

    const plan = planCheck.rows[0];

    // Update user's plan
    await pool.query(
      'UPDATE "user" SET plan_id = $1, updated_at = $2 WHERE id = $3',
      [plan_id, Date.now(), userId]
    );

    console.log(`[postChangePlan] User ${userId} changed to plan: ${plan.name}`);

    res.json({
      ok: true,
      data: {
        plan_id: Number(plan_id),
        plan_name: plan.name,
        interval: plan.interval
      }
    });
  } catch (error) {
    console.error('[postChangePlan] error:', error);
    res.status(500).json({ ok: false, error: 'Failed to change plan' });
  }
}

export async function postCancelAtPeriodEnd(req: Request, res: Response) {
  // Stub: mark cancel_at_period_end in GC and persist
  res.json({ ok: true, data: { cancels_on: null } });
}
