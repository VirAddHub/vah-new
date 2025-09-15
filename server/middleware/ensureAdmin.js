function ensureAdmin(req, res, next) {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ error: 'forbidden_admin' });
}
module.exports = { ensureAdmin };