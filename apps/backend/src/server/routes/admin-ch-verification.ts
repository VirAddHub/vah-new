// src/server/routes/admin-ch-verification.ts
// Admin endpoint for Companies House verification reminders

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { param } from '../../lib/express-params';
import { safeErrorMessage } from '../../lib/safeError';

const router = Router();

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
            message: safeErrorMessage(error)
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
    const userId = parseInt(param(req, 'userId'), 10);
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
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/admin/ch-verification/:userId/reject
 * Reject a Companies House verification submission
 */
router.post('/ch-verification/:userId/reject', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const adminId = req.user!.id;
    const userId = parseInt(param(req, 'userId'), 10);
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
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

export default router;

