// src/server/routes/mail-forward.ts
import express, { Request, Response } from 'express';
import { getPool } from '../db';
import fetch from 'node-fetch';

const router = express.Router();

// Audit function for forwarding attempts (PostgreSQL version)
async function auditForward(userId: number, mailId: number, result: string, reason: string | null) {
    try {
        const pool = getPool();
        // Ensure audit table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS forward_audit (
                id SERIAL PRIMARY KEY,
                mail_item_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                result TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS fwd_audit_mail_created ON forward_audit(mail_item_id, created_at DESC);
        `);

        // Insert audit record
        await pool.query(
            `INSERT INTO forward_audit (mail_item_id, user_id, result, reason, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [mailId, userId, result, reason]
        );
    } catch (err) {
        console.error('[auditForward] error:', err);
    }
}

/** POST /api/mail/forward  { mail_item_id, recipient, notes?, adminOverride? } */
router.post('/forward', async (req: Request, res: Response) => {
    const userId = Number(req.user?.id || 0);
    if (!userId) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }

    const { mail_item_id, recipient, notes, adminOverride } = req.body || {};
    const pool = getPool();

    try {
        // Get mail item
        const result = await pool.query(
            `SELECT id, user_id, expires_at FROM mail_item WHERE id = $1`,
            [Number(mail_item_id || 0)]
        );

        const m = result.rows[0];
        if (!m || m.user_id !== userId) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        // Check expiry
        const expired = m.expires_at && Date.now() > new Date(m.expires_at).getTime();

        if (expired && !req.user?.is_admin) {
            await auditForward(userId, m.id, 'blocked', 'expired');
            return res.status(403).json({
                ok: false,
                error: 'expired',
                message: 'Forwarding period has expired for this item.'
            });
        }

        if (expired && req.user?.is_admin && String(adminOverride) !== 'true') {
            await auditForward(userId, m.id, 'blocked', 'admin_override_required');
            return res.status(412).json({ ok: false, error: 'admin_override_required' });
        }

        // Update mail item status
        await pool.query(
            `UPDATE mail_item SET forwarding_status = $1, updated_at = $2 WHERE id = $3`,
            ['Requested', Date.now(), m.id]
        );

        // Audit successful request
        await auditForward(userId, m.id, expired ? 'override' : 'requested', null);

        // Send to webhook (optional)
        const url = process.env.MAKE_FORWARDING_LOG_URL || '';
        if (url) {
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        secret: process.env.MAKE_FORWARDING_LOG_SECRET || '',
                        mailItemId: m.id,
                        userId,
                        recipient,
                        notes: notes || '',
                        timestamp: Date.now()
                    })
                });
            } catch (err) {
                console.error('[mail-forward] webhook error:', err);
            }
        }

        return res.json({ ok: true });
    } catch (error) {
        console.error('[mail-forward] error:', error);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;
