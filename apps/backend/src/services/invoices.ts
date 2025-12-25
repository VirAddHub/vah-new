import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { getPool } from '../lib/db';
import { sendTemplateEmail } from '../lib/mailer';
import { Templates } from '../lib/postmark-templates';
import { getAppUrl } from '../config/appUrl';

const INVOICE_BASE_DIR = process.env.INVOICES_DIR
  ? path.resolve(process.env.INVOICES_DIR)
  : path.join(process.cwd(), 'data', 'invoices');

export interface InvoiceRow {
  id: number;
  user_id: number;
  gocardless_payment_id: string | null;
  period_start: string | Date;
  period_end: string | Date;
  amount_pence: number;
  currency: string;
  status: string;
  pdf_path: string | null;
  invoice_number: string | null;
  created_at: string | number;
}

export interface CreateInvoiceOptions {
  userId: number;
  gocardlessPaymentId?: string | null; // Optional: null/undefined when invoice is 'issued', set when 'paid'
  amountPence: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Create an invoice record and generate PDF
 */
export async function createInvoiceForPayment(opts: CreateInvoiceOptions): Promise<InvoiceRow> {
  const pool = getPool();

  // Convert dates to ISO string format for TEXT columns (needed for period lookup)
  const periodStartStr = opts.periodStart.toISOString().slice(0, 10);
  const periodEndStr = opts.periodEnd.toISOString().slice(0, 10);

  // Check if invoice already exists
  // Priority: 1) by payment ID (if provided), 2) by period (if no payment ID)
  let existing: any = { rows: [] };
  if (opts.gocardlessPaymentId) {
    existing = await pool.query<InvoiceRow>(
      `SELECT * FROM invoices WHERE gocardless_payment_id = $1`,
      [opts.gocardlessPaymentId]
    );

    if (existing.rows.length > 0) {
      // Update status to 'paid' since payment is confirmed
      await pool.query(
        `UPDATE invoices SET status = 'paid' WHERE id = $1`,
        [existing.rows[0].id]
      );
      console.log(`[invoices] Invoice already exists for payment ${opts.gocardlessPaymentId}, updated status to 'paid'`);
      const updated = await pool.query<InvoiceRow>(
        `SELECT * FROM invoices WHERE id = $1`,
        [existing.rows[0].id]
      );
      return updated.rows[0];
    }
  } else {
    // No payment ID - check by period to see if we should regenerate PDF
    existing = await pool.query<InvoiceRow>(
      `SELECT * FROM invoices 
       WHERE user_id = $1 
         AND period_start = $2 
         AND period_end = $3
       ORDER BY id DESC
       LIMIT 1`,
      [opts.userId, periodStartStr, periodEndStr]
    );

    if (existing.rows.length > 0) {
      const existingInvoice = existing.rows[0];
      // If PDF doesn't exist or amount changed, regenerate PDF
      if (!existingInvoice.pdf_path || existingInvoice.amount_pence !== opts.amountPence) {
        console.log(`[invoices] Regenerating PDF for invoice ${existingInvoice.id} (missing PDF or amount changed)`);

        // Update invoice amount if it changed
        if (existingInvoice.amount_pence !== opts.amountPence) {
          await pool.query(
            `UPDATE invoices SET amount_pence = $1 WHERE id = $2`,
            [opts.amountPence, existingInvoice.id]
          );
        }

        // Regenerate PDF
        try {
          const pdfPath = await generateInvoicePdf({
            invoiceId: existingInvoice.id,
            invoiceNumber: existingInvoice.invoice_number || `INV-${existingInvoice.id}`,
            userId: opts.userId,
            amountPence: opts.amountPence,
            currency: opts.currency,
            periodStart: existingInvoice.period_start,
            periodEnd: existingInvoice.period_end,
          });

          const updated = await pool.query<InvoiceRow>(
            `UPDATE invoices SET pdf_path = $1 WHERE id = $2 RETURNING *`,
            [pdfPath, existingInvoice.id]
          );

          const finalInvoice = updated.rows[0];

          // Recompute invoice amount from charges before sending email (ensures correctness)
          const { recomputeInvoiceAmount } = await import('./billing/invoiceService');
          await recomputeInvoiceAmount({
            pool,
            invoiceId: finalInvoice.id,
          });

          // Re-fetch invoice to get updated amount
          const refreshedInvoice = await pool.query<InvoiceRow>(
            `SELECT * FROM invoices WHERE id = $1`,
            [finalInvoice.id]
          );
          const invoiceToReturn = refreshedInvoice.rows[0] || finalInvoice;

          await sendInvoiceAvailableEmail(invoiceToReturn);
          return invoiceToReturn;
        } catch (pdfError) {
          console.error(`[invoices] Failed to regenerate PDF for invoice ${existingInvoice.id}:`, pdfError);
          // Return existing invoice even if PDF generation failed
          return existingInvoice;
        }
      } else {
        // PDF exists and amount matches - return existing invoice
        console.log(`[invoices] Invoice ${existingInvoice.id} already has PDF, skipping regeneration`);
        return existingInvoice;
      }
    }
  }

  // Get invoice number sequence
  const year = new Date(opts.periodEnd).getFullYear();
  const seqResult = await pool.query(
    `INSERT INTO invoices_seq (year, sequence, created_at, updated_at)
     VALUES ($1, 1, $2, $2)
     ON CONFLICT (year) 
     DO UPDATE SET sequence = invoices_seq.sequence + 1, updated_at = $2
     RETURNING sequence`,
    [year, Date.now()]
  );
  const invoiceNumber = seqResult.rows[0].sequence;

  const invoiceNumberFormatted = `VAH-${year}-${String(invoiceNumber).padStart(6, '0')}`;

  // periodStartStr and periodEndStr already defined above

  // Pull all pending charges for this user within the invoice period
  // Note: charge table may not exist yet - handle gracefully
  let charges: any[] = [];
  let chargesTotalPence = 0;
  try {
    const chargesResult = await pool.query(
      `
      SELECT id, amount_pence
      FROM charge
      WHERE user_id = $1
        AND status = 'pending'
        AND service_date >= $2
        AND service_date <= $3
      `,
      [opts.userId, periodStartStr, periodEndStr]
    );
    charges = chargesResult.rows;
    chargesTotalPence = charges.reduce((sum: number, c: any) => sum + Number(c.amount_pence), 0);
  } catch (chargeError: any) {
    // Table doesn't exist yet or query failed - continue with 0 charges
    // Error code 42P01 = relation does not exist
    if (chargeError?.code === '42P01' || chargeError?.message?.includes('does not exist')) {
      console.warn('[createInvoiceForPayment] charge table does not exist yet, skipping charges');
    } else {
      console.error('[createInvoiceForPayment] Error querying charge table:', chargeError);
    }
    charges = [];
    chargesTotalPence = 0;
  }

  // Invoice total = base plan amount + charges
  const invoiceTotalPence = opts.amountPence + chargesTotalPence;

  // Insert invoice record
  // Status: 'paid' if gocardlessPaymentId provided, 'issued' otherwise
  const status = opts.gocardlessPaymentId ? 'paid' : 'issued';
  const result = await pool.query<InvoiceRow>(
    `
    INSERT INTO invoices (
      user_id,
      gocardless_payment_id,
      period_start,
      period_end,
      amount_pence,
      currency,
      status,
      invoice_number,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      opts.userId,
      opts.gocardlessPaymentId || null,
      periodStartStr,
      periodEndStr,
      invoiceTotalPence, // Updated to include charges
      opts.currency,
      status,
      invoiceNumberFormatted,
      Date.now(),
    ],
  );

  const invoice = result.rows[0];

  // Mark charges as billed
  if (charges.length > 0) {
    const chargeIds = charges.map((c: any) => c.id);
    // Update charges one by one (PostgreSQL UUID array handling can be tricky)
    for (const chargeId of chargeIds) {
      await pool.query(
        `
        UPDATE charge
        SET status = 'billed',
            invoice_id = $1,
            billed_at = NOW()
        WHERE id = $2
        `,
        [invoice.id, chargeId]
      );
    }
    console.log(`[invoices] Marked ${charges.length} charges as billed for invoice ${invoice.id}`);
  }

  // Recompute invoice amount from charges before generating PDF (ensures correctness)
  const { recomputeInvoiceAmount } = await import('./billing/invoiceService');
  await recomputeInvoiceAmount({
    pool,
    invoiceId: invoice.id,
  });

  // Re-fetch invoice to get updated amount
  const refreshedInvoice = await pool.query<InvoiceRow>(
    `SELECT * FROM invoices WHERE id = $1`,
    [invoice.id]
  );
  const invoiceToUse = refreshedInvoice.rows[0] || invoice;

  // Generate PDF and update pdf_path
  try {
    const pdfPath = await generateInvoicePdf({
      invoiceId: invoiceToUse.id,
      invoiceNumber: invoiceNumberFormatted,
      userId: invoiceToUse.user_id,
      amountPence: invoiceToUse.amount_pence, // Use recomputed amount
      currency: invoiceToUse.currency,
      periodStart: invoiceToUse.period_start,
      periodEnd: invoiceToUse.period_end,
    });

    const updated = await pool.query<InvoiceRow>(
      `
      UPDATE invoices
      SET pdf_path = $1
      WHERE id = $2
      RETURNING *
      `,
      [pdfPath, invoiceToUse.id],
    );

    const finalInvoice = updated.rows[0];

    // Send invoice email (only if not already sent)
    await sendInvoiceAvailableEmail(finalInvoice);

    return finalInvoice;
  } catch (pdfError) {
    console.error(`[invoices] Failed to generate PDF for invoice ${invoice.id}:`, pdfError);
    // Return invoice even if PDF generation failed
    // Still try to send email if PDF generation failed but invoice exists
    try {
      await sendInvoiceAvailableEmail(invoice);
    } catch (emailError) {
      console.error(`[invoices] Failed to send email for invoice ${invoice.id} after PDF error:`, emailError);
    }
    return invoice;
  }
}

/**
 * Generate PDF invoice
 * Exported for on-demand generation in download endpoint
 */
export async function generateInvoicePdf(opts: {
  invoiceId: number;
  invoiceNumber: string;
  userId: number;
  amountPence: number;
  currency: string;
  periodStart: string | Date;
  periodEnd: string | Date;
}): Promise<string> {
  console.log('[generateInvoicePdf] Starting PDF generation', {
    invoiceId: opts.invoiceId,
    invoiceNumber: opts.invoiceNumber,
    userId: opts.userId,
    amountPence: opts.amountPence,
    currency: opts.currency,
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
  });

  const pool = getPool();

  // Get user details
  console.log('[generateInvoicePdf] Fetching user details', { userId: opts.userId });
  const userResult = await pool.query(
    `SELECT email, first_name, last_name, company_name FROM "user" WHERE id = $1`,
    [opts.userId]
  );
  const user = userResult.rows[0];

  if (!user) {
    console.error('[generateInvoicePdf] User not found', { userId: opts.userId });
    throw new Error(`User ${opts.userId} not found`);
  }

  console.log('[generateInvoicePdf] User found', {
    userId: opts.userId,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`,
  });

