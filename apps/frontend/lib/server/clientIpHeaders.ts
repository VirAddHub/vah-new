import { createHmac } from 'node:crypto';

/**
 * Headers that tell the API which visitor a request came from, signed with BFF_SHARED_SECRET so
 * the API can trust them for rate limiting (see clientKey in the backend's app.ts). Without the
 * secret nothing is sent and the API falls back to this server's own address.
 * Spread into the headers of any server-side fetch to the API made on behalf of an anonymous visitor.
 */
export function clientIpHeaders(request: { headers: Headers }): Record<string, string> {
  const secret = (process.env.BFF_SHARED_SECRET || '').trim();
  const ip = (request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim();
  if (!secret || !ip) return {};
  return { 'x-vah-client-ip': ip, 'x-vah-client-sig': createHmac('sha256', secret).update(ip).digest('hex') };
}
