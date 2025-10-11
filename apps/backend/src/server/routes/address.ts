import { Router } from 'express';

const router = Router();

// loud module-load log so we know the file is actually in the build
console.log('[address] router module loaded - v2');

router.get('/', (req, res) => {
  console.log('[address] GET / (ok)');
  return res.json({ ok: true, ping: 'address-root' });
});

router.get('/test', (req, res) => {
  console.log('[address] GET /test (ok)');
  return res.json({ ok: true, pong: 'address-test' });
});

// Real lookup route
router.get('/lookup', async (req, res) => {
  console.log('[address] GET /lookup (start)');
  
  const API_KEY = process.env.ADDRESS_API_KEY;
  if (!API_KEY) {
    console.log('[address] ADDRESS_API_KEY missing');
    return res.status(500).json({ ok: false, error: 'ADDRESS_API_KEY missing' });
  }

  const postcode = String(req.query.postcode || '').trim();
  const line1 = String(req.query.line1 || '').trim();
  if (!postcode) {
    console.log('[address] postcode required');
    return res.status(400).json({ ok: false, error: 'postcode required' });
  }

  console.log('[address] Looking up postcode:', postcode);

  try {
    const url = new URL(`https://api.getaddress.io/find/${encodeURIComponent(postcode)}/${encodeURIComponent(line1)}`);
    url.searchParams.set('api-key', API_KEY);

    const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!r.ok) {
      const errorText = await r.text().catch(() => 'lookup_failed');
      console.log('[address] API error:', r.status, errorText);
      return res.status(502).json({ ok: false, error: errorText });
    }

    const data = await r.json();
    const addresses: string[] = Array.isArray((data as any)?.addresses) ? (data as any).addresses : [];
    
    console.log('[address] Found', addresses.length, 'addresses');
    return res.json({ ok: true, data: { addresses } });
  } catch (err: any) {
    console.log('[address] Error:', err.message);
    return res.status(500).json({ ok: false, error: err?.message || 'server_error' });
  }
});

export default router;
