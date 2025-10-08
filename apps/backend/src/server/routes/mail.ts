// src/server/routes/mail.ts
// Mail items API endpoints for users

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';
import { extractDrivePathFromSharePointUrl, streamSharePointFileByPath } from '../../services/sharepoint';

const router = Router();

/** Resolve a downloadable URL for a mail item, regardless of source - Fixed SQL query */
async function resolveScanUrl(mailId: string, userId: string, isAdmin: boolean = false) {
    const pool = getPool();

    // Authorization: owner or admin
    const params: any[] = [mailId];
    let where = `m.id = $1`;
    if (!isAdmin) {
        params.push(userId);
        where += ` AND m.user_id = $2`;
    }

    const result = await pool.query(`
        SELECT
            m.id,
            m.user_id,
            -- Check file table first, then webhook columns on the mail_item row
            COALESCE(f.web_url, m.scan_file_url) AS url,
            COALESCE(f.name, m.subject) AS filename
        FROM mail_item m
        LEFT JOIN file f ON f.id = m.file_id
        WHERE ${where}
    `, params);

    if (result.rows.length === 0) {
        return { ok: false as const, error: 'not_found' };
    }

    const row = result.rows[0];
    if (!row.url) {
        return { ok: false as const, error: 'no_file_url' };
    }

    return {
        ok: true as const,
        url: row.url as string,
        filename: (row.filename ?? `mail_item_${mailId}.pdf`) as string,
    };
}

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

// Middleware to disable caching for mail endpoints
function noCache(req: Request, res: Response, next: Function) {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Authorization'); // avoid shared cache collisions
    next();
}

// Middleware to disable conditional requests (ETags, If-Modified-Since)
function noConditional(req: Request, res: Response, next: Function) {
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];
    next();
}

// Apply no-cache and no-conditional middlewares to all mail routes
router.use(noCache);
router.use(noConditional);

/**
 * GET /api/mail-items
 * Get all mail items for current user (with pagination support)
 * Query params: ?page=1&pageSize=20
 */
router.get('/mail-items', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    try {
        const result = await selectPaged(
            `SELECT
                m.*,
                COALESCE(f.name, m.subject) as file_name,
                COALESCE(f.size, m.file_size) as file_size,
                COALESCE(f.web_url, m.scan_file_url) as file_url,
                CASE 
                    WHEN m.received_at_ms IS NOT NULL AND (EXTRACT(EPOCH FROM now()) * 1000 - m.received_at_ms) > (30 * 24 * 60 * 60 * 1000) THEN true
                    WHEN m.received_date IS NOT NULL AND (EXTRACT(EPOCH FROM now()) * 1000 - EXTRACT(EPOCH FROM m.received_date::timestamptz) * 1000) > (30 * 24 * 60 * 60 * 1000) THEN true
                    ELSE false
                END as gdpr_expired
            FROM mail_item m
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.user_id = $1 AND m.deleted = false
            ORDER BY m.created_at DESC`,
            [userId],
            page,
            pageSize
        );

        return res.json({ ok: true, ...result });
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
                f.mime as file_mime,
                CASE 
                    WHEN m.received_at_ms IS NOT NULL AND (EXTRACT(EPOCH FROM now()) * 1000 - m.received_at_ms) > (30 * 24 * 60 * 60 * 1000) THEN true
                    WHEN m.received_date IS NOT NULL AND (EXTRACT(EPOCH FROM now()) * 1000 - EXTRACT(EPOCH FROM m.received_date::timestamptz) * 1000) > (30 * 24 * 60 * 60 * 1000) THEN true
                    ELSE false
                END as gdpr_expired
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
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.is_admin || false;

        const result = await resolveScanUrl(id, userId.toString(), isAdmin);
        if (!result.ok) {
            return res.status(result.error === 'not_found' ? 404 : 400).json(result);
        }

        // no-store so the signed/temporary URLs aren't cached
        res.setHeader('Cache-Control', 'no-store, private');

        // Record download in downloads table (optional - table may not exist yet)
        try {
            const pool = getPool();
            await pool.query(`
                INSERT INTO download (user_id, file_id, download_url, expires_at, created_at, ip_address, user_agent)
                SELECT $1, f.id, $2, $3, $4, $5, $6
                FROM file f
                WHERE f.item_id = $7
            `, [
                userId,
                result.url,
                Date.now() + 3600000,
                Date.now(),
                req.ip || req.headers['x-forwarded-for'] || 'unknown',
                req.headers['user-agent'] || 'unknown',
                id
            ]);

            // Log successful scan URL request for audit
            console.log(`[SCAN-URL AUDIT] user_id=${userId}, mail_item_id=${id}, action=scan_url_request, ip=${req.ip || 'unknown'}`);
        } catch (downloadError: any) {
            // Table may not exist yet - log but don't fail the request
            console.warn('[GET /api/mail-items/:id/scan-url] Could not record download (table may not exist):', downloadError.message);
        }

        return res.json({
            ok: true,
            url: result.url,
            filename: result.filename,
            expired: false // We can add expiry logic later if needed
        });
    } catch (error: any) {
        console.error('[GET /api/mail-items/:id/scan-url] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/mail-items/:id/download
 * Stream file from SharePoint via Microsoft Graph (app-only authentication)
 * Only authenticated VAH users who own the mail can access it
 * Query params:
 * - disposition=inline: Set Content-Disposition to inline (default: attachment)
 */
router.get('/mail-items/:id/download', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const mailId = Number(req.params.id);
        const disposition = (String(req.query.disposition || "inline") === "attachment") ? "attachment" : "inline";

        // Authorize - get mail item and verify ownership
        const result = await resolveScanUrl(mailId.toString(), userId.toString(), false);
        if (!result.ok) {
            return res.status(result.error === 'not_found' ? 404 : 400).json(result);
        }

        if (!result.url) {
            return res.status(404).json({ ok: false, error: 'no_file_url' });
        }

        // Debug logging
        console.log(`[DOWNLOAD DEBUG] Mail ID: ${mailId}, User ID: ${userId}`);
        console.log(`[DOWNLOAD DEBUG] File URL: ${result.url}`);
        console.log(`[DOWNLOAD DEBUG] Filename: ${result.filename}`);

        // Extract SharePoint drive path from URL
        const drivePath = extractDrivePathFromSharePointUrl(result.url);
        console.log(`[DOWNLOAD DEBUG] Extracted drive path: ${drivePath}`);

        // Stream file from SharePoint via Graph API (pass fileUrl for per-file UPN)
        await streamSharePointFileByPath(res, drivePath, {
            filename: `mail-${mailId}.pdf`,
            disposition,
            fileUrl: result.url,
        });

    } catch (err: any) {
        console.error('[GET /api/mail-items/:id/download] Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: 'internal_error', message: err.message });
        }
    }
});


export default router;
