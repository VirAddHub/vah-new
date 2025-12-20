// apps/backend/src/server/services/emailChange.ts
// Email change verification service

import { getPool } from '../db';
import { generateEmailChangeToken, hashToken } from '../security/tokens';
import { sendTemplateEmail } from '../../lib/mailer';
import { Templates } from '../../lib/postmark-templates';
import { getAppUrl } from '../../config/appUrl';

/**
 * Mask email for audit logs (e.g., j***@example.com)
 */
function maskEmail(email: string): string {
    if (!email || email.length === 0) return '***';
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    if (local.length <= 2) {
        return `${local[0]}***@${domain}`;
    }
    return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 3))}@${domain}`;
}

/**
 * Request an email change for a user
 * 
 * - Normalises email (trim + lowercase)
 * - Validates format
 * - If email is same as current, returns success (no-op)
 * - If email already used by another user, returns success but doesn't create request (no enumeration)
 * - Creates token and stores hash
 * - Sends verification email to new address
 * - Logs audit entry
 */
export async function requestEmailChange(
    userId: number,
    newEmail: string,
    currentEmail?: string,
    firstName?: string | null,
    name?: string | null
): Promise<void> {
    const pool = getPool();
    
    // Normalise email
    const normalisedEmail = newEmail.trim().toLowerCase();
    
    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalisedEmail)) {
        throw new Error('Invalid email format');
    }
    
    // If same as current email, no-op
    if (currentEmail && normalisedEmail === currentEmail.trim().toLowerCase()) {
        return; // Success, but nothing to do
    }
    
    // Check if email is already used by another user
    // Do NOT reveal this in error - just silently skip if taken
    const existingUserResult = await pool.query(
        'SELECT id FROM "user" WHERE email = $1 AND id != $2 LIMIT 1',
        [normalisedEmail, userId]
    );
    
    if (existingUserResult.rows.length > 0) {
        // Email already in use, but return success to prevent enumeration
        // Don't create request or send email
        return;
    }
    
    // Generate token and hash
    const token = generateEmailChangeToken();
    const tokenHash = hashToken(token);
    
    // Expires in 30 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // Delete any existing unused requests for this user (upsert behaviour)
    await pool.query(
        'DELETE FROM email_change_request WHERE user_id = $1 AND used_at IS NULL',
        [userId]
    );
    
    // Insert new request
    await pool.query(
        `INSERT INTO email_change_request (user_id, new_email, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, normalisedEmail, tokenHash, expiresAt]
    );
    
    // Build confirmation URL
    const confirmUrl = `${getAppUrl()}/account/confirm-email?token=${token}`;
    
    // Replies must route to support@virtualaddresshub.co.uk (intentional support workflow)
    // Send verification email to NEW email address
    try {
        await sendTemplateEmail({
            to: normalisedEmail,
            templateAlias: Templates.EmailChangeVerification,
            model: {
                firstName,
                name,
                confirmUrl,
                expiryMinutes: 30,
            },
            from: 'support@virtualaddresshub.co.uk', // From MUST always be support@
            replyTo: 'support@virtualaddresshub.co.uk', // Replies must route to support inbox
            templateId: 42716349, // Postmark Template ID
        });
    } catch (error) {
        console.error('[emailChange] Failed to send verification email:', error);
        // Don't throw - request is created, user can request another email if needed
    }
    
    // Log audit entry
    try {
        await pool.query(
            `INSERT INTO activity_log (user_id, action, details, created_at)
             VALUES ($1, $2, $3, $4)`,
            [
                userId,
                'email_change_requested',
                JSON.stringify({
                    new_email_masked: maskEmail(normalisedEmail),
                    current_email_masked: currentEmail ? maskEmail(currentEmail) : null,
                }),
                Date.now(),
            ]
        );
    } catch (auditError) {
        console.warn('[emailChange] Failed to log audit entry:', auditError);
        // Don't fail the request if audit logging fails
    }
}

/**
 * Confirm an email change using a token
 * 
 * - Validates token hash, expiry, and unused status
 * - Updates user.email to new_email
 * - Marks request as used
 * - Logs audit entry
 * 
 * Returns { changed: boolean } - false if token invalid/expired/used
 */
export async function confirmEmailChange(token: string): Promise<{ changed: boolean }> {
    const pool = getPool();
    
    const tokenHash = hashToken(token);
    
    // Find valid request: token matches, not used, not expired
    const requestResult = await pool.query(
        `SELECT id, user_id, new_email, expires_at
         FROM email_change_request
         WHERE token_hash = $1 
           AND used_at IS NULL 
           AND expires_at > NOW()
         LIMIT 1`,
        [tokenHash]
    );
    
    if (requestResult.rows.length === 0) {
        // Token invalid, expired, or already used
        // Return success but changed=false (no enumeration)
        return { changed: false };
    }
    
    const request = requestResult.rows[0];
    const userId = request.user_id;
    const newEmail = request.new_email;
    
    // Get current email for audit log
    const userResult = await pool.query(
        'SELECT email FROM "user" WHERE id = $1',
        [userId]
    );
    
    if (userResult.rows.length === 0) {
        // User doesn't exist (shouldn't happen due to FK, but handle gracefully)
        return { changed: false };
    }
    
    const oldEmail = userResult.rows[0].email;
    
    // Update user email
    await pool.query(
        'UPDATE "user" SET email = $1, updated_at = $2 WHERE id = $3',
        [newEmail, Date.now(), userId]
    );
    
    // Mark request as used
    await pool.query(
        'UPDATE email_change_request SET used_at = NOW() WHERE id = $1',
        [request.id]
    );
    
    // Log audit entry
    try {
        await pool.query(
            `INSERT INTO activity_log (user_id, action, details, created_at)
             VALUES ($1, $2, $3, $4)`,
            [
                userId,
                'email_change_confirmed',
                JSON.stringify({
                    old_email_masked: maskEmail(oldEmail),
                    new_email_masked: maskEmail(newEmail),
                }),
                Date.now(),
            ]
        );
    } catch (auditError) {
        console.warn('[emailChange] Failed to log audit entry:', auditError);
        // Don't fail the confirmation if audit logging fails
    }
    
    return { changed: true };
}

