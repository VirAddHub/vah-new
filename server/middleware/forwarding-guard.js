const rate = new Map(); // userId -> [timestamps]

module.exports = function forwardingGuard(req, res, next) {
  // idempotency
  const idem = req.get('X-Idempotency-Key');
  if (idem) {
    if (!req.app.locals.idemSeen) req.app.locals.idemSeen = new Set();
    const key = `fw:${req.user?.id || 'anon'}:${idem}`;
    if (req.app.locals.idemSeen.has(key)) return res.status(409).json({ error: 'duplicate_request' });
    req.app.locals.idemSeen.add(key);
    setTimeout(() => req.app.locals.idemSeen.delete(key), 10 * 60 * 1000);
  }

  // simple rate limit: 3 per 10 minutes
  const uid = req.user?.id || 'anon';
  const now = Date.now();
  const arr = rate.get(uid) || [];
  const recent = arr.filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 3) return res.status(429).json({ error: 'rate_limited' });
  recent.push(now);
  rate.set(uid, recent);

  next();
};
