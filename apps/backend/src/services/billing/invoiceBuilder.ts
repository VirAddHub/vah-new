// apps/backend/src/services/billing/invoiceBuilder.ts
import { getPool } from '../../lib/db';
import type { Pool } from 'pg';
import { logger } from '../../lib/logger';

type Cadence = 'monthly' | 'annual';

function errorInfo(e: unknown): { message: string; code?: string } {
  if (e && typeof e === 'object') {
    const anyE = e as { message?: unknown; code?: unknown };
    return {
      message: typeof anyE.message === 'string' ? anyE.message : String(e),
      code: typeof anyE.code === 'string' ? anyE.code : undefined,
    };
  }
  return { message: String(e) };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function periodForNow(cadence: Cadence, now = new Date()): { start: string; end: string } {
  // Use UTC date boundaries for consistency
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11

  if (cadence === 'annual') {
    const start = `${y}-01-01`;
    const end = `${y}-12-31`;
    return { start, end };
  }

  // monthly
  const start = `${y}-${pad2(m + 1)}-01`;
  const endDate = new Date(Date.UTC(y, m + 1, 0)); // last day of month
  const end = `${endDate.getUTCFullYear()}-${pad2(endDate.getUTCMonth() + 1)}-${pad2(endDate.getUTCDate())}`;
  return { start, end };
}

function basePricePence(cadence: Cadence): number {
  // TODO: replace with plans table lookup later
  return cadence === 'annual' ? 8999 : 999;
}

export interface CreateInvoiceForUserPeriodOptions {
  userId: number;
  cadence: Cadence;
  gocardlessPaymentId?: string | null;
  now?: Date;
}

export interface CreateInvoiceForUserPeriodResult {
  invoiceId: number;
  start: string;
  end: string;
  totalPence: number;
  created: boolean;
  chargesAttached: number;
}

/**
 * Create an invoice for a user's billing period, including all pending charges
 * Idempotent: if invoice already exists for (user_id, period_start, period_end), updates amount and returns existing
 */
export async function createInvoiceForUserPeriod(
  opts: CreateInvoiceForUserPeriodOptions
): Promise<CreateInvoiceForUserPeriodResult> {
  const { userId, cadence, gocardlessPaymentId = null, now = new Date() } = opts;
  const { start, end } = periodForNow(cadence, now);
  const pool = getPool();

  // 1) Calculate pending charges for period
  let chargesPence = 0;
  try {
    const chargesRes = await pool.query<{ charges_pence: number }>(
      `
      SELECT COALESCE(SUM(amount_pence), 0)::int AS charges_pence
      FROM charge
      WHERE user_id = $1
        AND status = 'pending'
        AND service_date >= $2::date
        AND service_date <= $3::date
      `,
      [userId, start, end]
    );
    chargesPence = chargesRes.rows[0]?.charges_pence ?? 0;
  } catch (chargeError: unknown) {
    // Table doesn't exist yet - continue with 0 charges
    const { message: msg, code } = errorInfo(chargeError);
    if (msg.includes('relation "charge" does not exist') || code === '42P01') {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[invoice_builder] charge table missing, skipping charges');
      }
    } else {
      logger.error('[invoice_builder] charge_query_failed', { message: msg, code });
    }
    chargesPence = 0;
  }

  const basePence = basePricePence(cadence);
  const totalPence = basePence + chargesPence;

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('[invoice_builder] computed', { userId, cadence, start, end, basePence, chargesPence, totalPence });
  }

  // 2) Get or generate invoice number
  // Use existing invoice number sequence logic
  const year = new Date(end).getFullYear();
  let invoiceNumberFormatted: string;
  let invoiceNumber: string;

  try {
    const seqResult = await pool.query(
      `INSERT INTO invoices_seq (year, sequence, created_at, updated_at)
       VALUES ($1, 1, $2, $2)
       ON CONFLICT (year) 
       DO UPDATE SET sequence = invoices_seq.sequence + 1, updated_at = $2
       RETURNING sequence`,
      [year, Date.now()]
    );
    const sequence = seqResult.rows[0].sequence;
    invoiceNumber = String(sequence);
    invoiceNumberFormatted = `VAH-${year}-${String(sequence).padStart(6, '0')}`;
  } catch (seqError: unknown) {
    // Fallback if invoices_seq table doesn't exist
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[invoice_builder] invoices_seq missing, using fallback invoice number');
    }
    invoiceNumber = `${userId}-${start}`;
    invoiceNumberFormatted = `INV-${userId}-${start}`;
  }

  const createdAtMs = Date.now();

  // 3) Create or update invoice (idempotent by gocardless_payment_id if provided, or by period)
  // Note: invoices table doesn't have unique constraint on (user_id, period_start, period_end)
  // So we check for existing invoice first
  let invoiceId: number;
  let created = false;

  if (gocardlessPaymentId) {
    // Check if invoice already exists for this payment
    const existing = await pool.query(
      `SELECT id FROM invoices WHERE gocardless_payment_id = $1`,
      [gocardlessPaymentId]
    );

    if (existing.rows.length > 0) {
      invoiceId = existing.rows[0].id;
      // Update amount in case charges changed
      await pool.query(
        `UPDATE invoices 
         SET amount_pence = $1
         WHERE id = $2`,
        [totalPence, invoiceId]
      );
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[invoice_builder] invoice_exists', { userId, invoiceId });
      }
    } else {
      // Create new invoice
      const invRes = await pool.query<{ id: number }>(
        `
        INSERT INTO invoices (
          user_id, invoice_number, amount_pence, period_start, period_end, 
          status, created_at, number, billing_interval, gocardless_payment_id, currency
        )
        VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8, $9, 'GBP')
        RETURNING id
        `,
        [userId, invoiceNumberFormatted, totalPence, start, end, createdAtMs, invoiceNumber, cadence, gocardlessPaymentId]
      );
      invoiceId = invRes.rows[0].id;
      created = true;
    }
  } else {
    // No payment ID - check by period
    const existing = await pool.query(
      `SELECT id FROM invoices 
       WHERE user_id = $1 
         AND period_start = $2 
         AND period_end = $3
       ORDER BY id DESC
       LIMIT 1`,
      [userId, start, end]
    );

    if (existing.rows.length > 0) {
      invoiceId = existing.rows[0].id;
      // Update amount in case charges changed
      await pool.query(
        `UPDATE invoices 
         SET amount_pence = $1
         WHERE id = $2`,
        [totalPence, invoiceId]
      );
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('[invoice_builder] invoice_exists', { userId, invoiceId, start, end });
      }
    } else {
      // Create new invoice
      const invRes = await pool.query<{ id: number }>(
        `
        INSERT INTO invoices (
          user_id, invoice_number, amount_pence, period_start, period_end, 
          status, created_at, number, billing_interval, currency
        )
        VALUES ($1, $2, $3, $4, $5, 'issued', $6, $7, $8, 'GBP')
        RETURNING id
        `,
        [userId, invoiceNumberFormatted, totalPence, start, end, createdAtMs, invoiceNumber, cadence]
      );
      invoiceId = invRes.rows[0].id;
      created = true;
    }
  }

  // 4) Attach charges + mark billed (only those in period and still pending)
  let chargesAttached = 0;
  try {
    const chargesUpdate = await pool.query(
      `
      UPDATE charge
      SET
        status = 'billed',
        invoice_id = $1,
        billed_at = NOW()
      WHERE user_id = $2
        AND status = 'pending'
        AND service_date >= $3::date
        AND service_date <= $4::date
        AND invoice_id IS NULL
      `,
      [invoiceId, userId, start, end]
    );
    chargesAttached = chargesUpdate.rowCount || 0;
  } catch (chargeError: unknown) {
    // Table doesn't exist - skip charge update
    const { message: msg, code } = errorInfo(chargeError);
    if (!msg.includes('relation "charge" does not exist') && code !== '42P01') {
      logger.error('[invoice_builder] charge_update_failed', { message: msg, code, invoiceId, userId });
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('[invoice_builder] invoice_ready', { userId, invoiceId, created, chargesAttached, totalPence, start, end });
  }

  return {
    invoiceId,
    start,
    end,
    totalPence,
    created,
    chargesAttached,
  };
}

