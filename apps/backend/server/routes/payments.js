const Router = require('express').Router;
const router = Router();

router.post('/redirect-flows', (_req, res) => {
  res.json({ ok: true, data: {
    redirect_flow_id: 'rf_' + Math.random().toString(36).slice(2),
    redirect_url: 'https://example.test/redirect'
  }});
});

router.get('/subscriptions/status', (_req, res) => {
  res.json({ ok: true, data: { plan_status: 'none' } });
});

router.post('/subscriptions', (req, res) => {
  if (req.body?.action === 'cancel') return res.json({ ok: true });
  res.status(400).json({ error: 'unsupported_action' });
});

module.exports = router;
