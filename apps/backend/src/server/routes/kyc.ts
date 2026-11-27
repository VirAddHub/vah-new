// src/server/routes/kyc.ts
// Identity verification for the signed-in customer, independent of provider.
// See services/identityVerification.ts: no provider is connected yet, so customers cannot complete
// verification online; administrators record results they establish (admin identity routes).

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { kycWriteUserLimiter } from '../../lib/routeGroupRateLimits';
import { safeErrorMessage } from '../../lib/safeError';
import { logger } from '../../lib/logger';
import { canSelfVerify, identityProviderStatus, IDENTITY_UNAVAILABLE_MESSAGE } from '../services/identityVerification';
import { logVerificationEvent } from '../services/verificationEventLog';

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) return res.status(401).json({ ok: false, error: 'unauthenticated' });
    next();
}

/** GET /api/kyc/status — the customer's identity verification status. */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
    try {
        const r = await getPool().query(
            `SELECT kyc_status, COALESCE(kyc_verified_at_ms, kyc_verified_at) AS kyc_verified_at, kyc_rejection_reason, identity_submitted_at
               FROM "user" WHERE id = $1`, [req.user!.id]);
        if (!r.rows.length) return res.status(404).json({ ok: false, error: 'user_not_found' });
        const u = r.rows[0];
        return res.json({ ok: true, data: {
            status: u.kyc_status || 'not_started',
            verified_at: u.kyc_verified_at,
            rejection_reason: u.kyc_rejection_reason,
            submitted_at: u.identity_submitted_at,
            online_verification: canSelfVerify() !== 'unavailable',
        } });
    } catch (error: any) {
        logger.error('[GET /api/kyc/status] error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});

/**
 * POST /api/kyc/start — start online identity verification.
 * Without a connected provider this answers 503 identity_verification_unavailable, unless the
 * KYC_AUTO_APPROVE_FOR_TESTING switch is on (test accounts only; must be off before launch).
 */
router.post('/start', requireAuth, kycWriteUserLimiter, async (req: Request, res: Response) => {
    const userId = Number(req.user!.id);
    try {
        if (canSelfVerify() === 'testing') {
            const r = await getPool().query(
                `UPDATE "user" SET kyc_status = 'approved', kyc_approved_at = COALESCE(kyc_approved_at, NOW()),
                        identity_submitted_at = COALESCE(identity_submitted_at, NOW()), updated_at = $2
                  WHERE id = $1 RETURNING id`, [userId, Date.now()]);
            if (!r.rows.length) return res.status(404).json({ ok: false, error: 'user_not_found' });
            await getPool().query(
                `INSERT INTO identity_check (user_id, subject, outcome, method, notes) VALUES ($1, 'account_holder', 'verified', 'testing', 'KYC_AUTO_APPROVE_FOR_TESTING')`,
                [userId]).catch(() => undefined);
            await logVerificationEvent('user', userId, 'verified', { reason: 'auto_approved_testing' });
            logger.warn('[kyc/start] auto-approved (KYC_AUTO_APPROVE_FOR_TESTING is on)', { userId });
            return res.json({ ok: true, auto_approved: true });
        }
        // A tested provider integration would start here. None exists yet.
        return res.status(503).json({
            ok: false, error: 'identity_verification_unavailable', message: IDENTITY_UNAVAILABLE_MESSAGE,
            provider: identityProviderStatus(),
        });
    } catch (e) {
        logger.error('[POST /api/kyc/start] error', { message: (e as Error)?.message });
        return res.status(500).json({ ok: false, error: 'server_error', message: safeErrorMessage(e) });
    }
});

router.post('/upload-documents', requireAuth, kycWriteUserLimiter, async (_req: Request, res: Response) => {
    return res.status(501).json({ ok: false, error: 'not_implemented', message: 'Document upload is not available. We will contact you about identity verification.' });
});

export default router;
