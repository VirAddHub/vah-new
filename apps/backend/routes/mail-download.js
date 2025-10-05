const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getPool } = require('../server/db');

const router = express.Router();

/**
 * GET /api/mail-items/:id/download
 * Direct download alias - redirects to signed URL or proxies the file
 */
router.get('/mail-items/:id/download', requireAuth, async (req, res) => {
    const userId = req.user.id;
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
        const expired = mail.expires_at && Date.now() > Number(mail.expires_at);

        if (!mail.web_url) {
            return res.status(404).json({ ok: false, error: 'no_file_url' });
        }

        // Record download in downloads table (optional - table may not exist yet)
        try {
            await pool.query(`
                INSERT INTO download (user_id, file_id, download_url, expires_at, created_at)
                SELECT $1, f.id, $2, $3, $4
                FROM file f
                WHERE f.item_id = $5
            `, [userId, mail.web_url, Date.now() + 3600000, Date.now(), mail.item_id]);
        } catch (downloadError) {
            // Table may not exist yet - log but don't fail the request
            console.warn('[GET /api/mail-items/:id/download] Could not record download (table may not exist):', downloadError.message);
        }

        // Option 1: Redirect to the signed URL (simpler, lets browser handle it)
        if (process.env.DOWNLOAD_REDIRECT_MODE === 'redirect') {
            return res.redirect(302, mail.web_url);
        }

        // Option 2: Proxy the file (more control, but uses more server resources)
        try {
            const fileResponse = await fetch(mail.web_url, {
                headers: {
                    'Authorization': req.headers.authorization || '',
                    'User-Agent': req.headers['user-agent'] || 'VAH-Download-Proxy/1.0'
                }
            });

            if (!fileResponse.ok) {
                return res.status(502).json({ ok: false, error: 'file_fetch_failed' });
            }

            // Set appropriate headers
            const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
            const contentLength = fileResponse.headers.get('content-length');
            const filename = mail.name || `mail_scan_${mailId}.pdf`;

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            if (contentLength) {
                res.setHeader('Content-Length', contentLength);
            }

            // Stream the file
            fileResponse.body.pipe(res);

        } catch (proxyError) {
            console.error('[GET /api/mail-items/:id/download] Proxy error:', proxyError);
            return res.status(502).json({ ok: false, error: 'proxy_failed' });
        }

    } catch (error) {
        console.error('[GET /api/mail-items/:id/download] Error:', error);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

module.exports = router;
