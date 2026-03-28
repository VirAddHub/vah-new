import crypto from 'crypto';
import { resolveSumsubApiConfig } from './sumsubConfig';

/**
 * Sign Sumsub API requests with HMAC-SHA256
 */
function sign(method: string, path: string, ts: string, body: string, appSecret: string): string {
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(`${ts}${method}${path}${body}`);
  return hmac.digest('hex');
}

/**
 * Make authenticated requests to Sumsub API (uses {@link resolveSumsubApiConfig} each call).
 */
export async function sumsubFetch(method: string, path: string, bodyObj?: any): Promise<any> {
  const cfg = resolveSumsubApiConfig();
  if (!cfg) {
    throw new Error('Sumsub API not configured');
  }

  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = sign(method, path, ts, body, cfg.secret);

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      'X-App-Token': cfg.token,
      'X-App-Access-Sig': sig,
      'X-App-Access-Ts': ts,
      'Content-Type': 'application/json',
    },
    body: body || undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sumsub ${method} ${path} ${res.status}: ${text}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}
