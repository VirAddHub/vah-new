// src/server/routes/kyc.ts
// KYC verification endpoints (Sumsub integration)

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { sendKycSubmitted } from '../../lib/mailer';
import { buildAppUrl } from '../../lib/mailer';
import { sumsubFetch } from '../../lib/sumsub';
import { deriveKycStatusFromSumsubReview } from '../../lib/sumsubKycReview';
import { resolveSumsubApiConfig, resolveSumsubLevelName } from '../../lib/sumsubConfig';

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
        console.error('[GET /api/kyc/status] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});


/**
 * POST /api/kyc/start
 * Start KYC verification process with Sumsub
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
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

        const apiCfg = resolveSumsubApiConfig();
        if (!apiCfg) {
            console.error('[kyc/start] Sumsub not configured');
            return res.status(501).json({
                ok: false,
                status: 501,
                error: 'Sumsub not configured',
                code: 'SUMSUB_NOT_CONFIGURED',
                message:
                    'Sumsub credentials are missing. For live: SUMSUB_APP_TOKEN + SUMSUB_APP_SECRET or SUMSUB_SECRET_KEY. ' +
                    'For sandbox: SUMSUB_APP_TOKEN_SANDBOX + SUMSUB_SECRET_KEY_SANDBOX or SUMSUB_APP_SECRET_SANDBOX (live secrets are not used with the sandbox token).',
                debug: { hint: 'Do not set SUMSUB_SECRET_KEY if you only intend to use sandbox credentials.' },
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
            
            const created = await sumsubFetch("POST", "/resources/applicants", payload);
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
                    console.error('[kyc/start] kyc_submitted_email_failed_nonfatal', err);
                });
            } catch (emailError) {
                console.error('[kyc/start] kyc_submitted_email_error', emailError);
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
        console.error("[kyc/start]", e);
        const raw = e instanceof Error ? e.message : String(e);
        /** Short, user-facing hint (Sumsub errors often include JSON in the message). */
        let message = raw;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}\s*$/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as { description?: string; errorCode?: string; errorName?: string };
                if (parsed.description) message = parsed.description;
                else if (parsed.errorName && parsed.errorCode) message = `${parsed.errorName} (${parsed.errorCode})`;
            }
        } catch {
            /* keep raw */
        }
        if (message.length > 400) message = `${message.slice(0, 400)}…`;
        return res.status(500).json({
            ok: false,
            error: "sumsub_error",
            message,
        });
    }
});

/**
 * POST /api/kyc/upload-documents
 * Upload KYC documents (multipart/form-data)
 */
/**
 * POST /api/kyc/sync-from-sumsub
 * Pull latest applicant review from Sumsub API and update user.kyc_status.
 * Use when the dashboard is stale (e.g. webhook delayed, misconfigured secret, or local dev).
 */
router.post('/sync-from-sumsub', requireAuth, async (req: Request, res: Response) => {
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

        const applicantId = row.sumsub_applicant_id as string | null;
        if (!applicantId || !String(applicantId).trim()) {
            return res.status(400).json({
                ok: false,
                error: 'no_applicant',
                message: 'No Sumsub applicant on file yet. Start identity verification first.',
            });
        }

        if (!resolveSumsubApiConfig()) {
            return res.status(501).json({
                ok: false,
                error: 'SUMSUB_NOT_CONFIGURED',
                message: 'Sumsub API is not configured on the server.',
            });
        }

        const applicant = await sumsubFetch(
            'GET',
            `/resources/applicants/${encodeURIComponent(String(applicantId).trim())}/one`
        );

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

        await pool.query(
            `UPDATE "user"
             SET sumsub_review_status   = $1,
                 sumsub_last_updated    = $2,
                 sumsub_rejection_reason = $3
             WHERE id = $4`,
            [derived.statusLabel, now, rejectReason, userId]
        );

        const updates: string[] = ['kyc_status = $1', 'updated_at = $2'];
        const values: unknown[] = [kycStatus, now];
        let paramIndex = 3;

        if (kycStatus === 'approved' && previousKycStatus !== 'approved') {
            updates.push(`kyc_approved_at = $${paramIndex++}`);
            values.push(new Date().toISOString());
        }

        values.push(userId);
        await pool.query(`UPDATE "user" SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);

        return res.json({
            ok: true,
            data: {
                kyc_status: kycStatus,
                sumsubReviewStatus: derived.statusLabel,
            },
        });
    } catch (e) {
        console.error('[POST /api/kyc/sync-from-sumsub]', e);
        const message = e instanceof Error ? e.message : String(e);
        return res.status(502).json({
            ok: false,
            error: 'sumsub_sync_failed',
            message: message.length > 500 ? `${message.slice(0, 500)}…` : message,
        });
    }
});

router.post('/upload-documents', requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // TODO: Handle file upload with multer
        // TODO: Upload to Sumsub API
        // For now, just update status to pending

        await pool.query(`
            UPDATE "user"
            SET kyc_status = 'pending', updated_at = $1
            WHERE id = $2
        `, [Date.now(), userId]);

        return res.json({
            ok: true,
            message: 'Documents uploaded successfully. Your verification is being reviewed.'
        });
    } catch (error: any) {
        console.error('[POST /api/kyc/upload-documents] error:', error);
        return res.status(500).json({ ok: false, error: 'upload_error', message: error.message });
    }
});

export default router;
