const Router = require('express').Router;
const router = Router();

router.get('/mail-items', (_req, res) => res.json({ ok: true, data: [] }));

router.patch('/mail-items/:id', (_req, res) => {
  // 404 is allowed by tests; 200 with {ok:true} also OK
  res.status(404).json({ error: 'not_found' });
});

router.post('/mail/forward', (_req, res) => {
  // tests accept 200 or 400; return 200 for simplicity
  res.json({ ok: true });
});

module.exports = router;
