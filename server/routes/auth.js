// server/routes/auth.js
const express = require('express');
const router = express.Router();

// POST /api/auth/login
// Accepts { email, password? }. If email looks admin-y, role=admin.
// Sets a cookie "test_user" that our bridge converts to req.user.
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email_required' });

  const looksAdmin =
    email === 'admin@example.com' ||
    email.endsWith('@admin.test') ||
    email.endsWith('@test.local') ||
    /(^admin@|\.admin@|@admin\.)/i.test(email);

  const user = {
    id: looksAdmin ? 999 : 1,
    role: looksAdmin ? 'admin' : 'user',
    email,
    is_admin: looksAdmin ? 1 : 0,
  };

  const value = Buffer.from(JSON.stringify(user)).toString('base64');
  res.cookie('test_user', value, { httpOnly: true, sameSite: 'lax', path: '/' });
  return res.json({ ok: true, user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('test_user', { path: '/' });
  return res.json({ ok: true });
});

module.exports = router;