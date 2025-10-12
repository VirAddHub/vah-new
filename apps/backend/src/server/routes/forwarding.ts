// src/server/routes/forwarding.ts
// User-facing forwarding requests API

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { selectPaged } from '../db-helpers';
import { createForwardingRequest } from '../../modules/forwarding/forwarding.service';

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
 * Create new forwarding request using stored forwarding address
 * Body: { mail_item_id, reason?, method? }
 * Returns: { ok: true, data: { forwarding_request, pricing, mail_tag, charge_amount } }
 */
router.post('/forwarding/requests', requireAuth, async (req: Request, res: Response) => {
    // High-signal logging at the top
    console.log('[forwarding] incoming', {
        path: req.path,
        user_id: req.user?.id,
        is_admin: req.user?.is_admin,
        body_keys: Object.keys(req.body || {}),
        mail_item_id: req.body?.mail_item_id,
        method: req.body?.method,
        reason: req.body?.reason
    });

    // DEBUG flag for troubleshooting
    if (process.env.DEBUG_FORWARDING === '1') {
        console.log('[forwarding] debug', {
            user: req.user?.id,
            payload: req.body,
            headers: req.headers
        });
    }

    const userId = req.user!.id as number;
    const { mail_item_id, reason = null, method = 'standard' } = req.body ?? {};

    // Validate payload with clear error codes
    if (!mail_item_id) {
        console.warn('[forwarding] 400 bad payload', { mail_item_id });
        return res.status(400).json({
            ok: false,
            error: 'bad_payload',
            reason: 'missing_mail_item_id',
            message: 'Missing required field: mail_item_id'
        });
    }

    try {
        // Get user's forwarding address
        const userResult = await pool.query(`
            SELECT forwarding_address, first_name, last_name
            FROM "user" 
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            console.warn('[forwarding] 404 user not found', { userId });
            return res.status(404).json({
                ok: false,
                error: 'user_not_found',
                reason: 'user_not_found',
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        if (!user.forwarding_address) {
            console.warn('[forwarding] 400 no forwarding address', { userId });
            return res.status(400).json({
                ok: false,
                error: 'no_forwarding_address',
                reason: 'missing_forwarding_address',
                message: 'Please add your forwarding address in Profile before requesting forwarding.'
            });
        }

        // Parse the stored forwarding address
        const addressLines = user.forwarding_address.split('\n').filter((line: string) => line.trim() !== '');
        const name = addressLines[0] || `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const address1 = addressLines[1] || '';
        const address2 = addressLines[2] || undefined; // Optional second address line
        const cityPostal = addressLines[addressLines.length - 2] || '';
        const country = addressLines[addressLines.length - 1] || 'GB';

        const [city, postal] = cityPostal.split(',').map((s: string) => s.trim());

        // Only require name, address1, city, and postal - address2 is optional
        if (!name || !address1 || !city || !postal) {
            console.warn('[forwarding] 400 invalid forwarding address', {
                userId,
                hasName: !!name,
                hasAddress1: !!address1,
                hasCity: !!city,
                hasPostal: !!postal
            });
            return res.status(400).json({
                ok: false,
                error: 'invalid_forwarding_address',
                reason: 'invalid_forwarding_address',
                message: 'Your forwarding address is incomplete. Please update it in Profile.'
            });
        }

        const result = await createForwardingRequest({
            userId,
            mailItemId: mail_item_id,
            to: {
                name,
                address1,
                address2,
                city,
                postal,
                country,
            },
            reason,
            method,
        });

        return res.json({
            ok: true,
            data: {
                forwarding_request: result,
                pricing: 'billable_200', // Will be determined by service
                mail_tag: 'UNKNOWN', // Will be determined by service
                charge_amount: 200, // Will be determined by service
            },
        });
    } catch (e: any) {
        console.error('[POST /api/forwarding/requests] error:', e);

        // Handle GDPR expiration specifically
        if (e.message && e.message.includes('30 days')) {
            return res.status(403).json({
                ok: false,
                error: 'gdpr_expired',
                message: 'This mail item is older than 30 days and cannot be forwarded due to GDPR compliance. You can still download it.'
            });
        }

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
