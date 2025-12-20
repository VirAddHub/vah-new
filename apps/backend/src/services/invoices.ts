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
  gocardlessPaymentId: string;
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

  // Check if invoice already exists for this payment
  const existing = await pool.query<InvoiceRow>(
    `SELECT * FROM invoices WHERE gocardless_payment_id = $1`,
    [opts.gocardlessPaymentId]
  );

  if (existing.rows.length > 0) {
    console.log(`[invoices] Invoice already exists for payment ${opts.gocardlessPaymentId}`);
    return existing.rows[0];
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

  // Convert dates to ISO string format for TEXT columns
  const periodStartStr = opts.periodStart.toISOString().slice(0, 10);
  const periodEndStr = opts.periodEnd.toISOString().slice(0, 10);

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
    VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7, $8)
    RETURNING *
    `,
    [
      opts.userId,
      opts.gocardlessPaymentId,
      periodStartStr,
      periodEndStr,
      invoiceTotalPence, // Updated to include charges
      opts.currency,
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

  // Generate PDF and update pdf_path
  try {
    const pdfPath = await generateInvoicePdf({
      invoiceId: invoice.id,
      invoiceNumber: invoiceNumberFormatted,
      userId: invoice.user_id,
      amountPence: invoice.amount_pence,
      currency: invoice.currency,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
    });

    const updated = await pool.query<InvoiceRow>(
      `
      UPDATE invoices
      SET pdf_path = $1
      WHERE id = $2
      RETURNING *
      `,
      [pdfPath, invoice.id],
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
 */
async function generateInvoicePdf(opts: {
  invoiceId: number;
  invoiceNumber: string;
  userId: number;
  amountPence: number;
  currency: string;
  periodStart: string | Date;
  periodEnd: string | Date;
}): Promise<string> {
  const pool = getPool();

  // Get user details
  const userResult = await pool.query(
    `SELECT email, first_name, last_name, business_name, trading_name FROM "user" WHERE id = $1`,
    [opts.userId]
  );
  const user = userResult.rows[0];

  if (!user) {
    throw new Error(`User ${opts.userId} not found`);
  }

  // Ensure directory exists: data/invoices/YYYY/user_id
  const year = new Date(opts.periodEnd).getFullYear();
  const dir = path.join(INVOICE_BASE_DIR, String(year), String(opts.userId));

  await fs.promises.mkdir(dir, { recursive: true });

  const filename = `invoice-${opts.invoiceId}.pdf`;
  const fullPath = path.join(dir, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const writeStream = fs.createWriteStream(fullPath);
  doc.pipe(writeStream);

  // Header
  doc.fontSize(20).text('VirtualAddressHub Ltd', { align: 'right' });
  doc.moveDown();

  // Invoice details
  doc.fontSize(12);
  doc.text(`Invoice: ${opts.invoiceNumber}`);
  doc.text(`Invoice date: ${new Date().toISOString().slice(0, 10)}`);
  
  const periodStartStr = typeof opts.periodStart === 'string' 
    ? opts.periodStart 
    : opts.periodStart.toISOString().slice(0, 10);
  const periodEndStr = typeof opts.periodEnd === 'string' 
    ? opts.periodEnd 
    : opts.periodEnd.toISOString().slice(0, 10);
  
  doc.text(`Billing period: ${periodStartStr} – ${periodEndStr}`);
  doc.moveDown();

  // Customer details
  doc.text('Bill to:');
  if (user.business_name) {
    doc.text(user.business_name);
  }
  if (user.trading_name) {
    doc.text(`Trading as: ${user.trading_name}`);
  }
  const customerName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Customer';
  doc.text(customerName);
  doc.text(user.email);
  doc.moveDown();

  // Description
  doc.text('Description: Digital Mailbox Plan – Monthly subscription');
  doc.moveDown();

  // Amount
  const amount = (opts.amountPence / 100).toFixed(2);
  doc.fontSize(14).text(`Total: ${opts.currency} ${amount}`, { align: 'right' });
  doc.moveDown(2);

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

