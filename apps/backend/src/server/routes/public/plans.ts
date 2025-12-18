import { Router, Request, Response } from 'express';
import { selectMany } from '../../db-helpers';
import { getPool } from '../../db';
import { ok } from '../../lib/apiResponse';
import { createHash } from 'crypto';

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
        const etag = maxUpdatedAt 
            ? `"${createHash('md5').update(String(new Date(maxUpdatedAt).getTime())).digest('hex')}"`
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
        const formattedPlans = rows.map(plan => ({
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
        console.error('[Public Plans] Database error:', e);
        // Safe stub if DB not reachable
        const stubPlans = [
            {
                id: 'monthly',
                name: 'Virtual Mailbox - Monthly',
                price_pence: 995,
                price: 9.95,
                priceFormatted: '£9.95',
                interval: 'month',
                currency: 'GBP',
                features: ['Use as Registered Office & Director\'s Service Address (Companies House + HMRC)', 'Professional London business address for banking, invoices & websites', 'Unlimited digital mail scanning — uploaded same day it arrives', 'Secure online dashboard to read, download, archive or request actions', 'HMRC & Companies House mail: digital scan + physical forwarding at no charge', 'Cancel anytime. No setup fees or long-term contracts', 'UK support — Mon-Fri, 9AM–6PM GMT'],
                active: true,
                isMonthly: true,
                isAnnual: false
            },
            {
                id: 'annual',
                name: 'Virtual Mailbox - Annual',
                price_pence: 8999,
                price: 89.99,
                priceFormatted: '£89.99',
                interval: 'year',
                currency: 'GBP',
                features: ['Use as Registered Office & Director\'s Service Address (Companies House + HMRC)', 'Professional London business address for banking, invoices & websites', 'Unlimited digital mail scanning — uploaded same day it arrives', 'Secure online dashboard to read, download, archive or request actions', 'HMRC & Companies House mail: digital scan + physical forwarding at no charge', 'Cancel anytime. No setup fees or long-term contracts', 'UK support — Mon-Fri, 9AM–6PM GMT', 'Save 25% — equivalent to £7.50/month'],
                active: true,
                isMonthly: false,
                isAnnual: true
            }
        ];

        // Even stub plans should have cache headers (but shorter TTL)
        res.set({
            'ETag': generateETag(stubPlans),
            'Cache-Control': 'public, max-age=10, stale-while-revalidate=30'
        });

        // Return as array (static list, no pagination needed)
        return ok(res, stubPlans);
    }
});

export default router;
