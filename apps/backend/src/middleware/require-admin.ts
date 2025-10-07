// apps/backend/src/middleware/require-admin.ts
import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    
    // No user session at all
    if (!user) {
        console.log('[requireAdmin] No user session for path:', req.originalUrl);
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    
    // User exists but not admin
    if (!(user.is_admin || (user as any).is_staff)) {
        console.log('[requireAdmin] Non-admin user attempted admin access:', {
            userId: user.id,
            email: user.email,
            is_admin: user.is_admin,
            path: req.originalUrl
        });
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    
    console.log('[requireAdmin] Admin access granted for user:', user.id, user.email);
    next();
}
