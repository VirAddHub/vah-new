// src/server/routes/admin-mail-items.ts
// Admin mail items management endpoints

import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Rate limiting for admin mail items - more generous for admin usage
const adminMailItemsLimiter = rateLimit({
    windowMs: 10_000, // 10 seconds
    limit: 30, // 30 requests per 10 seconds (more generous than forwarding)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as any).user;
        return u?.id ? `admin:${u.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
        res.setHeader("Retry-After", "3");
        return res.status(429).json({ ok: false, error: "rate_limited" });
    },
});

// Request coalescing cache to prevent duplicate requests
type Key = string;
const inflight = new Map<Key, Promise<any>>();
const COALESCE_TTL_MS = 2_000; // Reduced to 2 seconds for faster response

function keyFrom(req: Request): Key {
    const u = (req as any).user;
    const id = u?.id ?? "anon";
    // Normalize query params by sorting to handle different ordering
    const sortedQuery = Object.entries(req.query as Record<string, string>).sort();
    const qp = new URLSearchParams(sortedQuery).toString();
    return `${id}:${req.path}?${qp}`;
}

/**
 * GET /api/admin/mail-items
 * Get all mail items (admin only)
 */
router.get('/mail-items', requireAdmin, adminMailItemsLimiter, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, max-age=5");

    const key = keyFrom(req);
    if (inflight.has(key)) {
        console.log(`[admin-mail-items] Coalescing request for key: ${key}`);
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
                m.id,
                m.user_id,
                m.subject,
                m.sender_name,
                m.tag,
                m.status,
                m.forwarding_status,
                m.created_at,
                m.received_date,
                m.received_at_ms,
                m.scanned,
                m.deleted,
                m.file_size,
                m.scan_file_url,
                m.physical_destruction_date,
                m.expires_at,
                u.email as user_email,
                u.first_name,
                u.last_name,
                f.name as file_name,
                f.size as file_size,
                f.web_url as file_url,
                -- Calculate days until/past 30-day expiry
                -- Use received_at_ms first (most accurate), then received_date, then created_at as fallback
                CASE 
                    WHEN m.received_at_ms IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days' - now())) / 86400
                    WHEN m.received_date IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (m.received_date::timestamptz + INTERVAL '30 days' - now())) / 86400
                    WHEN m.created_at IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (to_timestamp(m.created_at / 1000) + INTERVAL '30 days' - now())) / 86400
                    ELSE NULL
                END as days_until_deletion,
                -- Check if past 30 days (same fallback logic)
                -- Uses >= so items on day 30 are considered past 30 days
                CASE 
                    WHEN m.received_at_ms IS NOT NULL AND (now() - to_timestamp(m.received_at_ms / 1000)) >= INTERVAL '30 days' THEN true
                    WHEN m.received_date IS NOT NULL AND (now() - m.received_date::timestamptz) >= INTERVAL '30 days' THEN true
                    WHEN m.created_at IS NOT NULL AND (now() - to_timestamp(m.created_at / 1000)) >= INTERVAL '30 days' THEN true
                    ELSE false
                END as past_30_days
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.deleted = false
            AND (
                -- Include scanned items OR items with files OR items with scan URLs
                (m.scanned = true OR m.scan_file_url IS NOT NULL OR f.id IS NOT NULL)
                -- OR include items that have dates (even if not marked scanned) - they might need destruction
                OR (m.received_at_ms IS NOT NULL OR m.received_date IS NOT NULL OR m.created_at IS NOT NULL)
            )
            AND (m.received_at_ms IS NOT NULL OR m.received_date IS NOT NULL OR m.created_at IS NOT NULL)
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
                items: result.rows,
                total: total,
                data: result.rows, // Keep for backward compatibility
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
                f.mime as file_mime,
                -- Get admin who marked as destroyed
                admin_user.email as destroyed_by_email,
                admin_user.first_name as destroyed_by_first_name,
                admin_user.last_name as destroyed_by_last_name,
                admin_audit.created_at as destroyed_by_at
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            LEFT JOIN admin_audit ON admin_audit.target_type = 'mail_item' 
                AND admin_audit.target_id = m.id 
                AND admin_audit.action = 'physical_destruction_confirmed'
            LEFT JOIN "user" admin_user ON admin_user.id = admin_audit.admin_id
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

/**
 * POST /api/admin/mail-items/:id/mark-destroyed
 * Mark physical mail as destroyed (admin only)
 * Required for HMRC AML compliance - tracks physical destruction confirmation
 */
router.post('/mail-items/:id/mark-destroyed', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const pool = getPool();

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Update mail item with destruction date
        // Use NOW() for database-generated timestamp (audit-safe, timezone-safe)
        const updateResult = await pool.query(
            `
            UPDATE mail_item
            SET physical_destruction_date = NOW(),
                updated_at = $1
            WHERE id = $2
            RETURNING id, user_id, physical_destruction_date
            `,
            [Date.now(), parseInt(id)]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'mail_item_not_found' });
        }

        // Get the database-generated timestamp for audit logs
        const destroyedAt = updateResult.rows[0].physical_destruction_date;

        // Log admin audit record
        // Use database-generated timestamp for consistency
        await pool.query(
            `
            INSERT INTO admin_audit (
                admin_id,
                action,
                target_type,
                target_id,
                details,
                created_at
            )
            VALUES ($1, 'physical_destruction_confirmed', 'mail_item', $2, $3, NOW())
            `,
            [
                adminId,
                parseInt(id),
                JSON.stringify({
                    destroyed_at: destroyedAt ? new Date(destroyedAt).toISOString() : new Date().toISOString(),
                    method: 'secure_shredding',
                }),
            ]
        );

        // Log in mail_event for additional audit trail
        // Use database-generated timestamp for consistency
        await pool.query(
            `
            INSERT INTO mail_event (
                mail_item,
                actor_user,
                event_type,
                details,
                created_at
            )
            VALUES ($1, $2, 'physical_mail_destroyed', $3, NOW())
            `,
            [
                parseInt(id),
                adminId,
                JSON.stringify({
                    destroyed_at: destroyedAt ? new Date(destroyedAt).toISOString() : new Date().toISOString(),
                }),
            ]
        );

        return res.json({ ok: true, message: 'Physical destruction confirmed' });
    } catch (error: any) {
        console.error('[POST /api/admin/mail-items/:id/mark-destroyed] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'failed_to_mark_physical_destruction',
            message: error.message,
        });
    }
});

export default router;
