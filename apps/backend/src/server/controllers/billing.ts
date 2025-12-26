import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getPool } from '../db';
import { gcCreateReauthoriseLink, gcCreateUpdateBankLink } from '../../lib/gocardless';
import { TimestampUtils } from '../../lib/timestamp-utils';
import { logger } from '../../lib/logger';

function redactEmail(email: unknown): string {
  const s = String(email || '');
  if (!s.includes('@')) return 'redacted';
  const [user, domain] = s.split('@');
  const safeUser = user.length <= 2 ? `${user[0] ?? ''}…` : `${user.slice(0, 2)}…`;
  return `${safeUser}@${domain}`;
}

/**
 * GET /api/billing/invoices/:id
 * Get invoice details with line items breakdown
 */
export async function getInvoiceById(req: Request, res: Response) {
  const userId = Number(req.user!.id);
  const invoiceId = Number(req.params.id);
  const pool = getPool();

  if (!invoiceId || Number.isNaN(invoiceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_invoice_id' });
  }

  try {
    // Get invoice
    const invoiceResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [invoiceId, userId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get all charges (line items) for this invoice
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
          related_id
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
      }));
    } catch (itemsError: any) {
      // Table doesn't exist - return empty items
      const msg = String(itemsError?.message || '');
      if (!msg.includes('relation "charge" does not exist') && itemsError?.code !== '42P01') {
        logger.error('[getInvoiceById] fetch_items_failed', { message: itemsError?.message ?? String(itemsError) });
      }
    }

    return res.json({
      ok: true,
      data: {
        invoice,
        items,
      },
    });
  } catch (error: any) {
    logger.error('[getInvoiceById] error', { message: error?.message ?? String(error) });
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
}

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
    logger.error('[getPendingForwardingFees] error', { message: error?.message ?? String(error) });
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
      SELECT plan_id, plan_status, payment_failed_at, payment_retry_count, payment_grace_until, account_suspended_at,
             gocardless_mandate_id, gocardless_redirect_flow_id
      FROM "user" WHERE id=$1
    `, [userId]);
    const user = userResult.rows[0];

    // Resolve plan (single source of truth for display price)
    // Prefer user.plan_id; fallback to subscription cadence/interval.
    let resolvedPlan: { id: number; name: string; interval: string; price_pence: number } | null = null;
    const planId = user?.plan_id ? Number(user.plan_id) : null;
    if (planId) {
      try {
        const r = await pool.query(
          `SELECT id, name, interval, price_pence
             FROM plans
            WHERE id = $1 AND active = true AND retired_at IS NULL
            LIMIT 1`,
          [planId]
        );
        resolvedPlan = r.rows[0] || null;
      } catch (e) {
        logger.warn('[getBillingOverview] plan_lookup_by_id_failed', { message: (e as any)?.message ?? String(e) });
      }
    }

    if (!resolvedPlan) {
      const cadence = (sub?.plan_interval || sub?.cadence || 'monthly').toString().toLowerCase();
      const interval = cadence.includes('year') || cadence.includes('annual') ? 'year' : 'month';
      try {
        const r = await pool.query(
          `SELECT id, name, interval, price_pence
             FROM plans
            WHERE interval = $1 AND active = true AND retired_at IS NULL
            ORDER BY sort ASC, price_pence ASC
            LIMIT 1`,
          [interval]
        );
        resolvedPlan = r.rows[0] || null;
      } catch (e) {
        logger.warn('[getBillingOverview] plan_lookup_by_interval_failed', { message: (e as any)?.message ?? String(e) });
      }
    }

    const resolvedPlanName = resolvedPlan?.name || sub?.plan_name || 'Digital Mailbox Plan';
    const resolvedCadence =
      (resolvedPlan?.interval || sub?.plan_interval || sub?.cadence || 'monthly')
        .toString()
        .toLowerCase()
        .includes('year')
        ? 'annual'
        : 'monthly';

    // Fallback price if plan lookup failed (use same defaults as invoiceService)
    // This ensures we always show a price even if plan lookup fails
    const fallbackPricePence = resolvedCadence === 'annual' ? 8999 : 999;

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
        plan_id: resolvedPlan?.id ?? planId ?? null,
        plan: resolvedPlanName,
        cadence: resolvedCadence,
        status: sub?.status || 'active',
        account_status: accountStatus,
        grace_period: gracePeriodInfo,
        next_charge_at: sub?.next_charge_at ?? null,
        mandate_status: sub?.mandate_id ? 'active' : 'missing',
        has_mandate: !!user?.gocardless_mandate_id,
        has_redirect_flow: !!user?.gocardless_redirect_flow_id,
        redirect_flow_id: user?.gocardless_redirect_flow_id ?? null,
        // NOTE: This should represent the plan price (not the latest invoice total, which can include forwarding fees).
        // Use fallback prices if plan lookup failed or returned invalid price (0 or null) to ensure price is always displayed
        current_price_pence: (resolvedPlan?.price_pence && resolvedPlan.price_pence > 0) 
          ? resolvedPlan.price_pence 
          : (sub?.price_pence && sub.price_pence > 0) 
            ? sub.price_pence 
            : fallbackPricePence,
        // Expose invoice total separately for UIs that need it (non-plan charges, etc.)
        latest_invoice_amount_pence: latestInvoice?.amount_pence || 0,
        pending_forwarding_fees_pence: await getPendingForwardingFees(userId),
      }
    });
  } catch (error) {
    logger.error('[getBillingOverview] error', { message: (error as any)?.message ?? String(error) });
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
  const callerId = BigInt(req.user!.id);
  const isAdmin = req.user!.is_admin || false;
  const invoiceId = Number(req.params.id);
  const pool = getPool();

  if (!invoiceId || Number.isNaN(invoiceId)) {
    return res.status(400).json({ ok: false, error: 'invalid_invoice_id' });
  }

  // Debug logging (guarded by env var)
  if (process.env.DEBUG_BILLING === '1') {
    logger.debug('[downloadInvoicePdf] debug', {
      callerId: String(callerId),
      callerEmail: redactEmail(req.user!.email),
      isAdmin,
      invoiceId,
    });
  }

  try {
    // Get invoice with full details needed for PDF generation
    if (process.env.DEBUG_BILLING === '1') {
      logger.debug('[billing] pdf_download_fetch_invoice', { invoiceId });
    }
    const result = await pool.query(
      `SELECT id, user_id, invoice_number, pdf_path, amount_pence, currency, period_start, period_end 
       FROM invoices WHERE id=$1 LIMIT 1`,
      [invoiceId]
    );
    const inv = result.rows[0];

    if (!inv) {
      logger.warn('[billing] pdf_download_invoice_not_found', { invoiceId });
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    if (process.env.DEBUG_BILLING === '1') {
      logger.debug('[billing] pdf_download_invoice_found', {
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        invoiceUserId: String(inv.user_id),
        hasPdfPath: Boolean(inv.pdf_path),
        amountPence: inv.amount_pence,
      });
    }

    // Authorization: admin can access any invoice, otherwise must own it
    // CRITICAL: Convert both to BigInt for safe comparison (Postgres BIGINT may come as string)
    const ownerId = BigInt(inv.user_id);
    const authorized = isAdmin || callerId === ownerId;

    if (process.env.DEBUG_BILLING === '1') {
      logger.debug('[billing] pdf_download_auth_check', {
        invoiceId,
        callerId: callerId.toString(),
        ownerId: ownerId.toString(),
        isAdmin,
        authorized,
      });
    }

    if (!authorized) {
      logger.warn('[billing] pdf_download_forbidden', {
        invoiceId,
        callerId: callerId.toString(),
        ownerId: ownerId.toString(),
        isAdmin,
      });
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    // Recompute invoice amount from charges before generating PDF (ensures correctness)
    if (process.env.DEBUG_BILLING === '1') {
      logger.debug('[billing] pdf_download_recompute_amount', { invoiceId });
    }
    const { recomputeInvoiceTotal } = await import('../../services/billing/invoiceService');
    const correctAmountPence = await recomputeInvoiceTotal(pool, inv.id, inv.currency || 'GBP');

    if (process.env.DEBUG_BILLING === '1') {
      logger.debug('[billing] pdf_download_amount_recomputed', {
        invoiceId,
        originalAmount: inv.amount_pence,
        recomputedAmount: correctAmountPence,
        currency: inv.currency || 'GBP',
      });
    }

    // Use recomputed amount for PDF generation
    const amountPence = correctAmountPence;

    const baseDir = process.env.INVOICES_DIR
      ? path.resolve(process.env.INVOICES_DIR)
      : path.join(process.cwd(), 'data', 'invoices');

    let pdfPath = inv.pdf_path;
    let fullPath: string | null = null;

    // Check if PDF exists
    if (pdfPath) {
      const rel = String(pdfPath).replace(/^\/+/, ''); // strip leading slash
      // Expected: invoices/YYYY/userId/invoice-123.pdf
      fullPath = path.join(baseDir, rel.replace(/^invoices\//, ''));

      if (fs.existsSync(fullPath)) {
        // PDF exists - stream it
        const filename = inv.invoice_number
          ? `${inv.invoice_number}.pdf`
          : `invoice-${invoiceId}.pdf`;

        const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        fs.createReadStream(fullPath).pipe(res);
        return;
      }
    }

    // PDF doesn't exist - generate on-demand
    logger.info('[billing] pdf_download_generating_on_demand', {
      invoiceId,
      invoiceNumber: inv.invoice_number,
    });

    try {
      const { generateInvoicePdf } = await import('../../services/invoices');

      // Generate PDF using recomputed amount
      const generatedPath = await generateInvoicePdf({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number || `INV-${inv.id}`,
        userId: inv.user_id,
        amountPence: amountPence, // Use recomputed amount, not inv.amount_pence
        currency: inv.currency || 'GBP',
        periodStart: inv.period_start,
        periodEnd: inv.period_end,
      });

      // Update invoice with generated PDF path
      await pool.query(
        `UPDATE invoices SET pdf_path = $1 WHERE id = $2`,
        [generatedPath, inv.id]
      );

      // Resolve full path for streaming
      const rel = String(generatedPath).replace(/^\/+/, '');
      fullPath = path.join(baseDir, rel.replace(/^invoices\//, ''));

      if (!fs.existsSync(fullPath)) {
        logger.error('[downloadInvoicePdf] generated_pdf_missing', { invoiceId, fullPath });
        return res.status(500).json({ ok: false, error: 'invoice_pdf_failed' });
      }

      // Stream the generated PDF
      const filename = inv.invoice_number
        ? `${inv.invoice_number}.pdf`
        : `invoice-${invoiceId}.pdf`;

      const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      fs.createReadStream(fullPath).pipe(res);
    } catch (pdfError: any) {
      logger.error('[downloadInvoicePdf] generate_pdf_failed', {
        invoiceId,
        message: pdfError?.message ?? String(pdfError),
      });
      return res.status(500).json({ ok: false, error: 'invoice_pdf_failed' });
    }
  } catch (error: any) {
    logger.error('[downloadInvoicePdf] error', { message: error?.message ?? String(error) });
    return res.status(500).json({ ok: false, error: 'download_failed' });
  }
}

export async function postUpdateBank(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const link = await gcCreateUpdateBankLink(userId);
    res.json({ ok: true, data: link });
  } catch (error) {
    logger.error('[postUpdateBank] error', { message: (error as any)?.message ?? String(error) });
    res.status(500).json({ ok: false, error: 'Failed to create update bank link' });
  }
}

export async function postReauthorise(req: Request, res: Response) {
  try {
    const userId = Number(req.user!.id);
    const link = await gcCreateReauthoriseLink(userId);
    res.json({ ok: true, data: link });
  } catch (error) {
    logger.error('[postReauthorise] error', { message: (error as any)?.message ?? String(error) });
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

      logger.info('[postChangePlan] plan_changed', {
        userId,
        planName: plan.name,
        interval: plan.interval,
      });

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
    logger.error('[postChangePlan] error', { message: (error as any)?.message ?? String(error) });
    res.status(500).json({ ok: false, error: 'Failed to change plan' });
  }
}

export async function postCancelAtPeriodEnd(req: Request, res: Response) {
  // Stub: mark cancel_at_period_end in GC and persist
  res.json({ ok: true, data: { cancels_on: null } });
}