  // Get all billed charges for this invoice (for line items breakdown)
  let charges: Array<{ description: string; amount_pence: number; service_date: string }> = [];
  try {
    const chargesResult = await pool.query(
      `
      SELECT description, amount_pence, service_date, created_at
      FROM charge
      WHERE invoice_id = $1
        AND status = 'billed'
      ORDER BY service_date ASC, created_at ASC
      `,
      [opts.invoiceId]
    );
    charges = chargesResult.rows.map((row: any) => ({
      description: row.description || 'Service charge',
      amount_pence: Number(row.amount_pence || 0),
      service_date: row.service_date ? new Date(row.service_date).toISOString().slice(0, 10) : '',
    }));
  } catch (chargeError: any) {
    // Table doesn't exist or query failed - continue without charges
    const msg = String(chargeError?.message || '');
    if (!msg.includes('relation "charge" does not exist') && chargeError?.code !== '42P01') {
      console.warn('[generateInvoicePdf] Error fetching charges:', chargeError);
    }
  }

  // Calculate base plan amount (total - charges)
  const chargesTotalPence = charges.reduce((sum, c) => sum + c.amount_pence, 0);
  const basePlanPence = opts.amountPence - chargesTotalPence;

  // Ensure directory exists: data/invoices/YYYY/user_id
  const year = new Date(opts.periodEnd).getFullYear();
  const dir = path.join(INVOICE_BASE_DIR, String(year), String(opts.userId));

