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
import { invoicePeriodRelatedId } from './chargeIdempotency';

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
  periodStart: string;
  periodEnd: string;
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
 * Recompute invoice total from attached charges (authoritative source)
 * INVARIANT: invoice.amount_pence = SUM(charge.amount_pence WHERE invoice_id = invoice.id AND status='billed')
 * 
 * @param pool Database pool
 * @param invoiceId Invoice ID
 * @param currency Currency (defaults to 'GBP')
 * @returns Total amount in pence
 */
export async function recomputeInvoiceTotal(
  pool: any,
  invoiceId: number,
  currency: string = 'GBP'
): Promise<number> {
  let totalChargesPence = 0;
  try {
    const chargesSum = await pool.query(
      `
      SELECT COALESCE(SUM(amount_pence), 0)::bigint AS total_pence
      FROM charge
      WHERE invoice_id = $1
        AND status = 'billed'
      `,
      [invoiceId]
    );
    totalChargesPence = Number((chargesSum.rows[0] as any)?.total_pence || 0);
  } catch (chargeError: any) {
    // Table doesn't exist - use 0
    const msg = String(chargeError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && chargeError?.code !== '42P01') {
      console.error('[invoiceService] Error computing charge total:', chargeError);
      throw chargeError;
    }
    totalChargesPence = 0;
  }

  // Get current invoice amount for comparison (debug logging)
  let currentInvoiceAmount = 0;
  try {
    const invoiceResult = await pool.query(
      `SELECT amount_pence FROM invoices WHERE id = $1`,
      [invoiceId]
    );
    if (invoiceResult.rows.length > 0) {
      currentInvoiceAmount = Number(invoiceResult.rows[0].amount_pence || 0);
    }
  } catch (e) {
    // Ignore
  }

  // Log mismatch if found (debug-safe)
  if (currentInvoiceAmount !== totalChargesPence) {
    console.error('[invoiceService] INVOICE AMOUNT MISMATCH', {
      invoiceId,
      currentInvoiceAmount,
      computedFromCharges: totalChargesPence,
      difference: totalChargesPence - currentInvoiceAmount,
    });
  }

  // Update invoice amount - this is the authoritative source
  // INVARIANT: invoice.amount_pence = SUM(charge.amount_pence WHERE invoice_id = invoice.id AND status='billed')
  await pool.query(
    `UPDATE invoices 
     SET amount_pence = $1, currency = $2
     WHERE id = $3`,
    [totalChargesPence, currency, invoiceId]
  );

  return totalChargesPence;
}

/**
 * Recompute invoice amount (alias for recomputeInvoiceTotal for consistency)
 */
export async function recomputeInvoiceAmount(opts: {
  pool: any;
  invoiceId: number;
}): Promise<number> {
  return recomputeInvoiceTotal(opts.pool, opts.invoiceId, 'GBP');
}

/**
 * Ensure subscription charge exists for billing period (idempotent)
 * Creates a subscription_fee charge if it doesn't already exist
 */
async function ensureSubscriptionChargeForPeriod(opts: {
  pool: any;
  userId: number;
  periodStart: string;
  periodEnd: string;
  billingInterval: 'monthly' | 'annual';
  currency: string;
}): Promise<void> {
  const { pool, userId, periodStart, periodEnd, billingInterval, currency } = opts;

  // Get plan price from plans table
  const interval = billingInterval === 'monthly' ? 'month' : 'year';
  let amountPence: number;
  let description: string;

  try {
    const planResult = await pool.query(
      `SELECT price_pence FROM plans 
       WHERE interval = $1 AND active = true AND retired_at IS NULL 
       ORDER BY sort ASC, price_pence ASC 
       LIMIT 1`,
      [interval]
    );

    if (planResult.rows.length > 0) {
      amountPence = Number(planResult.rows[0].price_pence);
    } else {
      // Fallback to hardcoded prices if plan not found
      amountPence = billingInterval === 'monthly' ? 999 : 8999;
    }
  } catch (planError: any) {
    // Plans table might not exist - use fallback
    console.warn('[ensureSubscriptionCharge] Error fetching plan price, using fallback:', planError);
    amountPence = billingInterval === 'monthly' ? 999 : 8999;
  }

  description = billingInterval === 'monthly'
    ? 'Digital Mailbox Plan – Monthly subscription'
    : 'Digital Mailbox Plan – Annual subscription';

  // Generate deterministic related_id
  const relatedId = invoicePeriodRelatedId(userId, periodStart, periodEnd);

  // Insert subscription charge (idempotent via unique constraint)
  try {
    await pool.query(
      `
      INSERT INTO charge (
        user_id,
        amount_pence,
        currency,
        type,
        description,
        service_date,
        status,
        related_type,
        related_id
      )
      VALUES (
        $1, $2, $3,
        'subscription_fee',
        $4,
        $5::date,
        'pending',
        'invoice_period',
        $6
      )
      ON CONFLICT (type, related_type, related_id)
      WHERE related_type IS NOT NULL AND related_id IS NOT NULL
      DO NOTHING
      `,
      [userId, amountPence, currency, description, periodStart, relatedId]
    );
  } catch (chargeError: any) {
    // Table doesn't exist - skip
    const msg = String(chargeError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && chargeError?.code !== '42P01') {
      console.error('[ensureSubscriptionCharge] Error creating subscription charge:', chargeError);
      throw chargeError;
    }
    console.warn('[ensureSubscriptionCharge] charge table missing, skipping subscription charge');
  }
}

