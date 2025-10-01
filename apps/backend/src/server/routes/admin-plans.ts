// src/server/routes/admin-plans.ts
// Admin plans management endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

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
    const planId = parseInt(req.params.id);
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
 * Update plan (admin only)
 */
router.patch('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id);
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
            return res.status(400).json({ ok: false, error: 'no_changes' });
        }

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());

        values.push(planId);

        const result = await pool.query(
            `UPDATE plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
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
    const planId = parseInt(req.params.id);
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
