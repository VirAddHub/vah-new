// src/server/routes/admin-users.ts
// Admin user management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { toDateOrNull, nowMs } from '../helpers/time';

const router = Router();

/**
 * GET /api/admin/users
 * Get all users (admin only)
 * Query params: ?page=1&pageSize=50 (or legacy: limit=50)
 */
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const { page = '1', pageSize, limit = '100', search, status, plan_id, kyc_status, activity } = req.query;

    const pageNum = parseInt(page as string) || 1;
    // Support both pageSize (new) and limit (legacy)
    const limitNum = parseInt((pageSize || limit) as string) || 100;
    const offset = (pageNum - 1) * limitNum;

    try {
        // Consider user online if active in last 5 minutes
        const onlineThreshold = Date.now() - (5 * 60 * 1000);

        const params: any[] = [];
        let paramIndex = 1;

        // Add onlineThreshold as the first parameter
        params.push(onlineThreshold);
        const onlineThresholdParam = `$${paramIndex}`;
        paramIndex++;

        let query = `
            SELECT
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.is_admin,
                u.status,
                u.plan_status,
                u.plan_id,
                u.kyc_status,
                u.created_at,
                u.updated_at,
                u.last_active_at,
                u.last_login_at,
                p.name as plan_name,
                p.interval as plan_interval,
                p.price_pence as plan_price,
                CASE
                    WHEN u.last_active_at IS NULL THEN 'offline'
                    WHEN u.last_active_at > ${onlineThresholdParam} THEN 'online'
                    ELSE 'offline'
                END as activity_status
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
        `;

        // Filter out soft-deleted users
        let whereClause = 'WHERE u.deleted_at IS NULL';

        // Search functionality - now supports ID, email, and name
        if (search) {
            // Check if search is a number (ID search)
            const searchNum = parseInt(String(search));
            if (!isNaN(searchNum)) {
                whereClause += ` AND u.id = $${paramIndex}`;
                params.push(searchNum);
            } else {
                // Text search for email, first_name, last_name
                whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
            }
            paramIndex++;
        }

        // Status filter
        if (status) {
            whereClause += ` AND u.status = $${paramIndex}`;
            params.push(String(status));
            paramIndex++;
        }

        // Plan filter
        if (plan_id) {
            whereClause += ` AND u.plan_id = $${paramIndex}`;
            params.push(parseInt(String(plan_id)));
            paramIndex++;
        }

        // KYC status filter
        if (kyc_status) {
            whereClause += ` AND u.kyc_status = $${paramIndex}`;
            params.push(String(kyc_status));
            paramIndex++;
        }

        // Activity filter
        if (activity) {
            if (activity === 'online') {
                whereClause += ` AND u.last_active_at > $${paramIndex}`;
                params.push(onlineThreshold);
            } else if (activity === 'offline') {
                whereClause += ` AND (u.last_active_at IS NULL OR u.last_active_at <= $${paramIndex})`;
                params.push(onlineThreshold);
            }
            paramIndex++;
        }

        query += ` ${whereClause} ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Get total count with same filters
        let countQuery = 'SELECT COUNT(*) FROM "user" u WHERE u.deleted_at IS NULL';
        const countParams: any[] = [];
        let countParamIndex = 1;

        if (search) {
            const searchNum = parseInt(String(search));
            if (!isNaN(searchNum)) {
                countQuery += ` AND u.id = $${countParamIndex}`;
                countParams.push(searchNum);
            } else {
                countQuery += ` AND (u.email ILIKE $${countParamIndex} OR u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex})`;
                countParams.push(`%${search}%`);
            }
            countParamIndex++;
        }

        if (status) {
            countQuery += ` AND u.status = $${countParamIndex}`;
            countParams.push(String(status));
            countParamIndex++;
        }

        if (plan_id) {
            countQuery += ` AND u.plan_id = $${countParamIndex}`;
            countParams.push(parseInt(String(plan_id)));
            countParamIndex++;
        }

        if (kyc_status) {
            countQuery += ` AND u.kyc_status = $${countParamIndex}`;
            countParams.push(String(kyc_status));
            countParamIndex++;
        }

        if (activity) {
            if (activity === 'online') {
                countQuery += ` AND u.last_active_at > $${countParamIndex}`;
                countParams.push(onlineThreshold);
            } else if (activity === 'offline') {
                countQuery += ` AND (u.last_active_at IS NULL OR u.last_active_at <= $${countParamIndex})`;
                countParams.push(onlineThreshold);
            }
            countParamIndex++;
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        return res.json({
            ok: true,
            items: result.rows,
            total,
            page: pageNum,
            pageSize: limitNum,
            // Legacy pagination object for backwards compatibility
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
 * GET /api/admin/users/stats
 * Get user statistics (admin only)
 * IMPORTANT: This route MUST come before /users/:id to avoid being caught by the :id parameter
 */
router.get('/users/stats', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();

    try {
        // Get total users
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM "user" WHERE deleted_at IS NULL');
        const total = parseInt(totalResult.rows[0].count);

        // Get active users
        const activeResult = await pool.query('SELECT COUNT(*) as count FROM "user" WHERE status = $1 AND deleted_at IS NULL', ['active']);
        const active = parseInt(activeResult.rows[0].count);

        // Get suspended users
        const suspendedResult = await pool.query('SELECT COUNT(*) as count FROM "user" WHERE status = $1 AND deleted_at IS NULL', ['suspended']);
        const suspended = parseInt(suspendedResult.rows[0].count);

        // Get pending users
        const pendingResult = await pool.query('SELECT COUNT(*) as count FROM "user" WHERE status = $1 AND deleted_at IS NULL', ['pending']);
        const pending = parseInt(pendingResult.rows[0].count);

        // Get deleted users
        const deletedResult = await pool.query('SELECT COUNT(*) as count FROM "user" WHERE deleted_at IS NOT NULL');
        const deleted = parseInt(deletedResult.rows[0].count);

        return res.json({
            ok: true,
            data: {
                total,
                active,
                suspended,
                pending,
                deleted
            }
        });
    } catch (error: any) {
        console.error('[GET /api/admin/users/stats] error:', error);
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
        plan_id,
        plan_status,
        kyc_status,
        expires_at,
        last_login_at,
        last_active_at
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
        if (plan_id !== undefined && plan_id !== null) {
            const planIdNum = parseInt(String(plan_id));
            if (!isNaN(planIdNum)) {
                updates.push(`plan_id = $${paramIndex++}`);
                values.push(planIdNum);
                
                // Also update subscription when plan changes
                try {
                    const planCheck = await pool.query(
                        'SELECT id, name, interval, price_pence FROM plans WHERE id = $1 AND active = true',
                        [planIdNum]
                    );
                    
                    if (planCheck.rows.length > 0) {
                        const plan = planCheck.rows[0];
                        
                        // Update or create subscription record
                        const subscriptionResult = await pool.query(
                            'SELECT id FROM subscription WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
                            [userId]
                        );

                        if (subscriptionResult.rows.length > 0) {
                            // Update existing subscription
                            await pool.query(
                                `UPDATE subscription 
                                 SET plan_id = $1, price_pence = $2, updated_at = $3
                                 WHERE user_id = $4 AND id = $5`,
                                [planIdNum, plan.price_pence, nowMs(), userId, subscriptionResult.rows[0].id]
                            );
                        } else {
                            // Create new subscription record
                            await pool.query(
                                `INSERT INTO subscription (user_id, plan_id, price_pence, status, created_at, updated_at)
                                 VALUES ($1, $2, $3, 'active', $4, $4)`,
                                [userId, planIdNum, plan.price_pence, nowMs()]
                            );
                        }
                        
                        console.log(`[Admin] User ${userId} plan changed to: ${plan.name} (${plan.interval})`);
                    }
                } catch (planError) {
                    console.error('[Admin] Failed to update subscription for plan change:', planError);
                    // Don't fail the entire update, just log the error
                }
            }
        }
        if (typeof plan_status === 'string') {
            updates.push(`plan_status = $${paramIndex++}`);
            values.push(plan_status);
        }
        if (typeof kyc_status === 'string') {
            updates.push(`kyc_status = $${paramIndex++}`);
            values.push(kyc_status);
        }

        // Handle timestamp fields with proper date conversion
        const expiresAtDate = toDateOrNull(expires_at);
        if (expiresAtDate !== null) {
            updates.push(`expires_at = $${paramIndex++}`);
            values.push(expiresAtDate);
        }

        const lastLoginAtDate = toDateOrNull(last_login_at);
        if (lastLoginAtDate !== null) {
            updates.push(`last_login_at = $${paramIndex++}`);
            values.push(lastLoginAtDate);
        }

        const lastActiveAtDate = toDateOrNull(last_active_at);
        if (lastActiveAtDate !== null) {
            updates.push(`last_active_at = $${paramIndex++}`);
            values.push(lastActiveAtDate);
        }

        // Always update the updated_at timestamp (use milliseconds for bigint field)
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(nowMs());

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
        const now = Date.now(); // Unix timestamp in milliseconds
        const nowTimestamp = new Date(now).toISOString(); // Convert to ISO timestamp for deleted_at

        // Soft delete - just mark as deleted
        await pool.query(`
            UPDATE "user"
            SET deleted_at = to_timestamp($1/1000.0)::timestamptz, updated_at = $2
            WHERE id = $3
        `, [now, now, userId]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [adminId, 'delete_user', 'user', userId, now]);

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[DELETE /api/admin/users/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
