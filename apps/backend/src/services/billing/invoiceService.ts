// apps/backend/src/services/billing/invoiceService.ts
/**
 * Invoice generation service for automated billing
 * 
 * Invariants:
 * - Charges are only marked as 'billed' when invoice_id is set
 * - Invoice amount is recomputed from attached charges (charges with invoice_id = invoice.id)
 * - Idempotent: generating invoice for same period updates existing invoice
 */

import { getPool } from '../../lib/db';

export interface GenerateInvoiceForPeriodOptions {
  userId: number;
  periodStart: Date | string; // Will be normalized to 'YYYY-MM-DD'
  periodEnd: Date | string; // Will be normalized to 'YYYY-MM-DD'
  billingInterval: 'monthly' | 'annual';
  currency?: string; // Defaults to 'GBP'
  gocardlessPaymentId?: string | null; // Optional: link invoice to payment
}

export interface GenerateInvoiceForPeriodResult {
  invoiceId: number;
  attachedCount: number;
  totalChargesPence: number;
  invoiceAmountPence: number;
}

/**
 * Normalize date to 'YYYY-MM-DD' format for invoice period storage
 */
function normalizeDate(date: Date | string): string {
  if (typeof date === 'string') {
    // Already in YYYY-MM-DD format
    return date;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate invoice for a user's billing period
 * 
 * Process:
 * 1. Upsert invoice row keyed by (user_id, period_start, period_end)
 * 2. Attach pending charges in period: UPDATE charge SET invoice_id, status='billed', billed_at
 * 3. Recompute invoice.amount_pence from attached charges
 * 
 * Idempotent: calling multiple times for same period updates existing invoice
 */
export async function generateInvoiceForPeriod(
  opts: GenerateInvoiceForPeriodOptions
): Promise<GenerateInvoiceForPeriodResult> {
  const pool = getPool();
  const {
    userId,
    periodStart,
    periodEnd,
    billingInterval,
    currency = 'GBP',
    gocardlessPaymentId = null,
  } = opts;

  const periodStartStr = normalizeDate(periodStart);
  const periodEndStr = normalizeDate(periodEnd);

  // 1) Upsert invoice (idempotent by user_id + period)
  // Check if invoice exists for this period
  const existingInvoice = await pool.query<{ id: number }>(
    `
    SELECT id FROM invoices
    WHERE user_id = $1
      AND period_start = $2
      AND period_end = $3
    ORDER BY id DESC
    LIMIT 1
    `,
    [userId, periodStartStr, periodEndStr]
  );

  let invoiceId: number;
  const createdAtMs = Date.now();

  // Generate invoice number using existing sequence
  const year = new Date(periodEndStr).getFullYear();
  let invoiceNumberFormatted: string;
  let invoiceNumber: string;

  try {
    const seqResult = await pool.query(
      `INSERT INTO invoices_seq (year, sequence, created_at, updated_at)
       VALUES ($1, $2, $2)
       ON CONFLICT (year) 
       DO UPDATE SET sequence = invoices_seq.sequence + 1, updated_at = $2
       RETURNING sequence`,
      [year, createdAtMs]
    );
    const sequence = seqResult.rows[0].sequence;
    invoiceNumber = String(sequence);
    invoiceNumberFormatted = `VAH-${year}-${String(sequence).padStart(6, '0')}`;
  } catch (seqError: any) {
    // Fallback if invoices_seq table doesn't exist
    console.warn('[invoiceService] invoices_seq table missing, using fallback invoice number');
    invoiceNumber = `${userId}-${periodStartStr}`;
    invoiceNumberFormatted = `INV-${userId}-${periodStartStr}`;
  }

  if (existingInvoice.rows.length > 0) {
    // Update existing invoice
    invoiceId = existingInvoice.rows[0].id;
    
    // Update gocardless_payment_id if provided and not already set
    if (gocardlessPaymentId) {
      await pool.query(
        `UPDATE invoices 
         SET gocardless_payment_id = COALESCE(gocardless_payment_id, $1)
         WHERE id = $2`,
        [gocardlessPaymentId, invoiceId]
      );
    }
    
    console.log('[invoiceService] invoice_exists', { userId, invoiceId, periodStartStr, periodEndStr });
  } else {
    // Create new invoice
    const status = gocardlessPaymentId ? 'paid' : 'issued';
    const invRes = await pool.query<{ id: number }>(
      `
      INSERT INTO invoices (
        user_id, invoice_number, amount_pence, period_start, period_end,
        status, created_at, number, billing_interval, gocardless_payment_id, currency
      )
      VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        userId,
        invoiceNumberFormatted,
        periodStartStr,
        periodEndStr,
        status,
        createdAtMs,
        invoiceNumber,
        billingInterval,
        gocardlessPaymentId,
        currency,
      ]
    );
    invoiceId = invRes.rows[0].id;
    console.log('[invoiceService] invoice_created', { userId, invoiceId, periodStartStr, periodEndStr });
  }

  // 2) Attach pending charges in period
  // Only mark charges as billed when invoice_id is set (invariant)
  let attachedCount = 0;
  try {
    const chargesUpdate = await pool.query(
      `
      UPDATE charge
      SET
        invoice_id = $1,
        status = 'billed',
        billed_at = NOW()
      WHERE user_id = $2
        AND status = 'pending'
        AND service_date >= $3::date
        AND service_date <= $4::date
        AND invoice_id IS NULL
      `,
      [invoiceId, userId, periodStartStr, periodEndStr]
    );
    attachedCount = chargesUpdate.rowCount || 0;
    console.log('[invoiceService] charges_attached', { userId, invoiceId, attachedCount });
  } catch (chargeError: any) {
    // Table doesn't exist - skip charge update
    const msg = String(chargeError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && chargeError?.code !== '42P01') {
      console.error('[invoiceService] Error attaching charges:', chargeError);
      throw chargeError;
    }
    console.warn('[invoiceService] charge table missing, skipping charge attachment');
  }

  // 3) Recompute invoice amount from attached charges
  // Invoice amount = SUM of all charges with invoice_id = invoiceId
  let totalChargesPence = 0;
  try {
    const chargesSum = await pool.query<{ total_pence: number }>(
      `
      SELECT COALESCE(SUM(amount_pence), 0)::bigint AS total_pence
      FROM charge
      WHERE invoice_id = $1
      `,
      [invoiceId]
    );
    totalChargesPence = Number(chargesSum.rows[0]?.total_pence || 0);
  } catch (chargeError: any) {
    // Table doesn't exist - use 0
    const msg = String(chargeError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && chargeError?.code !== '42P01') {
      console.error('[invoiceService] Error computing charge total:', chargeError);
    }
    totalChargesPence = 0;
  }

  // Update invoice amount
  await pool.query(
    `UPDATE invoices 
     SET amount_pence = $1
     WHERE id = $2`,
    [totalChargesPence, invoiceId]
  );

  console.log('[invoiceService] invoice_ready', {
    userId,
    invoiceId,
    attachedCount,
    totalChargesPence,
    periodStartStr,
    periodEndStr,
  });

  return {
    invoiceId,
    attachedCount,
    totalChargesPence,
    invoiceAmountPence: totalChargesPence,
  };
}

/**
 * Repair orphaned billed charges (charges marked as billed but no invoice_id)
 * Sets status back to 'pending' and clears billed_at
 */
export async function repairOrphanCharges(): Promise<number> {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `
      UPDATE charge
      SET status = 'pending',
          billed_at = NULL
      WHERE status = 'billed'
        AND invoice_id IS NULL
      `
    );
    
    const updatedCount = result.rowCount || 0;
    console.log('[invoiceService] repair_orphan_charges', { updatedCount });
    
    return updatedCount;
  } catch (error: any) {
    const msg = String(error?.message || '');
    if (msg.includes('relation "charge" does not exist') || error?.code === '42P01') {
      console.warn('[invoiceService] charge table missing, skipping repair');
      return 0;
    }
    throw error;
  }
}

