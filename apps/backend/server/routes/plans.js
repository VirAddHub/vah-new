const Router = require('express').Router;
const router = Router();

router.get('/', (_req, res) => {
  res.json({ ok: true, data: [] });
});

module.exports = router;
