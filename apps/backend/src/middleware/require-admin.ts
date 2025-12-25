// apps/backend/src/middleware/require-admin.ts
import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    
    // No user session at all
    if (!user) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    
    // User exists but not admin
    if (!(user.is_admin || user.is_staff)) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    
    // Admin access granted - no logging for performance
    next();
}
