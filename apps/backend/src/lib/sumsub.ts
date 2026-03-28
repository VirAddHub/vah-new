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

/**
 * Load applicant for dashboard sync: try stored Sumsub `id` first, then
 * `GET .../applicants/-;externalUserId={id}/one` (same externalUserId as kyc/start).
 * Fixes bad rows where sumsub_applicant_id is not a valid Sumsub applicant id (e.g. APPL…).
 * @see https://docs.sumsub.com/reference/get-applicant-data-via-externaluserid
 */
export async function sumsubGetApplicantForUserSync(opts: {
  storedApplicantId: string | null | undefined;
  externalUserId: number;
}): Promise<{ applicant: any; resolvedApplicantId: string }> {
  const stored = (opts.storedApplicantId || '').trim();
  const extPath = `/resources/applicants/-;externalUserId=${encodeURIComponent(String(opts.externalUserId))}/one`;

  if (stored) {
    try {
      const byIdPath = `/resources/applicants/${encodeURIComponent(stored)}/one`;
      const applicant = await sumsubFetch('GET', byIdPath);
      const id = typeof applicant?.id === 'string' ? applicant.id.trim() : '';
      if (id) {
        return { applicant, resolvedApplicantId: id };
      }
    } catch {
      /* Stored value may be invalid (Sumsub returns 400 "Invalid parameters") — fall back. */
    }
  }

  const applicant = await sumsubFetch('GET', extPath);
  const id = typeof applicant?.id === 'string' ? applicant.id.trim() : '';
  if (!id) {
    throw new Error('Sumsub applicant response missing id');
  }
  return { applicant, resolvedApplicantId: id };
}
