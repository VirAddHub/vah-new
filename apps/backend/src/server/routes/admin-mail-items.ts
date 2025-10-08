// src/server/routes/admin-mail-items.ts
// Admin mail items management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Request coalescing cache to prevent duplicate requests
type Key = string;
const inflight = new Map<Key, Promise<any>>();
const COALESCE_TTL_MS = 4_000;

function keyFrom(req: Request): Key {
    const u = (req as any).user;
    const id = u?.id ?? "anon";
    const qp = new URLSearchParams(Object.entries(req.query as any)).toString();
    return `${id}:${req.path}?${qp}`;
}

/**
 * GET /api/admin/mail-items
 * Get all mail items (admin only)
 */
router.get('/mail-items', requireAdmin, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, max-age=5");

    const key = keyFrom(req);
    if (inflight.has(key)) {
        try {
            const result = await inflight.get(key)!;
            return res.json(result);
        } catch {
            // fall through to fresh execution
        }
    }

    const exec = (async () => {
        const pool = getPool();
        const { status, user_id, limit = '100', offset = '0' } = req.query;

        const limitNum = parseInt(limit as string) || 100;
        const offsetNum = parseInt(offset as string) || 0;

        try {
            let query = `
            SELECT
                m.*,
                u.email as user_email,
                u.first_name,
                u.last_name,
                f.name as file_name,
                f.size as file_size,
                f.web_url as file_url
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.deleted = false
        `;

            const params: any[] = [];
            let paramIndex = 1;

            if (status && status !== 'all') {
                query += ` AND m.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (user_id) {
                query += ` AND m.user_id = $${paramIndex}`;
                params.push(parseInt(user_id as string));
                paramIndex++;
            }

            query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limitNum, offsetNum);

            const result = await pool.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) FROM mail_item m WHERE m.deleted = false';
            const countParams: any[] = [];
            let countParamIndex = 1;

            if (status && status !== 'all') {
                countQuery += ` AND m.status = $${countParamIndex}`;
                countParams.push(status);
                countParamIndex++;
            }

            if (user_id) {
                countQuery += ` AND m.user_id = $${countParamIndex}`;
                countParams.push(parseInt(user_id as string));
                countParamIndex++;
            }

            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].count);

            return {
                ok: true,
                data: result.rows,
                pagination: {
                    limit: limitNum,
                    offset: offsetNum,
                    total
                }
            };
        } catch (error: any) {
            console.error('[GET /api/admin/mail-items] error:', error);
            throw error;
        }
    })();

    inflight.set(key, exec);
    try {
        const result = await exec;
        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    } finally {
        setTimeout(() => inflight.delete(key), COALESCE_TTL_MS);
    }
});

/**
 * GET /api/admin/mail-items/:id
 * Get specific mail item (admin only)
 */
router.get('/mail-items/:id', requireAdmin, async (req: Request, res: Response) => {
    const mailId = parseInt(req.params.id);
    const pool = getPool();

    if (!mailId) {
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
                f.size as file_size,
                f.web_url as file_url,
                f.mime as file_mime
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.id = $1
        `, [mailId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/admin/mail-items/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PUT /api/admin/mail-items/:id
 * Update mail item (admin only)
 */
router.put('/mail-items/:id', requireAdmin, async (req: Request, res: Response) => {
    const mailId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const {
        status,
        subject,
        sender_name,
        tag,
        notes,
        forwarding_status
    } = req.body;

    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (typeof status === 'string') {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (typeof subject === 'string') {
            updates.push(`subject = $${paramIndex++}`);
            values.push(subject);
        }

        if (typeof sender_name === 'string') {
            updates.push(`sender_name = $${paramIndex++}`);
            values.push(sender_name);
        }

        if (typeof tag === 'string') {
            updates.push(`tag = $${paramIndex++}`);
            values.push(tag);
        }

        if (typeof notes === 'string') {
            updates.push(`notes = $${paramIndex++}`);
            values.push(notes);
        }

        if (typeof forwarding_status === 'string') {
            updates.push(`forwarding_status = $${paramIndex++}`);
            values.push(forwarding_status);
        }

        updates.push(`updated_by = $${paramIndex++}`);
        values.push(adminId);

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(Date.now());

        values.push(mailId);

        if (updates.length === 2) { // Only updated_by and updated_at
            return res.status(400).json({ ok: false, error: 'no_changes' });
        }

        const result = await pool.query(
            `UPDATE mail_item SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'update_mail_item', 'mail_item', $2, $3, $4)
        `, [adminId, mailId, JSON.stringify(req.body), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PUT /api/admin/mail-items/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/admin/mail-items/:id/log-physical-dispatch
 * Log physical dispatch for mail item (admin only)
 */
router.post('/mail-items/:id/log-physical-dispatch', requireAdmin, async (req: Request, res: Response) => {
    const mailId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { tracking_number, courier, dispatched_at } = req.body;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Build dispatch notes
        const dispatchNotes = [
            'Physically dispatched',
            tracking_number ? `Tracking: ${tracking_number}` : '',
            courier ? `Courier: ${courier}` : '',
            dispatched_at ? `Dispatched at: ${new Date(dispatched_at).toISOString()}` : ''
        ].filter(Boolean).join('\n');

        const result = await pool.query(`
            UPDATE mail_item
            SET
                forwarded_physically = true,
                status = 'dispatched',
                notes = COALESCE(notes, '') || $1,
                updated_by = $2,
                updated_at = $3
            WHERE id = $4
            RETURNING *
        `, ['\n' + dispatchNotes, adminId, Date.now(), mailId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const mail = result.rows[0];

        // Create notification for user
        await pool.query(`
            INSERT INTO notification (user_id, type, title, body, read, created_at)
            VALUES ($1, 'mail_dispatched', 'Mail Dispatched', $2, false, $3)
        `, [
            mail.user_id,
            `Your mail has been physically dispatched${tracking_number ? ` (Tracking: ${tracking_number})` : ''}.`,
            Date.now()
        ]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'log_physical_dispatch', 'mail_item', $2, $3, $4)
        `, [adminId, mailId, JSON.stringify({ tracking_number, courier, dispatched_at }), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[POST /api/admin/mail-items/:id/log-physical-dispatch] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
