// apps/backend/src/middleware/require-admin.ts
import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    console.log('[requireAdmin] User:', user ? { id: user.id, email: user.email, is_admin: user.is_admin } : 'null');
    if (!user || !(user.is_admin || (user as any).is_staff)) {
        console.log('[requireAdmin] Access denied for user:', user);
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    console.log('[requireAdmin] Access granted for user:', user.id);
    next();
}
