/* eslint-disable no-console */
/**
 * Diagnostic script to check user 4's mail items and 30-day expiry calculation
 */

import { getPool } from "../lib/db";

async function run() {
    const pool = getPool();
    const userId = 4;

    console.log(`\n=== Checking mail items for user ${userId} ===\n`);

    // Get all mail items for user 4
    const { rows: items } = await pool.query(`
        SELECT
            m.id,
            m.user_id,
            m.subject,
            m.sender_name,
            m.tag,
            m.status,
            m.scanned,
            m.deleted,
            m.scan_file_url,
            m.received_date,
            m.received_at_ms,
            m.created_at,
            m.physical_destruction_date,
            f.id as file_id,
            f.name as file_name,
            -- Calculate days until/past 30-day expiry
            CASE 
                WHEN m.received_at_ms IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days' - now())) / 86400
                WHEN m.received_date IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (m.received_date::timestamptz + INTERVAL '30 days' - now())) / 86400
                WHEN m.created_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (to_timestamp(m.created_at / 1000) + INTERVAL '30 days' - now())) / 86400
                ELSE NULL
            END as days_until_deletion,
            -- Check if past 30 days
            CASE 
                WHEN m.received_at_ms IS NOT NULL AND (now() - to_timestamp(m.received_at_ms / 1000)) > INTERVAL '30 days' THEN true
                WHEN m.received_date IS NOT NULL AND (now() - m.received_date::timestamptz) > INTERVAL '30 days' THEN true
                WHEN m.created_at IS NOT NULL AND (now() - to_timestamp(m.created_at / 1000)) > INTERVAL '30 days' THEN true
                ELSE false
            END as past_30_days,
            -- Raw date values for debugging
            CASE 
                WHEN m.received_at_ms IS NOT NULL THEN to_timestamp(m.received_at_ms / 1000)
                WHEN m.received_date IS NOT NULL THEN m.received_date::timestamptz
                WHEN m.created_at IS NOT NULL THEN to_timestamp(m.created_at / 1000)
                ELSE NULL
            END as receipt_date_calculated,
            now() as current_time
        FROM mail_item m
        LEFT JOIN file f ON m.file_id = f.id
        WHERE m.user_id = $1
        ORDER BY m.created_at DESC
    `, [userId]);

    console.log(`Found ${items.length} total mail items for user ${userId}\n`);

    if (items.length === 0) {
        console.log("No mail items found for this user.");
        process.exit(0);
    }

    // Check which items should appear in admin view
    const shouldAppear = items.filter(item => {
        const notDeleted = !item.deleted;
        const isScanned = item.scanned === true || item.scan_file_url !== null || item.file_id !== null;
        const hasDate = item.received_at_ms !== null || item.received_date !== null || item.created_at !== null;
        return notDeleted && isScanned && hasDate;
    });

    console.log(`Items that SHOULD appear in admin view: ${shouldAppear.length}`);
    console.log(`  (not deleted AND (scanned OR has scan_file_url OR has file_id) AND has date)\n`);

    // Check which items are past 30 days
    const past30Days = items.filter(item => item.past_30_days === true);
    console.log(`Items PAST 30 days: ${past30Days.length}\n`);

    // Show details for each item
    console.log("=== Item Details ===\n");
    items.forEach((item, idx) => {
        console.log(`\n--- Item #${item.id} (${idx + 1}/${items.length}) ---`);
        console.log(`Subject: ${item.subject || 'N/A'}`);
        console.log(`Sender: ${item.sender_name || 'N/A'}`);
        console.log(`Tag: ${item.tag || 'N/A'}`);
        console.log(`Status: ${item.status || 'N/A'}`);
        console.log(`Scanned: ${item.scanned}`);
        console.log(`Deleted: ${item.deleted}`);
        console.log(`scan_file_url: ${item.scan_file_url ? 'YES' : 'NO'}`);
        console.log(`file_id: ${item.file_id || 'NO'}`);
        console.log(`received_date: ${item.received_date || 'NULL'}`);
        console.log(`received_at_ms: ${item.received_at_ms ? new Date(item.received_at_ms).toISOString() : 'NULL'}`);
        console.log(`created_at: ${item.created_at ? new Date(item.created_at).toISOString() : 'NULL'}`);
        console.log(`Receipt Date (calculated): ${item.receipt_date_calculated ? new Date(item.receipt_date_calculated).toISOString() : 'NULL'}`);
        console.log(`Days until deletion: ${item.days_until_deletion !== null ? Math.round(item.days_until_deletion) : 'NULL'}`);
        console.log(`Past 30 days: ${item.past_30_days ? 'YES ✅' : 'NO'}`);
        console.log(`Physical destruction date: ${item.physical_destruction_date || 'NULL'}`);

        const shouldShow = !item.deleted &&
            (item.scanned === true || item.scan_file_url !== null || item.file_id !== null) &&
            (item.received_at_ms !== null || item.received_date !== null || item.created_at !== null);
        console.log(`Should appear in admin: ${shouldShow ? 'YES ✅' : 'NO ❌'}`);

        if (!shouldShow) {
            if (item.deleted) console.log(`  ❌ Reason: Item is deleted`);
            if (!item.scanned && !item.scan_file_url && !item.file_id) console.log(`  ❌ Reason: Not scanned and no file`);
            if (!item.received_at_ms && !item.received_date && !item.created_at) console.log(`  ❌ Reason: No date fields`);
        }
    });

    // Summary
    console.log("\n\n=== SUMMARY ===\n");
    console.log(`Total items: ${items.length}`);
    console.log(`Items that should appear in admin: ${shouldAppear.length}`);
    console.log(`Items past 30 days: ${past30Days.length}`);
    console.log(`Items past 30 days that should appear: ${past30Days.filter(item => {
        const shouldShow = !item.deleted &&
            (item.scanned === true || item.scan_file_url !== null || item.file_id !== null) &&
            (item.received_at_ms !== null || item.received_date !== null || item.created_at !== null);
        return shouldShow;
    }).length}`);

    process.exit(0);
}

run().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});

