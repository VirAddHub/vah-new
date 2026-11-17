// src/server/routes/admin-ch-verification.ts
// Admin endpoint for Companies House verification reminders

import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { param } from '../../lib/express-params';
import { safeErrorMessage } from '../../lib/safeError';
import fs from 'fs';
import path from 'path';

const router = Router();

/** Audit row for a review decision. Best effort: a failure here is logged, not shown as a failed review. */
async function recordReview(adminId: string | number, userId: number, action: string, details: Record<string, unknown>) {
    try {
        await getPool().query(
            `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, $2, 'user', $3, $4, NOW())`,
            [adminId, action, userId, JSON.stringify(details)]);
    } catch (e) {
        logger.warn('[admin-ch-verification] audit_failed', { action, userId, message: (e as Error)?.message });
    }
}

/**
 * GET /api/admin/ch-verification/:userId/proof
 * The proof file a customer uploaded, for the reviewing administrator.
 */
router.get('/ch-verification/:userId/proof', requireAdmin, async (req: Request, res: Response) => {
    const userId = parseInt(param(req, 'userId'), 10);
    if (Number.isNaN(userId)) return res.status(400).json({ ok: false, error: 'invalid_user_id' });
    try {
        const r = await getPool().query('SELECT ch_verification_proof_url FROM "user" WHERE id = $1', [userId]);
        const proofUrl: string | null = r.rows[0]?.ch_verification_proof_url ?? null;
        if (!proofUrl) return res.status(404).json({ ok: false, error: 'no_proof' });
        // Stored as a URL/path ending in the file name; only the base name is used, so no path can escape the folder.
        const filename = path.basename(String(proofUrl).split('?')[0]);
        const dir = path.join(process.cwd(), 'data', 'ch-verification');
        const filePath = path.join(dir, filename);
        if (!filename || !filePath.startsWith(dir + path.sep) || !fs.existsSync(filePath)) {
            return res.status(404).json({ ok: false, error: 'file_not_found' });
        }
        const ext = path.extname(filename).toLowerCase();
        const type = ext === '.pdf' ? 'application/pdf' : /\.(jpe?g|png|gif|webp)$/.test(ext) ? `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}` : 'application/octet-stream';
        res.setHeader('Content-Type', type);
        res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
        logger.error('[GET /api/admin/ch-verification/:userId/proof] error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'file_serve_error' });
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
        logger.error('[GET /api/admin/ch-verification/submissions] error:', error);
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
        await recordReview(adminId, userId, 'ch_verification_approve', { notes: notes || null });

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('[POST /api/admin/ch-verification/:userId/approve] error:', error);
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
        await recordReview(adminId, userId, 'ch_verification_reject', { reason: reason.trim() });

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('[POST /api/admin/ch-verification/:userId/reject] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

export default router;

