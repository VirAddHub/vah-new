// server/routes/profile.js
const express = require('express');
const router = express.Router();
const { validate, z } = require('../lib/validate');
const { db } = require('../db');

// Auth middleware (replace with your real session logic)
function requireAuth(req, res, next) {
    const token = req.cookies?.vah_session;
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const user = db.prepare('SELECT * FROM user WHERE session_token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'invalid_session' });
    req.user = user;
    next();
}

router.get('/', requireAuth, (req, res) => {
    const u = req.user;
    const profile = {
        id: u.id, email: u.email, phone: u.phone || null,
        first_name: u.first_name, last_name: u.last_name,
        business_name: u.business_name, trading_name: u.trading_name,
        kyc_status: u.kyc_status || 'pending'
    };
    res.json({ ok: true, profile });
});

router.put('/', requireAuth, validate(
    z.object({ email: z.string().email(), phone: z.string().min(5).max(32) })
), (req, res) => {
    const { email, phone } = req.body;
    db.prepare('UPDATE user SET email = ?, phone = ? WHERE id = ?').run(email, phone, req.user.id);
    res.json({ ok: true });
});

module.exports = router;
