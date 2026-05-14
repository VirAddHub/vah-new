// apps/backend/src/middleware/require-admin.ts
import { Request, Response, NextFunction } from 'express';
import { isAdminRole } from '../lib/isAdminRole';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    // No user session at all
    if (!user) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    // Accept is_admin flag, is_staff flag, or an admin-level role string
    const isAdmin = Boolean(user.is_admin) || Boolean(user.is_staff) || isAdminRole(user.role);

    // User exists but not admin
    if (!isAdmin) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    // Admin access granted - no logging for performance
    next();
}
