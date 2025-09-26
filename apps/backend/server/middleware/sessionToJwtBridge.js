// server/middleware/sessionToJwtBridge.js
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const FIVE_MIN = 60 * 5;
const DBG = process.env.DEBUG_ADMIN === '1';

module.exports = async function sessionToJwtBridge(req, res, next) {
    try {
        const auth = req.headers['authorization'] || '';
        if (auth.toLowerCase().startsWith('bearer ')) return next();

        // Check if user is already set by test bypass middleware
        if (req.user) {
            console.log('[bridge] Found test user:', req.user);
            const isAdmin = (req.user.role || '').toLowerCase() === 'admin';
            const payload = { sub: String(req.user.id), email: req.user.email, role: isAdmin ? 'admin' : (req.user.role || 'user'), is_admin: isAdmin ? 1 : 0, id: req.user.id };
            const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: FIVE_MIN, issuer: 'virtualaddresshub', audience: 'vah-users' });
            req.headers['authorization'] = `Bearer ${signed}`;

            console.log('[bridge] minted jwt for test user=%s role=%s is_admin=%s',
                req.user.email, payload.role, payload.is_admin);
            return next();
        }

        const cookieToken = req.cookies?.vah_session;
        if (!cookieToken) return next();

        // First try the in-memory store (for tests)
        if (req.__store && req.__store.sessions && req.__store.sessions[cookieToken]) {
            const user = req.__store.sessions[cookieToken];
            const isAdmin = user.is_admin === 1;
            const payload = { sub: String(user.id), email: user.email, role: isAdmin ? 'admin' : 'user', is_admin: isAdmin ? 1 : 0, id: user.id };
            const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: FIVE_MIN, issuer: 'virtualaddresshub', audience: 'vah-users' });
            req.headers['authorization'] = `Bearer ${signed}`;
            req.user = user; // Set req.user for consistency

            if (DBG) {
                console.log('[bridge] minted jwt for test user=%s role=%s is_admin=%s',
                    user.email, payload.role, payload.is_admin);
            }
            return next();
        }

        const row = await db.get('SELECT id, email, role FROM user WHERE session_token = ?', [cookieToken]);
        if (!row) return next();

        const isAdmin = (row.role || '').toLowerCase() === 'admin';
        const payload = { sub: String(row.id), email: row.email, role: isAdmin ? 'admin' : (row.role || 'user'), is_admin: isAdmin ? 1 : 0, id: row.id };
        const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: FIVE_MIN, issuer: 'virtualaddresshub', audience: 'vah-users' });

        req.headers['authorization'] = `Bearer ${signed}`;

        if (DBG) {
            console.log('[bridge] minted jwt for user=%s role=%s is_admin=%s',
                row.email, payload.role, payload.is_admin);
        }
        return next();
    } catch (e) {
        if (DBG) console.log('[bridge] error', e.message);
        return next();
    }
};
