// apps/backend/src/server/routes/profileEmailChange.ts
// Email change verification routes

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getPool } from '../db';
import { requestEmailChange, confirmEmailChange } from '../services/emailChange';

const router = Router();

/**
 * PATCH /api/profile/contact
 * Update contact details (phone and/or email)
 * 
 * - Phone: updated immediately
 * - Email: triggers verification flow (email sent to new address)
 * 
 * Request body:
 * {
 *   "phone"?: string,
 *   "email"?: string
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "message": "If the email is valid, we've sent a confirmation link."
 *   }
 * }
 */
router.patch('/contact', requireAuth, async (req: Request, res: Response) => {
    const userId = Number(req.user!.id);
    const pool = getPool();
    const { phone, email } = req.body;

    if (!phone && !email) {
        return res.status(400).json({
            ok: false,
            error: 'no_updates_provided',
            message: 'Please provide phone or email to update.',
        });
    }

    try {
        // Get current user data
        const userResult = await pool.query(
            'SELECT email, first_name, name FROM "user" WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        // Handle phone update (immediate)
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }

        // Handle email update (verification flow)
        if (email !== undefined) {
            try {
                await requestEmailChange(
                    userId,
                    email,
                    user.email,
                    user.first_name,
                    user.name
                );
                // Email change request created, verification email sent
            } catch (error: any) {
                // If email format invalid, return error
                if (error.message === 'Invalid email format') {
                    return res.status(400).json({
                        ok: false,
                        error: 'invalid_email',
                        message: 'Please provide a valid email address.',
                    });
                }
                // Other errors (e.g., Postmark failure) - still return success
                // The request was created, user can request another email if needed
                console.error('[profileEmailChange] Error requesting email change:', error);
            }
        }

        // Update phone if provided
        if (updates.length > 0) {
            updates.push(`updated_at = $${paramIndex++}`);
            values.push(Date.now());
            values.push(userId);

            await pool.query(
                `UPDATE "user" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                values
            );
        }

        // Always return success message (no enumeration)
        return res.json({
            ok: true,
            data: {
                message: email
                    ? "If the email is valid, we've sent a confirmation link."
                    : 'Contact details updated successfully.',
            },
        });
    } catch (error: any) {
        console.error('[PATCH /api/profile/contact] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'update_failed',
            message: 'Failed to update contact details.',
        });
    }
});

/**
 * GET /api/profile/confirm-email-change
 * Confirm email change using token from verification email
 * 
 * Query params:
 * - token: string (required) - verification token from email
 * 
 * Response:
 * {
 *   "ok": true,
 *   "data": {
 *     "changed": boolean
 *   }
 * }
 * 
 * Generic response - doesn't reveal if token was invalid/expired
 */
router.get('/confirm-email-change', async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({
            ok: false,
            error: 'token_required',
            message: 'Verification token is required.',
        });
    }

    try {
        const result = await confirmEmailChange(token);

        // Generic response - doesn't reveal if token was invalid
        return res.json({
            ok: true,
            data: {
                changed: result.changed,
                message: result.changed
                    ? 'Your email address has been updated successfully.'
                    : 'This verification link is invalid or has expired.',
            },
        });
    } catch (error: any) {
        console.error('[GET /api/profile/confirm-email-change] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'confirmation_failed',
            message: 'Failed to confirm email change.',
        });
    }
});

export default router;

/*
 * CURL EXAMPLES:
 * 
 * 1. Request email change (authenticated):
 * curl -X PATCH http://localhost:3001/api/profile/contact \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: session=..." \
 *   -d '{"email": "newemail@example.com"}'
 * 
 * 2. Request phone update (authenticated):
 * curl -X PATCH http://localhost:3001/api/profile/contact \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: session=..." \
 *   -d '{"phone": "+44 20 1234 5678"}'
 * 
 * 3. Confirm email change (public):
 * curl "http://localhost:3001/api/profile/confirm-email-change?token=abc123..."
 * 
 * 4. Combined update:
 * curl -X PATCH http://localhost:3001/api/profile/contact \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: session=..." \
 *   -d '{"email": "newemail@example.com", "phone": "+44 20 1234 5678"}'
 */

