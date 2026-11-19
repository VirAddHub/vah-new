// src/server/routes/admin-plans.ts
// Admin plans management endpoints

import { Router, Request, Response } from 'express';
import { getPool, connectForRequest } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { pricingService } from '../services/pricing';
import { TimestampUtils } from '../../lib/timestamp-utils';
import { param } from '../../lib/express-params';
import { safeErrorMessage } from '../../lib/safeError';
import { logger } from '../../lib/logger';
import { getBillingProvider } from '../../config/billing';
import { getAdvertisedRates, withAdvertisedPrice } from '../../services/stripePrices';

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

        // Show the price Stripe Checkout charges new customers, not the stored fallback.
        const rates = await getAdvertisedRates();
        return res.json({
            ok: true,
            data: result.rows.map(row => withAdvertisedPrice(row, rates))
        });
    } catch (error: any) {
        logger.error('[GET /api/admin/plans] error:', { error });
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: safeErrorMessage(error)
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
        logger.error('[GET /api/admin/plans/:id] error:', { error });
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: safeErrorMessage(error)
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
        logger.error('[POST /api/admin/plans] error:', { error });

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
            message: safeErrorMessage(error)
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
    // One connection for the whole transaction (see connectForRequest).
    const pool = await connectForRequest(res);

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
            // price_pence comes back from pg as a string: compare numbers, or every save looks like a
            // price change (and emails every customer on the plan).
            const priceChanging = typeof price_pence === 'number' && Number(price_pence) !== Number(oldPrice);

            // With Stripe, customers are charged the Stripe price (STRIPE_MONTHLY_PRICE_ID /
            // STRIPE_ANNUAL_PRICE_ID), not this number. Changing it here only changed the price shown
            // on the website (staging, 19 Nov 2026: shown £6.77, charged £9.99). Refuse it.
            if (priceChanging && getBillingProvider() === 'stripe') {
                await pool.query('ROLLBACK');
                return res.status(409).json({
                    ok: false,
                    error: 'price_set_in_stripe',
                    message: 'Prices are charged by Stripe. To change a price, create a new price in Stripe and update the price ID setting; the price shown here follows it.',
                });
            }

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

            // 3. Log admin audit action
            const auditDetails = {
                plan_id: planId,
                plan_name: updatedPlan.name,
                changes: {
                    old_price: oldPrice,
                    new_price: newPrice,
                    price_changed: priceChanging,
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

            // Commit the transaction
            await pool.query('COMMIT');

            // 5. Clear pricing cache after successful update
            pricingService.clearCache();

            // No customer emails from plan edits: the price is never changed here (see above), and
            // editing plan details is not something customers are notified about.

            logger.info('[PlanUpdate] Plan updated successfully', { planId, adminId });

            return res.json({
                ok: true,
                data: {
                    ...updatedPlan,
                    price_changed: false,
                    notifications_sent: false
                }
            });

        } catch (transactionError) {
            await pool.query('ROLLBACK');
            throw transactionError;
        }

    } catch (error: any) {
        logger.error('[PATCH /api/admin/plans/:id] error:', { error });

        if (error.code === '23505') {
            return res.status(400).json({
                ok: false,
                error: 'duplicate_slug'
            });
        }

        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: safeErrorMessage(error)
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
        logger.error('[DELETE /api/admin/plans/:id] error:', { error });
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: safeErrorMessage(error)
        });
    }
});

export default router;
