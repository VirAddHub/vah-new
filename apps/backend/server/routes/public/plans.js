const express = require('express');
const router = express.Router();

// keep super simple + predictable for smoke tests
const DEFAULT_PLANS = [
    { id: 'basic', name: 'Basic', price: 0, currency: 'GBP', interval: 'month' },
    { id: 'pro', name: 'Pro', price: 1500, currency: 'GBP', interval: 'month' },
    { id: 'teams', name: 'Teams', price: 4900, currency: 'GBP', interval: 'month' },
];

// GET /api/plans (public)
router.get('/plans', (req, res) => {
    res.json({ plans: DEFAULT_PLANS, public: true });
});

// DELETE /api/plans (explicit 405 for smoke)
router.delete('/plans', (req, res) => {
    res.set('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
});

module.exports = router;
