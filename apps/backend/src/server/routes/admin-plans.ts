// src/server/routes/admin-plans.ts
// Admin plans management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { pricingService } from '../services/pricing';
import { TimestampUtils } from '../../lib/timestamp-utils';
import { param } from '../../lib/express-params';

const router = Router();

/**
 * GET /api/admin/plans
 * Get all plans (admin only)
 */
router.get('/plans', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                slug,
                description,
                price_pence,
                interval,
                currency,
                features_json,
                active,
                vat_inclusive,
                trial_days,
                sort,
                effective_at,
                retired_at,
                created_at,
                updated_at
            FROM plans
            ORDER BY sort ASC, price_pence ASC
        `);

        return res.json({
            ok: true,
            data: result.rows
        });
    } catch (error: any) {
        console.error('[GET /api/admin/plans] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

/**
 * GET /api/admin/plans/:id
 * Get specific plan (admin only)
 */
router.get('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
    const planId = parseInt(param(req, 'id'), 10);
    const pool = getPool();

    if (!planId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT * FROM plans WHERE id = $1
        `, [planId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/admin/plans/:id] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

/**
 * POST /api/admin/plans
 * Create new plan (admin only)
 */
router.post('/plans', requireAdmin, async (req: Request, res: Response) => {
    // Ensure no caching on mutation endpoints
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    const pool = getPool();
    const {
        name,
        slug,
        description,
        price_pence,
        interval,
        currency = 'GBP',
        features_json = '[]',
        active = false,
        vat_inclusive = true,
        trial_days = 0,
        sort = 0
    } = req.body;

    // Validation
    if (!name || !slug || typeof price_pence !== 'number' || !interval) {
        return res.status(400).json({
            ok: false,
            error: 'missing_fields',
            message: 'name, slug, price_pence, and interval are required'
        });
    }

    if (!['month', 'year'].includes(interval)) {
        return res.status(400).json({
            ok: false,
            error: 'invalid_interval',
            message: 'interval must be "month" or "year"'
        });
    }

    try {
        const result = await pool.query(`
            INSERT INTO plans (
                name, slug, description, price_pence, interval,
                currency, features_json, active, vat_inclusive,
                trial_days, sort, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
            RETURNING *
        `, [
            name,
            slug,
            description || null,
            price_pence,
            interval,
            currency,
            typeof features_json === 'string' ? features_json : JSON.stringify(features_json),
            active,
            vat_inclusive,
            trial_days,
            sort,
            new Date().toISOString()
        ]);

        // Clear pricing cache after creating new plan
        pricingService.clearCache();

        return res.status(201).json({
            ok: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('[POST /api/admin/plans] error:', error);

        // Handle unique constraint violation
        if (error.code === '23505') {
            return res.status(400).json({
                ok: false,
                error: 'duplicate_slug',
                message: 'A plan with this slug already exists'
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

/**
 * PATCH /api/admin/plans/:id
 * Update plan (admin only) - Enhanced with comprehensive tracking
 */
router.patch('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
    // Ensure no caching on mutation endpoints
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    const planId = parseInt(param(req, 'id'), 10);
    const adminId = req.user?.id;
    const pool = getPool();

    if (!planId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const {
        name,
        slug,
        description,
        price_pence,
        interval,
        currency,
        features_json,
        active,
        vat_inclusive,
        trial_days,
        sort
    } = req.body;

    try {
        // Start transaction for atomic operations
        await pool.query('BEGIN');

        try {
            // Get current plan data for comparison
            const currentPlanResult = await pool.query(
                'SELECT * FROM plans WHERE id = $1',
                [planId]
            );

            if (currentPlanResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ ok: false, error: 'not_found' });
            }

            const currentPlan = currentPlanResult.rows[0];
            const oldPrice = currentPlan.price_pence;
            const newPrice = price_pence;

            // Build update query
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (typeof name === 'string') {
                updates.push(`name = $${paramIndex++}`);
                values.push(name);
            }
            if (typeof slug === 'string') {
                updates.push(`slug = $${paramIndex++}`);
                values.push(slug);
            }
            if (typeof description === 'string') {
                updates.push(`description = $${paramIndex++}`);
                values.push(description);
            }
            if (typeof price_pence === 'number') {
                updates.push(`price_pence = $${paramIndex++}`);
                values.push(price_pence);
            }
            if (typeof interval === 'string') {
                if (!['month', 'year'].includes(interval)) {
                    await pool.query('ROLLBACK');
                    return res.status(400).json({
                        ok: false,
                        error: 'invalid_interval'
                    });
                }
                updates.push(`interval = $${paramIndex++}`);
                values.push(interval);
            }
            if (typeof currency === 'string') {
                updates.push(`currency = $${paramIndex++}`);
                values.push(currency);
            }
            if (features_json !== undefined) {
                updates.push(`features_json = $${paramIndex++}`);
                values.push(typeof features_json === 'string' ? features_json : JSON.stringify(features_json));
            }
            if (typeof active === 'boolean') {
                updates.push(`active = $${paramIndex++}`);
                values.push(active);
            }
            if (typeof vat_inclusive === 'boolean') {
                updates.push(`vat_inclusive = $${paramIndex++}`);
                values.push(vat_inclusive);
            }
            if (typeof trial_days === 'number') {
                updates.push(`trial_days = $${paramIndex++}`);
                values.push(trial_days);
            }
            if (typeof sort === 'number') {
                updates.push(`sort = $${paramIndex++}`);
                values.push(sort);
            }

            if (updates.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ ok: false, error: 'no_changes' });
            }

            // Add updated_at timestamp
            updates.push(`updated_at = $${paramIndex++}`);
            values.push(new Date().toISOString());

            values.push(planId);

            // Update the plan
            const result = await pool.query(
                `UPDATE plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                values
            );

            const updatedPlan = result.rows[0];

            // 1. Log price history if price changed
            if (typeof price_pence === 'number' && oldPrice !== newPrice) {
                await pool.query(
                    `INSERT INTO plan_price_history (plan_id, price_pence, currency, effective_at, note)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        planId,
                        newPrice,
                        currency || currentPlan.currency || 'GBP',
                        new Date().toISOString(),
                        `Admin price update: ${oldPrice} → ${newPrice} pence`
                    ]
                );

                console.log(`[PlanUpdate] Price history logged: Plan ${planId} ${oldPrice} → ${newPrice} pence`);
            }

            // 2. Update subscription records for users on this plan
            if (typeof price_pence === 'number' && oldPrice !== newPrice) {
                const affectedUsersResult = await pool.query(
                    'SELECT COUNT(*) as count FROM "user" WHERE plan_id = $1 AND deleted_at IS NULL',
                    [planId]
                );

                const affectedUsersCount = parseInt(affectedUsersResult.rows[0].count);

                if (affectedUsersCount > 0) {
                    // Update subscription records to reflect new pricing
                    await pool.query(
                        `UPDATE subscription 
                         SET updated_at = $1
                         WHERE user_id IN (
                             SELECT id FROM "user" WHERE plan_id = $2 AND deleted_at IS NULL
                         )`,
                        [TimestampUtils.forTableField('plans', 'updated_at_ms'), planId]
                    );

                    console.log(`[PlanUpdate] Updated ${affectedUsersCount} subscription records for plan ${planId}`);
                }
            }

            // 3. Log admin audit action
            const auditDetails = {
                plan_id: planId,
                plan_name: updatedPlan.name,
                changes: {
                    old_price: oldPrice,
                    new_price: newPrice,
                    price_changed: typeof price_pence === 'number' && oldPrice !== newPrice,
                    fields_updated: updates.filter(u => !u.includes('updated_at')).length
                },
                admin_id: adminId,
                timestamp: new Date().toISOString()
            };

            await pool.query(
                `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    adminId,
                    'plan_update',
                    'plan',
                    planId,
                    JSON.stringify(auditDetails),
                    TimestampUtils.forTableField('admin_audit', 'created_at')
                ]
            );

            // 4. Get affected users for notification (if price changed)
            let affectedUsers: Array<{ id: number, email: string, first_name: string, last_name: string }> = [];
            if (typeof price_pence === 'number' && oldPrice !== newPrice) {
                const usersResult = await pool.query(
                    `SELECT id, email, first_name, last_name 
                     FROM "user" 
                     WHERE plan_id = $1 AND deleted_at IS NULL`,
                    [planId]
                );
                affectedUsers = usersResult.rows;
            }

            // Commit the transaction
            await pool.query('COMMIT');

            // 5. Clear pricing cache after successful update
            pricingService.clearCache();

            // 6. Send notifications to affected users (async, non-blocking)
            if (affectedUsers.length > 0) {
                setImmediate(async () => {
                    try {
                        const { sendTemplateEmail } = await import('../../lib/mailer');

                        for (const user of affectedUsers) {
                            await sendTemplateEmail({
                                to: user.email,
                                templateAlias: 'plan-price-change',
                                model: {
                                    firstName: user.first_name || 'User',
                                    planName: updatedPlan.name,
                                    oldPrice: `£${(oldPrice / 100).toFixed(2)}`,
                                    newPrice: `£${(newPrice / 100).toFixed(2)}`,
                                    interval: updatedPlan.interval,
                                    effectiveDate: new Date().toLocaleDateString('en-GB')
                                }
                            });
                        }

                        console.log(`[PlanUpdate] Sent price change notifications to ${affectedUsers.length} users`);
                    } catch (emailError) {
                        console.error('[PlanUpdate] Failed to send notifications:', emailError);
                    }
                });
            }

            console.log(`[PlanUpdate] Plan ${planId} updated successfully by admin ${adminId}`);

            return res.json({
                ok: true,
                data: {
                    ...updatedPlan,
                    affected_users: affectedUsers.length,
                    price_changed: typeof price_pence === 'number' && oldPrice !== newPrice,
                    notifications_sent: affectedUsers.length > 0
                }
            });

        } catch (transactionError) {
            await pool.query('ROLLBACK');
            throw transactionError;
        }

    } catch (error: any) {
        console.error('[PATCH /api/admin/plans/:id] error:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                ok: false,
                error: 'duplicate_slug'
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

/**
 * DELETE /api/admin/plans/:id
 * Delete/retire plan (admin only)
 */
router.delete('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
    // Ensure no caching on mutation endpoints
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });

    const planId = parseInt(param(req, 'id'), 10);
    const pool = getPool();

    if (!planId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Soft delete - mark as retired instead of actual deletion
        const result = await pool.query(`
            UPDATE plans
            SET retired_at = $1, active = false, updated_at = $1
            WHERE id = $2
            RETURNING *
        `, [new Date().toISOString(), planId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[DELETE /api/admin/plans/:id] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

export default router;
