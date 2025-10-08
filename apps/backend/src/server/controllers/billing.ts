import type { Request, Response } from 'express';
import { getPool } from '../db';
import { gcCreateReauthoriseLink, gcCreateUpdateBankLink } from '../../lib/gocardless';

export async function getBillingOverview(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const pool = getPool();

  const subResult = await pool.query(`
    SELECT * FROM subscription WHERE user_id=$1 ORDER BY id DESC LIMIT 1
  `, [userId]);

  const sub = subResult.rows[0];

  const usageMonth = new Date();
  usageMonth.setDate(1);
  usageMonth.setHours(0, 0, 0, 0);
  const yyyymm = `${usageMonth.getFullYear()}-${String(usageMonth.getMonth() + 1).padStart(2, '0')}`;

  const usageResult = await pool.query(`
    SELECT COALESCE(SUM(amount_pence),0) as amount_pence, COALESCE(SUM(qty),0) as qty
    FROM usage_charges WHERE user_id=$1 AND period_yyyymm=$2
  `, [userId, yyyymm]);

  const usage = usageResult.rows[0];

  res.json({
    ok: true, data: {
      plan: sub?.plan_name ?? 'Digital Mailbox Plan',
      cadence: sub?.cadence ?? 'monthly',
      status: sub?.status ?? 'active',
      next_charge_at: sub?.next_charge_at ?? null,
      mandate_status: sub?.mandate_id ? 'active' : 'missing',
      usage: { qty: usage?.qty ?? 0, amount_pence: usage?.amount_pence ?? 0 }
    }
  });
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
  const userId = Number(req.user!.id);
  const link = await gcCreateUpdateBankLink(userId);
  res.json({ ok: true, data: link });
}

export async function postReauthorise(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const link = await gcCreateReauthoriseLink(userId);
  res.json({ ok: true, data: link });
}

export async function postRetryPayment(req: Request, res: Response) {
  // Stub: schedule a retry on latest failed payment (implement via GC API)
  res.json({ ok: true, data: { queued: true } });
}

export async function postChangePlan(req: Request, res: Response) {
  const { plan, cadence } = req.body ?? {};
  // Stub: call GC to update subscription; persist to "subscription"
  res.json({ ok: true, data: { plan, cadence } });
}

export async function postCancelAtPeriodEnd(req: Request, res: Response) {
  // Stub: mark cancel_at_period_end in GC and persist
  res.json({ ok: true, data: { cancels_on: null } });
}
