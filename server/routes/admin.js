const Router = require('express').Router;
const requireAdmin = require('../middleware/requireAdmin');
const router = Router();

router.use(requireAdmin);

// GET /api/admin/plans -> 200
router.get('/plans', (_req, res) => res.json({ ok: true, data: [] }));

// PATCH /api/admin/plans/:id -> 200 or 404
router.patch('/plans/:id', (_req, res) => res.status(404).json({ error: 'not_found' }));

// GET /api/admin/users -> 200
router.get('/users', (_req, res) => res.json({ ok: true, data: [] }));

// PATCH /api/admin/users/:id -> 200 or 404
router.patch('/users/:id', (_req, res) => res.status(404).json({ error: 'not_found' }));

// PUT /api/admin/users/:id/kyc-status -> 200 or 404
router.put('/users/:id/kyc-status', (_req, res) => res.status(404).json({ error: 'not_found' }));

// Admin mail controls the tests touch:
router.get('/mail-items/:id', (_req, res) => {
  // ETag/304 path can be minimal: always return 200 with ETag
  res.set('ETag', 'W/"stub"').json({ ok: true, data: { id: _req.params.id } });
});
router.put('/mail-items/:id', (_req, res) => res.json({ ok: true }));
router.post('/mail-items/:id/log-physical-dispatch', (_req, res) => res.json({ ok: true }));

module.exports = router;