  console.log('[generateInvoicePdf] Creating directory', {
    invoiceId: opts.invoiceId,
    directory: dir,
    invoiceBaseDir: INVOICE_BASE_DIR,
  });

  await fs.promises.mkdir(dir, { recursive: true });
  console.log('[generateInvoicePdf] Directory created/verified', { directory: dir });

  const filename = `invoice-${opts.invoiceId}.pdf`;
  const fullPath = path.join(dir, filename);

  console.log('[generateInvoicePdf] PDF file path', {
    invoiceId: opts.invoiceId,
    filename,
    fullPath,
  });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const writeStream = fs.createWriteStream(fullPath);
  doc.pipe(writeStream);

  // Page + layout helpers
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;
  const top = doc.page.margins.top;
  const pageWidth = doc.page.width;
  const usableWidth = pageWidth - left - right;

  const formatMoney = (amountPence: number, currency: string) => `${currency} ${(amountPence / 100).toFixed(2)}`;

  // Try to include VAH logo (PNG) – best-effort only (PDF should still render without it)
  // Note: Render runs from repo root; process.cwd() is a reliable anchor in both dev + prod.
  const logoCandidates = [
    path.join(process.cwd(), 'apps/frontend/public/email/logo.png'),
    path.join(process.cwd(), 'apps/frontend/public/images/logo.png'),
  ];

