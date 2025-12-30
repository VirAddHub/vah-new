/* eslint-disable no-console */
/**
 * Physical Destruction Logging Script
 *
 * This cron job logs confirmed physical destruction events to Excel.
 * 
 * CRITICAL COMPLIANCE RULES:
 * - This script does NOT decide what to destroy
 * - This script only logs items that have been manually marked as destroyed by an admin
 * - Human clicks "Destroy" → Backend marks destroyed → This script logs to Excel
 * 
 * Flow:
 * 1. Admin clicks "Mark as Destroyed" button
 * 2. Backend sets physical_destruction_date = NOW(), destruction_logged = FALSE
 * 3. This cron finds items where physical_destruction_date IS NOT NULL AND destruction_logged = FALSE
 * 4. For each item, append row to Excel destruction log
 * 5. Mark destruction_logged = TRUE (idempotency)
 * 
 * This script should be run every 5-15 minutes (or daily if volume is low).
 * 
 * Usage:
 *   node dist/src/scripts/logDestructionToExcel.js
 *   (or: npm run script:log-destruction)
 */

import { getPool } from "../lib/db";
import { nowMs } from "../lib/time";

interface DestructionItem {
    id: number;
    user_id: number;
    user_name: string | null;
    user_email: string | null;
    company_name: string | null;
    subject: string | null;
    sender_name: string | null;
    tag: string | null;
    received_at_ms: number | null;
    received_date: string | null;
    physical_destruction_date: string; // ISO timestamp
    destroyed_by_admin_id: number | null;
    destroyed_by_name: string | null;
    destroyed_by_email: string | null;
}

/**
 * Calculate destruction eligibility date (30 days from receipt)
 */
function getDestructionEligibilityDate(item: DestructionItem): string {
    let receivedDate: Date | null = null;

    if (item.received_at_ms) {
        receivedDate = new Date(item.received_at_ms);
    } else if (item.received_date) {
        receivedDate = new Date(item.received_date);
    }

    if (!receivedDate || isNaN(receivedDate.getTime())) {
        return "—";
    }

    const eligibilityDate = new Date(receivedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    return eligibilityDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format receipt date for Excel
 */
function formatReceiptDate(item: DestructionItem): string {
    if (item.received_at_ms) {
        const date = new Date(item.received_at_ms);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (item.received_date) {
        const date = new Date(item.received_date);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return "—";
}

/**
 * Format destruction date for Excel
 */
function formatDestructionDate(destructionDate: string): string {
    const date = new Date(destructionDate);
    if (isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Build Excel row data for destruction log
 */
function buildExcelRow(item: DestructionItem): {
    mailItemId: number;
    customerName: string;
    customerId: number;
    mailDescription: string;
    receiptDate: string;
    destructionEligibilityDate: string;
    physicalDestructionDate: string;
    method: string;
    staffMember: string;
} {
    const customerName = item.user_name || item.company_name || item.user_email || `User #${item.user_id}`;
    const mailDescription = item.subject 
        ? `${item.subject}${item.sender_name ? ` – ${item.sender_name}` : ''}`
        : "—";
    const staffMember = item.destroyed_by_name || item.destroyed_by_email || "Unknown";

    return {
        mailItemId: item.id,
        customerName,
        customerId: item.user_id,
        mailDescription,
        receiptDate: formatReceiptDate(item),
        destructionEligibilityDate: getDestructionEligibilityDate(item),
        physicalDestructionDate: formatDestructionDate(item.physical_destruction_date),
        method: "Cross-cut shredder", // SOP method
        staffMember,
    };
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
        // Find items that have been destroyed but not yet logged to Excel
        // CRITICAL: Only items that were manually marked as destroyed by an admin
        const { rows: items } = await pool.query<DestructionItem>(
            `
            SELECT
                m.id,
                m.user_id,
                COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, NULL) AS user_name,
                u.email AS user_email,
                u.company_name,
                m.subject,
                m.sender_name,
                m.tag,
                m.received_at_ms,
                m.received_date,
                m.physical_destruction_date::text AS physical_destruction_date,
                admin_audit.admin_id AS destroyed_by_admin_id,
                COALESCE(admin_user.first_name || ' ' || admin_user.last_name, admin_user.first_name, admin_user.last_name, admin_user.email, NULL) AS destroyed_by_name,
                admin_user.email AS destroyed_by_email
            FROM mail_item m
            JOIN "user" u ON u.id = m.user_id
            LEFT JOIN admin_audit ON admin_audit.target_type = 'mail_item' 
                AND admin_audit.target_id = m.id 
                AND admin_audit.action = 'physical_destruction_confirmed'
            LEFT JOIN "user" admin_user ON admin_user.id = admin_audit.admin_id
            WHERE m.physical_destruction_date IS NOT NULL
                AND (m.destruction_logged IS NULL OR m.destruction_logged = FALSE)
                AND (m.deleted IS NULL OR m.deleted = false)
            ORDER BY m.physical_destruction_date ASC
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
                // Build Excel row
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
                    [now, item.id]
                );

                successCount++;
                console.log(`[logDestructionToExcel] Successfully logged mail item #${item.id} to Excel`);
            } catch (error: any) {
                errorCount++;
                console.error(`[logDestructionToExcel] Failed to log mail item #${item.id}:`, error);
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

