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

        const cookieToken = req.cookies?.vah_session;
        if (!cookieToken) return next();

        const row = await db.get('SELECT id, email, role FROM user WHERE session_token = ?', [cookieToken]);
        if (!row) return next();

        const isAdmin = (row.role || '').toLowerCase() === 'admin';
        const payload = { sub: String(row.id), email: row.email, role: isAdmin ? 'admin' : (row.role || 'user'), is_admin: isAdmin ? 1 : 0 };
        const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: FIVE_MIN });

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
