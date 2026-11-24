import { kycAutoApproveForTesting } from '../../config/testingSwitches';
// src/server/routes/kyc.ts
// KYC verification endpoints (Sumsub integration)

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { sendKycSubmitted } from '../../lib/mailer';
import { buildAppUrl } from '../../lib/mailer';
import { sumsubFetch, sumsubGetApplicantForUserSync } from '../../lib/sumsub';
import { deriveKycStatusFromSumsubReview } from '../../lib/sumsubKycReview';
import { resolveSumsubApiConfig, resolveSumsubLevelName } from '../../lib/sumsubConfig';
import { kycWriteUserLimiter } from '../../lib/routeGroupRateLimits';
import { safeErrorMessage } from '../../lib/safeError';
import { logger } from '../../lib/logger';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/kyc/status
 * Get KYC status for current user
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                kyc_status,
                COALESCE(kyc_verified_at_ms, kyc_verified_at) AS kyc_verified_at,
                kyc_rejection_reason,
                sumsub_applicant_id
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        return res.json({
            ok: true,
            data: {
                status: user.kyc_status || 'not_started',
                verified_at: user.kyc_verified_at,
                rejection_reason: user.kyc_rejection_reason,
                applicant_id: user.sumsub_applicant_id
            }
        });
    } catch (error: any) {
        logger.error('[GET /api/kyc/status] error:', { error });
        return res.status(500).json({ ok: false, error: 'database_error', message: safeErrorMessage(error) });
    }
});


/**
 * POST /api/kyc/start
 * Start KYC verification process with Sumsub
 */
router.post('/start', requireAuth, kycWriteUserLimiter, async (req: Request, res: Response) => {
    try {
        if (!req.user || req.user.id == null) {
            return res.status(401).json({ ok: false, error: "unauthenticated", message: "Please log in to start verification." });
        }
        const userId = Number(req.user.id);
        if (!Number.isFinite(userId)) {
            return res.status(401).json({ ok: false, error: "unauthenticated", message: "Please log in to start verification." });
        }

        const pool = getPool();
        const userResult = await pool.query(
            `SELECT id, email, first_name, last_name, sumsub_applicant_id FROM "user" WHERE id = $1`, 
            [userId]
        );
        const user = userResult.rows[0];
        
        if (!user) {
            return res.status(404).json({ ok: false, error: "user_not_found" });
        }

        // TEMPORARY testing switch: approve straight away without Sumsub (see config/testingSwitches.ts).
        if (kycAutoApproveForTesting()) {
            await pool.query(
                `UPDATE "user"
                    SET kyc_status = 'approved',
                        kyc_approved_at = COALESCE(kyc_approved_at, NOW()),
                        sumsub_review_status = 'auto_approved_testing',
                        updated_at = $2
                  WHERE id = $1`,
                [userId, Date.now()]
            );
            const { logVerificationEvent } = await import('../services/verificationEventLog');
            await logVerificationEvent('user', userId, 'verified', { reason: 'auto_approved_testing' }).catch(() => undefined);
            logger.warn('[kyc/start] auto-approved (KYC_AUTO_APPROVE_FOR_TESTING is on)', { userId });
            return res.json({ ok: true, auto_approved: true });
        }

        const apiCfg = resolveSumsubApiConfig();
        if (!apiCfg) {
            logger.error('[kyc/start] Sumsub not configured');
            return res.status(501).json({
                ok: false,
                status: 501,
                error: 'kyc_service_unavailable',
                message: 'Identity verification is currently unavailable. Please contact support.',
            });
        }

        const { levelName } = resolveSumsubLevelName(apiCfg.mode, 'id-and-liveness');

        // Ensure applicant exists
        let applicantId = user.sumsub_applicant_id;
        if (!applicantId) {
            const payload = {
                externalUserId: String(user.id),
                email: user.email,
                info: {
                    firstName: user.first_name || "",
                    lastName: user.last_name || "",
                },
            };
            
            const created = await sumsubFetch("POST", `/resources/applicants?levelName=${encodeURIComponent(levelName)}`, payload);
            applicantId = created?.id;
            if (!applicantId) throw new Error("No applicant id from Sumsub");

            await pool.query(
                `UPDATE "user" SET sumsub_applicant_id = $1 WHERE id = $2`, 
                [applicantId, user.id]
            );

            // Send KYC submitted email (non-blocking) - only for new applicants
            try {
                sendKycSubmitted({
                    email: user.email,
                    firstName: user.first_name || undefined,
                    name: user.last_name ? [user.first_name, user.last_name].filter(Boolean).join(' ') : user.first_name || undefined,
                    cta_url: buildAppUrl('/profile'),
                }).catch((err: any) => {
                    logger.error('[kyc/start] kyc_submitted_email_failed_nonfatal', { error: err });
                });
            } catch (emailError) {
                logger.error('[kyc/start] kyc_submitted_email_error', { error: emailError });
            }
        }

        // Access token for Web SDK / Mobile SDK
        const tokenBody = {
            userId: String(user.id),
            levelName: levelName,
            ttlInSecs: 600,
            applicantIdentifiers: {
                email: user.email,
            },
        };

        const tokenResp = await sumsubFetch("POST", "/resources/accessTokens/sdk", tokenBody);

        if (!tokenResp?.token) {
            throw new Error("No token in Sumsub response");
        }

        return res.json({ ok: true, token: tokenResp.token, applicantId });
    } catch (e) {
        // Provider error text stays in the server log; the customer gets a fixed message
        // (security review F17).
        const raw = e instanceof Error ? e.message : String(e);
        let providerCode: string | undefined;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}\s*$/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as { errorCode?: string | number; errorName?: string };
                providerCode = [parsed.errorName, parsed.errorCode].filter(Boolean).join(':') || undefined;
            }
        } catch {
            /* not JSON */
        }
        logger.error('[kyc/start] error', { message: raw.slice(0, 500), providerCode });
        return res.status(500).json({
            ok: false,
            error: "sumsub_error",
            message: "We couldn't start identity verification just now. Please try again in a few minutes.",
        });
    }
});

