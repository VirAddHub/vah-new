// src/server/routes/admin-users.ts
// Admin user management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';

const router = Router();

// Middleware to require admin
function requireAdmin(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    if (!req.user?.is_admin) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    next();
}

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const { page = '1', limit = '100', search } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 100;
    const offset = (pageNum - 1) * limitNum;

    try {
        let query = `
            SELECT
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.is_admin,
                u.plan_id,
                u.plan_status,
                u.kyc_status,
                u.kyc_verified_at,
                u.company_reg_no,
                u.gocardless_customer_id,
                u.gocardless_mandate_id,
                u.created_at,
                u.updated_at,
                u.deleted_at,
                p.name as plan_name,
                p.price_pence
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
        `;

        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            query += ` WHERE (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Get total count
        const countQuery = search
            ? 'SELECT COUNT(*) FROM "user" WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)'
            : 'SELECT COUNT(*) FROM "user"';
        const countParams = search ? [`%${search}%`] : [];
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return res.json({
            ok: true,
            data: result.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        console.error('[GET /api/admin/users] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/admin/users/:id
 * Get specific user (admin only)
 */
router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const pool = getPool();

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                u.*,
                p.name as plan_name,
                p.price_pence,
                p.billing_cycle
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/admin/users/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (admin only)
 */
router.patch('/users/:id', requireAdmin, async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const pool = getPool();

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const {
        email,
        first_name,
        last_name,
        phone,
        is_admin,
        plan_id,
        plan_status,
        kyc_status,
        company_reg_no
    } = req.body;

    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (typeof email === 'string') {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (typeof first_name === 'string') {
            updates.push(`first_name = $${paramIndex++}`);
            values.push(first_name);
        }
        if (typeof last_name === 'string') {
            updates.push(`last_name = $${paramIndex++}`);
            values.push(last_name);
        }
        if (typeof phone === 'string') {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }
        if (typeof is_admin === 'boolean') {
            updates.push(`is_admin = $${paramIndex++}`);
            values.push(is_admin);
        }
        if (typeof plan_id === 'number') {
            updates.push(`plan_id = $${paramIndex++}`);
            values.push(plan_id);
        }
        if (typeof plan_status === 'string') {
            updates.push(`plan_status = $${paramIndex++}`);
            values.push(plan_status);
        }
        if (typeof kyc_status === 'string') {
            updates.push(`kyc_status = $${paramIndex++}`);
            values.push(kyc_status);
        }
        if (typeof company_reg_no === 'string') {
            updates.push(`company_reg_no = $${paramIndex++}`);
            values.push(company_reg_no);
        }

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(Date.now());

        values.push(userId);

        if (updates.length === 1) { // Only updated_at
            return res.status(400).json({ ok: false, error: 'no_changes' });
        }

        const result = await pool.query(
            `UPDATE "user" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'update_user', 'user', $2, $3, $4)
        `, [adminId, userId, JSON.stringify(req.body), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PATCH /api/admin/users/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete user (admin only)
 */
router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const pool = getPool();

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Soft delete - just mark as deleted
        await pool.query(`
            UPDATE "user"
            SET deleted_at = $1, updated_at = $1
            WHERE id = $2
        `, [Date.now(), userId]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, created_at)
            VALUES ($1, 'delete_user', 'user', $2, $3)
        `, [adminId, userId, Date.now()]);

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[DELETE /api/admin/users/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
