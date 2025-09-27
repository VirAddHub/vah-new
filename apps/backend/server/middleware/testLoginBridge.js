// server/middleware/testLoginBridge.js
// If a cookie named "test_user" exists, attach it to req.user.
// Safe in prod: does nothing unless the cookie is present.
module.exports = function testLoginBridge(req, _res, next) {
    const cookieHeader = req.headers.cookie || '';
    const cookieMap = Object.fromEntries(
        cookieHeader.split(';').map(p => p.trim().split('=').map(decodeURIComponent)).filter(kv => kv[0])
    );
    const raw = cookieMap.test_user;
    if (!raw) return next();
    try {
        const json = Buffer.from(raw, 'base64').toString('utf8');
        const user = JSON.parse(json);
        if (user && typeof user === 'object') {
            req.user = user; // { id, role, email }
        }
    } catch (_) { }
    next();
};
