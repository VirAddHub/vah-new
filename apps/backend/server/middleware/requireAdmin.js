module.exports = function requireAdmin(req, res, next) {
  console.log('[requireAdmin] Called with user:', req.user);
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  if (req.user.is_admin === 1) return next();
  return res.status(403).json({ error: 'forbidden' });
};
