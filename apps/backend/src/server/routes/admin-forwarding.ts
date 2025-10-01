// src/server/routes/admin-forwarding.ts
// Admin forwarding request management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// Middleware to require admin
function requireAdmin(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    if (!req.user?.is_admin) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    next();
}

/**
 * GET /api/admin/forwarding-requests
 * Get all forwarding requests (admin only)
 */
router.get('/forwarding-requests', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const { status, limit = '100', offset = '0' } = req.query;

    const limitNum = parseInt(limit as string) || 100;
    const offsetNum = parseInt(offset as string) || 0;

    try {
        let query = `
            SELECT
                m.id,
                m.user_id,
                m.subject,
                m.sender_name,
                m.tag,
                m.status,
                m.forwarding_status,
                m.notes,
                m.expires_at,
                m.created_at,
                m.updated_at,
                u.email as user_email,
                u.first_name,
                u.last_name,
                f.name as file_name
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.forwarding_status != 'No'
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND m.forwarding_status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offsetNum);

        const result = await pool.query(query, params);

        // Get total count
        const countQuery = status && status !== 'all'
            ? `SELECT COUNT(*) FROM mail_item WHERE forwarding_status = $1 AND forwarding_status != 'No'`
            : `SELECT COUNT(*) FROM mail_item WHERE forwarding_status != 'No'`;
        const countParams = status && status !== 'all' ? [status] : [];
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return res.json({
            ok: true,
            data: result.rows,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                total
            }
        });
    } catch (error: any) {
        console.error('[GET /api/admin/forwarding-requests] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/admin/forwarding-requests/:id
 * Get specific forwarding request (admin only)
 */
router.get('/forwarding-requests/:id', requireAdmin, async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id);
    const pool = getPool();

    if (!requestId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                m.*,
                u.email as user_email,
                u.first_name,
                u.last_name,
                u.phone,
                f.name as file_name,
                f.web_url as file_url
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.id = $1
        `, [requestId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/admin/forwarding-requests/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/admin/forwarding-requests/:id
 * Update forwarding request status (admin only)
 */
router.patch('/forwarding-requests/:id', requireAdmin, async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const pool = getPool();

    if (!requestId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const { forwarding_status, notes, tracking_number } = req.body;

    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (typeof forwarding_status === 'string') {
            updates.push(`forwarding_status = $${paramIndex++}`);
            values.push(forwarding_status);
        }

        if (typeof notes === 'string') {
            updates.push(`notes = $${paramIndex++}`);
            values.push(notes);
        }

        // Add tracking number to notes if provided
        if (typeof tracking_number === 'string') {
            const existingMail = await pool.query('SELECT notes FROM mail_item WHERE id = $1', [requestId]);
            const existingNotes = existingMail.rows[0]?.notes || '';
            const newNotes = existingNotes + `\nTracking: ${tracking_number}`;
            updates.push(`notes = $${paramIndex++}`);
            values.push(newNotes);
        }

        updates.push(`updated_by = $${paramIndex++}`);
        values.push(adminId);

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(Date.now());

        values.push(requestId);

        if (updates.length === 2) { // Only updated_by and updated_at
            return res.status(400).json({ ok: false, error: 'no_changes' });
        }

        const result = await pool.query(
            `UPDATE mail_item SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'update_forwarding_request', 'mail_item', $2, $3, $4)
        `, [adminId, requestId, JSON.stringify(req.body), Date.now()]);

        // Create notification for user if status changed to Fulfilled or Dispatched
        if (forwarding_status === 'Fulfilled' || forwarding_status === 'Dispatched') {
            const mail = result.rows[0];
            await pool.query(`
                INSERT INTO notification (user_id, type, title, body, read, created_at)
                VALUES ($1, 'forwarding_update', 'Mail Forwarded', $2, false, $3)
            `, [
                mail.user_id,
                `Your mail has been ${forwarding_status.toLowerCase()}${tracking_number ? ` (Tracking: ${tracking_number})` : ''}.`,
                Date.now()
            ]);
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PATCH /api/admin/forwarding-requests/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/admin/forwarding-requests/:id/fulfill
 * Mark forwarding request as fulfilled (admin only)
 */
router.post('/forwarding-requests/:id/fulfill', requireAdmin, async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { tracking_number, carrier, notes } = req.body;
    const pool = getPool();

    if (!requestId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Build fulfillment notes
        const fulfillmentNotes = [
            notes || 'Forwarding request fulfilled',
            tracking_number ? `Tracking: ${tracking_number}` : '',
            carrier ? `Carrier: ${carrier}` : ''
        ].filter(Boolean).join('\n');

        const result = await pool.query(`
            UPDATE mail_item
            SET
                forwarding_status = 'Fulfilled',
                notes = COALESCE(notes, '') || $1,
                updated_by = $2,
                updated_at = $3
            WHERE id = $4
            RETURNING *
        `, ['\n' + fulfillmentNotes, adminId, Date.now(), requestId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const mail = result.rows[0];

        // Create notification for user
        await pool.query(`
            INSERT INTO notification (user_id, type, title, body, read, created_at)
            VALUES ($1, 'forwarding_fulfilled', 'Mail Forwarded', $2, false, $3)
        `, [
            mail.user_id,
            `Your mail has been forwarded${tracking_number ? ` (Tracking: ${tracking_number})` : ''}.`,
            Date.now()
        ]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'fulfill_forwarding_request', 'mail_item', $2, $3, $4)
        `, [adminId, requestId, JSON.stringify({ tracking_number, carrier, notes }), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[POST /api/admin/forwarding-requests/:id/fulfill] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
