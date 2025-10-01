import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../lib/jwt';

/**
 * Optional JWT authentication middleware
 * Verifies JWT token if present and attaches user to req.user
 * Does NOT require authentication - just sets req.user if valid token exists
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
        // No token provided - continue without setting req.user
        return next();
    }

    const payload = verifyToken(token);

    if (!payload) {
        // Invalid or expired token - continue without setting req.user
        return next();
    }

    // Valid token - attach user data to request
    // Convert id to number if it's a string
    req.user = {
        id: typeof payload.id === 'string' ? parseInt(payload.id) : payload.id,
        email: payload.email,
        is_admin: payload.is_admin
    };
    next();
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
