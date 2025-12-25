import { Router } from 'express';
import { performance } from 'node:perf_hooks';
import { logger } from '../../lib/logger';

const router = Router();

// In-memory cache to prevent provider 429s
const cache = new Map<string, { at: number; data: any }>();
const TTL = 60_000; // 60 seconds

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

// Debug route to test API key and environment
router.get('/debug', (req, res) => {
  const hasApiKey = !!process.env.IDEAL_POSTCODES_API_KEY;
  const apiKeyLength = process.env.IDEAL_POSTCODES_API_KEY?.length || 0;
  const apiKeyPrefix = process.env.IDEAL_POSTCODES_API_KEY?.substring(0, 8) || 'none';

  return res.json({
    ok: true,
    debug: {
      hasApiKey,
      apiKeyLength,
      apiKeyPrefix: `${apiKeyPrefix}...`,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      provider: 'Ideal Postcodes'
    }
  });
});

// Hardened lookup route with timeout, caching, and observability
router.get('/lookup', async (req, res) => {
  const t0 = performance.now();

  const API_KEY = process.env.IDEAL_POSTCODES_API_KEY;
  if (!API_KEY) {
    logger.error('[address] missing IDEAL_POSTCODES_API_KEY');
    return res.status(500).json({ ok: false, error: 'IDEAL_POSTCODES_API_KEY missing' });
  }

  const postcode = String(req.query.postcode || '').trim().toUpperCase();
  const line1 = String(req.query.line1 || '').trim();

  if (!postcode) {
    logger.debug('[address] postcode required');
    return res.status(400).json({ ok: false, error: 'postcode required' });
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
      const errorText = await r.text().catch(() => 'lookup_failed');
      logger.warn('[address] provider error', { status: r.status });
      return res.status(502).json({ ok: false, error: errorText || 'lookup_failed' });
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
