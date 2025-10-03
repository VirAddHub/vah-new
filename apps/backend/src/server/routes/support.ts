// src/server/routes/support.ts
// Support tickets API endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/support/tickets
 * Get all support tickets for current user
 */
router.get('/tickets', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT id, user_id, subject, message, status, created_at, updated_at
            FROM support_ticket
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        return res.json({ ok: true, data: result.rows });
    } catch (error: any) {
        console.error('[GET /api/support/tickets] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/support/tickets
 * Create new support ticket
 */
router.post('/tickets', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { subject, message } = req.body;
    const pool = getPool();

    if (!subject || !message) {
        return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO support_ticket (user_id, subject, message, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [userId, subject, message, 'open', Date.now(), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[POST /api/support/tickets] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/support/tickets/:id/close
 * Close a support ticket
 */
router.post('/tickets/:id/close', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const ticketId = parseInt(req.params.id);
    const pool = getPool();

    if (!ticketId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Verify ticket belongs to user
        const check = await pool.query(
            'SELECT id FROM support_ticket WHERE id = $1 AND user_id = $2',
            [ticketId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        // Close the ticket
        await pool.query(`
            UPDATE support_ticket SET status = $1, updated_at = $2 WHERE id = $3
        `, ['closed', Date.now(), ticketId]);

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[POST /api/support/tickets/:id/close] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
