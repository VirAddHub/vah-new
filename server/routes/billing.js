// server/routes/billing.js
const express = require('express');
const router = express.Router();
const { validate, z } = require('../lib/validate');
const { db } = require('../db');

function requireAuth(req, res, next) {
    const token = req.cookies?.vah_session;
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const user = db.prepare('SELECT * FROM user WHERE session_token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'invalid_session' });
    req.user = user; next();
}

// Plan status (MISSING → now exists)
router.get('/', requireAuth, (req, res) => {
    const u = req.user;
    res.json({ ok: true, plan_status: u.plan_status || 'inactive' });
});

// Mandate create (returns redirect URL — stub if no GC env)
router.post('/mandate/create', requireAuth, (req, res) => {
    const hasGC = process.env.GO_CARDLESS_TOKEN && process.env.GO_CARDLESS_REDIRECT_BASE;
    if (!hasGC) {
        // Dev stub redirect
        const fake = `${process.env.APP_ORIGIN || 'http://localhost:3000'}/signup/step-3?success=1&session_id=fake123`;
        return res.json({ ok: true, redirect_url: fake });
    }
    // TODO: call GoCardless redirect flow create API here
    // return res.json({ ok:true, redirect_url });
    const fake = `${process.env.APP_ORIGIN || 'http://localhost:3000'}/signup/step-3?success=1&session_id=gc123`;
    return res.json({ ok: true, redirect_url: fake });
});

// Confirm mandate/subscription (sets plan_status)
router.post('/mandate/confirm', requireAuth, validate(
    z.object({ session_id: z.string().min(3) })
), (req, res) => {
    const { session_id } = req.body;
    // TODO: verify with GoCardless API; for now assume OK
    db.prepare('UPDATE user SET plan_status = ? WHERE id = ?').run('active', req.user.id);
    res.json({ ok: true, plan_status: 'active' });
});

// Invoices list (you already had one — safe duplicate guard)
router.get('/invoices', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT id, created_at, status, invoice_url FROM payment WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ ok: true, invoices: rows });
});

// Retry & cancel (stubs for now)
router.post('/retry', requireAuth, (req, res) => res.json({ ok: true, message: 'retry_requested' }));
router.post('/cancel', requireAuth, (req, res) => {
    db.prepare('UPDATE user SET plan_status=? WHERE id=?').run('cancelled', req.user.id);
    res.json({ ok: true, plan_status: 'cancelled' })
});

module.exports = router;
