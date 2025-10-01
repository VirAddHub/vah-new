// src/server/routes/mail.ts
// Mail items API endpoints for users

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
 * GET /api/mail-items
 * Get all mail items for current user
 */
router.get('/mail-items', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                m.*,
                f.name as file_name,
                f.size as file_size,
                f.web_url as file_url
            FROM mail_item m
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.user_id = $1 AND m.deleted = false
            ORDER BY m.created_at DESC
        `, [userId]);

        return res.json({ ok: true, data: result.rows });
    } catch (error: any) {
        console.error('[GET /api/mail-items] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/mail-items/:id
 * Get specific mail item
 */
router.get('/mail-items/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id);
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                m.*,
                f.name as file_name,
                f.size as file_size,
                f.web_url as file_url,
                f.mime as file_mime
            FROM mail_item m
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.id = $1 AND m.user_id = $2
        `, [mailId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/mail-items/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/mail-items/:id
 * Update mail item (user can only mark as read)
 */
router.patch('/mail-items/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id);
    const { is_read } = req.body;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Verify ownership
        const check = await pool.query(
            'SELECT id FROM mail_item WHERE id = $1 AND user_id = $2',
            [mailId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        // Only allow updating is_read and updated_at
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (typeof is_read === 'boolean') {
            updates.push(`is_read = $${paramIndex++}`);
            values.push(is_read);
        }

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(Date.now());

        values.push(mailId);

        if (updates.length === 1) { // Only updated_at
            return res.status(400).json({ ok: false, error: 'no_changes' });
        }

        const result = await pool.query(
            `UPDATE mail_item SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PATCH /api/mail-items/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/mail-items/:id/scan-url
 * Get download URL for mail scan
 */
router.get('/mail-items/:id/scan-url', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id);
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                m.id,
                m.user_id,
                m.expires_at,
                f.web_url,
                f.name,
                f.item_id
            FROM mail_item m
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.id = $1 AND m.user_id = $2
        `, [mailId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const mail = result.rows[0];

        // Check if mail has expired (for downloads, we're more lenient than forwarding)
        // Allow downloads even after expiry, but warn
        const expired = mail.expires_at && Date.now() > Number(mail.expires_at);

        if (!mail.web_url) {
            return res.status(404).json({ ok: false, error: 'no_file_url' });
        }

        // Record download in downloads table
        await pool.query(`
            INSERT INTO download (user_id, file_id, download_url, expires_at, created_at)
            SELECT $1, f.id, $2, $3, $4
            FROM file f
            WHERE f.item_id = $5
        `, [userId, mail.web_url, Date.now() + 3600000, Date.now(), mail.item_id]);

        return res.json({
            ok: true,
            url: mail.web_url,
            expired: expired,
            filename: mail.name || `mail-${mailId}.pdf`
        });
    } catch (error: any) {
        console.error('[GET /api/mail-items/:id/scan-url] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
