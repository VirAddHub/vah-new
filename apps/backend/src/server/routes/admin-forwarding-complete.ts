import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPool } from '../../db/pool';
import { requireAdmin } from '../../middleware/require-admin';
import { sendPostmarkEmail } from '../../lib/postmark';

const router = Router();

const CompleteForwardingSchema = z.object({
    mail_id: z.number().int().positive(),
    forwarded_date: z.string().optional() // ISO string, defaults to now
});

/**
 * POST /api/admin/forwarding/complete
 * Complete a forwarding request and send confirmation email
 */
router.post('/complete', requireAdmin, async (req: Request, res: Response) => {
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
        const emailData = {
            name: user.first_name || user.email,
            forwarding_address: user.forwarding_address,
            forwarded_date: forwardedDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        };

        const emailResult = await sendPostmarkEmail({
            to: user.email,
            template: 'forwarding_completed',
            data: emailData
        });

        if (!emailResult.success) {
            console.error('[admin-forwarding-complete] Email failed:', emailResult.error);
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
                email_sent: emailResult.success
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
