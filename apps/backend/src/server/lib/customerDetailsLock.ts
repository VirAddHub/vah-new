/**
 * Customer details are fixed at sign-up. A signed-in customer may change only their email address
 * (with confirmation) and their password (by emailed link). Everything else is changed by an
 * administrator on request (admin routes are unaffected). Admins pass this gate.
 */
import type { Request, Response, NextFunction } from 'express';

export const SUPPORT_REQUIRED = {
    ok: false,
    error: 'support_required',
    message: 'These details are fixed after sign-up. Please contact support to change them.',
} as const;

export function customerDetailsLocked(req: Request, res: Response, next: NextFunction) {
    if ((req as any).user?.is_admin) return next();
    return res.status(403).json(SUPPORT_REQUIRED);
}
