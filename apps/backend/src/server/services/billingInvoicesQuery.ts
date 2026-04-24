import { getPool } from '../db';
import { logger } from '../../lib/logger';
import type { Pool } from 'pg';

type InvoiceListItem = {
  id: number;
  invoice_number: string | null;
  date: string | number;
  period_start: string | null;
  period_end: string | null;
  amount_pence: number;
  currency: string;
  status: string | null;
  pdf_url: string | null;
};

export interface BillingInvoicesQueryDeps {
  pool: Pool;
}

function getBillingInvoicesQueryDeps(
  overrides?: Partial<BillingInvoicesQueryDeps>
): BillingInvoicesQueryDeps {
  return {
    pool: getPool(),
    ...overrides,
  };
}

export async function getInvoiceDetailsForUser(
  userId: number,
  invoiceId: number,
  deps?: Partial<BillingInvoicesQueryDeps>
): Promise<{ invoice: any; items: any[] } | null> {
  const { pool } = getBillingInvoicesQueryDeps(deps);

  const invoiceResult = await pool.query(
    `SELECT * FROM invoices WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [invoiceId, userId]
  );
  if (invoiceResult.rows.length === 0) {
    return null;
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
    const msg = String(itemsError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && itemsError?.code !== '42P01') {
      logger.error('[billingInvoicesQuery] fetch_items_failed', {
        message: itemsError?.message ?? String(itemsError),
      });
    }
  }

  return { invoice, items };
}

export async function listInvoicesForUser(
  userId: number,
  page: number,
  pageSize: number,
  deps?: Partial<BillingInvoicesQueryDeps>
): Promise<{ items: InvoiceListItem[]; page: number; page_size: number }> {
  const { pool } = getBillingInvoicesQueryDeps(deps);
  const offset = (page - 1) * pageSize;

  const rowsResult = await pool.query(
    `
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
    `,
    [userId, pageSize, offset]
  );

  const items: InvoiceListItem[] = rowsResult.rows.map((r: any) => ({
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

  return { items, page, page_size: pageSize };
}
