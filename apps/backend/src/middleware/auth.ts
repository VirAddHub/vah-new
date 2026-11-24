import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, generateToken } from '../lib/jwt';
import { hasSessionVersionColumn, isPastAbsoluteLifetime, sessionVersionMatches } from '../lib/sessionVersion';
import { getPool } from '../server/db';
import { SESSION_IDLE_TIMEOUT_SECONDS, SESSION_REFRESH_THRESHOLD_SECONDS } from '../config/auth';
import { logger } from '../lib/logger';
import { sessionCookieSecurityOptions } from '../lib/cookies';
import { safeAccessPath } from '../lib/accessLog';
import { isAdminRole } from '../lib/isAdminRole';

function errorMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string') return msg;
    }
    return String(e);
}

/**
 * Public auth routes that don't require authentication and shouldn't log token verification failures
 * These routes handle their own authentication (login, signup, etc.)
 */
const PUBLIC_AUTH_ROUTES = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/reset-password/confirm',
];

/**
 * Check if a path is a public auth route
 */
function isPublicAuthRoute(path: string): boolean {
    return PUBLIC_AUTH_ROUTES.some(route => path === route || path.startsWith(route + '/'));
}

/**
 * Optional JWT authentication middleware
 * Verifies JWT token if present (from header or cookie) and attaches user to req.user
 * Does NOT require authentication - just sets req.user if valid token exists
 */
export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const headerToken = extractTokenFromHeader(authHeader);

    // Also check for JWT in cookie (for iframe authentication)
    const cookieToken = req.cookies?.vah_session;

    const token = headerToken || cookieToken;

    if (!token) {
        // No token provided - continue without setting req.user
        return next();
    }

    const payload = verifyToken(token);

    if (!payload) {
        // Invalid or expired token - clear cookie and continue without setting req.user
        // Don't log warnings for public auth routes (login, signup, etc.) as invalid tokens are expected
        if (!isPublicAuthRoute(req.path)) {
            logger.warn('[jwt] token_verification_failed', { path: req.path });
        }
        res.clearCookie('vah_session', sessionCookieSecurityOptions());
        return next();
    }

    // Check token expiration
    const nowSeconds = Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === 'number' ? payload.exp : 0;
    const secondsLeft = exp - nowSeconds;

    // If token is expired, clear cookie and continue as unauthenticated
    if (secondsLeft <= 0) {
        // Don't log warnings for public auth routes (login, signup, etc.) as expired tokens are expected
        if (!isPublicAuthRoute(req.path)) {
            logger.warn('[jwt] token_expired', { path: safeAccessPath(req) });
        }
        res.clearCookie('vah_session', sessionCookieSecurityOptions());
        return next();
    }

    // Absolute lifetime: a session cannot be extended forever by activity (security review F29).
    if (isPastAbsoluteLifetime(payload, nowSeconds)) {
        res.clearCookie('vah_session', sessionCookieSecurityOptions());
        return next();
    }

    const userId = typeof payload.id === 'string' ? parseInt(payload.id) : payload.id;

    // DB check: the account must still be active, and privilege comes from the database, never from
    // the token, so a demoted admin's old token carries no admin power (security review F26/R33).
    // The session version check revokes tokens after logout, password reset, email or role change (F20).
    const withVersion = await hasSessionVersionColumn();
    let statusResult;
    try {
        statusResult = await getPool().query(
            `SELECT id, email, is_admin, role${withVersion ? ', session_version' : ''} FROM "user"
             WHERE id = $1
               AND deleted_at IS NULL
               AND (suspended_at IS NULL OR suspended_at > NOW())
             LIMIT 1`,
            [userId]
        );
    } catch (err) {
        logger.error('[jwt] user_status_check_failed', { message: errorMessage(err) });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }

    if (statusResult.rows.length === 0) {
        // User is suspended, deleted, or does not exist — revoke session
        res.clearCookie('vah_session', sessionCookieSecurityOptions());
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const dbUser = statusResult.rows[0];
    if (withVersion && !sessionVersionMatches(payload, dbUser.session_version)) {
        res.clearCookie('vah_session', sessionCookieSecurityOptions());
        return res.status(401).json({ ok: false, error: 'session_revoked' });
    }

    const user = {
        id: userId,
        email: dbUser.email || payload.email || '',
        is_admin: Boolean(dbUser.is_admin),
        role: typeof dbUser.role === 'string' ? dbUser.role : undefined,
    };

    req.user = user;
    if (process.env.NODE_ENV !== 'production') {
        logger.debug('[jwt] authenticated', { userId: user.id, is_admin: Boolean(user.is_admin) });
    }

    // Rolling session refresh: if the token has less than REFRESH_THRESHOLD_SECONDS left, issue a new
    // one from current database values, keeping the original sign-in time and session version.
    if (secondsLeft > 0 && secondsLeft < SESSION_REFRESH_THRESHOLD_SECONDS && !res.headersSent) {
        const newToken = generateToken({
            id: dbUser.id,
            email: dbUser.email,
            is_admin: Boolean(dbUser.is_admin),
            role: dbUser.role || (dbUser.is_admin ? 'admin' : 'user'),
            sv: withVersion ? Number(dbUser.session_version ?? 0) : undefined,
            auth_time: typeof payload.auth_time === 'number' ? payload.auth_time : payload.iat,
        });
        res.cookie('vah_session', newToken, {
            ...sessionCookieSecurityOptions(),
            maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 1000,
        });
    }

    // Update last_active_at asynchronously (don't wait for it)
    updateUserActivity(userId).catch(err => {
        logger.warn('[activity] last_active_at_update_failed', { message: errorMessage(err) });
    });

    next();
}

