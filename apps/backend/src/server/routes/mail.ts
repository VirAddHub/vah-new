// src/server/routes/mail.ts
// Mail items API endpoints for users

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';

const router = Router();

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
                COALESCE(f.web_url, m.scan_file_url) as file_url
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
                COALESCE(f.web_url, m.scan_file_url) as web_url,
                COALESCE(f.name, m.subject) as name,
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

        // Record download in downloads table (optional - table may not exist yet)
        try {
            await pool.query(`
                INSERT INTO download (user_id, file_id, download_url, expires_at, created_at, ip_address, user_agent)
                SELECT $1, f.id, $2, $3, $4, $5, $6
                FROM file f
                WHERE f.item_id = $7
            `, [
                userId,
                mail.web_url,
                Date.now() + 3600000,
                Date.now(),
                req.ip || req.headers['x-forwarded-for'] || 'unknown',
                req.headers['user-agent'] || 'unknown',
                mail.item_id
            ]);

            // Log successful scan URL request for audit
            console.log(`[SCAN-URL AUDIT] user_id=${userId}, mail_item_id=${mailId}, action=scan_url_request, ip=${req.ip || 'unknown'}`);
        } catch (downloadError: any) {
            // Table may not exist yet - log but don't fail the request
            console.warn('[GET /api/mail-items/:id/scan-url] Could not record download (table may not exist):', downloadError.message);
        }

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

/**
 * GET /api/mail-items/:id/download
 * Download alias - redirects to signed URL or proxies the file
 */
router.get('/mail-items/:id/download', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(req.params.id);
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Get the mail item and its file info
        const result = await pool.query(`
            SELECT
                m.id,
                m.user_id,
                m.expires_at,
                COALESCE(f.web_url, m.scan_file_url) as web_url,
                COALESCE(f.name, m.subject) as name,
                f.item_id
            FROM mail_item m
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.id = $1 AND m.user_id = $2
        `, [mailId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const mail = result.rows[0];

        if (!mail.web_url) {
            return res.status(404).json({ ok: false, error: 'no_file_url' });
        }

        // Record download in downloads table (optional - table may not exist yet)
        try {
            await pool.query(`
                INSERT INTO download (user_id, file_id, download_url, expires_at, created_at, ip_address, user_agent)
                SELECT $1, f.id, $2, $3, $4, $5, $6
                FROM file f
                WHERE f.item_id = $7
            `, [
                userId,
                mail.web_url,
                Date.now() + 3600000,
                Date.now(),
                req.ip || req.headers['x-forwarded-for'] || 'unknown',
                req.headers['user-agent'] || 'unknown',
                mail.item_id
            ]);

            // Log successful download for audit
            console.log(`[DOWNLOAD AUDIT] user_id=${userId}, mail_item_id=${mailId}, action=download, ip=${req.ip || 'unknown'}`);
        } catch (downloadError: any) {
            // Table may not exist yet - log but don't fail the request
            console.warn('[GET /api/mail-items/:id/download] Could not record download (table may not exist):', downloadError.message);
        }

        // Option 1: Redirect to the signed URL (simpler, lets browser handle it)
        if (process.env.DOWNLOAD_REDIRECT_MODE === 'redirect') {
            return res.redirect(302, mail.web_url);
        }

        // Option 2: Proxy the file (more control, but uses more server resources)
        try {
            const fetch = (await import('node-fetch')).default;
            const fileResponse = await fetch(mail.web_url, {
                headers: {
                    'Authorization': req.headers.authorization || '',
                    'User-Agent': req.headers['user-agent'] || 'VAH-Download-Proxy/1.0'
                }
            });

            if (!fileResponse.ok) {
                return res.status(502).json({ ok: false, error: 'file_fetch_failed' });
            }

            // Set appropriate headers with hardening
            const contentType = fileResponse.headers.get('content-type') || 'application/pdf';
            const contentLength = fileResponse.headers.get('content-length');
            const filename = mail.name || `mail_scan_${mailId}.pdf`;

            // Sanitize filename for safe download
            const safeFilename = filename.replace(/[^\w\-_\.]/g, '_');

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`);
            res.setHeader('Cache-Control', 'no-store, private');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }

            // Stream the file
            fileResponse.body?.pipe(res);

        } catch (proxyError: any) {
            console.error('[GET /api/mail-items/:id/download] Proxy error:', proxyError);
            return res.status(502).json({ ok: false, error: 'proxy_failed' });
        }

    } catch (error: any) {
        console.error('[GET /api/mail-items/:id/download] Error:', error);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;
