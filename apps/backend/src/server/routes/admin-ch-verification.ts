// src/server/routes/admin-ch-verification.ts
// Admin endpoint for Companies House verification reminders

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { sendChVerificationReminder } from '../../lib/mailer';

const router = Router();

/**
 * GET /api/admin/ch-verification-reminders
 * Send reminder emails to users who are KYC-approved but not CH-verified
 * (for daily cron / Make.com)
 */
router.get('/ch-verification-reminders', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();

    try {
        // Find users who:
        // 1. Are KYC approved
        // 2. Are NOT Companies House verified
        // 3. Were approved at least 3 days ago
        // 4. Haven't received a reminder in the last 3 days (or never)
        const result = await pool.query(`
            SELECT 
                id,
                email,
                first_name,
                kyc_status,
                companies_house_verified,
                kyc_approved_at,
                ch_reminder_last_sent_at
            FROM "user"
            WHERE 
                kyc_status = 'approved'
                AND (companies_house_verified IS FALSE OR companies_house_verified IS NULL)
                AND kyc_approved_at IS NOT NULL
                AND kyc_approved_at <= NOW() - INTERVAL '3 days'
                AND (
                    ch_reminder_last_sent_at IS NULL 
                    OR ch_reminder_last_sent_at <= NOW() - INTERVAL '3 days'
                )
                AND deleted_at IS NULL
            ORDER BY kyc_approved_at ASC
        `);

        const users = result.rows;
        let sentCount = 0;
        const errors: Array<{ userId: number; error: string }> = [];

        // Send reminders to each user
        for (const user of users) {
            try {
                await sendChVerificationReminder({
                    email: user.email,
                    first_name: user.first_name,
                });

                // Update reminder timestamp
                await pool.query(
                    `UPDATE "user" SET ch_reminder_last_sent_at = NOW() WHERE id = $1`,
                    [user.id]
                );

                sentCount++;
            } catch (error: any) {
                console.error(`[CH Reminders] Failed to send to user ${user.id}:`, error);
                errors.push({
                    userId: user.id,
                    error: error.message || 'Unknown error',
                });
                // Continue with other users even if one fails
            }
        }

        return res.json({
            ok: true,
            data: {
                count: sentCount,
                totalEligible: users.length,
                errors: errors.length > 0 ? errors : undefined,
            },
        });
    } catch (error: any) {
        console.error('[GET /api/admin/ch-verification-reminders] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message,
        });
    }
});

export default router;

