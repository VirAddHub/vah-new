import { Router } from 'express';
import { performance } from 'node:perf_hooks';
import rateLimit from 'express-rate-limit';
import { logger } from '../../lib/logger';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// In-memory cache to prevent provider 429s
const cache = new Map<string, { at: number; data: any }>();
const TTL = 60_000; // 60 seconds
const MAX_CACHE_ENTRIES = 500;

// Each lookup costs money with the provider: signed-in customers only, with a per-account allowance
// (security review F44). The forwarding-address form is the only caller.
const lookupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => `addr:${req.user?.id ?? 'anon'}`,
  message: { ok: false, error: 'too_many_lookups', message: 'Too many address lookups. Please wait a few minutes.' },
});
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

function getCacheKey(postcode: string, line1: string): string {
  return `${postcode}::${line1}`;
}

function redactPostcode(postcode: string): string {
  // Do not log full postcodes (PII-ish). Keep only outcode area as a hint.
  // Examples: "SE1 3PH" -> "SE1…", "N70EY" -> "N7…"
  const t = String(postcode || '').trim().toUpperCase().replace(/\s+/g, '');
  const outcode = t.slice(0, Math.min(3, t.length));
  return outcode ? `${outcode}…` : 'unknown';
}

router.get('/', (req, res) => {
  return res.json({ ok: true, ping: 'address-root' });
});

// Hardened lookup route with timeout, caching, and observability
router.get('/lookup', requireAuth, lookupLimiter, async (req, res) => {
  const t0 = performance.now();

  const API_KEY = process.env.IDEAL_POSTCODES_API_KEY;
  if (!API_KEY) {
    logger.error('[address] missing IDEAL_POSTCODES_API_KEY');
    return res.status(503).json({ ok: false, error: 'lookup_unavailable' });
  }

  const postcode = (typeof req.query.postcode === 'string' ? req.query.postcode : '').trim().toUpperCase().slice(0, 12);
  const line1 = (typeof req.query.line1 === 'string' ? req.query.line1 : '').trim().slice(0, 100);

  if (!postcode) {
    logger.debug('[address] postcode required');
    return res.status(400).json({ ok: false, error: 'postcode required' });
  }
  if (!UK_POSTCODE.test(postcode)) {
    return res.status(400).json({ ok: false, error: 'invalid_postcode', message: 'Please enter a valid UK postcode.' });
  }

  // Check cache first
  const key = getCacheKey(postcode, line1);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    const latency = Math.round(performance.now() - t0);
    logger.debug('[address] cache hit', {
      postcode: redactPostcode(postcode),
      filtered: Boolean(line1),
      latencyMs: latency,
    });
    return res.json(hit.data);
  }

  logger.debug('[address] lookup start', { postcode: redactPostcode(postcode), filtered: Boolean(line1) });

  try {
    // Ideal Postcodes API endpoint
    const url = new URL(`https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(postcode)}`);
    url.searchParams.set('api_key', API_KEY);

    // Add timeout with AbortController
    const ctrl = AbortController ? new AbortController() : null;
    const timeout = setTimeout(() => ctrl?.abort(), 6000);

    const r = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'VirtualAddressHub/1.0'
      },
      signal: ctrl?.signal as any
    });

    clearTimeout(timeout);

    if (!r.ok) {
      logger.warn('[address] provider error', { status: r.status });
      return res.status(r.status === 404 ? 404 : 502).json({ ok: false, error: r.status === 404 ? 'postcode_not_found' : 'lookup_failed' });
    }

    const data = await r.json() as { result?: Array<{ line_1?: string; line_2?: string; post_town?: string; postcode?: string }> };

    // Transform Ideal Postcodes response to match expected format
    const addresses: string[] = [];
    if (data.result && Array.isArray(data.result)) {
      addresses.push(...data.result.map((addr: any) => {
        const parts: string[] = [];
        if (addr.line_1) parts.push(addr.line_1);
        if (addr.line_2) parts.push(addr.line_2);
        if (addr.line_3) parts.push(addr.line_3);
        if (addr.post_town) parts.push(addr.post_town);
        if (addr.postcode) parts.push(addr.postcode);
        return parts.join(', ');
      }));
    }

    const payload = { ok: true, data: { addresses } };

    // Cache successful results
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), data: payload });

    const latency = Math.round(performance.now() - t0);
    logger.debug('[address] lookup ok', {
      postcode: redactPostcode(postcode),
      filtered: Boolean(line1),
      results: addresses.length,
      latencyMs: latency,
    });

    return res.json(payload);
  } catch (err: any) {
    const latency = Math.round(performance.now() - t0);
    const msg = err?.name === 'AbortError' ? 'lookup_timeout' : (err?.message || 'lookup_error');
    logger.warn('[address] lookup failed', {
      postcode: redactPostcode(postcode),
      filtered: Boolean(line1),
      error: msg,
      latencyMs: latency,
    });
    return res.status(502).json({ ok: false, error: msg });
  }
});

export default router;
