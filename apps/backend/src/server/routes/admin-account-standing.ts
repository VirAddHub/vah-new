/**
 * Account standing: suspend, restore, close. Admin only, each with a recorded reason and an
 * audit row. Standing overrides payment and verification (services/access.ts); Stripe and identity-verification results
 * events never change it.
 *
 * What these actions do NOT do: they do not cancel or refund anything in Stripe. If the account
 * has a live Stripe subscription the response says so explicitly (stripe: 'action_required') so
 * the admin is never shown a false "cancelled". Cancelling in Stripe is outstanding provider work.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPool, connectForRequest } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { logger } from '../../lib/logger';
import { getAccess, standingOf } from '../services/access';

const router = Router();

const Body = z.object({ reason: z.string().trim().min(5, 'A reason of at least 5 characters is required').max(1000) });
type Action = 'suspend' | 'restore' | 'close';

async function act(req: Request, res: Response, action: Action) {
    const admin = (req as any).user;
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ ok: false, error: 'invalid_id' });
    const parsed = Body.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'reason_required', message: parsed.error.issues[0]?.message });
    const reason = parsed.data.reason;
    if (userId === Number(admin.id)) return res.status(400).json({ ok: false, error: 'cannot_change_own_account' });

    const db = await connectForRequest(res);
    try {
        await db.query('BEGIN');
        const cur = await db.query(
            `SELECT id, email, status, deleted_at, suspended_at, is_admin FROM "user" WHERE id = $1 FOR UPDATE`, [userId]);
        const u = cur.rows[0];
        if (!u) { await db.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'not_found' }); }
        if (u.is_admin) { await db.query('ROLLBACK'); return res.status(400).json({ ok: false, error: 'cannot_change_admin_account' }); }

        const before = standingOf(u);
        const allowed: Record<Action, string[]> = { suspend: ['good'], restore: ['suspended', 'closed'], close: ['good', 'suspended'] };
        if (!allowed[action].includes(before)) {
            await db.query('ROLLBACK');
            return res.status(409).json({ ok: false, error: 'invalid_standing_change', message: `Account is ${before}; cannot ${action}.`, standing: before });
        }

        const now = Date.now();
        if (action === 'suspend') {
            await db.query(`UPDATE "user" SET status = 'suspended', suspended_at = NOW(), standing_reason = $2, standing_changed_at_ms = $3, standing_changed_by = $4, updated_at = $3 WHERE id = $1`,
                [userId, reason, now, admin.id]);
        } else if (action === 'close') {
            await db.query(`UPDATE "user" SET status = 'closed', deleted_at = NOW(), suspended_at = NULL, standing_reason = $2, standing_changed_at_ms = $3, standing_changed_by = $4, updated_at = $3 WHERE id = $1`,
                [userId, reason, now, admin.id]);
        } else {
            await db.query(`UPDATE "user" SET status = 'active', deleted_at = NULL, suspended_at = NULL, standing_reason = $2, standing_changed_at_ms = $3, standing_changed_by = $4, updated_at = $3 WHERE id = $1`,
                [userId, reason, now, admin.id]);
        }
        await db.query(
            `INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, $2, 'user', $3, $4, NOW())`,
            [admin.id, `account_${action}`, userId, JSON.stringify({ reason, from: before, to: action === 'suspend' ? 'suspended' : action === 'close' ? 'closed' : 'good' })]);
        const sub = (await db.query(`SELECT status, stripe_subscription_id, cancel_at_period_end FROM subscription WHERE user_id = $1`, [userId])).rows[0];
        await db.query('COMMIT');

        const liveStripe = !!sub?.stripe_subscription_id && (sub.status === 'active' || sub.status === 'past_due');
        const access = await getAccess(userId);
        logger.info('[admin] account_standing_changed', { adminId: admin.id, userId, action, from: before });
        return res.json({
            ok: true,
            data: {
                user_id: userId,
                standing: access?.standing ?? null,
                access_level: access?.level ?? null,
                // Billing is NOT changed by this action.
                stripe: !liveStripe
                    ? { status: 'none', message: 'No live Stripe subscription.' }
                    : action === 'restore'
                        ? { status: 'unchanged', message: 'Billing was not changed. The Stripe subscription is still live.' }
                        : { status: 'action_required', message: 'This account still has a live Stripe subscription. It has NOT been cancelled or refunded. Cancel it in the Stripe dashboard if required.' },
            },
        });
    } catch (e) {
        await db.query('ROLLBACK').catch(() => {});
        logger.error('[admin] account_standing_failed', { action, userId, message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
}

router.post('/users/:id/suspend', requireAdmin, (req, res) => act(req, res, 'suspend'));
router.post('/users/:id/restore-standing', requireAdmin, (req, res) => act(req, res, 'restore'));
router.post('/users/:id/close', requireAdmin, (req, res) => act(req, res, 'close'));

/** Standing, access decision and the audit trail for one account. */
router.get('/users/:id/standing', requireAdmin, async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ ok: false, error: 'invalid_id' });
    try {
        const pool = getPool();
        const u = (await pool.query(`SELECT id, status, deleted_at, suspended_at, standing_reason, standing_changed_at_ms, standing_changed_by FROM "user" WHERE id = $1`, [userId])).rows[0];
        if (!u) return res.status(404).json({ ok: false, error: 'not_found' });
        const history = await pool.query(
            `SELECT a.id, a.action, a.details, a.created_at, a.admin_id, ad.email AS admin_email
               FROM admin_audit a LEFT JOIN "user" ad ON ad.id = a.admin_id
              WHERE a.target_type = 'user' AND a.target_id = $1 AND a.action IN ('account_suspend','account_restore','account_close')
              ORDER BY a.created_at DESC, a.id DESC LIMIT 100`, [userId]);
        return res.json({
            ok: true,
            data: {
                standing: standingOf(u), reason: u.standing_reason ?? null,
                changed_at_ms: u.standing_changed_at_ms != null ? Number(u.standing_changed_at_ms) : null,
                access: await getAccess(userId),
                history: history.rows.map(r => ({ ...r, details: (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() })),
            },
        });
    } catch (e) {
        logger.error('[admin] standing_read_failed', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
});

export default router;
