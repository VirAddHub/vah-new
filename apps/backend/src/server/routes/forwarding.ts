// src/server/routes/forwarding.ts
// User-facing forwarding requests API

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';

const router = Router();
const pool = getPool();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

// Helper to normalize tags
const normalizeTag = (tag: string | null | undefined): string =>
    (tag || '').trim().toUpperCase();

/**
 * GET /api/forwarding/requests
 * List all forwarding requests for current user (with pagination support)
 * Query params: ?page=1&pageSize=20
 */
router.get('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    try {
        const result = await selectPaged(
            `SELECT
                mi.id,
                mi.user_id,
                mi.item_id as letter_id,
                mi.sender_name,
                mi.description,
                mi.forwarding_status,
                mi.created_at as received_at,
                mi.updated_at
            FROM mail_item mi
            WHERE mi.user_id = $1 
            AND mi.forwarding_status IS NOT NULL 
            AND mi.forwarding_status != 'No'
            ORDER BY mi.created_at DESC`,
            [userId],
            page,
            pageSize
        );

        return res.json({ ok: true, ...result });
    } catch (error: any) {
        console.error('[GET /api/forwarding/requests] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/forwarding/requests/:id
 * Get specific forwarding request
 */
router.get('/forwarding/requests/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const requestId = parseInt(req.params.id);
    const pool = getPool();

    if (!requestId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                fr.*,
                mi.item_id as letter_id,
                mi.sender_name,
                mi.created_at as received_at
            FROM forwarding_request fr
            LEFT JOIN mail_item mi ON fr.mail_item_id = mi.id
            WHERE fr.id = $1 AND fr.user_id = $2
        `, [requestId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/forwarding/requests/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/forwarding/requests
 * Create new forwarding request
 * Body: { mail_item_id, to_name, address1, address2?, city, state?, postal, country?, reason?, method? }
 * Returns: { ok: true, data: { forwarding_request, pricing, mail_tag, charge_amount } }
 */
router.post('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id as number;
    const {
        mail_item_id,
        to_name,
        address1,
        address2 = null,
        city,
        state = null,
        postal,
        country = 'GB',
        reason = null,
        method = 'standard',
    } = req.body ?? {};

    if (!mail_item_id || !to_name || !address1 || !city || !postal) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    try {
        // 1) Check ownership and fetch tag
        const mail = await pool.query(
            `SELECT id, user_id, tag, expires_at FROM mail_item WHERE id = $1 LIMIT 1`,
            [mail_item_id]
        );
        const row = mail.rows[0];
        if (!row) return res.status(404).json({ ok: false, error: 'Mail item not found' });
        if (row.user_id !== userId) return res.status(403).json({ ok: false, error: 'Not allowed' });

        // Check if mail has expired
        if (row.expires_at && Date.now() > Number(row.expires_at)) {
            return res.status(403).json({ ok: false, error: 'expired', message: 'Forwarding period has expired for this item' });
        }

        const tag = normalizeTag(row.tag);
        const isFree = ['HMRC', 'COMPANIES HOUSE'].includes(tag);

        const now = Date.now();

        // 2) Create forwarding_request
        const fr = await pool.query(
            `INSERT INTO forwarding_request (
                user_id, mail_item_id, to_name,
                address1, address2, city, state, postal, country,
                reason, method, status, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *`,
            [userId, mail_item_id, to_name, address1, address2, city, state, postal, country,
             reason, method, 'pending', now, now]
        );

        // 3) Update mail status
        await pool.query(
            `UPDATE mail_item SET forwarding_status = 'Requested', updated_at = $1 WHERE id = $2`,
            [now, mail_item_id]
        );

        // 4) If not free, mark mail billable & create pending charge (idempotent via unique index)
        if (!isFree) {
            await pool.query(
                `UPDATE mail_item SET is_billable_forward = TRUE WHERE id = $1`,
                [mail_item_id]
            );

            await pool.query(
                `INSERT INTO forwarding_charge (user_id, mail_item_id, amount_pence, status, created_at)
                 VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
                [userId, mail_item_id, 200, 'pending', now]
            );
        }

        return res.json({
            ok: true,
            data: {
                forwarding_request: fr.rows[0],
                pricing: isFree ? 'free' : 'billable_200',
                mail_tag: tag,
                charge_amount: isFree ? 0 : 200,
            },
        });
    } catch (e: any) {
        console.error('[POST /api/forwarding/requests] error:', e);
        return res.status(500).json({ ok: false, error: 'Failed to create forwarding request' });
    }
});

/**
 * POST /api/forwarding/requests/bulk
 * Bulk forward multiple mail items
 */
router.post('/requests/bulk', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { ids } = req.body;
    const pool = getPool();

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ ok: false, error: 'invalid_ids' });
    }

    try {
        const forwarded: number[] = [];
        const errors: any[] = [];

        for (const id of ids) {
            try {
                const mailResult = await pool.query(`
                    SELECT id, user_id
                    FROM mail_item
                    WHERE id = $1 AND user_id = $2 AND deleted = false
                `, [id, userId]);

                if (mailResult.rows.length === 0) {
                    errors.push({ id, error: 'not_found' });
                    continue;
                }

                const mailItem = mailResult.rows[0];

                // Update mail item to mark as forwarding requested
                await pool.query(`
                    UPDATE mail_item
                    SET forwarding_status = $1, updated_at = $2
                    WHERE id = $3
                `, ['Requested', Date.now(), mailItem.id]);

                forwarded.push(id);
            } catch (error: any) {
                errors.push({ id, error: error.message });
            }
        }

        return res.json({ ok: true, forwarded, errors });
    } catch (error: any) {
        console.error('[POST /api/forwarding/requests/bulk] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
