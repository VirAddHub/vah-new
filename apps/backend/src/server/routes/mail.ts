// src/server/routes/mail.ts
// Mail items API endpoints for users

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';

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
 * Download alias - redirects to signed URL or proxies the file
 * Query params:
 * - mode=proxy: Stream file through server (for iframe embedding)
 * - disposition=inline: Set Content-Disposition to inline (default: attachment)
 */
router.get('/mail-items/:id/download', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.is_admin || false;

        // Parse query parameters
        const mode = String(req.query.mode || '');
        const dispositionQ = String(req.query.disposition || '');
        const disposition = dispositionQ === 'inline' ? 'inline' : 'attachment';

        const result = await resolveScanUrl(id, userId.toString(), isAdmin);
        if (!result.ok) {
            return res.status(result.error === 'not_found' ? 404 : 400).json(result);
        }

        res.setHeader('Cache-Control', 'no-store, private');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        // Use proxy mode if explicitly requested or if environment variable is set
        const useProxy = mode === 'proxy' || process.env.DOWNLOAD_REDIRECT_MODE === 'proxy';

        if (!useProxy) {
            // Simple redirect path
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${result.filename.replace(/"/g, '')}"`
            );
            return res.redirect(302, result.url);
        }

        // Proxy mode: stream bytes through server for iframe embedding
        try {
            const fetch = (await import('node-fetch')).default;
            const fileResponse = await fetch(result.url, {
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
            const filename = result.filename;

            // Sanitize filename for safe download
            const safeFilename = makeSafeFilename(filename);

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
            res.setHeader('Cache-Control', 'no-store, private');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

            // Set cross-origin iframe-friendly headers for proxy mode
            const allowedFrames = [
                'https://vah-new-frontend-75d6.vercel.app',
                'https://*.vercel.app'
            ];

            // Remove restrictive headers that would block cross-origin iframe embedding
            res.removeHeader('X-Frame-Options');
            res.removeHeader('Cross-Origin-Opener-Policy');

            // Allow cross-origin embedding
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

            // Minimal CSP that allows Vercel to frame this response
            res.setHeader(
                'Content-Security-Policy',
                [
                    "default-src 'none'",
                    `frame-ancestors 'self' ${allowedFrames.join(' ')}`
                ].join('; ')
            );
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

/**
 * Helper function to make safe filenames for Content-Disposition headers
 */
function makeSafeFilename(name: string): string {
    return name.replace(/[^\w.\- ]+/g, '_').slice(0, 140);
}

export default router;
