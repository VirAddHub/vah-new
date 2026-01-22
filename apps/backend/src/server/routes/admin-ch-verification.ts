// src/server/routes/admin-ch-verification.ts
// Admin endpoint for Companies House verification reminders

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { sendChVerificationReminder } from '../../lib/mailer';
import fs from 'fs';
import path from 'path';

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
        // 3. Were approved at least 24 hours ago
        // 4. Haven't received a reminder in the last 24 hours (or never)
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
                AND kyc_approved_at <= NOW() - INTERVAL '24 hours'
                AND (
                    ch_reminder_last_sent_at IS NULL 
                    OR ch_reminder_last_sent_at <= NOW() - INTERVAL '24 hours'
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

/**
 * GET /api/admin/ch-verification/submissions
 * List Companies House verification submissions for review
 */
router.get('/ch-verification/submissions', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const { status = 'submitted', limit = '50' } = req.query;

    const allowedStatuses = ['submitted', 'approved', 'rejected', 'not_submitted'];
    const shouldFilterByStatus = typeof status === 'string' && status !== 'all';
    const statusFilter = shouldFilterByStatus && allowedStatuses.includes(status) ? status : 'submitted';
    const limitNum = Math.min(Math.max(parseInt(String(limit)) || 50, 1), 200);

    try {
        const params: any[] = [];
        let where = 'WHERE u.deleted_at IS NULL';
        if (shouldFilterByStatus) {
            where += ' AND u.ch_verification_status = $1';
            params.push(statusFilter);
        }

        const query = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.companies_house_verified,
                u.ch_verification_status,
                u.ch_verification_proof_url,
                u.ch_verification_submitted_at,
                u.ch_verification_reviewed_at,
                u.ch_verification_notes,
                reviewer.id AS reviewer_id,
                reviewer.email AS reviewer_email,
                reviewer.first_name AS reviewer_first_name,
                reviewer.last_name AS reviewer_last_name
            FROM "user" u
            LEFT JOIN "user" reviewer ON reviewer.id = u.ch_verification_reviewer_id
            ${where}
            ORDER BY 
                CASE WHEN u.ch_verification_status = 'submitted' THEN 0 ELSE 1 END,
                u.ch_verification_submitted_at DESC NULLS LAST
            LIMIT $${params.length + 1}
        `;
        params.push(limitNum);

        const result = await pool.query(query, params);
        return res.json({
            ok: true,
            data: {
                items: result.rows,
                count: result.rows.length
            }
        });
    } catch (error: any) {
        console.error('[GET /api/admin/ch-verification/submissions] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

/**
 * POST /api/admin/ch-verification/:userId/approve
 * Approve a Companies House verification submission
 */
router.post('/ch-verification/:userId/approve', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId);
    const { notes } = req.body ?? {};

    if (Number.isNaN(userId)) {
        return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    }

    try {
        const result = await pool.query(`
            UPDATE "user"
            SET 
                companies_house_verified = true,
                ch_verification_status = 'approved',
                ch_verification_reviewed_at = NOW(),
                ch_verification_reviewer_id = $1,
                ch_verification_notes = $2,
                updated_at = $3
            WHERE id = $4
            RETURNING id, email, companies_house_verified, ch_verification_status, ch_verification_reviewed_at
        `, [adminId, notes || null, Date.now(), userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[POST /api/admin/ch-verification/:userId/approve] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/admin/ch-verification/:userId/reject
 * Reject a Companies House verification submission
 */
router.post('/ch-verification/:userId/reject', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const adminId = req.user!.id;
    const userId = parseInt(req.params.userId);
    const { reason } = req.body ?? {};

    if (Number.isNaN(userId)) {
        return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'missing_reason', message: 'Reason is required to reject a submission.' });
    }

    try {
        const result = await pool.query(`
            UPDATE "user"
            SET 
                companies_house_verified = false,
                ch_verification_status = 'rejected',
                ch_verification_reviewed_at = NOW(),
                ch_verification_reviewer_id = $1,
                ch_verification_notes = $2,
                updated_at = $3
            WHERE id = $4
            RETURNING id, email, companies_house_verified, ch_verification_status, ch_verification_reviewed_at, ch_verification_notes
        `, [adminId, reason.trim(), Date.now(), userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[POST /api/admin/ch-verification/:userId/reject] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/admin/ch-verification/proof/:userId
 * Stream the Companies House verification proof for a user (admin only)
 * Handles both full URLs and relative paths stored in ch_verification_proof_url
 */
router.get('/ch-verification/proof/:userId', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const userId = parseInt(req.params.userId, 10);

    if (Number.isNaN(userId)) {
        return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    }

    try {
        const result = await pool.query(`
            SELECT ch_verification_proof_url
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const proofUrl: string | null = result.rows[0].ch_verification_proof_url;
        if (!proofUrl) {
            return res.status(404).json({ ok: false, error: 'no_proof_uploaded' });
        }

        const sanitizedUrl = proofUrl.trim();
        const withoutQuery = sanitizedUrl.split('?')[0].split('#')[0];
        const mediaPrefix = '/api/profile/media/';
        const prefixIndex = withoutQuery.indexOf(mediaPrefix);
        const relativePath = prefixIndex !== -1
            ? withoutQuery.slice(prefixIndex + mediaPrefix.length)
            : withoutQuery.replace(/^https?:\/\/[^/]+\/api\/profile\/media\//i, '');

        const filename = path.basename(relativePath || withoutQuery);

        if (!filename || filename === '.' || filename === '..') {
            console.error('[admin CH proof] invalid proof path', {
                userId,
                proofUrl
            });
            return res.status(400).json({ ok: false, error: 'invalid_proof_path' });
        }

        const filePath = path.join(process.cwd(), 'data', 'ch-verification', filename);

        if (!fs.existsSync(filePath)) {
            console.warn('[admin CH proof] file not found', {
                userId,
                proofUrl,
                resolvedPath: filePath
            });
            return res.status(404).json({ ok: false, error: 'file_not_found' });
        }

        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === '.pdf'
            ? 'application/pdf'
            : ext.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                ? `image/${ext.slice(1)}`
                : 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error: any) {
        console.error('[GET /api/admin/ch-verification/proof/:userId] error:', error);
        return res.status(500).json({ ok: false, error: 'file_serve_error', message: error.message });
    }
});

export default router;

