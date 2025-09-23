const Router = require('express').Router;
const router = Router();

router.post('/tickets', (_req, res) => res.status(201).json({ ok: true, data: { id: 1, status: 'open' } }));
router.post('/tickets/:id/close', (_req, res) => res.json({ ok: true }));

module.exports = router;
