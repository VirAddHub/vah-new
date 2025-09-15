// server/routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { validate, z } = require('../lib/validate');

// Helpers (replace with your real auth & cookie utils)
function setSessionCookie(res, token, role = 'user') {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('vah_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        path: '/'
    });
    res.cookie('vah_role', role, {
        httpOnly: false,
        sameSite: 'lax',
        secure: isProd,
        path: '/'
    });
}
function clearSessionCookie(res) {
    res.clearCookie('vah_session', { path: '/' });
    res.clearCookie('vah_role', { path: '/' });
}

// DB helpers (adjust for your schema)
const { db } = require('../db'); // your better-sqlite3 instance

// Login handler moved to main server/index.js to avoid conflicts

router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
});

router.post('/reset-password/request', validate(
    z.object({ email: z.string().email() })
), (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM user WHERE email = ?').get(email);
    if (user) {
        const token = crypto.randomBytes(24).toString('hex');
        const expires = Math.floor(Date.now() / 1000) + 60 * 60; // 1h
        db.prepare('INSERT INTO password_reset (user_id, token, expires_at) VALUES (?,?,?)').run(user.id, token, expires);
        // TODO: send Postmark email with link containing token
    }
    res.json({ ok: true }); // always OK (don't leak existence)
});

router.post('/reset-password/confirm', validate(
    z.object({ token: z.string().min(8), new_password: z.string().min(6) })
), (req, res) => {
    const { token, new_password } = req.body;
    const row = db.prepare('SELECT * FROM password_reset WHERE token = ?').get(token);
    if (!row || row.expires_at < Math.floor(Date.now() / 1000)) {
        return res.status(400).json({ error: 'invalid_or_expired' });
    }
    db.prepare('UPDATE user SET password = ? WHERE id = ?').run(new_password, row.user_id);
    db.prepare('DELETE FROM password_reset WHERE token = ?').run(token);
    res.json({ ok: true });
});

module.exports = router;
