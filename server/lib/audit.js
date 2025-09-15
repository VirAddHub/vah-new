// server/lib/audit.js
const { db } = require('../db');

function logAuthEvent(eventType, userId, req, metadata = {}) {
    try {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        db.prepare(`
            INSERT INTO audit_log (user_id, event_type, ip_address, user_agent, metadata)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, eventType, ip, userAgent, JSON.stringify(metadata));
    } catch (e) {
        console.error('[audit] Failed to log event:', e);
    }
}

module.exports = { logAuthEvent };
