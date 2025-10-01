// src/server/routes/admin-users.ts
// Admin user management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

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
        // Consider user online if active in last 5 minutes
        const onlineThreshold = Date.now() - (5 * 60 * 1000);

        let query = `
            SELECT
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.is_admin,
                u.plan_status,
                u.kyc_status,
                u.created_at,
                u.updated_at,
                u.last_active_at,
                CASE
                    WHEN u.last_active_at > ${onlineThreshold} THEN 'online'
                    ELSE 'offline'
                END as activity_status
            FROM "user" u
        `;

        const params: any[] = [];
        let paramIndex = 1;

        // Filter out soft-deleted users
        let whereClause = 'WHERE u.deleted_at IS NULL';

        if (search) {
            whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ${whereClause} ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Get total count (excluding deleted users)
        const countQuery = search
            ? 'SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL AND (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)'
            : 'SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL';
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
            SELECT u.*
            FROM "user" u
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
        is_admin,
        plan_status,
        kyc_status
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
        if (typeof is_admin === 'boolean') {
            updates.push(`is_admin = $${paramIndex++}`);
            values.push(is_admin);
        }
        if (typeof plan_status === 'string') {
            updates.push(`plan_status = $${paramIndex++}`);
            values.push(plan_status);
        }
        if (typeof kyc_status === 'string') {
            updates.push(`kyc_status = $${paramIndex++}`);
            values.push(kyc_status);
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