  let logoPath: string | null = null;
  for (const candidate of logoCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        logoPath = candidate;
        break;
      }
    } catch {
      // ignore
    }
  }

  // Header (logo left, company details right)
  const headerY = top;
  const logoMaxWidth = 140;
  const logoMaxHeight = 36;
  let logoRenderedWidth = 0;

  if (logoPath) {
    try {
      // Fit within max bounds; PDFKit will preserve aspect ratio with just width OR height.
      // We'll constrain by height (more consistent across different source images).
      doc.image(logoPath, left, headerY, { height: logoMaxHeight });
      logoRenderedWidth = logoMaxWidth; // reserve space; exact rendered width depends on image aspect ratio
    } catch (e) {
      console.warn('[generateInvoicePdf] Failed to render logo, continuing without it', {
        invoiceId: opts.invoiceId,
        logoPath,
        error: e instanceof Error ? e.message : String(e),
      });
      logoPath = null;
      logoRenderedWidth = 0;
    }
  }

  const rightBlockX = left + Math.min(logoRenderedWidth, 160) + (logoPath ? 16 : 0);
  const rightBlockWidth = left + usableWidth - rightBlockX;

  // Address block (right side). Intentionally omit the large black company name per UX request.
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#444')
    .text('Second Floor, Tanner Place', rightBlockX, headerY, { width: rightBlockWidth, align: 'right' })
    .text('54–58 Tanner Street', rightBlockX, doc.y, { width: rightBlockWidth, align: 'right' })
    .text('London SE1 3PH', rightBlockX, doc.y, { width: rightBlockWidth, align: 'right' });

  // Separator
  doc.moveDown(1.0);
  doc.moveTo(left, doc.y).lineTo(left + usableWidth, doc.y).strokeColor('#E6E6E6').stroke();
  doc.moveDown(1.0);

  // Invoice details
  // Use invoice.created_at if present (created_at is stored as epoch ms in this codebase)
  let invoiceDateStr = new Date().toISOString().slice(0, 10);
  try {
    const invRes = await pool.query(`SELECT created_at FROM invoices WHERE id = $1`, [opts.invoiceId]);
    const createdAt = invRes.rows?.[0]?.created_at;
    if (createdAt !== undefined && createdAt !== null) {
      const n = Number(createdAt);
      if (!Number.isNaN(n) && n > 0) {
        invoiceDateStr = new Date(n).toISOString().slice(0, 10);
      }
    }
  } catch (e) {
    console.warn('[generateInvoicePdf] Failed to load invoice created_at, using today', {
      invoiceId: opts.invoiceId,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Ensure subsequent content is left-aligned (PDFKit can retain the last x position from previous text calls)
  doc.x = left;
  doc.font('Helvetica').fontSize(11).fillColor('#111');
  doc.text(`Invoice: ${opts.invoiceNumber}`, left);
  doc.text(`Invoice date: ${invoiceDateStr}`, left);

  const periodStartStr = typeof opts.periodStart === 'string'
    ? opts.periodStart
    : opts.periodStart.toISOString().slice(0, 10);
  const periodEndStr = typeof opts.periodEnd === 'string'
    ? opts.periodEnd
    : opts.periodEnd.toISOString().slice(0, 10);

  doc.text(`Billing period: ${periodStartStr} – ${periodEndStr}`, left);
  doc.moveDown(1.2);

  // Customer details
  doc.font('Helvetica-Bold').text('Bill to:', left);
  doc.font('Helvetica');
  if (user.company_name) {
    doc.text(user.company_name, left);
  }
  const customerName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Customer';
  doc.text(customerName, left);
  doc.text(user.email, left);
  doc.moveDown(1.2);

  // Line items table
  doc.font('Helvetica-Bold').fontSize(12).text('Items', left);
  doc.font('Helvetica').fontSize(11);
  doc.moveDown(0.6);

  if (charges.length === 0 && basePlanPence === 0) {
    doc.text('No billable activity this period');
    doc.moveDown(0.5);
  } else {
    // Table columns derived from page width (prevents clipping on the right edge)
    const startX = left;
    const colGap = 10;
    const amountWidth = 95;
    const dateWidth = 95;
    const descWidth = Math.max(220, usableWidth - amountWidth - dateWidth - colGap * 2);
    const dateX = startX + descWidth + colGap;
    const amountX = dateX + dateWidth + colGap;

    // Header row
    const headerY2 = doc.y;
    doc.font('Helvetica-Bold').fillColor('#333');
    doc.text('Description', startX, headerY2, { width: descWidth });
    doc.text('Date', dateX, headerY2, { width: dateWidth });
    doc.text('Amount', amountX, headerY2, { width: amountWidth, align: 'right' });
    doc.font('Helvetica').fillColor('#111');

    doc.y = headerY2 + 16;
    doc.moveTo(startX, doc.y).lineTo(startX + usableWidth, doc.y).strokeColor('#E6E6E6').stroke();
    doc.moveDown(0.6);

    // All charges (including subscription) - already sorted by DB query (service_date ASC, created_at ASC)
    // Subscription charge should already be in charges array if it was created
    const allItems = charges;

    // Verify total matches
    const itemsSum = allItems.reduce((sum, item) => sum + item.amount_pence, 0);
    if (itemsSum !== opts.amountPence) {
      console.warn('[generateInvoicePdf] Amount mismatch', {
        invoiceId: opts.invoiceId,
        invoiceAmount: opts.amountPence,
        itemsSum,
        difference: opts.amountPence - itemsSum,
      });
    }

    // Render each line item (lock all columns to the same Y per row)
    let renderedItemsSum = 0;
    for (const item of allItems) {
      if (item.amount_pence <= 0) continue;

      const y = doc.y;
      const descRaw = item.description || 'Service charge';
      // Clean up migrated descriptions in PDFs (keep "non-HMRC/Companies House", remove "(legacy)")
      const desc = descRaw.replace(/\s*\(legacy\)\s*/gi, '').trim();
      const itemDate = item.service_date || '';
      const amountStr = formatMoney(item.amount_pence, opts.currency);

      const descHeight = doc.heightOfString(desc, { width: descWidth });
      const dateHeight = itemDate ? doc.heightOfString(itemDate, { width: dateWidth }) : 0;
      const amountHeight = doc.heightOfString(amountStr, { width: amountWidth });
      const rowHeight = Math.max(descHeight, dateHeight, amountHeight, 12);

      doc.text(desc, startX, y, { width: descWidth });
      if (itemDate) doc.text(itemDate, dateX, y, { width: dateWidth });
      doc.text(amountStr, amountX, y, { width: amountWidth, align: 'right' });

      renderedItemsSum += item.amount_pence;
      doc.y = y + rowHeight + 6;
    }

    // Log if rendered items don't match invoice total
    if (renderedItemsSum !== opts.amountPence) {
      console.warn('[generateInvoicePdf] Rendered items mismatch', {
        invoiceId: opts.invoiceId,
        invoiceAmount: opts.amountPence,
        renderedSum: renderedItemsSum,
      });
    }

    doc.moveDown(0.3);
    // Draw separator line
    doc.moveTo(startX, doc.y).lineTo(startX + usableWidth, doc.y).strokeColor('#E6E6E6').stroke();
    doc.moveDown(0.6);
  }

  // Total
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111');
  doc.text('Total', left, doc.y, { width: usableWidth - 95, align: 'right' });
  doc.text(formatMoney(opts.amountPence, opts.currency), left, doc.y - 12, { width: usableWidth, align: 'right' });
  doc.font('Helvetica').fontSize(11).fillColor('#111');
  doc.moveDown(1.6);

  // Footer
  doc.fontSize(9).fillColor('#666').text('Thank you for your business.');

  doc.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => reject(err));
  });

  // Return relative path (can be used to construct a URL)
  // Example: "/invoices/2025/123/invoice-456.pdf"
  const relativePath = `/invoices/${year}/${opts.userId}/${filename}`;
  return relativePath;
}

