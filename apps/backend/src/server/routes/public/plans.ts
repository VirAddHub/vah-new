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
