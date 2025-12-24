// apps/backend/src/server/routes/admin-invoices.ts
// Admin invoice search + download endpoints

import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { downloadInvoicePdf } from '../controllers/billing';

const router = Router();

const adminInvoicesLimiter = rateLimit({
  windowMs: 10_000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req as any).user;
    return u?.id ? `admin-invoices:${u.id}` : ipKeyGenerator(req.ip ?? '');
  },
  handler: (_req, res) => {
    res.setHeader('Retry-After', '10');
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  },
});

/**
 * GET /api/admin/invoices
 *
 * Query params:
 * - page (default 1)
 * - page_size (default 25)
 * - email (optional; ILIKE match)
 * - user_id (optional)
 * - invoice_number (optional; ILIKE match)
 * - from (optional; YYYY-MM-DD, filters created_at >= start of day UTC)
 * - to (optional; YYYY-MM-DD, filters created_at <= end of day UTC)
 */
router.get('/invoices', requireAdmin, adminInvoicesLimiter, async (req: Request, res: Response) => {
  const pool = getPool();

  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.page_size ?? 25) || 25));
  const offset = (page - 1) * pageSize;

  const email = typeof req.query.email === 'string' ? req.query.email.trim() : '';
  const invoiceNumber = typeof req.query.invoice_number === 'string' ? req.query.invoice_number.trim() : '';
  const userIdRaw = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : '';
  const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';

  const where: string[] = ['u.deleted_at IS NULL'];
  const params: any[] = [];
  let i = 1;

  if (email) {
    where.push(`u.email ILIKE $${i++}`);
    params.push(`%${email}%`);
  }

  if (invoiceNumber) {
    where.push(`inv.invoice_number ILIKE $${i++}`);
    params.push(`%${invoiceNumber}%`);
  }

  if (userIdRaw) {
    const userId = Number(userIdRaw);
    if (Number.isNaN(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    }
    where.push(`inv.user_id = $${i++}`);
    params.push(userId);
  }

  // created_at is stored as epoch ms (BIGINT-ish). Accept YYYY-MM-DD and convert to UTC ms bounds.
  const parseDayStartUtcMs = (d: string) => Date.parse(`${d}T00:00:00.000Z`);
  const parseDayEndUtcMs = (d: string) => Date.parse(`${d}T23:59:59.999Z`);

  if (from) {
    const ms = parseDayStartUtcMs(from);
    if (Number.isNaN(ms)) return res.status(400).json({ ok: false, error: 'invalid_from_date' });
    where.push(`inv.created_at >= $${i++}`);
    params.push(ms);
  }
  if (to) {
    const ms = parseDayEndUtcMs(to);
    if (Number.isNaN(ms)) return res.status(400).json({ ok: false, error: 'invalid_to_date' });
    where.push(`inv.created_at <= $${i++}`);
    params.push(ms);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const countResult = await pool.query(
      `
      SELECT COUNT(*)::bigint AS total
      FROM invoices inv
      JOIN "user" u ON u.id = inv.user_id
      ${whereSql}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const rowsResult = await pool.query(
      `
      SELECT
        inv.id,
        inv.user_id,
        u.email,
        u.first_name,
        u.last_name,
        inv.invoice_number,
        inv.amount_pence,
        inv.currency,
        inv.status,
        inv.period_start,
        inv.period_end,
        inv.created_at,
        inv.pdf_path
      FROM invoices inv
      JOIN "user" u ON u.id = inv.user_id
      ${whereSql}
      ORDER BY inv.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, pageSize, offset]
    );

    const items = rowsResult.rows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      email: r.email,
      first_name: r.first_name ?? null,
      last_name: r.last_name ?? null,
      invoice_number: r.invoice_number,
      amount_pence: Number(r.amount_pence ?? 0),
      currency: r.currency || 'GBP',
      status: r.status,
      period_start: r.period_start,
      period_end: r.period_end,
      created_at: r.created_at,
      pdf_path: r.pdf_path || null,
    }));

    return res.json({
      ok: true,
      data: {
        items,
        page,
        page_size: pageSize,
        total,
      },
    });
  } catch (error: any) {
    console.error('[admin-invoices] list error:', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/**
 * GET /api/admin/invoices/:id
 * Admin invoice details + charge line items.
 */
router.get('/invoices/:id', requireAdmin, adminInvoicesLimiter, async (req: Request, res: Response) => {
  const pool = getPool();
  const invoiceId = Number(req.params.id);
  if (!invoiceId || Number.isNaN(invoiceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_invoice_id' });
  }

  try {
    const invoiceResult = await pool.query(
      `
      SELECT
        inv.*,
        u.email,
        u.first_name,
        u.last_name,
        u.company_name
      FROM invoices inv
      JOIN "user" u ON u.id = inv.user_id
      WHERE inv.id = $1
      LIMIT 1
      `,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    const invoice = invoiceResult.rows[0];

    let items: any[] = [];
    try {
      const itemsResult = await pool.query(
        `
        SELECT
          service_date,
          description,
          amount_pence,
          currency,
          type,
          related_type,
          related_id,
          created_at
        FROM charge
        WHERE invoice_id = $1
          AND status = 'billed'
        ORDER BY service_date ASC, created_at ASC
        `,
        [invoiceId]
      );
      items = itemsResult.rows.map((row: any) => ({
        service_date: row.service_date,
        description: row.description,
        amount_pence: Number(row.amount_pence || 0),
        currency: row.currency || 'GBP',
        type: row.type,
        related_type: row.related_type,
        related_id: row.related_id ? String(row.related_id) : null,
        created_at: row.created_at,
      }));
    } catch (itemsError: any) {
      const msg = String(itemsError?.message || '');
      if (!msg.includes('relation "charge" does not exist') && itemsError?.code !== '42P01') {
        console.error('[admin-invoices] get invoice items error:', itemsError);
      }
    }

    return res.json({ ok: true, data: { invoice, items } });
  } catch (error: any) {
    console.error('[admin-invoices] get invoice error:', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

/**
 * GET /api/admin/invoices/:id/download
 * Admin-only download. Reuses the main download controller (which supports admin access).
 */
router.get('/invoices/:id/download', requireAdmin, async (req: Request, res: Response) => {
  return downloadInvoicePdf(req, res);
});

export default router;