/**
 * Update user's last activity timestamp
 */
async function updateUserActivity(userId: number): Promise<void> {
    try {
        const pool = getPool();
        await pool.query(
            'UPDATE "user" SET last_active_at = $1 WHERE id = $2',
            [Date.now(), userId]
        );
    } catch (error: unknown) {
        // Silently fail - don't disrupt the request
        logger.warn('[activity] last_active_at_update_error', { message: errorMessage(error) });
    }
}

/**
 * Require authentication middleware
 * Returns 401 if no valid JWT token is present
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * Require admin middleware
 * Returns 401 if not authenticated, 403 if not admin
 * Verifies against DB that the user still exists, is not deleted/suspended,
 * and still holds is_admin=true — so a revoked admin cannot reuse a valid JWT.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }

    // Fast JWT pre-check: reject obviously non-admin tokens before hitting the DB
    if (!Boolean(req.user?.is_admin) && !isAdminRole(req.user?.role)) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    // DB verification: confirm the user still exists, is active, and is still an admin
    const userId = req.user.id;
    getPool().query(
        `SELECT is_admin FROM "user"
         WHERE id = $1
           AND deleted_at IS NULL
           AND (suspended_at IS NULL OR suspended_at > NOW())
         LIMIT 1`,
        [userId]
    ).then((result) => {
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }
        next();
    }).catch((err) => {
        logger.error('[auth] require_admin_db_check_failed', { message: errorMessage(err) });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    });
}

/**
 * Require an active subscription.
 * Returns 401 if not authenticated, 403 with reason if subscription is not active.
 * Admin users bypass this check.
 */
export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    if (req.user?.is_admin) {
        return next();
    }
    const pool = getPool();
    pool.query(
        `SELECT s.status, u.status AS account_status FROM "user" u LEFT JOIN subscription s ON s.user_id = u.id WHERE u.id = $1 LIMIT 1`,
        [req.user.id]
    ).then(result => {
        if (result.rows[0]?.account_status === 'suspended') {
            return res.status(403).json({ ok: false, error: 'account_suspended', message: 'Your account is suspended. Please contact support.' });
        }
        if (result.rows.length === 0 || result.rows[0].status !== 'active') {
            return res.status(403).json({
                ok: false,
                error: 'subscription_required',
                message: 'An active subscription is required to access this resource.',
            });
        }
        next();
    }).catch(err => {
        logger.error('[auth] subscription_check_failed', { message: errorMessage(err) });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    });
}
