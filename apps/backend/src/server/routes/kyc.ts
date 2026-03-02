// src/server/routes/kyc.ts
// KYC verification endpoints (Sumsub integration)

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { sendKycSubmitted } from '../../lib/mailer';
import { buildAppUrl } from '../../lib/mailer';

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
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user info
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name, kyc_status, sumsub_applicant_id
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];

        // If already has applicant ID, return existing
        if (user.sumsub_applicant_id) {
            // TODO: Generate new access token for existing applicant
            // const sumsubToken = await generateSumsubToken(user.sumsub_applicant_id);

            return res.json({
                ok: true,
                applicant_id: user.sumsub_applicant_id,
                // access_token: sumsubToken,
                status: user.kyc_status || 'pending',
                message: 'Using existing KYC application'
            });
        }

        // TODO: Create Sumsub applicant
        // In production, integrate with Sumsub API:
        // const sumsub = require('sumsub-api-client');
        // const applicant = await sumsub.createApplicant({
        //     externalUserId: userId.toString(),
        //     email: user.email,
        //     info: {
        //         firstName: user.first_name,
        //         lastName: user.last_name
        //     }
        // });

        // Mock applicant ID for now
        const mockApplicantId = `APPL${Date.now()}`;

        // Update user with applicant ID and set status to pending
        await pool.query(`
            UPDATE "user"
            SET
                sumsub_applicant_id = $1,
                kyc_status = 'pending',
                updated_at = $2
            WHERE id = $3
        `, [mockApplicantId, Date.now(), userId]);

        // Create notification
        await pool.query(`
            INSERT INTO notification (user_id, type, title, body, read, created_at)
            VALUES ($1, 'kyc_started', 'KYC Verification Started', 'Your identity verification has been initiated. Please upload your documents.', false, $2)
        `, [userId, Date.now()]);

        // Send "KYC submitted" email (user has started verification / submitted for review)
        sendKycSubmitted({
            email: user.email,
            firstName: user.first_name || undefined,
            name: user.last_name ? [user.first_name, user.last_name].filter(Boolean).join(' ') : user.first_name || undefined,
            cta_url: buildAppUrl('/account/verification'),
        }).catch((err) => {
            console.error('[POST /api/kyc/start] Failed to send KYC submitted email:', err);
        });

        return res.json({
            ok: true,
            applicant_id: mockApplicantId,
            // access_token: mockToken,
            status: 'pending',
            // sumsub_url: `https://sumsub.com/idensic/...`,
            message: 'KYC verification started. Please complete the verification process.'
        });
    } catch (error: any) {
        console.error('[POST /api/kyc/start] error:', error);
        return res.status(500).json({ ok: false, error: 'kyc_start_error', message: error.message });
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
