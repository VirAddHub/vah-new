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
    
    // Upsert: update existing active request or insert new one
    // Check if active request exists
    const existingResult = await pool.query(
        `SELECT id FROM email_change_request WHERE user_id = $1 AND used_at IS NULL LIMIT 1`,
        [userId]
    );
    
    if (existingResult.rows.length > 0) {
        // Update existing request
        await pool.query(
            `UPDATE email_change_request 
             SET new_email = $1, 
                 token_hash = $2, 
                 expires_at = $3, 
                 last_sent_at = NOW()
             WHERE id = $4`,
            [normalisedEmail, tokenHash, expiresAt, existingResult.rows[0].id]
        );
    } else {
        // Insert new request
        await pool.query(
            `INSERT INTO email_change_request (user_id, new_email, token_hash, expires_at, last_sent_at, created_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`,
            [userId, normalisedEmail, tokenHash, expiresAt]
        );
    }
    
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
                ctaUrl: confirmUrl, // Use ctaUrl to match template variable cta_url
                confirmUrl, // Also include for backward compatibility
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
    
    // Get current email and user details for audit log and notification
    const userResult = await pool.query(
        'SELECT email, first_name, name FROM "user" WHERE id = $1',
        [userId]
    );
    
    if (userResult.rows.length === 0) {
        // User doesn't exist (shouldn't happen due to FK, but handle gracefully)
        return { changed: false };
    }
    
    const oldEmail = userResult.rows[0].email;
    const firstName = userResult.rows[0].first_name;
    const name = userResult.rows[0].name;
    
    // Safety check: don't proceed if oldEmail === newEmail
    if (oldEmail.trim().toLowerCase() === newEmail.trim().toLowerCase()) {
        // Email already matches, mark request as used and return success
        await pool.query(
            'UPDATE email_change_request SET used_at = NOW() WHERE id = $1',
            [request.id]
        );
        return { changed: true };
    }
    
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
    
    // Send security notification to OLD email address
    // This email is sent AFTER the email has been successfully changed
    // Replies must route to support@virtualaddresshub.co.uk (intentional support workflow)
    try {
        await sendTemplateEmail({
            to: oldEmail,
            templateAlias: Templates.EmailChangeNotificationOldAddress,
            model: {
                firstName,
                name,
                new_email: newEmail,
            },
            from: 'support@virtualaddresshub.co.uk',
            replyTo: 'support@virtualaddresshub.co.uk',
            templateId: 42718936, // Postmark Template ID
        });
        console.log(`[emailChange] Security notification sent to old email: ${maskEmail(oldEmail)}`);
    } catch (emailError) {
        console.error('[emailChange] Failed to send security notification to old email:', emailError);
        // Don't fail the confirmation if notification email fails - email change is already complete
    }
    
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

/**
 * Resend email change confirmation email
 * 
 * - Validates token and finds request
 * - Rate limits: won't resend if last_sent_at within 60 seconds
 * - Generates new token and updates request
 * - Sends new verification email
 * - Always returns success (no enumeration)
 */
export async function resendEmailChangeConfirmation(token: string): Promise<{ sent: boolean }> {
    const pool = getPool();
    
    if (!token || token.trim().length === 0) {
        // Return success to prevent enumeration
        return { sent: true };
    }
    
    const tokenHash = hashToken(token);
    
    // Find request by token hash (must be unused)
    const requestResult = await pool.query(
        `SELECT id, user_id, new_email, last_sent_at
         FROM email_change_request
         WHERE token_hash = $1 
           AND used_at IS NULL
         LIMIT 1`,
        [tokenHash]
    );
    
    if (requestResult.rows.length === 0) {
        // Request not found or already used
        // Return success to prevent enumeration
        return { sent: true };
    }
    
    const request = requestResult.rows[0];
    const userId = request.user_id;
    const newEmail = request.new_email;
    const lastSentAt = request.last_sent_at;
    
    // Rate limiting: don't resend if last sent within 60 seconds
    if (lastSentAt) {
        const lastSentTime = new Date(lastSentAt).getTime();
        const now = Date.now();
        const timeSinceLastSent = now - lastSentTime;
        const sixtySeconds = 60 * 1000;
        
        if (timeSinceLastSent < sixtySeconds) {
            // Rate limited, but return success
            return { sent: true };
        }
    }
    
    // Get user data for email
    const userResult = await pool.query(
        'SELECT first_name, name FROM "user" WHERE id = $1',
        [userId]
    );
    
    if (userResult.rows.length === 0) {
        // User doesn't exist
        return { sent: true };
    }
    
    const user = userResult.rows[0];
    
    // Generate new token
    const newToken = generateEmailChangeToken();
    const newTokenHash = hashToken(newToken);
    
    // Update expires_at to 30 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // Update request with new token and last_sent_at
    await pool.query(
        `UPDATE email_change_request 
         SET token_hash = $1, 
             expires_at = $2, 
             last_sent_at = NOW()
         WHERE id = $3`,
        [newTokenHash, expiresAt, request.id]
    );
    
    // Build confirmation URL with new token
    const confirmUrl = `${getAppUrl()}/account/confirm-email?token=${newToken}`;
    
    // Send verification email to new email address
    try {
        await sendTemplateEmail({
            to: newEmail,
            templateAlias: Templates.EmailChangeVerification,
            model: {
                firstName: user.first_name,
                name: user.name,
                ctaUrl: confirmUrl, // Use ctaUrl to match template variable cta_url
                confirmUrl, // Also include for backward compatibility
                expiryMinutes: 30,
            },
            from: 'support@virtualaddresshub.co.uk',
            replyTo: 'support@virtualaddresshub.co.uk',
            templateId: 42716349,
        });
    } catch (error) {
        console.error('[emailChange] Failed to resend verification email:', error);
        // Still return success - email might have been sent
    }
    
    return { sent: true };
}

/**
 * Cleanup expired email change requests older than 7 days
 * 
 * Optional maintenance function to delete old expired requests.
 * Can be called from a cron job or maintenance script.
 * 
 * @returns Number of deleted requests
 */
export async function cleanupExpiredEmailChangeRequests(): Promise<number> {
    const pool = getPool();
    
    // Delete requests that are expired and older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const result = await pool.query(
        `DELETE FROM email_change_request
         WHERE expires_at < NOW()
           AND created_at < $1`,
        [sevenDaysAgo]
    );
    
    const deletedCount = result.rowCount || 0;
    console.log(`[emailChange] Cleaned up ${deletedCount} expired email change requests`);
    
    return deletedCount;
}

