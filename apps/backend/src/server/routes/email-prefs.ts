// src/server/routes/email-prefs.ts
// Email preferences API

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/email-prefs
 * Get user's email preferences
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                email_pref_marketing AS marketing,
                email_pref_product AS product,
                email_pref_security AS security,
                email_unsubscribed_at AS "unsubscribedAt",
                email_bounced_at AS "bouncedAt"
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.json({ ok: true, prefs: null });
        }

        return res.json({ ok: true, prefs: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/email-prefs] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/email-prefs
 * Update user's email preferences
 * Body: { marketing?: boolean, product?: boolean, security?: boolean }
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { marketing, product, security } = req.body || {};

    const pool = getPool();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (typeof marketing === 'boolean') {
        updates.push(`email_pref_marketing = $${paramIndex++}`);
        values.push(marketing);
    }
    if (typeof product === 'boolean') {
        updates.push(`email_pref_product = $${paramIndex++}`);
        values.push(product);
    }
    if (typeof security === 'boolean') {
        updates.push(`email_pref_security = $${paramIndex++}`);
        values.push(security);
    }

    if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: 'no_changes' });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(Date.now());

    // Add userId for WHERE clause
    values.push(userId);

    try {
        await pool.query(`
            UPDATE "user"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `, values);

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[POST /api/email-prefs] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
