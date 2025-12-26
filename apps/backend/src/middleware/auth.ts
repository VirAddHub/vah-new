import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, generateToken } from '../lib/jwt';
import { getPool } from '../server/db';
import { SESSION_IDLE_TIMEOUT_SECONDS, SESSION_REFRESH_THRESHOLD_SECONDS } from '../config/auth';
import { logger } from '../lib/logger';

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
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
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
        res.clearCookie('vah_session', { path: '/', httpOnly: true, secure: true, sameSite: 'none' });
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
            logger.warn('[jwt] token_expired', { path: req.path });
        }
        res.clearCookie('vah_session', { path: '/', httpOnly: true, secure: true, sameSite: 'none' });
        return next();
    }

    // Valid token - attach user data to request
    // Convert id to number if it's a string
    const userId = typeof payload.id === 'string' ? parseInt(payload.id) : payload.id;
    const user = {
        id: userId,
        email: payload.email || '',
        is_admin: payload.is_admin,
    };
    req.user = user;
    if (process.env.NODE_ENV !== 'production') {
        logger.debug('[jwt] authenticated', { userId: user.id, is_admin: Boolean(user.is_admin) });
    }

    // Rolling session refresh: if token has less than REFRESH_THRESHOLD_SECONDS remaining, issue a new token
    if (secondsLeft > 0 && secondsLeft < SESSION_REFRESH_THRESHOLD_SECONDS) {
        // Fetch user data to create new token
        getPool().query(
            'SELECT id, email, is_admin, role FROM "user" WHERE id = $1',
            [userId]
        ).then((result) => {
            // Guard: don't set cookies if headers already sent
            if (res.headersSent) {
                logger.warn('[jwt] cannot_refresh_headers_sent', { userId });
                return;
            }

            if (result.rows.length > 0) {
                const user = result.rows[0];
                const newToken = generateToken({
                    id: user.id,
                    email: user.email,
                    is_admin: user.is_admin,
                    role: user.role || (user.is_admin ? 'admin' : 'user')
                });

                // Set new cookie with refreshed token (only if headers not sent)
                if (!res.headersSent) {
                    res.cookie('vah_session', newToken, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        path: '/',
                        maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 1000, // 60 minutes
                    });
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug('[jwt] token_refreshed', { userId });
                    }
                }
            }
        }).catch((err) => {
            logger.warn('[jwt] refresh_failed_nonfatal', { message: errorMessage(err) });
            // Don't fail the request if refresh fails
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
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    if (!req.user?.is_admin) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    next();
}
