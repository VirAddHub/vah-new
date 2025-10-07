// src/server/routes/admin-forwarding.ts
// Admin forwarding request management endpoints

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../../middleware/require-admin';
import { adminListForwarding, adminUpdateForwarding } from '../../modules/forwarding/forwarding.admin.controller';
import { getPool } from '../db';
import { sendMailForwarded } from '../../lib/mailer';

const router = Router();

// Rate limiting by admin user ID, not IP
const adminForwardingLimiter = rateLimit({
  windowMs: 10_000, // 10 seconds
  limit: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const u = (req as any).user;
    return u?.id ? `admin:${u.id}` : `ip:${req.ip}`;
  },
  handler: (_req, res) => {
    res.setHeader("Retry-After", "3");
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
        // Add cache headers
        res.set("Cache-Control", "private, max-age=5");
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
            await sendMailForwarded({
                email: user.email,
                name: user.first_name || user.email,
                tracking_number: undefined, // No tracking for completed forwarding
                carrier: undefined, // No carrier for completed forwarding
                cta_url: `${process.env.APP_BASE_URL || 'https://vah-new-frontend-75d6.vercel.app'}/mail`
            });
        } catch (emailError) {
            console.error('[admin-forwarding-complete] Email failed:', emailError);
            // Don't rollback - the forwarding is complete, just email failed
        }

        // Commit transaction
        await pool.query('COMMIT');

        return res.json({ 
            ok: true, 
            message: 'Forwarding completed and confirmation email sent',
            data: {
                mail_id: mailItem.id,
                user_email: user.email,
                forwarded_date: forwardedDate.toISOString(),
                email_sent: true
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