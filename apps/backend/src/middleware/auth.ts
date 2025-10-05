import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/jwt';
import { getPool } from '../server/db';

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
        // Invalid or expired token - continue without setting req.user
        console.warn('[JWT] Token verification failed for path:', req.path);
        return next();
    }

    // Valid token - attach user data to request
    // Convert id to number if it's a string
    req.user = {
        id: typeof payload.id === 'string' ? parseInt(payload.id) : payload.id,
        email: payload.email,
        is_admin: payload.is_admin
    };
    console.log('[JWT] Authenticated user:', req.user.id, req.user.email, 'is_admin:', req.user.is_admin);

    // Update last_active_at asynchronously (don't wait for it)
    updateUserActivity(req.user.id).catch(err => {
        console.error('[Activity] Failed to update last_active_at:', err);
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
    } catch (error) {
        // Silently fail - don't disrupt the request
        console.error('[Activity] Error updating user activity:', error);
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
