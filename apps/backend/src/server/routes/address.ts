import { Router } from 'express';
import { performance } from 'node:perf_hooks';

const router = Router();

// In-memory cache to prevent provider 429s
const cache = new Map<string, { at: number; data: any }>();
const TTL = 60_000; // 60 seconds

function getCacheKey(postcode: string, line1: string): string {
  return `${postcode}::${line1}`;
}

// loud module-load log so we know the file is actually in the build
console.log('[address] router module loaded - v2');

router.get('/', (req, res) => {
  console.log('[address] GET / (ok)');
  return res.json({ ok: true, ping: 'address-root' });
});

// Debug route to test API key and environment
router.get('/debug', (req, res) => {
  console.log('[address] DEBUG route called');
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
    console.log('[address] IDEAL_POSTCODES_API_KEY missing');
    return res.status(500).json({ ok: false, error: 'IDEAL_POSTCODES_API_KEY missing' });
  }

  const postcode = String(req.query.postcode || '').trim().toUpperCase();
  const line1 = String(req.query.line1 || '').trim();

  if (!postcode) {
    console.log('[address] postcode required');
    return res.status(400).json({ ok: false, error: 'postcode required' });
  }

  // Check cache first
  const key = getCacheKey(postcode, line1);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    const latency = Math.round(performance.now() - t0);
    console.log(`[address] cache hit ${postcode} ${line1 ? '(filtered)' : ''} ${latency}ms`);
    return res.json(hit.data);
  }

  console.log('[address] Looking up postcode:', postcode);

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
      console.log('[address] API error:', r.status, errorText);
      return res.status(502).json({ ok: false, error: errorText || 'lookup_failed' });
    }

    const data = await r.json();

    // Transform Ideal Postcodes response to match expected format
    const addresses: string[] = [];
    if (data.result && Array.isArray(data.result)) {
      addresses.push(...data.result.map((addr: any) => {
        const parts = [];
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
    console.log(`[address] lookup ${postcode} ${line1 ? '(filtered)' : ''} ${addresses.length} results ${latency}ms`);

    return res.json(payload);
  } catch (err: any) {
    const latency = Math.round(performance.now() - t0);
    const msg = err?.name === 'AbortError' ? 'lookup_timeout' : (err?.message || 'lookup_error');
    console.log(`[address] error ${postcode} ${line1 ? '(filtered)' : ''} ${msg} ${latency}ms`);
    return res.status(502).json({ ok: false, error: msg });
  }
});

export default router;