/**
 * Generate invoice for a user's billing period
 * 
 * Process:
 * 0. Ensure subscription charge exists for period (idempotent)
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
  const existingInvoice = await pool.query<{ id: number; gocardless_payment_id?: string | null; email_sent_at?: string | null; status?: string | null }>(
    `
    SELECT id, gocardless_payment_id, email_sent_at, status FROM invoices
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
  const existing = existingInvoice.rows[0];
  const isFrozen = Boolean(existing?.email_sent_at) || Boolean(existing?.gocardless_payment_id);

  // 0) Ensure subscription charge exists for this period (idempotent)
  // Only when the invoice is still open. If the invoice is frozen, we must not create/attach new items into that closed period.
  if (!isFrozen) {
    await ensureSubscriptionChargeForPeriod({
      pool,
      userId,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      billingInterval,
      currency,
    });
  }

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
    // Update existing invoice - keep status as-is unless explicitly changed
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
    
    console.log('[invoiceService] invoice_exists', { userId, invoiceId, periodStartStr, periodEndStr, isFrozen });
  } else {
    // Create new invoice - default status is 'issued' unless creating from payment flow
    // Status will be set to 'paid' later in webhook handler if gocardlessPaymentId is provided
    const status = 'issued'; // Always start as 'issued', webhook will update to 'paid'
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
    console.log('[invoiceService] invoice_created', { userId, invoiceId, periodStartStr, periodEndStr, status });
  }

  // 2) Attach pending charges in period
  // Only mark charges as billed when invoice_id is set (invariant)
  let attachedCount = 0;
  try {
    if (isFrozen) {
      // Freeze rule: once invoice is finalized/charged, never attach new charges to it.
      // Any late-arriving charges will remain pending and will be picked up by the NEXT invoice run.
      attachedCount = 0;
      console.log('[invoiceService] charges_attach_skipped_frozen', { userId, invoiceId });
    } else {
      const chargesUpdate = await pool.query(
        `
        UPDATE charge
        SET
          invoice_id = $1,
          status = 'billed',
          billed_at = NOW()
        WHERE user_id = $2
          AND status = 'pending'
          AND service_date <= $3::date
          AND invoice_id IS NULL
        `,
        [invoiceId, userId, periodEndStr]
      );
      attachedCount = chargesUpdate.rowCount || 0;
      console.log('[invoiceService] charges_attached', { userId, invoiceId, attachedCount, upTo: periodEndStr });
    }
  } catch (chargeError: any) {
    // Table doesn't exist - skip charge update
    const msg = String(chargeError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && chargeError?.code !== '42P01') {
      console.error('[invoiceService] Error attaching charges:', chargeError);
      throw chargeError;
    }
    console.warn('[invoiceService] charge table missing, skipping charge attachment');
  }

  // 3) CRITICAL FIX: Recompute invoice amount from authoritative source
  // Invoice amount MUST equal SUM(charge.amount_pence) WHERE charge.invoice_id = invoice.id AND status='billed'
  // This ensures correctness even if charges were attached in a previous run or attached elsewhere
  // Always compute from charge table (authoritative source), not from UPDATE ... RETURNING
  const totalChargesPence = await recomputeInvoiceTotal(pool, invoiceId, currency);

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
    periodStart: periodStartStr,
    periodEnd: periodEndStr,
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