/**
 * Ensure an invoice has a PDF and the "invoice available" email is sent.
 * Intended for end-of-period invoice finalisation.
 *
 * Idempotent:
 * - PDF generation can be re-run safely (overwrites file, updates pdf_path if needed)
 * - Email send is guarded by invoices.email_sent_at
 */
export async function ensureInvoicePdfAndEmail(invoiceId: number): Promise<InvoiceRow> {
  const pool = getPool();

  // Always recompute invoice amount from authoritative charge rows before generating PDFs/emails.
  const { recomputeInvoiceAmount } = await import('./billing/invoiceService');
  await recomputeInvoiceAmount({ pool, invoiceId });

  const invRes = await pool.query<InvoiceRow>(`SELECT * FROM invoices WHERE id = $1 LIMIT 1`, [invoiceId]);
  const invoice = invRes.rows[0];
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  // Generate PDF and persist path
  const pdfPath = await generateInvoicePdf({
    invoiceId: invoice.id,
    invoiceNumber: String(invoice.invoice_number || `INV-${invoice.user_id}-${String(invoice.period_end || '').replace(/-/g, '')}`),
    userId: invoice.user_id,
    amountPence: Number(invoice.amount_pence || 0),
    currency: invoice.currency || 'GBP',
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
  });

  const updated = await pool.query<InvoiceRow>(
    `UPDATE invoices SET pdf_path = $1 WHERE id = $2 RETURNING *`,
    [pdfPath, invoice.id]
  );
  const finalInvoice = updated.rows[0] || invoice;

  // Send invoice email once (idempotent)
  await sendInvoiceAvailableEmail(finalInvoice);

  return finalInvoice;
}

