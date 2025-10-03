// src/server/routes/profile.ts
// User profile API endpoints

import { Router, Request, Response } from "express";
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
 * GET /api/profile
 * Get current user's profile
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                id,
                email,
                state,
                first_name,
                last_name,
                phone,
                company_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                kyc_status,
                kyc_verified_at_ms,
                kyc_rejection_reason,
                plan_id,
                subscription_status,
                created_at,
                updated_at,
                last_login_at
            FROM user_profile_view
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/profile] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/profile/me (legacy endpoint)
 * Get current user's profile (same as GET /api/profile)
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                id,
                email,
                name,
                phone,
                company_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                kyc_status,
                kyc_verified_at,
                plan_id,
                subscription_status,
                created_at,
                updated_at,
                last_login_at
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: { me: result.rows[0] } });
    } catch (error: any) {
        console.error('[GET /api/profile/me] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/profile
 * Update current user's profile
 */
router.patch("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
        name,
        phone,
        company_name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country
    } = req.body;

    const pool = getPool();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
    }
    if (company_name !== undefined) {
        updates.push(`company_name = $${paramIndex++}`);
        values.push(company_name);
    }
    if (address_line1 !== undefined) {
        updates.push(`address_line1 = $${paramIndex++}`);
        values.push(address_line1);
    }
    if (address_line2 !== undefined) {
        updates.push(`address_line2 = $${paramIndex++}`);
        values.push(address_line2);
    }
    if (city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(city);
    }
    if (state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(state);
    }
    if (postal_code !== undefined) {
        updates.push(`postal_code = $${paramIndex++}`);
        values.push(postal_code);
    }
    if (country !== undefined) {
        updates.push(`country = $${paramIndex++}`);
        values.push(country);
    }

    if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: 'no_updates_provided' });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(Date.now());

    // Add userId for WHERE clause
    values.push(userId);

    try {
        const result = await pool.query(`
            UPDATE "user"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PATCH /api/profile] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
