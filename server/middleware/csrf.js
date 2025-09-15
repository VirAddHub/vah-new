// server/middleware/csrf.js
// Minimal CSRF gate with exemptions; expects a cookie (vah_csrf or csrf) and header x-csrf-token
// GET/HEAD/OPTIONS are read-only and bypass; so do health/metrics/webhooks.

const EXEMPT_PREFIXES = [
    '/api/health', '/api/healthz', '/api/ready', '/api/metrics',
    '/api/webhooks', '/api/webhooks-gc', '/api/webhooks-postmark', '/api/webhooks/onedrive'
];

module.exports = function csrfMiddleware(req, res, next) {
    const m = req.method;
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return next();
    if (EXEMPT_PREFIXES.some(p => req.path.startsWith(p))) return next();

    // Accept legacy _csrf too (old csurf), so both stacks work during transition
    const cookieToken =
        req.cookies?.vah_csrf ||
        req.cookies?.csrf ||
        req.cookies?._csrf || ''; // legacy csurf cookie accepted
    const headerToken = req.get('x-csrf-token') || req.body?.csrf || '';

    if (!cookieToken || !headerToken) {
        return res.status(403).json({ error: 'csrf_missing' });
    }
    if (cookieToken !== headerToken) {
        return res.status(403).json({ error: 'csrf_invalid' });
    }
    next();
};