/**
 * List all invoices for a user
 */
export async function listInvoicesForUser(userId: number): Promise<InvoiceRow[]> {
  const pool = getPool();
  const result = await pool.query<InvoiceRow>(
    `
    SELECT id,
           user_id,
           gocardless_payment_id,
           period_start,
           period_end,
           amount_pence,
           currency,
           status,
           pdf_path,
           invoice_number,
           created_at
    FROM invoices
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId],
  );
  return result.rows;
}

/**
 * Get billing period for next invoice
 */
export async function getBillingPeriodForUser(userId: number): Promise<{ periodStart: Date; periodEnd: Date }> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT period_end FROM invoices WHERE user_id = $1 ORDER BY period_end DESC LIMIT 1`,
    [userId],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (result.rows.length === 0) {
    // First invoice: use subscription start date or today
    const userRes = await pool.query(
      `SELECT plan_start_date FROM "user" WHERE id = $1`,
      [userId],
    );
    const planStart = userRes.rows[0]?.plan_start_date;

    if (planStart) {
      const start = new Date(Number(planStart));
      start.setHours(0, 0, 0, 0);
      return {
        periodStart: start,
        periodEnd: today,
      };
    }

    // Default: last 30 days
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    return {
      periodStart: start,
      periodEnd: today,
    };
  }

  const lastEnd = new Date(result.rows[0].period_end);
  lastEnd.setHours(0, 0, 0, 0);
  const nextStart = new Date(lastEnd);
  nextStart.setDate(nextStart.getDate() + 1);

  return {
    periodStart: nextStart,
    periodEnd: today,
  };
}

/**
 * Find user ID from GoCardless payment ID
 */
export async function findUserIdForPayment(
  pool: any,
  gocardlessPaymentId: string,
  paymentLinks?: any
): Promise<number | null> {
  try {
    // Option 1: Check if we already have an invoice for this payment
    const invoiceResult = await pool.query(
      `SELECT user_id FROM invoices WHERE gocardless_payment_id = $1 LIMIT 1`,
      [gocardlessPaymentId]
    );

    if (invoiceResult.rows.length > 0) {
      return invoiceResult.rows[0].user_id;
    }

    // Option 2: Look up via subscription table using mandate/customer from payment
    if (paymentLinks?.mandate) {
      const mandateResult = await pool.query(
        `SELECT user_id FROM subscription WHERE mandate_id = $1 LIMIT 1`,
        [paymentLinks.mandate]
      );

      if (mandateResult.rows.length > 0) {
        return mandateResult.rows[0].user_id;
      }
    }

    // Option 3: Look up via customer ID
    if (paymentLinks?.customer) {
      const customerResult = await pool.query(
        `SELECT id FROM "user" WHERE gocardless_customer_id = $1 LIMIT 1`,
        [paymentLinks.customer]
      );

      if (customerResult.rows.length > 0) {
        return customerResult.rows[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error('[invoices] Error finding user for payment:', error);
    return null;
  }
}

/**
 * Format billing period as "1–31 January 2026"
 */
function formatBillingPeriod(periodStart: string | Date, periodEnd: string | Date): string {
  const start = typeof periodStart === 'string' ? new Date(periodStart) : periodStart;
  const end = typeof periodEnd === 'string' ? new Date(periodEnd) : periodEnd;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = end.toLocaleDateString('en-GB', { month: 'long' });
  const year = end.getFullYear();

  return `${startDay}–${endDay} ${month} ${year}`;
}

/**
 * Send invoice available email to user
 * Idempotent: only sends if email_sent_at is NULL
 */
async function sendInvoiceAvailableEmail(invoice: InvoiceRow): Promise<void> {
  const pool = getPool();

  // Check if email already sent (idempotency)
  const checkResult = await pool.query(
    `SELECT email_sent_at FROM invoices WHERE id = $1`,
    [invoice.id]
  );

  if (checkResult.rows[0]?.email_sent_at) {
    console.log(`[invoices] Email already sent for invoice ${invoice.id}, skipping`);
    return;
  }

  // Get user data
  const userResult = await pool.query(
    `SELECT email, first_name, name FROM "user" WHERE id = $1`,
    [invoice.user_id]
  );

  if (userResult.rows.length === 0) {
    const errorMsg = `User ${invoice.user_id} not found`;
    await pool.query(
      `UPDATE invoices SET email_send_error = $1 WHERE id = $2`,
      [errorMsg, invoice.id]
    );
    console.error(`[invoices] ${errorMsg} for invoice ${invoice.id}`);
    return;
  }

  const user = userResult.rows[0];

  if (!user.email) {
    const errorMsg = 'User email not found';
    await pool.query(
      `UPDATE invoices SET email_send_error = $1 WHERE id = $2`,
      [errorMsg, invoice.id]
    );
    console.error(`[invoices] ${errorMsg} for invoice ${invoice.id}`);
    return;
  }

  // Format billing period
  const billingPeriod = formatBillingPeriod(invoice.period_start, invoice.period_end);

  // Format invoice amount
  const invoiceAmount = (invoice.amount_pence / 100).toFixed(2);

  // Build billing URL
  const billingUrl = `${getAppUrl()}/billing#invoices`;

  // Send email
  try {
    await sendTemplateEmail({
      to: user.email,
      templateAlias: Templates.InvoiceAvailable,
      model: {
        firstName: user.first_name,
        name: user.name,
        invoice_amount: invoiceAmount,
        billing_period: billingPeriod,
        billing_url: billingUrl,
      },
      from: 'support@virtualaddresshub.co.uk',
      replyTo: 'support@virtualaddresshub.co.uk',
      templateId: 40508791, // Postmark Template ID
    });

    // Mark as sent
    await pool.query(
      `UPDATE invoices SET email_sent_at = NOW(), email_send_error = NULL WHERE id = $1`,
      [invoice.id]
    );

    console.log(`[invoices] Invoice email sent for invoice ${invoice.id} to ${user.email}`);
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown error sending email';
    await pool.query(
      `UPDATE invoices SET email_send_error = $1 WHERE id = $2`,
      [errorMsg, invoice.id]
    );
    console.error(`[invoices] Failed to send email for invoice ${invoice.id}:`, error);
    // Don't throw - invoice creation should succeed even if email fails
  }
}

