// src/server/routes/mail.ts
// Mail items API endpoints for users

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';
import { extractDrivePathFromSharePointUrl, streamSharePointFileByPath } from '../../services/sharepoint';
import { logger } from '../../lib/logger';
import { safeErrorMessage } from '../../lib/safeError';
import { requireActiveSubscription } from '../../middleware/auth';
import { param } from '../../lib/express-params';

const router = Router();

/**
 * Normalize tag to canonical format (lowercase, underscores, alphanumeric only)
 * Returns null for empty/invalid tags
 * This is the authoritative normalization - frontend normalization is UX only
 */
function normalizeTag(tag: unknown): string | null {
    if (tag === null || tag === undefined) return null;

    const str = String(tag)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');

    return str.length > 0 ? str : null;
}

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

router.use(noCache);
router.use(noConditional);
router.use(requireActiveSubscription);

/**
 * GET /api/mail-items
 * Get all mail items for current user (with pagination support)
 * Query params: ?page=1&pageSize=20&includeArchived=true
 */
router.get('/mail-items', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const includeArchived = req.query.includeArchived === 'true';

    try {
        // Build the query based on whether to include archived items
        const deletedFilter = includeArchived ? '' : 'AND m.deleted = false';

        const result = await selectPaged(
            `SELECT
                m.*,
                COALESCE(f.name, m.subject) as file_name,
                COALESCE(f.size, m.file_size) as file_size,
                COALESCE(f.web_url, m.scan_file_url) as file_url,
                fr.status as forwarding_status,
                CASE 
                    -- GDPR forwarding window: 30 days (see apps/backend/src/config/gdpr.ts - GDPR_FORWARDING_WINDOW_DAYS)
                    -- Uses >= so items on day 30 are blocked
                    WHEN m.received_at_ms IS NOT NULL AND (now() - to_timestamp(m.received_at_ms / 1000)) >= INTERVAL '30 days' THEN true
                    WHEN m.received_date IS NOT NULL AND (now() - m.received_date::timestamptz) >= INTERVAL '30 days' THEN true
                    ELSE false
                END as gdpr_expired
            FROM mail_item m
            LEFT JOIN file f ON m.file_id = f.id
            LEFT JOIN forwarding_request fr ON fr.mail_item_id = m.id AND fr.status IN ('Requested', 'Processing')
            WHERE m.user_id = $1 ${deletedFilter}
            ORDER BY m.created_at DESC`,
            [userId],
            page,
            pageSize
        );

        return res.json({ ok: true, ...result });
    } catch (error: any) {
        logger.error('[mail] list error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * GET /api/mail-items/:id
 * Get specific mail item
 */
router.get('/mail-items/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(param(req, 'id'), 10);
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
                    -- GDPR forwarding window: 30 days (see apps/backend/src/config/gdpr.ts - GDPR_FORWARDING_WINDOW_DAYS)
                    -- Uses >= so items on day 30 are blocked
                    WHEN m.received_at_ms IS NOT NULL AND (now() - to_timestamp(m.received_at_ms / 1000)) >= INTERVAL '30 days' THEN true
                    WHEN m.received_date IS NOT NULL AND (now() - m.received_date::timestamptz) >= INTERVAL '30 days' THEN true
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
        logger.error('[mail] get error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * PATCH /api/mail-items/:id
 * Update mail item (user can update is_read, subject, and tag)
 */
router.patch('/mail-items/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(param(req, 'id'), 10);
    const { is_read, subject, tag } = req.body;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Verify ownership and get current values
        const check = await pool.query(
            'SELECT id, tag FROM mail_item WHERE id = $1 AND user_id = $2',
            [mailId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const currentTag = check.rows[0].tag || null;
        const normalizedNewTag = normalizeTag(tag);

        // Allow updating is_read, subject, tag, and updated_at
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (typeof is_read === 'boolean') {
            updates.push(`is_read = $${paramIndex++}`);
            values.push(is_read);
        }

        if (typeof subject === 'string') {
            updates.push(`subject = $${paramIndex++}`);
            values.push(subject);
        }

        // Handle tag update - only if it's actually different
        if (tag !== undefined) {
            // Check if tag value actually changed
            if (currentTag === normalizedNewTag) {
                // Tag is already set to this value - this is not an error, just no change needed
                // But we still need to check if other fields changed
                if (typeof is_read !== 'boolean' && typeof subject !== 'string') {
                    return res.status(400).json({
                        ok: false,
                        error: 'no_changes',
                        message: 'Tag is already set to this value'
                    });
                }
                // Continue with other updates if any
            } else {
                updates.push(`tag = $${paramIndex++}`);
                values.push(normalizedNewTag);
            }
        }

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(Date.now());

        values.push(mailId);

        if (updates.length === 1) { // Only updated_at
            return res.status(400).json({
                ok: false,
                error: 'no_changes',
                message: 'No fields were provided to update'
            });
        }

        const result = await pool.query(
            `UPDATE mail_item SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('[mail] patch error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/mail-items/:id/tag
 * Add or update tag for mail item
 */
router.post('/mail-items/:id/tag', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(param(req, 'id'), 10);
    const { tag } = req.body;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const normalizedTag = normalizeTag(tag);

    if (normalizedTag === null) {
        return res.status(400).json({ ok: false, error: 'invalid_tag' });
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

        // Update tag
        const result = await pool.query(
            'UPDATE mail_item SET tag = $1, updated_at = $2 WHERE id = $3 RETURNING *',
            [normalizedTag, Date.now(), mailId]
        );

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('[mail] tag error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * DELETE /api/mail-items/:id
 * Archive mail item (soft delete)
 */
router.delete('/mail-items/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(param(req, 'id'), 10);
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

        // Soft delete (archive)
        const result = await pool.query(
            'UPDATE mail_item SET deleted = true, updated_at = $1 WHERE id = $2 RETURNING *',
            [Date.now(), mailId]
        );

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('[mail] delete error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/mail-items/:id/restore
 * Restore archived mail item
 */
router.post('/mail-items/:id/restore', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const mailId = parseInt(param(req, 'id'), 10);
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

        // Restore (unarchive)
        const result = await pool.query(
            'UPDATE mail_item SET deleted = false, updated_at = $1 WHERE id = $2 RETURNING *',
            [Date.now(), mailId]
        );

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('[mail] restore error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * GET /api/mail-items/:id/scan-url
 * Get download URL for mail scan
 */
router.get('/mail-items/:id/scan-url', requireAuth, async (req: Request, res: Response) => {
    try {
        const id = param(req, 'id');
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

            // Avoid logging user_id / IP / URL in production logs. Keep minimal observability only.
            logger.debug('[mail] scan-url audit recorded', { mailItemId: id });
        } catch (downloadError: any) {
            // Table may not exist yet - log but don't fail the request
            logger.warn('[mail] scan-url audit not recorded', { message: downloadError?.message });
        }

        return res.json({
            ok: true,
            url: result.url,
            filename: result.filename,
            expired: false // We can add expiry logic later if needed
        });
    } catch (error: any) {
        logger.error('[mail] scan-url error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
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
        const mailId = Number(param(req, 'id'));
        const disposition = (String(req.query.disposition || "inline") === "attachment") ? "attachment" : "inline";

        // Authorize - get mail item and verify ownership
        const result = await resolveScanUrl(mailId.toString(), userId.toString(), false);
        if (!result.ok) {
            return res.status(result.error === 'not_found' ? 404 : 400).json(result);
        }

        if (!result.url) {
            return res.status(404).json({ ok: false, error: 'no_file_url' });
        }

        logger.debug('[mail] download requested', { mailItemId: mailId, disposition });

        // Extract SharePoint drive path from URL
        const drivePath = extractDrivePathFromSharePointUrl(result.url);
        logger.debug('[mail] drive path extracted', { mailItemId: mailId, ok: Boolean(drivePath) });

        // Stream file from SharePoint via Graph API (pass fileUrl for per-file UPN)
        await streamSharePointFileByPath(res, drivePath, {
            filename: `mail-${mailId}.pdf`,
            disposition,
            fileUrl: result.url,
        });

    } catch (err: any) {
        logger.error('[mail] download error', { message: err?.message });
        if (!res.headersSent) {
            res.status(500).json({ ok: false, error: 'internal_error', message: safeErrorMessage(err) });
        }
    }
});

/**
 * POST /api/tags/rename
 * Atomically rename a tag across all user's mail items
 */
router.post('/tags/rename', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { from, to } = req.body;
    const pool = getPool();

    const normalizedFrom = normalizeTag(from);
    const normalizedTo = normalizeTag(to);

    if (!normalizedFrom) {
        return res.status(400).json({ ok: false, error: 'invalid_from_tag' });
    }

    if (!normalizedTo) {
        return res.status(400).json({ ok: false, error: 'invalid_to_tag' });
    }

    if (normalizedFrom === normalizedTo) {
        return res.status(400).json({ ok: false, error: 'same_tag', message: 'Source and target tags are identical' });
    }

    try {
        // Atomic update - all items with old tag get new tag
        const result = await pool.query(
            `UPDATE mail_item 
             SET tag = $1, updated_at = $2 
             WHERE user_id = $3 AND tag = $4 AND deleted = false
             RETURNING id`,
            [normalizedTo, Date.now(), userId, normalizedFrom]
        );

        return res.json({
            ok: true,
            updated: result.rowCount || 0,
            from: normalizedFrom,
            to: normalizedTo
        });
    } catch (error: any) {
        logger.error('[mail] tag rename error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/tags/merge
 * Atomically merge one tag into another across all user's mail items
 */
router.post('/tags/merge', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { source, target } = req.body;
    const pool = getPool();

    const normalizedSource = normalizeTag(source);
    const normalizedTarget = normalizeTag(target);

    if (!normalizedSource) {
        return res.status(400).json({ ok: false, error: 'invalid_source_tag' });
    }

    if (!normalizedTarget) {
        return res.status(400).json({ ok: false, error: 'invalid_target_tag' });
    }

    if (normalizedSource === normalizedTarget) {
        return res.status(400).json({ ok: false, error: 'same_tag', message: 'Source and target tags are identical' });
    }

    try {
        // Atomic merge - all items with source tag get target tag
        const result = await pool.query(
            `UPDATE mail_item 
             SET tag = $1, updated_at = $2 
             WHERE user_id = $3 AND tag = $4 AND deleted = false
             RETURNING id`,
            [normalizedTarget, Date.now(), userId, normalizedSource]
        );

        return res.json({
            ok: true,
            merged: result.rowCount || 0,
            source: normalizedSource,
            target: normalizedTarget
        });
    } catch (error: any) {
        logger.error('[mail] tag merge error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * GET /api/tags
 * Get list of all tags used by user (distinct, sorted)
 */
router.get('/tags', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(
            `SELECT DISTINCT tag 
             FROM mail_item 
             WHERE user_id = $1 AND deleted = false AND tag IS NOT NULL
             ORDER BY tag`,
            [userId]
        );

        const tags = result.rows.map(row => row.tag);

        return res.json({ ok: true, tags });
    } catch (error: any) {
        logger.error('[mail] tags list error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/tags/delete
 * Delete a tag from all active mail items (archived mail keeps its tag)
 */
router.post('/tags/delete', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { tag } = req.body;
    const pool = getPool();

    const normalizedTag = normalizeTag(tag);

    if (!normalizedTag) {
        return res.status(400).json({ ok: false, error: 'invalid_tag' });
    }

    try {
        const result = await pool.query(
            `UPDATE mail_item 
             SET tag = NULL, updated_at = $1 
             WHERE user_id = $2 AND deleted = false AND tag = $3 
             RETURNING id`,
            [Date.now(), userId, normalizedTag]
        );

        return res.json({ ok: true, updatedCount: result.rowCount });
    } catch (error: any) {
        logger.error('[mail] delete tag error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});


export default router;
