const Router = require('express').Router;
const router = Router();

function getStore(req){ return req.__store || (req.__store = { profiles:{} }); }

// GET /api/profile -> 200 + current user email
router.get('/', (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'unauthorized' });
  const profile = getStore(req).profiles[email] || {};
  res.json({ email, ...profile });
});

// POST /api/profile -> 200 and echo saved fields
router.post('/', (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'unauthorized' });
  const store = getStore(req);
  store.profiles[email] = { ...(store.profiles[email]||{}), ...(req.body||{}) };
  res.json(store.profiles[email]);
});

// PUT /api/profile/address -> 200 {forwarding_address}
router.put('/address', (req, res) => {
  const email = req.user?.email;
  if (!email) return res.status(401).json({ error: 'unauthorized' });
  const store = getStore(req);
  const { forwarding_address } = req.body || {};
  store.profiles[email] = { ...(store.profiles[email]||{}), forwarding_address };
  res.json({ forwarding_address });
});

// POST /api/profile/reset-password-request -> 200 { ok, debug_token }
router.post('/reset-password-request', (req, res) => {
  const token = 'pw_' + Math.random().toString(36).slice(2);
  getStore(req).resetToken = token;
  res.json({ ok: true, debug_token: token });
});

// POST /api/profile/reset-password -> 200 { ok }
router.post('/reset-password', (_req, res) => res.json({ ok: true }));

module.exports = router;