// src/server/routes/admin-forwarding.ts
// Admin forwarding request management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/forwarding/requests
 * Get all forwarding requests (admin only)
 */
router.get('/forwarding/requests', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const { status, limit = '20', offset = '0', page, page_size, q } = req.query;

    const limitNum = parseInt((page_size || limit) as string) || 20;
    const pageNum = parseInt(page as string) || 1;
    const offsetNum = page ? (pageNum - 1) * limitNum : parseInt(offset as string) || 0;

    try {
        let query = `
            SELECT
                m.id,
                m.user_id,
                m.item_id,
                m.subject,
                m.description,
                m.sender_name,
                m.tag,
                m.status,
                m.is_billable_forward,
                COALESCE(m.forwarding_status, 'Pending') as forwarding_status,
                m.notes,
                m.expires_at,
                m.created_at,
                m.updated_at,
                u.email as user_email,
                u.first_name,
                u.last_name,
                u.phone,
                f.name as file_name,
                f.web_url as file_url,
                fr.id as forwarding_request_id,
                fr.to_name,
                fr.address1,
                fr.address2,
                fr.city,
                fr.state,
                fr.postal,
                fr.country,
                fr.reason,
                fr.method,
                fr.tracking,
                fr.courier,
                fc.amount_pence as charge_amount
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            LEFT JOIN forwarding_request fr ON fr.mail_item_id = m.id
            LEFT JOIN forwarding_charge fc ON fc.mail_item_id = m.id AND fc.status = 'pending'
            WHERE COALESCE(m.forwarding_status, 'Pending') != 'No'
              AND COALESCE(m.forwarding_status, 'Pending') IN ('Requested', 'Pending', 'Processing', 'Dispatched')
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (status && status !== 'all') {
            query += ` AND COALESCE(m.forwarding_status, 'Pending') = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offsetNum);

        const result = await pool.query(query, params);

        // Get total count
        const countQuery = status && status !== 'all'
            ? `SELECT COUNT(*) FROM mail_item WHERE COALESCE(forwarding_status, 'Pending') IN ('Requested', 'Pending', 'Processing', 'Dispatched') AND COALESCE(forwarding_status, 'Pending') = $1`
            : `SELECT COUNT(*) FROM mail_item WHERE COALESCE(forwarding_status, 'Pending') IN ('Requested', 'Pending', 'Processing', 'Dispatched')`;
        const countParams = status && status !== 'all' ? [status] : [];
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        // Format the data for the frontend
        const items = result.rows.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            userName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.user_email,
            userEmail: row.user_email,
            userPhone: row.phone,
            mailItemId: row.id,
            mailSubject: row.description || row.subject || `Mail from ${row.sender_name || 'Unknown'}`,
            mailSender: row.sender_name,
            mailTag: row.tag,
            isBillable: row.is_billable_forward,
            chargeAmount: row.charge_amount ? `£${(row.charge_amount / 100).toFixed(2)}` : (row.is_billable_forward ? '£2.00' : 'Free'),
            destination: [row.address1, row.address2, row.city, row.state, row.postal, row.country]
                .filter(Boolean)
                .join(', ') || 'Address not provided',
            destinationDetails: {
                toName: row.to_name,
                address1: row.address1,
                address2: row.address2,
                city: row.city,
                state: row.state,
                postal: row.postal,
                country: row.country
            },
            priority: row.method || 'standard',
            status: (row.forwarding_status || 'pending').toLowerCase(),
            trackingNumber: row.tracking,
            carrier: row.courier,
            notes: row.notes,
            reason: row.reason,
            cost: row.is_billable_forward ? '£2.00' : 'Free',
            createdAt: new Date(Number(row.created_at)).toISOString(),
            updatedAt: row.updated_at ? new Date(Number(row.updated_at)).toISOString() : null,
            fileUrl: row.file_url
        }));

        return res.json({
            ok: true,
            data: items,
            total,
            page: pageNum,
            limit: limitNum
        });
    } catch (error: any) {
        console.error('[GET /api/admin/forwarding-requests] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/admin/forwarding/requests/:id
 * Get specific forwarding request (admin only)
 */
router.get('/forwarding/requests/:id', requireAdmin, async (req: Request, res: Response) => {
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
 * PATCH /api/admin/forwarding/requests/:id
 * Update forwarding request status (admin only)
 */
router.patch('/forwarding/requests/:id', requireAdmin, async (req: Request, res: Response) => {
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
 * POST /api/admin/forwarding/requests/:id/fulfill
 * Mark forwarding request as fulfilled (admin only)
 */
router.post('/forwarding/requests/:id/fulfill', requireAdmin, async (req: Request, res: Response) => {
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
