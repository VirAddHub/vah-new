const express = require('express');
const router = express.Router();
const { validate, z } = require('../lib/validate');
const db = require('../db');

function requireAdmin(req, res, next) {
    const token = req.cookies?.vah_session;
    if (!token) return res.status(401).json({ error: 'unauthenticated' });
    const user = db.prepare('SELECT * FROM user WHERE session_token = ?').get(token);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'forbidden' });
    req.admin = user; next();
}

// Users search
router.get('/users', requireAdmin, validate(null, z.object({
    q: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    offset: z.coerce.number().min(0).optional()
})), (req, res) => {
    const { q = '', limit = 25, offset = 0 } = req.query;
    const rows = db.prepare(
        `SELECT id, email, name, kyc_status, plan_status FROM user
     WHERE email LIKE ? OR name LIKE ?
     ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(`%${q}%`, `%${q}%`, limit, offset);
    res.json({ ok: true, users: rows });
});

// Update user (plan, KYC, role)
router.put('/users/:id', requireAdmin, validate(
    z.object({
        kyc_status: z.enum(['pending', 'approved', 'reverify_required', 'rejected']).optional(),
        plan_status: z.enum(['inactive', 'active', 'cancelled']).optional(),
        is_admin: z.boolean().optional()
    }), null, z.object({ id: z.string() })
), (req, res) => {
    const { id } = req.params;
    const { kyc_status, plan_status, is_admin } = req.body;
    const u = db.prepare('SELECT * FROM user WHERE id = ?').get(id);
    if (!u) return res.status(404).json({ error: 'not_found' });
    db.prepare(`
    UPDATE user SET 
      kyc_status = COALESCE(?, kyc_status),
      plan_status = COALESCE(?, plan_status),
      is_admin = COALESCE(?, is_admin)
    WHERE id = ?
  `).run(kyc_status ?? null, plan_status ?? null, (is_admin === undefined ? null : (is_admin ? 1 : 0)), id);
    res.json({ ok: true });
});

// Mail search
router.get('/mail-items', requireAdmin, validate(null, z.object({
    q: z.string().optional(),
    tag: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    offset: z.coerce.number().min(0).optional()
})), (req, res) => {
    const { q = '', tag = '', limit = 25, offset = 0 } = req.query;
    const rows = db.prepare(
        `SELECT id, user_id, subject, tag, status, deleted FROM mail_item
     WHERE (subject LIKE ?) AND (?='' OR tag = ?)
     ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(`%${q}%`, tag, tag, limit, offset);
    res.json({ ok: true, items: rows });
});

// Update mail (tag/status/scan/forward override)
router.put('/mail-items/:id', requireAdmin, validate(
    z.object({
        tag: z.string().optional(),
        status: z.enum(['received', 'scanned', 'forward_requested', 'deleted']).optional(),
        scanned: z.boolean().optional(),
        deleted: z.boolean().optional()
    }), null, z.object({ id: z.string() })
), (req, res) => {
    const { id } = req.params;
    const { tag, status, scanned, deleted } = req.body;
    const m = db.prepare('SELECT * FROM mail_item WHERE id = ?').get(id);
    if (!m) return res.status(404).json({ error: 'not_found' });
    db.prepare(`
    UPDATE mail_item SET 
      tag = COALESCE(?, tag),
      status = COALESCE(?, status),
      scanned = COALESCE(?, scanned),
      deleted = COALESCE(?, deleted)
    WHERE id = ?
  `).run(tag ?? null, status ?? null, (scanned === undefined ? null : (scanned ? 1 : 0)), (deleted === undefined ? null : (deleted ? 1 : 0)), id);
    res.json({ ok: true });
});

module.exports = router;
