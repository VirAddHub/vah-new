import { Router } from 'express';
import { selectMany } from '../../db-helpers';

const router = Router();

router.get('/plans', async (_req, res) => {
    try {
        const rows = await selectMany(
            `SELECT id, name, slug, description, price_pence, interval, currency, features_json, trial_days
             FROM plans
             WHERE active = true AND retired_at IS NULL
             ORDER BY sort ASC, price_pence ASC`
        ) as any[];
        return res.status(200).json({ ok: true, data: rows, source: 'db' });
    } catch (e) {
        // Safe stub if DB not reachable
        return res.status(200).json({
            ok: true,
            data: [{ id: 'monthly', name: 'Digital Mailbox', price_pence: 999, interval: 'month' }],
            source: 'stub',
        });
    }
});

export default router;
