// src/server/routes/kyc.ts
// KYC verification endpoints (Sumsub integration)

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { sendKycSubmitted } from '../../lib/mailer';
import { buildAppUrl } from '../../lib/mailer';
import { sumsubFetch } from '../../lib/sumsub';

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

        // Check if Sumsub credentials are configured
        // Support old, new and sandbox env var names
        const appToken = process.env.SUMSUB_APP_TOKEN || process.env.SUMSUB_APP_TOKEN_SANDBOX;
        const appSecret = process.env.SUMSUB_APP_SECRET || process.env.SUMSUB_SECRET_KEY || process.env.SUMSUB_SECRET_KEY_SANDBOX;
        const levelName = process.env.SUMSUB_LEVEL || process.env.SUMSUB_LEVEL_NAME || process.env.SUMSUB_LEVEL_NAME_SANDBOX || "basic-kyc";
        const baseUrl = process.env.SUMSUB_BASE_URL || process.env.SUMSUB_API || process.env.SUMSUB_BASE_URL_SANDBOX || process.env.SUMSUB_API_SANDBOX || "https://api.sumsub.com";

        if (!appToken || !appSecret) {
            console.error('[kyc/start] Sumsub not configured', {
                hasAppToken: !!appToken,
                hasAppSecret: !!appSecret,
                hasLevelName: !!levelName,
                hasBaseUrl: !!baseUrl,
            });
            return res.status(501).json({
                ok: false,
                status: 501,
                error: 'Sumsub not configured',
                code: 'SUMSUB_NOT_CONFIGURED',
                message: 'Sumsub credentials are missing. Please configure SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY (or SUMSUB_APP_SECRET) environment variables.',
                debug: { hasAppToken: !!appToken, hasAppSecret: !!appSecret, hasLevelName: !!levelName, hasBaseUrl: !!baseUrl }
            });
        }

        // Ensure applicant exists
        let applicantId = user.sumsub_applicant_id;
        if (!applicantId) {
            const payload = {
                externalUserId: String(user.id),
                email: user.email,
                info: {
                    firstName: user.first_name || "",
                    lastName: user.last_name || "",
                    country: "",
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
        return res.status(500).json({ ok: false, error: "server_error" });
    }
});

/**
 * POST /api/kyc/upload-documents
 * Upload KYC documents (multipart/form-data)
 */
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
