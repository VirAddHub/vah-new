import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getPool } from '../db';
import { BCRYPT_ROUNDS } from '../../config/auth';
import { sendTemplateEmail, buildAppUrl } from '../../lib/mailer';
import { Templates } from '../../lib/postmark-templates';

/**
 * Issues a one-time password link that POST /api/auth/reset-password/confirm will accept.
 *
 * The confirm endpoint finds the account by an HMAC "lookup hash" of the token, then checks the
 * bcrypt hash. Links created in the admin area used to store only the bcrypt hash, so they could
 * never be used; this helper stores both, exactly like the public "Forgot password" flow.
 */
export async function issuePasswordLink(userId: number, ttlMinutes: number): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured');
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(raw, BCRYPT_ROUNDS);
    const lookupHash = crypto.createHmac('sha256', jwtSecret).update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await getPool().query(
        `UPDATE "user"
            SET reset_token_hash = $1,
                reset_token_lookup_hash = $2,
                reset_token_expires_at = $3,
                reset_token_used_at = NULL
          WHERE id = $4`,
        [hash, lookupHash, expiresAt.toISOString(), userId]
    );
    return raw;
}

/** Issues a link and emails it with the password template. Throws if the email cannot be sent. */
export async function sendPasswordLink(user: { id: number; email: string; first_name?: string | null }, ttlMinutes: number): Promise<void> {
    const raw = await issuePasswordLink(Number(user.id), ttlMinutes);
    await sendTemplateEmail({
        to: user.email,
        templateAlias: Templates.PasswordReset,
        model: {
            firstName: user.first_name || 'there',
            resetLink: `${buildAppUrl('')}/reset-password/confirm?token=${encodeURIComponent(raw)}`,
            expiryMinutes: ttlMinutes,
        },
    });
}
