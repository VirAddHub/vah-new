// src/server/routes/admin-forwarding-complete.ts
// Admin endpoint to mark forwarding requests as completed

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/require-admin';

const router = Router();

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * POST /api/admin/forwarding/requests/:id/complete
 * Mark a forwarding request as completed
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tracking_number, courier, admin_notes } = req.body;
    const adminUserId = req.user!.id;
    const pool = getPool();

    try {
        // Update the forwarding request
        const result = await pool.query(`
            UPDATE forwarding_request 
            SET 
                status = 'Delivered',
                tracking_number = COALESCE($1, tracking_number),
                courier = COALESCE($2, courier),
                admin_notes = COALESCE($3, admin_notes),
                delivered_at = $4,
                updated_at = $4
            WHERE id = $5
            RETURNING *
        `, [tracking_number, courier, admin_notes, Date.now(), id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const updatedRequest = result.rows[0];

        // Log the admin action
        await pool.query(`
            INSERT INTO admin_log (admin_user_id, action_type, target_type, target_id, details, created_at)
            VALUES ($1, 'forwarding_completed', 'forwarding_request', $2, $3, $4)
        `, [
            adminUserId,
            id,
            JSON.stringify({
                tracking_number,
                courier,
                admin_notes,
                previous_status: 'Processing'
            }),
            Date.now()
        ]);

        return res.json({
            ok: true,
            data: updatedRequest,
            message: 'Forwarding request marked as completed'
        });

    } catch (error: any) {
        console.error('[POST /api/admin/forwarding/requests/:id/complete] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

export default router;
