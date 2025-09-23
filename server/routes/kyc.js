const Router = require('express').Router;
const router = Router();

router.post('/upload', (_req, res) => {
  res.status(201).json({ ok: true, data: { sdk_token: 'stub' } });
});

router.get('/status', (_req, res) => {
  res.json({ ok: true, data: { status: 'pending' } });
});

module.exports = router;
