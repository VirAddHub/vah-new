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

// Hardened lookup route with timeout, caching, and observability
router.get('/lookup', async (req, res) => {
  const t0 = performance.now();
  
  const API_KEY = process.env.ADDRESS_API_KEY;
  if (!API_KEY) {
    console.log('[address] ADDRESS_API_KEY missing');
    return res.status(500).json({ ok: false, error: 'ADDRESS_API_KEY missing' });
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
    const url = new URL(`https://api.getaddress.io/find/${encodeURIComponent(postcode)}/${encodeURIComponent(line1)}`);
    url.searchParams.set('api-key', API_KEY);

    // Add timeout with AbortController
    const ctrl = AbortController ? new AbortController() : null;
    const timeout = setTimeout(() => ctrl?.abort(), 6000);

    const r = await fetch(url.toString(), { 
      headers: { Accept: 'application/json' }, 
      signal: ctrl?.signal as any 
    });
    
    clearTimeout(timeout);

    if (!r.ok) {
      const errorText = await r.text().catch(() => 'lookup_failed');
      console.log('[address] API error:', r.status, errorText);
      return res.status(502).json({ ok: false, error: errorText || 'lookup_failed' });
    }

    const data = await r.json();
    const addresses: string[] = Array.isArray((data as any)?.addresses) ? (data as any).addresses : [];
    
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
