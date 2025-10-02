import { Router } from 'express';
import { selectMany } from '../../db-helpers';

const router = Router();

router.get('/plans', async (_req, res) => {
    try {
        const rows = await selectMany(
            `SELECT id, name, slug, description, price_pence, interval, currency, features_json, trial_days, active, vat_inclusive
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
        
        // Disable caching for fresh pricing data
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        return res.status(200).json({ 
            ok: true, 
            data: formattedPlans, 
            source: 'db',
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('[Public Plans] Database error:', e);
        // Safe stub if DB not reachable
        const stubPlans = [
            { 
                id: 'monthly', 
                name: 'Digital Mailbox', 
                price_pence: 999, 
                price: 9.99,
                priceFormatted: '£9.99',
                interval: 'month',
                currency: 'GBP',
                features: ['Digital mail scanning', 'Mail forwarding', 'Registered office address'],
                active: true,
                isMonthly: true,
                isAnnual: false
            },
            { 
                id: 'annual', 
                name: 'Digital Mailbox (Annual)', 
                price_pence: 8999, 
                price: 89.99,
                priceFormatted: '£89.99',
                interval: 'year',
                currency: 'GBP',
                features: ['Digital mail scanning', 'Mail forwarding', 'Registered office address', '25% savings'],
                active: true,
                isMonthly: false,
                isAnnual: true
            }
        ];
        
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        return res.status(200).json({
            ok: true,
            data: stubPlans,
            source: 'stub',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
