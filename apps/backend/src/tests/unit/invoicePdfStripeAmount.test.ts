import { describe, it, expect, vi } from 'vitest';

vi.mock('../../server/db', () => ({ getPool: () => ({ query: vi.fn() }) }));

import { prepareInvoicePdfForDownload } from '../../server/services/billingInvoicePdf';
import { recomputeInvoiceTotal } from '../../services/billing/invoiceService';

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 4,
    user_id: 51,
    invoice_number: 'VAH-2026-000003',
    pdf_path: null,
    amount_pence: 999,
    currency: 'GBP',
    period_start: '2026-11-19',
    period_end: '2026-12-19',
    stripe_invoice_id: 'in_test_123',
    ...overrides,
  };
}

function deps(row: Record<string, unknown>) {
  const queries: string[] = [];
  const pool = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      if (/FROM invoices WHERE id=\$1/.test(sql)) return { rows: [row] };
      return { rows: [], rowCount: 1 };
    }),
  };
  const generatePdf = vi.fn(async () => 'invoices/2026/51/VAH-2026-000003.pdf');
  const recomputeInvoiceAmount = vi.fn(async () => 0);
  return {
    queries,
    generatePdf,
    recomputeInvoiceAmount,
    overrides: {
      pool: pool as any,
      generatePdf: generatePdf as any,
      recomputeInvoiceAmount: recomputeInvoiceAmount as any,
      fileExists: () => true,
      warn: () => {},
      info: () => {},
      error: () => {},
      resolveBaseDir: () => '/tmp/invoices',
    },
  };
}

describe('invoice PDF download keeps the amount Stripe charged', () => {
  it('uses the stored amount for a Stripe invoice and never recomputes it from charges', async () => {
    const d = deps(invoiceRow());
    const result = await prepareInvoicePdfForDownload(
      { invoiceId: 4, callerId: BigInt(51), isAdmin: false },
      d.overrides
    );
    expect(result.ok).toBe(true);
    expect(d.recomputeInvoiceAmount).not.toHaveBeenCalled();
    expect(d.generatePdf).toHaveBeenCalledWith(expect.objectContaining({ amountPence: 999 }));
    expect(d.queries.some((q) => /UPDATE invoices SET amount_pence/i.test(q))).toBe(false);
  });

  it('still rebuilds an internal (non-Stripe) invoice from its charges', async () => {
    const d = deps(invoiceRow({ stripe_invoice_id: null, user_id: 4, amount_pence: 800 }));
    d.recomputeInvoiceAmount.mockResolvedValueOnce(800);
    await prepareInvoicePdfForDownload({ invoiceId: 1, callerId: BigInt(4), isAdmin: true }, d.overrides);
    expect(d.recomputeInvoiceAmount).toHaveBeenCalled();
    expect(d.generatePdf).toHaveBeenCalledWith(expect.objectContaining({ amountPence: 800 }));
  });
});

describe('recomputeInvoiceTotal leaves Stripe invoices alone', () => {
  it('returns the stored amount and writes nothing', async () => {
    const queries: string[] = [];
    const pool = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (/SELECT amount_pence, stripe_invoice_id/.test(sql)) {
          return { rows: [{ amount_pence: 677, stripe_invoice_id: 'in_test_456' }] };
        }
        return { rows: [{ total: 0 }], rowCount: 1 };
      }),
    };
    const total = await recomputeInvoiceTotal(pool as any, 5, 'GBP');
    expect(total).toBe(677);
    expect(queries.some((q) => /UPDATE invoices/i.test(q))).toBe(false);
  });
});
