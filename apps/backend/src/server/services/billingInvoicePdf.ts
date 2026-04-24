import fs from 'fs';
import path from 'path';
import { getPool } from '../db';
import { logger } from '../../lib/logger';
import { recomputeInvoiceTotal } from '../../services/billing/invoiceService';
import { generateInvoicePdf } from '../../services/invoices';
import type { Pool } from 'pg';

type InvoiceRow = {
  id: number;
  user_id: string | number;
  invoice_number: string | null;
  pdf_path: string | null;
  amount_pence: number | null;
  currency: string | null;
  period_start: string;
  period_end: string;
};

export type InvoicePdfReadyResult =
  | { ok: true; fullPath: string; filename: string }
  | { ok: false; error: 'not_found' | 'forbidden' | 'invoice_pdf_failed' };

export interface BillingInvoicePdfDeps {
  pool: Pool;
  recomputeInvoiceAmount: typeof recomputeInvoiceTotal;
  generatePdf: typeof generateInvoicePdf;
  fileExists: (filePath: string) => boolean;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
  resolveBaseDir: () => string;
}

function getBillingInvoicePdfDeps(overrides?: Partial<BillingInvoicePdfDeps>): BillingInvoicePdfDeps {
  return {
    pool: getPool(),
    recomputeInvoiceAmount: recomputeInvoiceTotal,
    generatePdf: generateInvoicePdf,
    fileExists: (filePath: string) => fs.existsSync(filePath),
    warn: (msg, meta) => logger.warn(msg, meta),
    info: (msg, meta) => logger.info(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
    resolveBaseDir: () => (
      process.env.INVOICES_DIR
        ? path.resolve(process.env.INVOICES_DIR)
        : path.join(process.cwd(), 'data', 'invoices')
    ),
    ...overrides,
  };
}

export async function prepareInvoicePdfForDownload(opts: {
  invoiceId: number;
  callerId: bigint;
  isAdmin: boolean;
}, deps?: Partial<BillingInvoicePdfDeps>): Promise<InvoicePdfReadyResult> {
  const { invoiceId, callerId, isAdmin } = opts;
  const {
    pool,
    recomputeInvoiceAmount,
    generatePdf,
    fileExists,
    warn,
    info,
    error: logError,
    resolveBaseDir,
  } = getBillingInvoicePdfDeps(deps);

  const result = await pool.query<InvoiceRow>(
    `SELECT id, user_id, invoice_number, pdf_path, amount_pence, currency, period_start, period_end
     FROM invoices WHERE id=$1 LIMIT 1`,
    [invoiceId]
  );
  const inv = result.rows[0];
  if (!inv) {
    warn('[billing] pdf_download_invoice_not_found', { invoiceId });
    return { ok: false, error: 'not_found' };
  }

  const ownerId = BigInt(inv.user_id);
  const authorized = isAdmin || callerId === ownerId;
  if (!authorized) {
    warn('[billing] pdf_download_forbidden', {
      invoiceId,
      callerId: callerId.toString(),
      ownerId: ownerId.toString(),
      isAdmin,
    });
    return { ok: false, error: 'forbidden' };
  }

  const amountPence = await recomputeInvoiceAmount(pool, inv.id, inv.currency || 'GBP');
  const baseDir = resolveBaseDir();

  if (inv.pdf_path) {
    const rel = String(inv.pdf_path).replace(/^\/+/, '');
    const existingPath = path.join(baseDir, rel.replace(/^invoices\//, ''));
    if (fileExists(existingPath)) {
      return {
        ok: true,
        fullPath: existingPath,
        filename: inv.invoice_number ? `${inv.invoice_number}.pdf` : `invoice-${invoiceId}.pdf`,
      };
    }
  }

  info('[billing] pdf_download_generating_on_demand', {
    invoiceId,
    invoiceNumber: inv.invoice_number,
  });

  try {
    const generatedPath = await generatePdf({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number || `INV-${inv.id}`,
      userId: Number(inv.user_id),
      amountPence,
      currency: inv.currency || 'GBP',
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
    });

    await pool.query(
      `UPDATE invoices SET pdf_path = $1 WHERE id = $2`,
      [generatedPath, inv.id]
    );

    const rel = String(generatedPath).replace(/^\/+/, '');
    const fullPath = path.join(baseDir, rel.replace(/^invoices\//, ''));
    if (!fileExists(fullPath)) {
      logError('[billingInvoicePdf] generated_pdf_missing', { invoiceId, fullPath });
      return { ok: false, error: 'invoice_pdf_failed' };
    }

    return {
      ok: true,
      fullPath,
      filename: inv.invoice_number ? `${inv.invoice_number}.pdf` : `invoice-${invoiceId}.pdf`,
    };
  } catch (error: any) {
    logError('[billingInvoicePdf] generate_pdf_failed', {
      invoiceId,
      message: error?.message ?? String(error),
    });
    return { ok: false, error: 'invoice_pdf_failed' };
  }
}
