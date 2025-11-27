// src/server/routes/admin-users.ts
// Admin user management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { TimestampUtils } from '../../lib/timestamp-utils';
import { toDateOrNull, nowMs } from '../helpers/time';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const router = Router();

// Admin users rate limiter - very generous for admin dashboard usage
const adminUsersLimiter = rateLimit({
    windowMs: 10_000, // 10 seconds
    limit: 50, // 50 requests per 10 seconds (very generous for admin usage)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as any).user;
        return u?.id ? `admin-users:${u.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
        res.setHeader("Retry-After", "10");
        return res.status(429).json({ ok: false, error: "rate_limited" });
    },
});

/**
 * GET /api/admin/users
 * Get all users (admin only)
 * Query params: ?page=1&pageSize=50 (or legacy: limit=50)
 */
router.get('/users', adminUsersLimiter, requireAdmin, async (req: Request, res: Response) => {
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
                    WHEN u.last_active_at > $1 THEN 'online'
                    ELSE 'offline'
                END as activity_status
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
        `;

        // Filter out soft-deleted users
        let whereClause = 'WHERE u.deleted_at IS NULL';

        // Search functionality - optimized for speed
        if (search) {
            // Check if search is a number (ID search)
            const searchNum = parseInt(String(search));
            if (!isNaN(searchNum)) {
                whereClause += ` AND u.id = $${paramIndex}`;
                params.push(searchNum);
            } else {
                // Simplified search for better performance - use individual field matching
                const searchTerm = String(search).trim();
                whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
                params.push(`%${searchTerm}%`);
            }
            paramIndex++;
        }

        // Status filter (skip if __all__)
        if (status && status !== '__all__') {
            whereClause += ` AND u.status = $${paramIndex}`;
            params.push(String(status));
            paramIndex++;
        }

        // Plan filter (skip if __all__)
        if (plan_id && plan_id !== '__all__') {
            const planIdNum = parseInt(String(plan_id));
            if (!isNaN(planIdNum)) {
                whereClause += ` AND u.plan_id = $${paramIndex}`;
                params.push(planIdNum);
                paramIndex++;
            }
        }

        // KYC status filter (skip if __all__)
        if (kyc_status && kyc_status !== '__all__') {
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
                countParams.push(`%${String(search).trim()}%`);
            }
            countParamIndex++;
        }

        if (status && status !== '__all__') {
            countQuery += ` AND u.status = $${countParamIndex}`;
            countParams.push(String(status));
            countParamIndex++;
        }

        if (plan_id && plan_id !== '__all__') {
            const planIdNum = parseInt(String(plan_id));
            if (!isNaN(planIdNum)) {
                countQuery += ` AND u.plan_id = $${countParamIndex}`;
                countParams.push(planIdNum);
                countParamIndex++;
            }
        }

        if (kyc_status && kyc_status !== '__all__') {
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
 * GET /api/admin/users/search
 * Quick search for users (admin only)
 */
router.get('/users/search', adminUsersLimiter, requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const q = String(req.query.q ?? '').trim();

    if (!q) {
        return res.json({ ok: true, data: [] });
    }

    try {
        const like = `%${q}%`;
        const result = await pool.query(
            `
            SELECT
                id,
                email,
                first_name,
                last_name,
                company_name,
                plan_status,
                kyc_status,
                status
            FROM "user"
            WHERE deleted_at IS NULL
              AND (
                email ILIKE $1
                OR CONCAT_WS(' ', COALESCE(first_name, ''), COALESCE(last_name, '')) ILIKE $1
                OR company_name ILIKE $1
              )
            ORDER BY id ASC
            LIMIT 20
            `,
            [like]
        );

        return res.json({ ok: true, data: result.rows });
    } catch (error: any) {
        console.error('[GET /api/admin/users/search] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message,
        });
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
 * GET /api/admin/users/deleted
 * Get soft-deleted users (admin only)
 */
router.get('/users/deleted', adminUsersLimiter, requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();
    const pageNum = Math.max(1, parseInt(req.query.page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.q as string)?.trim();
    const offset = (pageNum - 1) * limitNum;

    try {
        const params: any[] = [];
        let paramIndex = 1;

        let query = `
            SELECT
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.is_admin,
                'deleted' as status,  -- Override status to show 'deleted' for soft-deleted users
                u.plan_status,
                u.plan_id,
                u.kyc_status,
                u.created_at,
                u.updated_at,
                u.deleted_at,
                u.last_active_at,
                u.last_login_at,
                p.name as plan_name,
                p.interval as plan_interval,
                p.price_pence as plan_price
            FROM "user" u
            LEFT JOIN plans p ON u.plan_id = p.id
        `;

        // Only show soft-deleted users
        let whereClause = 'WHERE u.deleted_at IS NOT NULL';

        // Search functionality - optimized for speed
        if (search) {
            const searchNum = parseInt(String(search));
            if (!isNaN(searchNum)) {
                whereClause += ` AND u.id = $${paramIndex}`;
                params.push(searchNum);
            } else {
                // Simplified search for better performance
                const searchTerm = String(search).trim();
                whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
                params.push(`%${searchTerm}%`);
            }
            paramIndex++;
        }

        query += ` ${whereClause} ORDER BY u.deleted_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Get total count with same filters
        let countQuery = 'SELECT COUNT(*) FROM "user" u WHERE u.deleted_at IS NOT NULL';
        const countParams: any[] = [];
        let countParamIndex = 1;

        if (search) {
            const searchNum = parseInt(String(search));
            if (!isNaN(searchNum)) {
                countQuery += ` AND u.id = $${countParamIndex}`;
                countParams.push(searchNum);
            } else {
                countQuery += ` AND (u.email ILIKE $${countParamIndex} OR u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex})`;
                countParams.push(`%${String(search).trim()}%`);
            }
            countParamIndex++;
        }

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
        console.error('[GET /api/admin/users/deleted] error:', error);
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
        // Get current user state to detect KYC status transition
        let previousKycStatus: string | null = null;
        if (typeof kyc_status === 'string') {
            const currentUser = await pool.query('SELECT kyc_status, companies_house_verified FROM "user" WHERE id = $1', [userId]);
            if (currentUser.rows.length > 0) {
                previousKycStatus = currentUser.rows[0].kyc_status || null;
            }
        }

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
                                 SET plan_name = $1, updated_at = $2
                                 WHERE user_id = $3 AND id = $4`,
                                [plan.name, TimestampUtils.forTableField('subscription', 'updated_at'), userId, subscriptionResult.rows[0].id]
                            );
                        } else {
                            // Create new subscription record
                            await pool.query(
                                `INSERT INTO subscription (user_id, plan_name, cadence, status, created_at, updated_at)
                                 VALUES ($1, $2, $3, 'active', $4, $5)`,
                                [userId, plan.name, plan.interval, TimestampUtils.forTableField('subscription', 'created_at'), TimestampUtils.forTableField('subscription', 'updated_at')]
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

            // Set kyc_approved_at when transitioning to approved
            if (kyc_status === 'approved' && previousKycStatus !== 'approved') {
                updates.push(`kyc_approved_at = $${paramIndex++}`);
                values.push(new Date().toISOString());
            }
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
        values.push(TimestampUtils.forTableField('user', 'updated_at'));

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
        `, [adminId, userId, JSON.stringify(req.body), TimestampUtils.forTableField('admin_audit', 'created_at')]);

        // Send KYC approved email if KYC just became approved
        if (typeof kyc_status === 'string' && kyc_status === 'approved' && previousKycStatus !== 'approved') {
            const updatedUser = result.rows[0];
            if (updatedUser && updatedUser.email) {
                // Fire-and-forget email send
                import('../../lib/mailer').then(({ sendKycApproved }) => {
                    const userName = updatedUser.first_name 
                        ? `${updatedUser.first_name}${updatedUser.last_name ? ' ' + updatedUser.last_name : ''}`
                        : updatedUser.email?.split('@')[0] || 'there';
                    
                    sendKycApproved({
                        email: updatedUser.email,
                        name: userName,
                    }).catch((err) => {
                        console.error('[Admin] Failed to send KYC approved email:', err);
                    });
                }).catch((err) => {
                    console.error('[Admin] Failed to import mailer:', err);
                });
            }
        }

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
        // Use TimestampUtils for proper timestamp handling
        const nowTimestamp = TimestampUtils.forTableField('user', 'deleted_at');
        const nowBigint = TimestampUtils.forTableField('user', 'updated_at');
        const auditTimestamp = TimestampUtils.forTableField('admin_audit', 'created_at');

        // Soft delete - just mark as deleted
        await pool.query(`
            UPDATE "user"
            SET deleted_at = $1, updated_at = $2
            WHERE id = $3
        `, [nowTimestamp, nowBigint, userId]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [adminId, 'delete_user', 'user', userId, auditTimestamp]);

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[DELETE /api/admin/users/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/admin/users/:id/restore
 * Restore soft-deleted user (admin only)
 */
router.post('/users/:id/restore', requireAdmin, async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const pool = getPool();

    if (!userId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const { email, first_name, last_name, reactivate = true } = req.body || {};

    if (!email?.trim()) {
        return res.status(400).json({ ok: false, error: 'email_required' });
    }

    try {
        // Check if user exists and is deleted
        const userResult = await pool.query(`
            SELECT id, email, deleted_at FROM "user" WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];
        if (!user.deleted_at) {
            return res.status(400).json({ ok: false, error: 'user_not_deleted' });
        }

        // Check if email is already taken by another user
        const emailCheck = await pool.query(`
            SELECT id FROM "user" WHERE email = $1 AND id != $2 AND deleted_at IS NULL
        `, [email.trim(), userId]);

        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ ok: false, error: 'email_taken' });
        }

        // Use TimestampUtils for proper timestamp handling
        const nowBigint = TimestampUtils.forTableField('user', 'updated_at');
        const auditTimestamp = TimestampUtils.forTableField('admin_audit', 'created_at');

        // Restore user
        await pool.query(`
            UPDATE "user"
            SET 
                deleted_at = NULL,
                email = $1,
                first_name = $2,
                last_name = $3,
                status = $4,
                updated_at = $5
            WHERE id = $6
        `, [
            email.trim(),
            first_name?.trim() || null,
            last_name?.trim() || null,
            reactivate ? 'active' : 'pending',
            nowBigint,
            userId
        ]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            adminId,
            'restore_user',
            'user',
            userId,
            JSON.stringify({
                restored_email: email.trim(),
                restored_name: `${first_name || ''} ${last_name || ''}`.trim(),
                reactivated: reactivate
            }),
            auditTimestamp
        ]);

        return res.json({
            ok: true,
            message: 'User restored successfully',
            data: {
                id: userId,
                email: email.trim(),
                status: reactivate ? 'active' : 'pending'
            }
        });
    } catch (error: any) {
        console.error('[POST /api/admin/users/:id/restore] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

export default router;
