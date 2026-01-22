/* eslint-disable no-console */
/**
 * Physical Destruction Logging Script
 *
 * This cron job logs confirmed physical destruction events to Excel.
 * 
 * CRITICAL COMPLIANCE RULES:
 * - This script reads from destruction_log table (compliance-safe source of truth)
 * - Only logs items with destruction_status = 'completed'
 * - All data is pre-validated and compliance-ready
 * - Idempotency: Uses destruction_log table which has UNIQUE constraint on mail_item_id
 * 
 * Flow:
 * 1. Admin clicks "Mark as Destroyed" button
 * 2. Backend validates eligibility, creates destruction_log record, sets physical_destruction_date
 * 3. This cron finds items in destruction_log where excel_logged = FALSE (or similar flag)
 * 4. For each item, append row to Excel destruction log
 * 5. Mark excel_logged = TRUE (idempotency)
 * 
 * This script should be run every 5-15 minutes (or daily if volume is low).
 * 
 * Usage:
 *   node dist/src/scripts/logDestructionToExcel.js
 *   (or: npm run script:log-destruction)
 */

import { getPool } from "../lib/db";
import { nowMs } from "../lib/time";

interface DestructionLogItem {
    mail_item_id: number;
    user_id: number;
    user_display_name: string;
    receipt_date: string; // ISO date string
    eligibility_date: string; // ISO date string
    recorded_at: Date | string; // TIMESTAMPTZ
    actor_type: string;
    action_source: string;
    staff_name: string;
    staff_initials: string;
    notes: string;
    destruction_method: string;
    subject: string | null;
    sender_name: string | null;
}

/**
 * Format date for Excel (DD/MM/YYYY)
 */
function formatDateForExcel(dateString: string | Date): string {
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        if (isNaN(date.getTime())) {
            return "N/A";
    }
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return "N/A";
    }
}

/**
 * Clean text to fix encoding issues
 */
function cleanText(text: string | null): string {
    if (!text) return "N/A";
    return text
        .replace(/‚Äì/g, '–')  // Fix broken en-dash
        .replace(/‚Äî/g, '—')  // Fix broken em-dash
        .replace(/â€™/g, "'")  // Fix broken apostrophe
        .replace(/â€œ/g, '"')  // Fix broken opening quote
        .replace(/â€/g, '"')   // Fix broken closing quote
        .replace(/â€"/g, '—')  // Fix broken em-dash variant
        .replace(/â€"/g, '–'); // Fix broken en-dash variant
}

/**
 * Build Excel row data for destruction log
 * Matches the actual Excel table structure with compliance-safe data
 */
function buildExcelRow(item: DestructionLogItem): string[] {
    const mailDescription = item.subject
        ? `${item.subject}${item.sender_name ? ` – ${item.sender_name}` : ''}`
        : (item.sender_name || 'N/A');

    return [
        formatDateForExcel(item.recorded_at), // Column A: Physical Destruction Date (recorded_at)
        String(item.mail_item_id), // Column B: Mail Item ID
        cleanText(item.user_display_name), // Column C: Customer Name (no ID suffix - cleaner)
        cleanText(mailDescription), // Column D: Mail Description
        formatDateForExcel(item.receipt_date), // Column E: Receipt Date
        formatDateForExcel(item.eligibility_date), // Column F: Eligibility Date
        cleanText(item.destruction_method || 'Cross-cut shredder'), // Column G: Destruction Method
        cleanText(item.staff_name), // Column H: Staff Name (never "Unknown")
        cleanText(item.staff_initials), // Column I: Staff Signature / Initials
        cleanText(item.notes), // Column J: Notes (factual, system-generated)
    ];
}

/**
 * Append row to Excel destruction log
 * 
 * TODO: Implement actual Excel writing using one of:
 * - Microsoft Graph API (recommended for OneDrive)
 * - CSV append + re-upload
 * - Excel Online API
 * 
 * For now, this logs to console. Replace with actual Excel writing.
 */
async function appendToExcel(row: ReturnType<typeof buildExcelRow>): Promise<void> {
    // TODO: Implement Excel writing
    // Example using Graph API:
    // await graphClient.api('/me/drive/root:/Scanned_Mail/Destruction_Log.xlsx:/workbook/worksheets/Sheet1/tables/Table1/rows/add')
    //   .post({ values: [[row.mailItemId, row.customerName, ...]] });

    console.log('[logDestructionToExcel] Would append to Excel:', JSON.stringify(row, null, 2));

    // For now, just log - replace with actual implementation
    // This is a placeholder to show the structure
}

async function run() {
    const pool = getPool();
    const now = nowMs();

    console.log(`[logDestructionToExcel] Starting at ${new Date(now).toISOString()}`);

    try {
        // Find items from destruction_log that need to be logged to Excel
        // CRITICAL: Only items with destruction_status = 'completed' and not yet logged to Excel
        // Note: We use mail_item.destruction_logged flag for idempotency
        // GUARD: All records must have valid staff attribution (no "Unknown")
        const { rows: items } = await pool.query<DestructionLogItem>(
            `
            SELECT
                dl.mail_item_id,
                dl.user_id,
                dl.user_display_name,
                dl.receipt_date,
                dl.eligibility_date,
                dl.recorded_at,
                dl.actor_type,
                dl.action_source,
                dl.staff_name,
                dl.staff_initials,
                dl.notes,
                dl.destruction_method,
                m.subject,
                m.sender_name
            FROM destruction_log dl
            JOIN mail_item m ON m.id = dl.mail_item_id
            WHERE dl.destruction_status = 'completed'
                AND (m.destruction_logged IS NULL OR m.destruction_logged = FALSE)
                AND (m.deleted IS NULL OR m.deleted = false)
                AND dl.staff_name != 'Unknown'  -- Guard: Never export "Unknown" records
                AND dl.staff_initials != 'UN'    -- Guard: Never export "UN" records
            ORDER BY dl.recorded_at ASC
            `,
            []
        );

        console.log(`[logDestructionToExcel] Found ${items.length} items that need to be logged to Excel`);

        if (items.length === 0) {
            console.log('[logDestructionToExcel] No items to log. Exiting.');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const item of items) {
            try {
                // Build Excel row (all data is already compliance-ready from destruction_log table)
                const row = buildExcelRow(item);

                // Append to Excel (TODO: implement actual Excel writing)
                await appendToExcel(row);

                // Mark as logged (idempotency - safe to re-run)
                await pool.query(
                    `
                    UPDATE mail_item
                    SET destruction_logged = TRUE,
                        updated_at = $1
                    WHERE id = $2
                    `,
                    [now, item.mail_item_id]
                );

                successCount++;
                console.log(`[logDestructionToExcel] Successfully logged mail item #${item.mail_item_id} to Excel`);
            } catch (error: any) {
                errorCount++;
                console.error(`[logDestructionToExcel] Failed to log mail item #${item.mail_item_id}:`, error);
                // Continue processing other items - don't fail entire batch
            }
        }

        console.log(`[logDestructionToExcel] Completed: ${successCount} succeeded, ${errorCount} failed`);
    } catch (error: any) {
        console.error('[logDestructionToExcel] Fatal error:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    run().catch((error) => {
        console.error('[logDestructionToExcel] Unhandled error:', error);
        process.exit(1);
    });
}

export { run, buildExcelRow, appendToExcel };

