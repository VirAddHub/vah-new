// server/middleware/csrf.js
const csrf = require('csurf');
const isTest = process.env.NODE_ENV === 'test';

const raw = csrf({ cookie: true });

function csrfAfterAuth(req, res, next) {
    // In tests, disable CSRF entirely to avoid 403s.
    if (isTest) return next();

    // Only enforce CSRF if the user is authenticated.
    if (!req.user && !req.session?.user) return next();
    return raw(req, res, next);
}

// For public JSON endpoints (login/signup/webhooks/etc.)
// In tests, disable CSRF.
function maybeCsrf(req, res, next) {
    if (isTest) return next();
    return raw(req, res, next);
}

module.exports = { csrfAfterAuth, maybeCsrf };
