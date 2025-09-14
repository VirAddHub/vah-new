const express = require('express');
const router = express.Router();
const { validate, z } = require('../lib/validate');
const db = require('../db');

function requireAuth(req, res, next) {
    const token = req.cookies?.vah_session;
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const user = db.prepare('SELECT * FROM user WHERE session_token = ?').get(token);
    if (!user) return res.status(401).json({ error: 'invalid_session' });
    req.user = user; next();
}

router.post('/forward/bulk', requireAuth, validate(
    z.object({ ids: z.array(z.number().int()).min(1) })
), (req, res) => {
    const { ids } = req.body;
    const forwarded = [];
    const errors = [];

    ids.forEach(id => {
        const m = db.prepare('SELECT * FROM mail_item WHERE id = ?').get(id);
        if (!m) { errors.push({ mail_id: id, reason: 'not_found', message: 'Mail not found' }); return; }
        if (m.user_id !== req.user.id) { errors.push({ mail_id: id, reason: 'not_owner', message: 'You do not own this item' }); return; }
        if (m.deleted) { errors.push({ mail_id: id, reason: 'deleted', message: 'Item deleted' }); return; }
        // 14-day rule
        const daysOld = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);
        if (daysOld > 14) { errors.push({ mail_id: id, reason: 'too_old', message: 'Beyond forwarding window' }); return; }

        db.prepare('UPDATE mail_item SET status=?, requested_at=strftime("%s","now") WHERE id=?').run('forward_requested', id);
        db.prepare('INSERT INTO forwarding_request (user, mail_item, requested_at, status, is_billable) VALUES (?,?,?,?,?)')
            .run(req.user.id, id, Math.floor(Date.now() / 1000), 'pending', 0);

        // TODO: call Make.com webhook here for audit email/log if desired
        forwarded.push(id);
    });

    const message = forwarded.length && !errors.length
        ? 'All items forwarded'
        : forwarded.length && errors.length
            ? 'Some items forwarded; some failed'
            : 'No items forwarded';

    res.json({ forwarded, errors, message });
});

module.exports = router;
