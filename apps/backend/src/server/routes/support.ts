// src/server/routes/support.ts
// Support tickets API endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { param } from '../../lib/express-params';
import { sendSupportRequestReceived, sendSupportRequestClosed } from '../../lib/mailer';
import { buildAppUrl } from '../../lib/mailer';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

const SUPPORT_INFO = {
    email: 'support@virtualaddresshub.co.uk',
    phone: '+44 20 1234 5678',
    hours: 'Monday - Friday: 9:00 AM - 6:00 PM GMT',
    whatsapp: '+44 20 1234 5678',
    address: '123 Business Street, London, SW1A 1AA, United Kingdom'
};

function sendSupportInfo(res: Response) {
    return res.json({ ok: true, data: SUPPORT_INFO });
}

/**
 * GET /api/support
 * Get support information (contact details, hours, etc.)
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        return sendSupportInfo(res);
    } catch (error: any) {
        console.error('[GET /api/support] error:', error);
        return res.status(500).json({ ok: false, error: 'server_error', message: error.message });
    }
});

/**
 * GET /api/support/info
 * Backwards-compatible alias for legacy clients expecting /info
 */
router.get('/info', async (_req: Request, res: Response) => {
    try {
        return sendSupportInfo(res);
    } catch (error: any) {
        console.error('[GET /api/support/info] error:', error);
        return res.status(500).json({ ok: false, error: 'server_error', message: error.message });
    }
});

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

        const ticket = result.rows[0];

        // Send confirmation email to user (non-blocking)
        try {
            const userResult = await pool.query('SELECT email, first_name, name FROM "user" WHERE id = $1', [userId]);
            const user = userResult.rows[0];
            if (user?.email) {
                sendSupportRequestReceived({
                    email: user.email,
                    firstName: user.first_name,
                    name: user.name,
                    ticket_id: String(ticket.id),
                    cta_url: buildAppUrl('/account/support'),
                }).catch((err) => {
                    console.error('[POST /api/support/tickets] email_send_failed_nonfatal', err);
                });
            }
        } catch (emailError) {
            // Don't fail ticket creation if email fails
            console.error('[POST /api/support/tickets] email_error', emailError);
        }

        return res.json({ ok: true, data: ticket });
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
    const ticketId = parseInt(param(req, 'id'), 10);
    const pool = getPool();

    if (!ticketId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Verify ticket belongs to user and get ticket details
        const check = await pool.query(
            'SELECT id, user_id FROM support_ticket WHERE id = $1 AND user_id = $2',
            [ticketId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        // Close the ticket
        await pool.query(`
            UPDATE support_ticket SET status = $1, updated_at = $2 WHERE id = $3
        `, ['closed', Date.now(), ticketId]);

        // Send confirmation email to user (non-blocking)
        try {
            const userResult = await pool.query('SELECT email, first_name, name FROM "user" WHERE id = $1', [userId]);
            const user = userResult.rows[0];
            if (user?.email) {
                sendSupportRequestClosed({
                    email: user.email,
                    firstName: user.first_name,
                    name: user.name,
                    ticket_id: String(ticketId),
                    cta_url: buildAppUrl('/account/support'),
                }).catch((err) => {
                    console.error('[POST /api/support/tickets/:id/close] email_send_failed_nonfatal', err);
                });
            }
        } catch (emailError) {
            // Don't fail ticket closure if email fails
            console.error('[POST /api/support/tickets/:id/close] email_error', emailError);
        }

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[POST /api/support/tickets/:id/close] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
