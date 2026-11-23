import { Router, Request, Response } from 'express';
import { logger } from '../../../lib/logger';
import { selectMany } from '../../db-helpers';
import { ok } from '../../lib/apiResponse';
import { createHash } from 'crypto';
import { getAdvertisedRates, withAdvertisedPrice } from '../../../services/stripePrices';

const router = Router();

/** Hash the actual returned plans so price changes and retirement invalidate caches. */
function generateETag(plans: any[]): string {
    return `"${createHash('sha256').update(JSON.stringify(plans)).digest('hex')}"`;
}

router.get('/plans', async (req: Request, res: Response) => {
    try {
        // The shown price is the Stripe price Checkout charges; the ETag below hashes the returned
        // plans (prices included), so a price change always invalidates caches.
        const rates = await getAdvertisedRates();
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

        const etag = generateETag(formattedPlans);
        if (req.headers['if-none-match'] === etag) {
            res.set({'ETag':etag, 'Cache-Control':'public, max-age=30, stale-while-revalidate=60'});
            return res.status(304).end();
        }
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
        res.set('Cache-Control', 'no-store');
        return res.status(503).json({ ok: false, error: 'pricing_unavailable' });
    }
});

export default router;
