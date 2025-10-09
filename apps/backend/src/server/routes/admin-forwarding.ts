// src/server/routes/admin-forwarding.ts
// Admin forwarding request management endpoints

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { requireAdmin } from '../../middleware/require-admin';
import { adminListForwarding, adminUpdateForwarding } from '../../modules/forwarding/forwarding.admin.controller';
import { getPool } from '../db';
import { sendMailForwarded } from '../../lib/mailer';
import { concurrencyService } from '../services/concurrency';

const router = Router();

// Request deduplication cache to prevent multiple identical requests
const requestCache = new Map<string, { timestamp: number; response: any }>();
const CACHE_TTL = 2000; // 2 seconds

// Rate limiting by admin user ID, not IP - admin-friendly limits
const adminForwardingLimiter = rateLimit({
    windowMs: 10_000, // 10 seconds
    limit: 20, // 20 requests per 10 seconds (allows for admin dashboard usage)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as any).user;
        return u?.id ? `admin:${u.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
        res.setHeader("Retry-After", "5");
        return res.status(429).json({ ok: false, error: "rate_limited" });
    },
});

// Apply admin auth to all routes
router.use(requireAdmin);

// GET /api/admin/forwarding/requests?status=Requested&q=...&limit=50&offset=0
router.get('/forwarding/requests',
    adminForwardingLimiter,
    (req, res, next) => {
        console.log('[admin-forwarding] GET /forwarding/requests called');
        console.log('[admin-forwarding] User:', req.user);

        // Request deduplication - check if we have a recent identical request
        const cacheKey = `${req.user?.id}-${req.url}`;
        const now = Date.now();
        const cached = requestCache.get(cacheKey);

        if (cached && (now - cached.timestamp) < CACHE_TTL) {
            console.log('[admin-forwarding] Returning cached response for deduplication');
            return res.json(cached.response);
        }

        // Add cache headers
        res.setHeader("Cache-Control", "private, max-age=5");
        next();
    },
    async (req, res, next) => {
        // Wrap the original handler to cache the response
        const originalSend = res.json;
        const cacheKey = `${req.user?.id}-${req.url}`;

        res.json = function (data: any) {
            const now = Date.now();

            // Cache the response for deduplication
            requestCache.set(cacheKey, {
                timestamp: now,
                response: data
            });

            // Clean up old cache entries
            for (const [key, value] of requestCache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    requestCache.delete(key);
                }
            }

            return originalSend.call(this, data);
        };

        next();
    },
    adminListForwarding
);

// PATCH /api/admin/forwarding/requests/:id  { action, courier?, tracking_number?, admin_notes? }
router.patch('/forwarding/requests/:id', adminUpdateForwarding);

const CompleteForwardingSchema = z.object({
    mail_id: z.number().int().positive(),
    forwarded_date: z.string().optional() // ISO string, defaults to now
});

// POST /api/admin/forwarding/complete
router.post('/forwarding/complete', async (req: Request, res: Response) => {
    const admin = req.user;
    if (!admin) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const parse = CompleteForwardingSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({
            ok: false,
            error: 'invalid_body',
            details: parse.error.flatten()
        });
    }

    const { mail_id, forwarded_date } = parse.data;
    const pool = getPool();

    try {
        // Start transaction
        await pool.query('BEGIN');

        // 1. Update mail item status
        const forwardedDate = forwarded_date ? new Date(forwarded_date) : new Date();
        const forwardedTimestamp = forwardedDate.getTime();

        const updateMailResult = await pool.query(`
            UPDATE mail_items 
            SET status = 'forwarded', forwarded_date = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, user_id, subject
        `, [forwardedTimestamp, Date.now(), mail_id]);

        if (updateMailResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'mail_item_not_found' });
        }

        const mailItem = updateMailResult.rows[0];

        // 2. Get user info and forwarding address
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name, forwarding_address
            FROM "user" 
            WHERE id = $1
        `, [mailItem.user_id]);

        if (userResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];

        if (!user.forwarding_address) {
            await pool.query('ROLLBACK');
            return res.status(400).json({
                ok: false,
                error: 'no_forwarding_address',
                message: 'User has no forwarding address configured'
            });
        }

        // 3. Archive/delete the forwarding request
        await pool.query(`
            DELETE FROM forwarding_request 
            WHERE mail_item_id = $1
        `, [mail_id]);

        // 4. Send confirmation email
        try {
            // Get the forwarding address from the request
            const addressQuery = await pool.query(`
                SELECT to_name, address1, address2, city, state, postal, country
                FROM forwarding_request
                WHERE mail_item_id = $1
            `, [mail_id]);

            let forwarding_address = 'Your forwarding address';
            if (addressQuery.rows.length > 0) {
                const addr = addressQuery.rows[0];
                const parts = [
                    addr.to_name,
                    addr.address1,
                    addr.address2,
                    addr.city,
                    addr.state,
                    addr.postal,
                    addr.country
                ].filter(Boolean);
                forwarding_address = parts.join(', ');
            }

            await sendMailForwarded({
                email: user.email,
                name: user.first_name || user.email,
                forwarding_address: forwarding_address,
                forwarded_date: new Date().toLocaleDateString('en-GB')
            });
        } catch (emailError) {
            console.error('[admin-forwarding-complete] Email failed:', emailError);
            // Don't rollback - the forwarding is complete, just email failed
        }

        // 5. Record usage charges
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const yyyymm = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

        // Forwarding charge: £2.00 (200 pence)
        await pool.query(`
            INSERT INTO usage_charges (user_id, period_yyyymm, amount_pence, qty, description, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.id, yyyymm, 200, 1, 'Mail forwarding', Date.now()]);

        // Commit transaction
        await pool.query('COMMIT');

        return res.json({
            ok: true,
            message: 'Forwarding completed and confirmation email sent',
            data: {
                mail_id: mailItem.id,
                user_email: user.email,
                forwarded_date: forwardedDate.toISOString(),
                email_sent: true,
                usage_charged: 200 // pence
            }
        });

    } catch (error: any) {
        await pool.query('ROLLBACK');
        console.error('[admin-forwarding-complete] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

export default router;