const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SESSION_TTL_SECS = Number(process.env.SESSION_TTL_SECS || 60 * 60 * 24 * 30);
const SLIDE_AFTER_SECS = Number(process.env.SLIDE_AFTER_SECS || 60 * 5);

// Public-aware wrapper so any router using requireAuth won't guard public endpoints.
// IMPORTANT: use originalUrl (full mount path), not req.path (router-relative).
const PUBLIC_PATTERNS = [
  /^\/healthz$/,
  /^\/api\/healthz$/,
  /^\/api\/ready$/,
  /^\/api\/auth\/ping$/,
  /^\/api\/plans(?:\/.*)?$/, // GET-only logic happens in the route, but bypass auth here
  /^\/plans$/,               // legacy alias
  /^\/scans\/.*/,            // static/public scans
];
function isPublic(req) {
  const raw = (req.originalUrl || req.url || '').split('?')[0];
  return PUBLIC_PATTERNS.some((rx) => rx.test(raw));
}

function nowSec() { return Math.floor(Date.now() / 1000); }

async function findBySession(token) {
    if (!token) return null;
    const row = await db.get(`
    SELECT id, email, role, session_created_at
    FROM user
    WHERE session_token = ?
  `, [token]);
    if (!row) return null;
    const created = row.session_created_at; // already a Unix timestamp in seconds
    const age = nowSec() - created;
    if (age > SESSION_TTL_SECS) return { expired: true };
    if (age > SLIDE_AFTER_SECS) {
        await db.run(`UPDATE user SET session_created_at = CURRENT_TIMESTAMP WHERE id = ?`, [row.id]);
    }
    return { id: row.id, email: row.email, role: row.role || 'user' };
}

// Keep your original checks in here (token/cookie/session). This is a placeholder pass-through.
async function baseRequireAuth(req, res, next) {
    console.log('[requireAuth] req.user:', req.user);
    console.log('[requireAuth] authorization header:', req.headers.authorization);

    // Check if user is already set by test bypass middleware
    if (req.user) {
        console.log('[requireAuth] User already set, proceeding');
        return next();
    }

    // 1) Bearer JWT
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(auth.slice(7).trim(), JWT_SECRET);
            req.user = { id: payload.sub, email: payload.email, role: payload.role || 'user' };
            console.log('[requireAuth] JWT verified, user:', req.user);
            return next();
        } catch (e) {
            console.log('[requireAuth] JWT verification failed:', e.message);
        }
    }
    // 2) vah_session cookie
    const token = req.cookies?.vah_session || '';
    const u = await findBySession(token);
    if (!u) {
        console.log('[requireAuth] No valid session, returning 401');
        return res.status(401).json({ error: 'invalid_session' });
    }
    if (u.expired) {
        console.log('[requireAuth] Session expired, returning 401');
        return res.status(401).json({ error: 'session_expired' });
    }
    req.user = { id: u.id, email: u.email, role: u.role || 'user' };
    console.log('[requireAuth] Session verified, user:', req.user);
    return next();
}

async function requireAuth(req, res, next) {
    if (isPublic(req)) return next();
    return baseRequireAuth(req, res, next);
}

module.exports = { requireAuth };