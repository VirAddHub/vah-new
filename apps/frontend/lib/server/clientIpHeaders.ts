import { createHmac } from 'node:crypto';

/**
 * Which incoming header carries the visitor's real address. It must be one the hosting platform
 * sets itself (overwriting anything the browser sent), or visitors could choose their own address
 * and escape rate limits:
 *  - on Vercel (VERCEL=1) the default is `x-real-ip`, which Vercel sets from the connection;
 *  - elsewhere set VAH_CLIENT_IP_HEADER to the header your platform guarantees;
 *  - if neither applies nothing is sent and the API treats the website server as the client.
 * Local development sets VAH_CLIENT_IP_HEADER=x-forwarded-for (local/frontend.env) so tests can
 * simulate several visitors; that is only safe because nothing local is exposed to the internet.
 */
export function visitorIpHeaderName(): string | null {
  const configured = (process.env.VAH_CLIENT_IP_HEADER || '').trim().toLowerCase();
  if (configured) return configured;
  return process.env.VERCEL === '1' ? 'x-real-ip' : null;
}

export function visitorIp(headers: { get(name: string): string | null }): string | null {
  const name = visitorIpHeaderName();
  if (!name) return null;
  const raw = headers.get(name) || '';
  // For x-forwarded-for the platform's own entry is the first one; everything is trimmed and validated.
  const ip = raw.split(',')[0].trim();
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null;
}

/**
 * Headers that tell the API which visitor a request came from, signed with BFF_SHARED_SECRET so the
 * API can trust them for rate limiting (see apps/backend/src/server/lib/clientKey.ts).
 */
export function signedVisitorHeaders(ip: string | null): Record<string, string> {
  const secret = (process.env.BFF_SHARED_SECRET || '').trim();
  if (!secret || !ip) return {};
  return { 'x-vah-client-ip': ip, 'x-vah-client-sig': createHmac('sha256', secret).update(ip).digest('hex') };
}

export function clientIpHeaders(request: { headers: { get(name: string): string | null } }): Record<string, string> {
  return signedVisitorHeaders(visitorIp(request.headers));
}
