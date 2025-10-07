// apps/backend/src/middleware/require-admin.ts
import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user || !(user.is_admin || (user as any).is_staff)) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    next();
}
