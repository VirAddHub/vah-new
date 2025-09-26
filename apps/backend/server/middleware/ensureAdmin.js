function ensureAdmin(req, res, next) {
    console.log('[ensureAdmin] Called with user:', req.user);
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ error: 'forbidden_admin' });
}
module.exports = { ensureAdmin };