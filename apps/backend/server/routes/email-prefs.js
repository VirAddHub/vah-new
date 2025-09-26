// server/routes/email-prefs.js
const express = require('express');
const router = express.Router();

// Minimal endpoints to satisfy imports/tests; expand later if needed.
router.get('/', (_req, res) => res.json({ ok: true, prefs: {} }));
router.post('/', (_req, res) => res.json({ ok: true }));
router.patch('/', (_req, res) => res.json({ ok: true }));

module.exports = router;