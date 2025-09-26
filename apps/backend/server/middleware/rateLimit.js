// super simple in-memory limiter per IP & path
const buckets = new Map();
module.exports = function rateLimit({ windowMs = 60000, max = 60 } = {}) {
    return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();
        const bucket = buckets.get(key) || [];
        const recent = bucket.filter(ts => now - ts < windowMs);
        recent.push(now);
        buckets.set(key, recent);
        if (recent.length > max) return res.status(429).json({ error: 'rate_limited' });
        next();
    }
}
