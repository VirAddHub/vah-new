/* eslint-disable no-console */
/**
 * Mailroom Expiry Reminders Script
 * 
 * Sends per-item expiry reminder emails to mailroom@virtualaddresshub.co.uk
 * when mail items reach the 30-day GDPR forwarding window.
 * 
 * This script should be run daily via cron/Render job.
 * 
 * Usage:
 *   node dist/scripts/mailroomExpiryReminders.js
 *   (or: npm run script:mailroom-expiry)
 */

import { getPool } from "../lib/db";
import { GDPR_FORWARDING_WINDOW_MS } from "../config/gdpr";
import { nowMs } from "../lib/time";
import { sendMailroomExpiryReminder } from "../services/mailer";

interface MailroomExpiryItem {
    id: number;
    user_id: number;
    user_name: string | null;
    user_email: string | null;
    company_name: string | null;
    received_at_ms: number;
    tag: string | null;
    sender_name: string | null;
    subject: string | null;
    file_name: string | null;
}

async function run() {
    const pool = getPool();
    const now = nowMs();
    const cutoff = now - GDPR_FORWARDING_WINDOW_MS;

    console.log(`[mailroomExpiryReminders] Starting at ${new Date(now).toISOString()}`);
    console.log(`[mailroomExpiryReminders] Cutoff timestamp: ${cutoff} (${new Date(cutoff).toISOString()})`);

    // Select items that:
    // - Have received_at_ms set
    // - Are past or at the 30-day mark (received_at_ms <= cutoff)
    // - Have not yet triggered a mailroom expiry notification
    // - Are not soft-deleted
    const { rows: items } = await pool.query<MailroomExpiryItem>(
        `
        SELECT
            m.id,
            m.user_id,
            COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, NULL) AS user_name,
            u.email AS user_email,
            u.company_name,
            m.received_at_ms,
            m.tag,
            m.sender_name,
            m.subject,
            COALESCE(f.name, m.subject) AS file_name
        FROM mail_item m
        JOIN "user" u ON u.id = m.user_id
        LEFT JOIN file f ON f.id = m.file_id
        WHERE
            m.received_at_ms IS NOT NULL
            AND m.received_at_ms <= $1
            AND (m.mailroom_expiry_notified_at IS NULL)
            AND (m.deleted IS NULL OR m.deleted = false)
        ORDER BY m.received_at_ms ASC
        `,
        [cutoff]
    );

    console.log(`[mailroomExpiryReminders] Found ${items.length} items that need expiry reminders`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
        try {
            await sendMailroomExpiryReminder(item);

            // Mark as notified
            await pool.query(
                `
                UPDATE mail_item
                SET mailroom_expiry_notified_at = $2
                WHERE id = $1
                `,
                [item.id, now]
            );

            console.log(`[mailroomExpiryReminders] ✅ Sent reminder for mail item ${item.id} (User ${item.user_id})`);
            successCount++;
        } catch (err: any) {
            console.error(
                `[mailroomExpiryReminders] ❌ Failed to send reminder for mail item ${item.id}:`,
                err?.message || err
            );
            errorCount++;
            // Continue processing other items even if one fails
        }
    }

    console.log(
        `[mailroomExpiryReminders] Completed: ${successCount} sent, ${errorCount} errors, ${items.length} total`
    );
}

// Run the script
run()
    .then(() => {
        console.log("[mailroomExpiryReminders] Script completed successfully");
        process.exit(0);
    })
    .catch((err) => {
        console.error("[mailroomExpiryReminders] Script failed:", err);
        process.exit(1);
    });

