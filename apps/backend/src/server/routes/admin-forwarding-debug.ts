import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { toCanonical, getNextStatuses } from './mailStatus';
import { getPool } from '../../server/db';

const router = Router();

/**
 * GET /api/admin/forwarding/requests/:id/debug-status
 * Debug endpoint to inspect current status and allowed transitions
 */
router.get('/admin/forwarding/requests/:id/debug-status', requireAdmin, async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const pool = getPool();

        // Get the forwarding request
        const result = await pool.query(`
            SELECT id, status, created_at, updated_at, processing_at, dispatched_at, delivered_at
            FROM forwarding_request 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                ok: false, 
                error: "not_found",
                message: `Forwarding request ${id} not found`
            });
        }

        const request = result.rows[0];
        const current = toCanonical(request.status);
        const allowed = getNextStatuses(current);

        res.json({ 
            ok: true, 
            id: String(id),
            current: current,
            rawStatus: request.status,
            allowed: allowed,
            strict: process.env.STRICT_STATUS_GUARD === "1",
            timestamps: {
                created_at: request.created_at,
                updated_at: request.updated_at,
                processing_at: request.processing_at,
                dispatched_at: request.dispatched_at,
                delivered_at: request.delivered_at
            }
        });

    } catch (error: any) {
        console.error('[Debug Status] Error:', error);
        res.status(500).json({
            ok: false,
            error: 'internal_error',
            message: error.message
        });
    }
});

export default router;
