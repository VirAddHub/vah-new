// apps/backend/src/server/routes/profileEmailChange.ts
// Email change verification routes

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getPool } from '../db';
import { requestEmailChange, confirmEmailChange } from '../services/emailChange';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Normalise phone number: trim and remove spaces
 */
function normalisePhone(phone: string): string {
    return phone.trim().replace(/\s+/g, '');
}

/**
 * Validate phone number:
 * - Must be 8-20 characters
 * - Should start with + (prefer E.164 format)
 */
function validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone || phone.length === 0) {
        return { valid: false, error: 'Phone number is required.' };
    }

    if (phone.length < 8 || phone.length > 20) {
        return { valid: false, error: 'Phone number must be between 8 and 20 characters.' };
    }

    if (!phone.startsWith('+')) {
        return { valid: false, error: 'Phone number should start with + (E.164 format, e.g. +44...).' };
    }

    // Basic validation: should contain only digits and + at the start
    if (!/^\+[0-9]+$/.test(phone)) {
        return { valid: false, error: 'Phone number should contain only digits after the + sign.' };
    }

    return { valid: true };
}

/**
 * Mask phone number for audit logs (e.g., +44****1234)
 */
function maskPhone(phone: string): string {
    if (!phone || phone.length === 0) return '***';
    if (phone.length <= 4) return '***';
    // Keep first 2 chars and last 4 chars, mask the middle
    const start = phone.substring(0, 2);
    const end = phone.substring(phone.length - 4);
    return `${start}****${end}`;
}

/**
 * Check rate limit for phone changes: max 3 per 24 hours per user
 */
async function checkPhoneChangeRateLimit(userId: number): Promise<{ allowed: boolean; error?: string }> {
    const pool = getPool();
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    try {
        const result = await pool.query(
            `SELECT COUNT(*) as count
             FROM activity_log
             WHERE user_id = $1
               AND action = 'phone_changed'
               AND created_at > $2`,
            [userId, twentyFourHoursAgo]
        );

        const count = parseInt(result.rows[0]?.count || '0', 10);

        if (count >= 3) {
            return {
                allowed: false,
                error: 'You have reached the maximum number of phone number changes allowed in 24 hours. Please try again later.',
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('[checkPhoneChangeRateLimit] Error:', error);
        // On error, allow the change (fail open)
        return { allowed: true };
    }
}

// Rate limiting middleware for phone changes (per user)
// Note: This is a first-line defense; we also check in the handler for accuracy
const phoneChangeRateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3, // 3 phone changes per 24 hours
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const user = (req as any).user;
        return user?.id ? `phone-change:${user.id}` : 'phone-change:anonymous';
    },
    handler: (_req, res) => {
        res.setHeader('Retry-After', String(Math.floor(24 * 60 * 60))); // 24 hours in seconds
        return res.status(429).json({
            ok: false,
            error: 'rate_limit_exceeded',
            message: 'You have reached the maximum number of phone number changes allowed in 24 hours. Please try again later.',
        });
    },
    skip: (req) => {
        // Skip rate limiting if phone is not being updated
        // This allows email-only updates to bypass phone rate limiting
        const body = (req as any).body;
        return !body || body.phone === undefined;
    },
});

/**
 * PATCH /api/profile/contact
 * Update contact details (phone and/or email)
 * 
 * - Phone: updated immediately (with rate limiting and audit logging)
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
router.patch('/contact', requireAuth, phoneChangeRateLimiter, async (req: Request, res: Response) => {
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
            'SELECT email, phone, first_name, name FROM "user" WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = userResult.rows[0];
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        let phoneChanged = false;
        let oldPhone: string | null = null;

        // Handle phone update (immediate with validation and rate limiting)
        if (phone !== undefined) {
            // Normalise phone
            const normalisedPhone = normalisePhone(phone);

            // Validate phone
            const validation = validatePhone(normalisedPhone);
            if (!validation.valid) {
                return res.status(400).json({
                    ok: false,
                    error: 'invalid_phone',
                    message: validation.error || 'Invalid phone number format.',
                });
            }

            // Check if phone actually changed
            if (normalisedPhone === (user.phone || '').trim().replace(/\s+/g, '')) {
                // Phone is the same, skip update
            } else {
                // Check rate limit (additional check beyond middleware)
                const rateLimitCheck = await checkPhoneChangeRateLimit(userId);
                if (!rateLimitCheck.allowed) {
                    return res.status(429).json({
                        ok: false,
                        error: 'rate_limit_exceeded',
                        message: rateLimitCheck.error || 'You have reached the maximum number of phone number changes allowed in 24 hours. Please try again later.',
                    });
                }

                oldPhone = user.phone;
                updates.push(`phone = $${paramIndex++}`);
                values.push(normalisedPhone);
                phoneChanged = true;
            }
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

        // Update phone if provided and changed
        if (updates.length > 0) {
            updates.push(`updated_at = $${paramIndex++}`);
            values.push(Date.now());
            values.push(userId);

            await pool.query(
                `UPDATE "user" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                values
            );

            // Log phone change to audit log
            if (phoneChanged) {
                try {
                    const newPhone = values[0]; // First value is the new phone
                    await pool.query(
                        `INSERT INTO activity_log (user_id, action, details, created_at)
                         VALUES ($1, $2, $3, $4)`,
                        [
                            userId,
                            'phone_changed',
                            JSON.stringify({
                                old_phone_masked: oldPhone ? maskPhone(oldPhone) : null,
                                new_phone_masked: maskPhone(newPhone),
                            }),
                            Date.now(),
                        ]
                    );
                } catch (auditError) {
                    console.warn('[profileEmailChange] Failed to log phone change audit entry:', auditError);
                    // Don't fail the request if audit logging fails
                }
            }
        }

        // Build response message
        const messages: string[] = [];
        if (phoneChanged) {
            messages.push('Phone number updated successfully.');
        }
        if (email) {
            messages.push("If the email is valid, we've sent a confirmation link.");
        }

        // Always return success message (no enumeration)
        return res.json({
            ok: true,
            data: {
                message: messages.length > 0 ? messages.join(' ') : 'Contact details updated successfully.',
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

