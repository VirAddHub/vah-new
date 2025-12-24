
import dotenv from 'dotenv';
import path from 'path';
import { getPool } from '../src/server/db';
import { generateInvoicePdf, InvoiceRow } from '../src/services/invoices';
import { recomputeInvoiceAmount } from '../src/services/billing/invoiceService';

// Load environment variables
// Since we run this with tsx (ESM) from apps/backend root, we can look for .env in current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DRY_RUN = !process.argv.includes('--execute');

async function main() {
    console.log('--- Invoice PDF Backfill Script ---');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'EXECUTE (will generate PDFs)'}`);

    const pool = getPool();
    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    try {
        // 1. Find invoices that need backfilling
        // Status is 'paid' but pdf_path is missing
        const query = `
      SELECT * FROM invoices 
      WHERE status = 'paid' 
      AND (pdf_path IS NULL OR pdf_path = '')
      ORDER BY created_at DESC
    `;

        console.log('Scanning for missing PDFs...');
        const result = await pool.query<InvoiceRow>(query);
        const invoices = result.rows;

        console.log(`Found ${invoices.length} paid invoices missing PDF paths.`);

        if (invoices.length === 0) {
            console.log('No action needed.');
            return;
        }

        // 2. Process each invoice
        for (const invoice of invoices) {
            console.log(`\nProcessing Invoice #${invoice.id} (${invoice.invoice_number || 'No Number'})...`);

            // Calculate billing period
            const periodStart = invoice.period_start;
            const periodEnd = invoice.period_end;
            const amountPence = invoice.amount_pence;

            console.log(`  User: ${invoice.user_id}`);
            console.log(`  Amount: ${(amountPence / 100).toFixed(2)} ${invoice.currency}`);
            console.log(`  Period: ${String(periodStart)} to ${String(periodEnd)}`);

            if (DRY_RUN) {
                console.log(`  [DRY RUN] Would generate PDF and update DB.`);
                successCount++;
                continue;
            }

            try {
                // Double-check amount correctness before generating
                // This calculates what the total SHOULD be based on line items
                console.log('  Verifying invoice amount...');
                const recomputed = await recomputeInvoiceAmount({
                    pool,
                    invoiceId: invoice.id
                });

                if (recomputed !== amountPence) {
                    console.warn(`  WARNING: Amount mismatch! DB says ${amountPence}, recompute says ${recomputed}. Updating DB to match recompute.`);
                    warningCount++;
                    // Update the invoice amount to be correct before generating PDF
                    await pool.query('UPDATE invoices SET amount_pence = $1 WHERE id = $2', [recomputed, invoice.id]);
                }

                console.log('  Generating PDF...');
                const pdfPath = await generateInvoicePdf({
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoice_number || `INV-${invoice.id}`,
                    userId: invoice.user_id,
                    amountPence: recomputed, // Use the verified amount
                    currency: invoice.currency,
                    periodStart: periodStart,
                    periodEnd: periodEnd
                });

                console.log(`  PDF generated at: ${pdfPath}`);

                // Update DB
                await pool.query(
                    `UPDATE invoices SET pdf_path = $1 WHERE id = $2`,
                    [pdfPath, invoice.id]
                );
                console.log('  Database updated.');
                successCount++;

            } catch (err: any) {
                console.error(`  ERROR processing invoice ${invoice.id}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n--- Backfill Complete ---');
        console.log(`Summary: ${successCount} succeeded, ${warningCount} warnings, ${errorCount} errors`);

    } catch (error: any) {
        console.error('Fatal error:', error);
        process.exitCode = 1;
    } finally {
        // Close pool to allow script to exit cleanly
        try {
            await pool.end();
        } catch (e) {
            console.warn('Warning: error closing pool', e);
        }
    }
}

main().catch((err) => {
    console.error('Unhandled error in main:', err);
    process.exit(1);
});
