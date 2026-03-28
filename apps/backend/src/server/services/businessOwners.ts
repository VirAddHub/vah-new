// apps/backend/src/server/services/businessOwners.ts
// Business owner management and verification service

import { getPool } from '../db';
import { generateEmailChangeToken, hashToken } from '../security/tokens';
import { getAppUrl } from '../../config/appUrl';
import { sendTemplateEmail } from '../../lib/mailer';
import { Templates } from '../../lib/postmark-templates';
import { sumsubFetch } from '../../lib/sumsub';
import { resolveSumsubApiConfig, resolveSumsubLevelName } from '../../lib/sumsubConfig';

/**
 * Create business owner and send verification invite
 */
export async function createBusinessOwner(
    userId: number,
    fullName: string,
    email: string,
    role: 'director' | 'psc' = 'director',
    companyName?: string
): Promise<{ id: number; inviteToken: string }> {
    const pool = getPool();
    
    // Normalize email
    const normalisedEmail = email.trim().toLowerCase();
    
    // Check if owner already exists for this user
    const existing = await pool.query(
        'SELECT id FROM business_owner WHERE user_id = $1 AND email = $2',
        [userId, normalisedEmail]
    );
    
    if (existing.rows.length > 0) {
        throw new Error('Business owner with this email already exists');
    }
    
    // Insert business owner with role and requires_verification
    const ownerResult = await pool.query(
        `INSERT INTO business_owner (
            user_id, full_name, email, role, requires_verification, 
            status, created_at, updated_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id`,
        [userId, fullName.trim(), normalisedEmail, role, true, 'not_started']
    );
    
    const ownerId = ownerResult.rows[0].id;
    
    // Generate invite token
    const token = generateEmailChangeToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
    
    // Create invite
    await pool.query(
        `INSERT INTO business_owner_invite (business_owner_id, token_hash, expires_at, last_sent_at, created_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [ownerId, tokenHash, expiresAt]
    );
    
    // Send verification email using dedicated business owner verification template
    // TODO: Future enhancement - Replace with direct Sumsub URL generation
    // When switching to direct Sumsub links:
    // 1) Generate Sumsub URL at send-time using createSumsubApplicantForOwner()
    // 2) Keep token issuance in DB for audit trail (already done above)
    // 3) On resend, rotate token/session and invalidate previous invite
    // 4) Add error handling if Sumsub URL generation fails
    // 5) Keep template variable {{verification_url}} unchanged
    const verifyUrl = `${getAppUrl()}/verify-owner?token=${token}`;
    
    // Fetch company name if not provided
    let finalCompanyName = companyName;
    if (!finalCompanyName) {
        const userResult = await pool.query(
            'SELECT company_name FROM "user" WHERE id = $1',
            [userId]
        );
        finalCompanyName = userResult.rows[0]?.company_name || 'your company';
    }
    
    // Format expiry time (7 days = 7 * 24 * 60 = 10080 minutes)
    const expiresIn = '7 days';
    
    try {
        await sendTemplateEmail({
            to: normalisedEmail,
            templateAlias: Templates.BusinessOwnerVerification,
            model: {
                owner_name: fullName,
                company_name: finalCompanyName,
                verification_url: verifyUrl,
                expires_in: expiresIn,
            },
            from: 'support@virtualaddresshub.co.uk',
            replyTo: 'support@virtualaddresshub.co.uk',
            templateId: 43428305, // Postmark Template ID
        });
    } catch (error) {
        console.error('[businessOwners] Failed to send verification email:', error);
        // Don't throw - owner is created, can resend later
    }

    const { logVerificationEvent } = await import('./verificationEventLog');
    await logVerificationEvent('business_owner', ownerId, 'invite_sent', {});

    return { id: ownerId, inviteToken: token };
}

/**
 * Resend verification invite for a business owner
 */
export async function resendBusinessOwnerInvite(ownerId: number): Promise<string> {
    const pool = getPool();
    
    // Get owner details and company name
    const ownerResult = await pool.query(
        `SELECT bo.id, bo.user_id, bo.full_name, bo.email, u.company_name
         FROM business_owner bo
         JOIN "user" u ON bo.user_id = u.id
         WHERE bo.id = $1`,
        [ownerId]
    );
    
    if (ownerResult.rows.length === 0) {
        throw new Error('Business owner not found');
    }
    
    const owner = ownerResult.rows[0];
    
    // Generate new token
    const token = generateEmailChangeToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Update or create invite
    const existingInvite = await pool.query(
        'SELECT id FROM business_owner_invite WHERE business_owner_id = $1 AND used_at IS NULL',
        [ownerId]
    );
    
    if (existingInvite.rows.length > 0) {
        // Update existing invite
        await pool.query(
            `UPDATE business_owner_invite 
             SET token_hash = $1, expires_at = $2, last_sent_at = NOW()
             WHERE id = $3`,
            [tokenHash, expiresAt, existingInvite.rows[0].id]
        );
    } else {
        // Create new invite
        await pool.query(
            `INSERT INTO business_owner_invite (business_owner_id, token_hash, expires_at, last_sent_at, created_at)
             VALUES ($1, $2, $3, NOW(), NOW())`,
            [ownerId, tokenHash, expiresAt]
        );
    }
    
    // Send email using dedicated business owner verification template
    // TODO: Future enhancement - Replace with direct Sumsub URL generation (see createBusinessOwner for details)
    const verifyUrl = `${getAppUrl()}/verify-owner?token=${token}`;
    const expiresIn = '7 days';
    const companyName = owner.company_name || 'your company';
    
    try {
        await sendTemplateEmail({
            to: owner.email,
            templateAlias: Templates.BusinessOwnerVerification,
            model: {
                owner_name: owner.full_name,
                company_name: companyName,
                verification_url: verifyUrl,
                expires_in: expiresIn,
            },
            from: 'support@virtualaddresshub.co.uk',
            replyTo: 'support@virtualaddresshub.co.uk',
            templateId: 43428305, // Postmark Template ID
        });
    } catch (error) {
        console.error('[businessOwners] Failed to resend verification email:', error);
        // Still return token - email might have been sent
    }
    
    return token;
}

/**
 * Verify invite token and return owner details (only when invite is unused and not expired).
 */
export async function verifyBusinessOwnerInviteToken(token: string): Promise<{
    ownerId: number;
    fullName: string;
    email: string;
} | null> {
    const ctx = await getOwnerVerificationContext(token);
    if (!ctx || !ctx.canStart) return null;
    return {
        ownerId: ctx.ownerId,
        fullName: ctx.fullName,
        email: ctx.email,
    };
}

/**
 * Get full verification context for an invite token (used for /verify page state).
 * Returns owner info + status + token state so frontend can show already_verified, expired, etc.
 */
export async function getOwnerVerificationContext(token: string): Promise<{
    valid: boolean;
    canStart: boolean;
    ownerId: number;
    fullName: string;
    email: string;
    status: string;
    tokenUsed: boolean;
    tokenExpired: boolean;
} | null> {
    const pool = getPool();
    const tokenHash = hashToken(token);
    const now = new Date();

    const inviteResult = await pool.query(
        `SELECT bo.id, bo.full_name, bo.email, bo.status, boi.expires_at, boi.used_at
         FROM business_owner_invite boi
         JOIN business_owner bo ON bo.id = boi.business_owner_id
         WHERE boi.token_hash = $1`,
        [tokenHash]
    );

    if (inviteResult.rows.length === 0) return null;

    const row = inviteResult.rows[0];
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    const usedAt = row.used_at;
    const tokenUsed = !!usedAt;
    const tokenExpired = expiresAt ? now > expiresAt : false;
    const canStart = !tokenUsed && !tokenExpired;
    const valid = true;

    return {
        valid,
        canStart,
        ownerId: row.id,
        fullName: row.full_name,
        email: row.email,
        status: row.status || 'not_started',
        tokenUsed,
        tokenExpired,
    };
}

/**
 * Mark invite as used
 */
export async function markBusinessOwnerInviteUsed(token: string): Promise<void> {
    const pool = getPool();
    const tokenHash = hashToken(token);
    
    await pool.query(
        `UPDATE business_owner_invite 
         SET used_at = NOW()
         WHERE token_hash = $1 AND used_at IS NULL`,
        [tokenHash]
    );
}

/**
 * Create Sumsub applicant for a business owner
 */
export async function createSumsubApplicantForOwner(ownerId: number): Promise<{
    applicantId: string;
    accessToken: string;
}> {
    const pool = getPool();
    // Get owner details
    const ownerResult = await pool.query(
        'SELECT id, user_id, full_name, email, sumsub_applicant_id FROM business_owner WHERE id = $1',
        [ownerId]
    );
    
    if (ownerResult.rows.length === 0) {
        throw new Error('Business owner not found');
    }
    
    const owner = ownerResult.rows[0];

    const api = resolveSumsubApiConfig();
    if (!api) {
        throw new Error('Sumsub API not configured');
    }
    const { levelName } = resolveSumsubLevelName(api.mode, 'basic-kyc');
    
    // If applicant already exists, generate new token
    if (owner.sumsub_applicant_id) {
        const tokenBody = {
            userId: `owner_${owner.id}`,
            levelName: levelName,
            ttlInSecs: 600,
            applicantIdentifiers: {
                email: owner.email,
            },
        };
        
        const tokenResp = await sumsubFetch(
            'POST',
            '/resources/accessTokens/sdk',
            tokenBody
        );
        
        if (!tokenResp?.token) {
            throw new Error('No token in Sumsub response');
        }
        
        return {
            applicantId: owner.sumsub_applicant_id,
            accessToken: tokenResp.token,
        };
    }
    
    // Create new Sumsub applicant
    const [firstName, ...lastNameParts] = owner.full_name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    
    const payload = {
        externalUserId: `owner_${owner.id}`, // Prefix to distinguish from primary users
        email: owner.email,
        info: {
            firstName: firstName || '',
            lastName: lastName || '',
            country: '',
        },
    };
    
    const created = await sumsubFetch('POST', '/resources/applicants', payload);
    const applicantId = created?.id;
    
    if (!applicantId) {
        throw new Error('No applicant id from Sumsub');
    }
    
    // Store applicant ID
    await pool.query(
        `UPDATE business_owner 
         SET sumsub_applicant_id = $1, status = $2, updated_at = NOW()
         WHERE id = $3`,
        [applicantId, 'pending', owner.id]
    );
    
    // Generate access token (levelName from resolveSumsubLevelName above)
    const tokenBody = {
        userId: `owner_${owner.id}`,
        levelName: levelName,
        ttlInSecs: 600,
        applicantIdentifiers: {
            email: owner.email,
        },
    };
    
    const tokenResp = await sumsubFetch(
        'POST',
        '/resources/accessTokens/sdk',
        tokenBody
    );
    
    if (!tokenResp?.token) {
        throw new Error('No token in Sumsub response');
    }
    
    return {
        applicantId,
        accessToken: tokenResp.token,
    };
}

/**
 * Get all business owners for a user
 */
export async function getBusinessOwners(userId: number): Promise<Array<{
    id: number;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    requiresVerification: boolean;
    status: string;
    sumsubApplicantId: string | null;
    kycUpdatedAt: Date | null;
    createdAt: Date;
}>> {
    const pool = getPool();
    
    const result = await pool.query(
        `SELECT 
            id, full_name, email, role, requires_verification, status,
            sumsub_applicant_id, kyc_updated_at, created_at
         FROM business_owner
         WHERE user_id = $1
         ORDER BY created_at ASC`,
        [userId]
    );
    
    return result.rows.map(row => {
        // Split full_name into first and last name
        const nameParts = (row.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
            id: row.id,
            fullName: row.full_name,
            firstName,
            lastName,
            email: row.email,
            role: row.role,
            requiresVerification: row.requires_verification,
            status: row.status,
            sumsubApplicantId: row.sumsub_applicant_id,
            kycUpdatedAt: row.kyc_updated_at,
            createdAt: row.created_at,
        };
    });
}

