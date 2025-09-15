const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SESSION_TTL_SECS = Number(process.env.SESSION_TTL_SECS || 60 * 60 * 24 * 30);
const SLIDE_AFTER_SECS = Number(process.env.SLIDE_AFTER_SECS || 60 * 5);

function nowSec() { return Math.floor(Date.now() / 1000); }

function findBySession(token) {
    if (!token) return null;
    const row = db.prepare(`
    SELECT id, email, role, session_created_at
    FROM user
    WHERE session_token = ?
  `).get(token);
    if (!row) return null;
    const created = Math.floor(new Date(row.session_created_at).getTime() / 1000);
    const age = nowSec() - created;
    if (age > SESSION_TTL_SECS) return { expired: true };
    if (age > SLIDE_AFTER_SECS) {
        db.prepare(`UPDATE user SET session_created_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);
    }
    return { id: row.id, email: row.email, role: row.role || 'user' };
}

function requireAuth(req, res, next) {
    // 1) Bearer JWT
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(auth.slice(7).trim(), JWT_SECRET);
            req.user = { id: payload.sub, email: payload.email, role: payload.role || 'user' };
            return next();
        } catch (_) { }
    }
    // 2) vah_session cookie
    const token = req.cookies?.vah_session || '';
    const u = findBySession(token);
    if (!u) return res.status(401).json({ error: 'invalid_session' });
    if (u.expired) return res.status(401).json({ error: 'session_expired' });
    req.user = { id: u.id, email: u.email, role: u.role || 'user' };
    return next();
}

module.exports = { requireAuth };