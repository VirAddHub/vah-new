/**
 * GET /api/access
 * The access decision for the signed-in customer, for the frontend to choose a landing page and
 * show outstanding steps. While service is restricted it reports only HOW MANY mail items are
 * waiting, never anything about them.
 */
import { Router, Request, Response } from 'express';
import { getAccess, heldMailCount } from '../services/access';
import { logger } from '../../lib/logger';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ ok: false, error: 'unauthenticated' });
    try {
        const access = await getAccess(Number(user.id));
        if (!access) return res.status(401).json({ ok: false, error: 'unauthenticated' });
        const mailWaiting = access.level === 'full' ? null : await heldMailCount(Number(user.id));
        res.setHeader('Cache-Control', 'no-store, private');
        return res.json({ ok: true, data: { ...access, mailWaiting, isAdmin: !!user.is_admin } });
    } catch (e) {
        logger.error('[access] route_failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;
