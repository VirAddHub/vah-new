import { Router, Request, Response } from 'express';
import { logger } from '../../../lib/logger';
import { selectMany } from '../../db-helpers';
import { getPool } from '../../db';
import { ok } from '../../lib/apiResponse';
import { createHash } from 'crypto';
import { getAdvertisedRates, withAdvertisedPrice } from '../../../services/stripePrices';

const router = Router();

/**
 * Generate ETag from plans data (based on max updated_at or content hash)
 */
function generateETag(plans: any[]): string {
    if (plans.length === 0) {
        return createHash('md5').update('empty').digest('hex');
    }
    // Use max updated_at timestamp as ETag basis (more stable than content hash)
    const maxUpdatedAt = Math.max(...plans.map(p => {
        const updatedAt = p.updated_at;
        if (!updatedAt) return 0;
        const ts = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt;
        return isNaN(ts) ? 0 : ts;
    }));
    return `"${createHash('md5').update(String(maxUpdatedAt)).digest('hex')}"`;
}

router.get('/plans', async (req: Request, res: Response) => {
    try {
        const pool = getPool();

        // First, get max updated_at for ETag generation (lightweight query)
        const maxUpdatedResult = await pool.query(
            `SELECT MAX(updated_at) as max_updated_at
             FROM plans
             WHERE active = true AND retired_at IS NULL`
        );

        const maxUpdatedAt = maxUpdatedResult.rows[0]?.max_updated_at;
        // The shown price is the Stripe price Checkout charges, so it is part of the ETag.
        const rates = await getAdvertisedRates();
        const rateKey = `${rates.month?.priceId}:${rates.month?.amountPence}|${rates.year?.priceId}:${rates.year?.amountPence}`;
        const etag = maxUpdatedAt
            ? `"${createHash('md5').update(String(new Date(maxUpdatedAt).getTime()) + rateKey).digest('hex')}"`
            : generateETag([]);

        // Check If-None-Match header for conditional request
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag || ifNoneMatch === etag.replace(/"/g, '')) {
            res.set({
                'ETag': etag,
                'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
            });
            return res.status(304).end();
        }

        const rows = await selectMany(
            `SELECT id, name, slug, description, price_pence, interval, currency, features_json, trial_days, active, vat_inclusive, updated_at
             FROM plans
             WHERE active = true AND retired_at IS NULL
             ORDER BY sort ASC, price_pence ASC`
        ) as any[];

        // Format prices for frontend consumption
        const formattedPlans = rows.map(row => withAdvertisedPrice(row, rates)).map(plan => ({
            ...plan,
            priceFormatted: `£${(plan.price_pence / 100).toFixed(2)}`,
            price: plan.price_pence / 100,
            features: Array.isArray(plan.features_json) ? plan.features_json : JSON.parse(plan.features_json || '[]'),
            isAnnual: plan.interval === 'year',
            isMonthly: plan.interval === 'month'
        }));

        // Set caching headers with ETag
        res.set({
            'ETag': etag,
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
        });

        // Return as array (static list, no pagination needed)
        return ok(res, formattedPlans);
    } catch (e) {
        logger.error('[Public Plans] Database error:', e);
        // No made-up plans: a stub here once advertised £9.95 while Checkout charged £9.99.
        return res.status(503).json({ ok: false, error: 'plans_unavailable' });
    }
});

export default router;
