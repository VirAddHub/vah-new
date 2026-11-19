/**
 * Sign-in throttling that protects against password guessing without letting a stranger lock a
 * customer out of their own account.
 *
 * Failures are counted separately for each (account, source) pair:
 *  - a recognised device (one that has signed in to this account before, proven by a signed
 *    `vah_device` cookie) has its own allowance, so attempts from elsewhere never block it;
 *  - every other source is counted per visitor address;
 *  - all unrecognised sources together also share an account-wide ceiling, which stops slow,
 *    distributed guessing. Hitting it only affects unrecognised devices. A password reset clears it.
 * Unknown email addresses are counted the same way, so responses do not reveal which accounts exist.
 * The per-address limiter in app.ts (30 failed sign-ins per 15 minutes across all accounts) still applies.
 */
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { getPool } from '../db';
import { sessionCookieSecurityOptions } from '../../lib/cookies';

const MIN = 60 * 1000;
export const LIMITS = {
    visitor: { max: 5, windowMs: 15 * MIN, lockMs: 15 * MIN },
    device: { max: 10, windowMs: 15 * MIN, lockMs: 15 * MIN },
    untrustedAccount: { max: 50, windowMs: 24 * 60 * MIN, lockMs: 60 * MIN },
} as const;
type Limit = (typeof LIMITS)[keyof typeof LIMITS];

const DEVICE_COOKIE = 'vah_device';
const DEVICE_MAX_AGE_MS = 365 * 24 * 60 * MIN;

function deviceSecret(): string {
    const s = (process.env.JWT_SECRET || '').trim();
    if (!s) throw new Error('JWT_SECRET is required for device recognition');
    return crypto.createHash('sha256').update(`vah-device:${s}`).digest('hex');
}
const sign = (v: string) => crypto.createHmac('sha256', deviceSecret()).update(v).digest('hex');
const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex').slice(0, 32);

function readCookie(req: Request, name: string): string | null {
    const fromParser = (req as Request & { cookies?: Record<string, string> }).cookies?.[name];
    if (fromParser) return fromParser;
    const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
}

/** The device id if this request carries a valid device cookie for this account. */
export function recognisedDevice(req: Request, userId: number): string | null {
    const raw = readCookie(req, DEVICE_COOKIE);
    if (!raw) return null;
    const [uid, nonce, sig] = raw.split('.');
    if (!uid || !nonce || !sig || Number(uid) !== Number(userId)) return null;
    const expected = sign(`${uid}.${nonce}`);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return nonce;
}

export function rememberDevice(req: Request, res: Response, userId: number): void {
    const nonce = recognisedDevice(req, userId) ?? crypto.randomBytes(16).toString('hex');
    res.cookie(DEVICE_COOKIE, `${userId}.${nonce}.${sign(`${userId}.${nonce}`)}`, {
        ...sessionCookieSecurityOptions(),
        maxAge: DEVICE_MAX_AGE_MS,
    });
}

export const keys = {
    device: (userId: number, deviceId: string) => `u:${userId}:d:${hash(deviceId)}`,
    visitor: (userId: number, client: string) => `u:${userId}:v:${hash(client)}`,
    untrusted: (userId: number) => `u:${userId}:untrusted`,
    unknownEmail: (email: string, client: string) => `e:${hash(email.toLowerCase())}:v:${hash(client)}`,
};

/** Milliseconds until the key unlocks, or 0 if it is not locked. */
export async function lockedFor(key: string, now = Date.now()): Promise<number> {
    const r = await getPool().query('SELECT locked_until FROM login_throttle WHERE key = $1', [key]);
    const until = Number(r.rows[0]?.locked_until || 0);
    return until > now ? until - now : 0;
}

export async function recordFailure(key: string, limit: Limit, now = Date.now()): Promise<void> {
    // A lock that has expired, or a window that has passed, starts the count again.
    const restart = '(login_throttle.first_failure_at < $2::bigint - $4::bigint OR COALESCE(login_throttle.locked_until <= $2::bigint, false))';
    await getPool().query(
        `INSERT INTO login_throttle (key, failures, first_failure_at, locked_until)
         VALUES ($1::text, 1, $2::bigint, CASE WHEN 1 >= $3::int THEN $2::bigint + $5::bigint ELSE NULL END)
         ON CONFLICT (key) DO UPDATE SET
           failures = CASE WHEN ${restart} THEN 1 ELSE login_throttle.failures + 1 END,
           first_failure_at = CASE WHEN ${restart} THEN $2::bigint ELSE login_throttle.first_failure_at END,
           locked_until = CASE
             WHEN (CASE WHEN ${restart} THEN 1 ELSE login_throttle.failures + 1 END) >= $3::int THEN $2::bigint + $5::bigint
             WHEN ${restart} THEN NULL
             ELSE login_throttle.locked_until END`,
        [key, now, limit.max, limit.windowMs, limit.lockMs]
    );
}

export async function clearKey(key: string): Promise<void> {
    await getPool().query('DELETE FROM login_throttle WHERE key = $1', [key]);
}

/** Clears every counter for an account (password reset, or an administrator unlocking it). */
export async function clearAccount(userId: number): Promise<void> {
    await getPool().query('DELETE FROM login_throttle WHERE key LIKE $1', [`u:${Number(userId)}:%`]);
}