/**
 * POST /api/kyc/sync-from-sumsub
 * Pull latest applicant review from Sumsub API and update user.kyc_status.
 * Use when the dashboard is stale (e.g. webhook delayed, misconfigured secret, or local dev).
 */
router.post('/sync-from-sumsub', requireAuth, kycWriteUserLimiter, async (req: Request, res: Response) => {
    try {
        const userId = Number(req.user!.id);
        if (!Number.isFinite(userId)) {
            return res.status(401).json({ ok: false, error: 'unauthenticated' });
        }

        const pool = getPool();
        const userResult = await pool.query(
            `SELECT id, kyc_status, sumsub_applicant_id FROM "user" WHERE id = $1`,
            [userId]
        );
        const row = userResult.rows[0];
        if (!row) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const storedApplicantIdRaw = row.sumsub_applicant_id as string | null;
        const storedApplicantId =
            storedApplicantIdRaw && String(storedApplicantIdRaw).trim()
                ? String(storedApplicantIdRaw).trim()
                : null;

        if (!resolveSumsubApiConfig()) {
            return res.status(501).json({
                ok: false,
                error: 'SUMSUB_NOT_CONFIGURED',
                message: 'Sumsub API is not configured on the server.',
            });
        }

        let applicant: any;
        let resolvedApplicantId: string;
        try {
            const got = await sumsubGetApplicantForUserSync({
                storedApplicantId,
                externalUserId: userId,
            });
            applicant = got.applicant;
            resolvedApplicantId = got.resolvedApplicantId;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/404/.test(msg) || /not found/i.test(msg)) {
                return res.status(400).json({
                    ok: false,
                    error: 'no_applicant',
                    message:
                        'No Sumsub applicant found for this account. Complete identity verification once, then try again.',
                });
            }
            throw e;
        }

        const derived = deriveKycStatusFromSumsubReview(applicant?.review);
        const kycStatus =
            derived.kycStatus === 'approved'
                ? 'approved'
                : derived.kycStatus === 'rejected'
                  ? 'rejected'
                  : 'pending';

        const previousKycStatus = row.kyc_status as string;
        const now = Date.now();
        const rejectReason = derived.kycStatus === 'rejected' ? derived.rejectReason : null;

        // One UPDATE: requires columns from migration 055_user_sumsub_and_kyc_approval_columns.sql
        let p = 1;
        const sets: string[] = [
            `kyc_status = $${p++}`,
            `updated_at = $${p++}`,
            `sumsub_review_status = $${p++}`,
            `sumsub_last_updated = $${p++}`,
            `sumsub_rejection_reason = $${p++}`,
            `sumsub_applicant_id = $${p++}`,
        ];
        const vals: unknown[] = [
            kycStatus,
            now,
            derived.statusLabel,
            now,
            rejectReason,
            resolvedApplicantId,
        ];

        if (kycStatus === 'approved' && previousKycStatus !== 'approved') {
            sets.push(`kyc_approved_at = $${p++}`);
            vals.push(new Date().toISOString());
        }

        vals.push(userId);
        await pool.query(`UPDATE "user" SET ${sets.join(', ')} WHERE id = $${p}`, vals);

        return res.json({
            ok: true,
            data: {
                kyc_status: kycStatus,
                sumsubReviewStatus: derived.statusLabel,
                sumsub_applicant_id: resolvedApplicantId,
            },
        });
    } catch (e) {
        logger.error('[POST /api/kyc/sync-from-sumsub] error', { error: e });
        const message = safeErrorMessage(e);
        return res.status(502).json({
            ok: false,
            error: 'sumsub_sync_failed',
            message,
        });
    }
});

router.post('/upload-documents', requireAuth, kycWriteUserLimiter, async (req: Request, res: Response) => {
    // M-6 fix: This endpoint is not yet implemented. Returning 501 instead of
    // silently mutating kyc_status to 'pending' for any authenticated user.
    return res.status(501).json({
        ok: false,
        error: 'not_implemented',
        message: 'Document upload is not yet available. Please use the identity verification flow instead.',
    });
});

export default router;
