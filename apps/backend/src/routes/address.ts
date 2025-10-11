import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// GET /api/address?postcode=EC1V%209NR&line1=10
router.get('/address', async (req, res) => {
  try {
    const API_KEY = process.env.ADDRESS_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ ok: false, error: 'ADDRESS_API_KEY missing' });
    }

    const postcode = String(req.query.postcode || '').trim();
    const line1 = String(req.query.line1 || '').trim(); // house/flat filter (optional)

    if (!postcode) {
      return res.status(400).json({ ok: false, error: 'postcode required' });
    }

    // getaddress.io format: /find/{postcode}/{house}?api-key=KEY
    const base = 'https://api.getaddress.io/find';
    const url = new URL(`${base}/${encodeURIComponent(postcode)}/${encodeURIComponent(line1)}`);
    url.searchParams.set('api-key', API_KEY);

    const r = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      // 6s safety timeout via AbortController
      // @ts-ignore
      signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      return res.status(502).json({ ok: false, error: msg || 'lookup_failed' });
    }

    const data = await r.json();

    // Normalise minimal shape for the UI (addresses array of strings)
    const addresses: string[] =
      Array.isArray((data as any)?.addresses) ? (data as any).addresses : ((data as any)?.Address || (data as any)?.results || []);

    return res.json({ ok: true, data: { addresses } });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'server_error' });
  }
});

export default router;
