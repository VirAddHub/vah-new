import crypto from 'crypto';
import type { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Who is the client? Requests normally arrive from the website's server, so req.ip is that server
 * and every visitor would share one allowance. When the website signs the visitor's address with
 * BFF_SHARED_SECRET we use it; an unsigned or wrongly signed header is ignored, so a caller cannot
 * pick their own key by sending these headers.
 */
export function trustedVisitorIp(req: Request): string | null {
    const secret = (process.env.BFF_SHARED_SECRET || '').trim();
    const ip = String(req.headers['x-vah-client-ip'] || '').trim();
    const sig = String(req.headers['x-vah-client-sig'] || '').trim();
    if (!secret || !ip || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(ip).digest('hex');
    if (sig.length !== expected.length) return null;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? ip : null;
}

/** Rate-limit key for the visitor (IPv6 addresses are grouped by /56 as express-rate-limit recommends). */
export function clientKey(req: Request): string {
    return ipKeyGenerator(trustedVisitorIp(req) ?? req.ip ?? '');
}
