// apps/backend/src/server/services/businessOwners.ts
// Business owner management and verification service

import { getPool } from '../db';
import { generateEmailChangeToken, hashToken } from '../security/tokens';
import { getAppUrl } from '../../config/appUrl';
import { sendTemplateEmail } from '../../lib/mailer';
import { Templates } from '../../lib/postmark-templates';

/**
 * Create business owner and send verification invite
 */
export async function createBusinessOwner(
    userId: number,
    fullName: string,
    email: string,
    role: 'director' | 'psc' = 'director'
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
    
    // Send verification email
    const verifyUrl = `${getAppUrl()}/verify-owner?token=${token}`;
    
    try {
        await sendTemplateEmail({
            to: normalisedEmail,
            templateAlias: Templates.EmailChangeVerification, // TODO: Create dedicated template
            model: {
                firstName: fullName.split(' ')[0] || fullName,
                name: fullName,
                ctaUrl: verifyUrl,
                confirmUrl: verifyUrl,
                expiryMinutes: 7 * 24 * 60, // 7 days in minutes
            },
            from: 'support@virtualaddresshub.co.uk',
            replyTo: 'support@virtualaddresshub.co.uk',
            templateId: 42716349, // TODO: Create dedicated template for owner verification
        });
    } catch (error) {
        console.error('[businessOwners] Failed to send verification email:', error);
        // Don't throw - owner is created, can resend later
    }
    
    return { id: ownerId, inviteToken: token };
}

/**
 * Resend verification invite for a business owner
 */
export async function resendBusinessOwnerInvite(ownerId: number): Promise<string> {
    const pool = getPool();
    
    // Get owner details
    const ownerResult = await pool.query(
        'SELECT id, user_id, full_name, email FROM business_owner WHERE id = $1',
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
    
    // Send email
    const verifyUrl = `${getAppUrl()}/verify-owner?token=${token}`;
    
    try {
        await sendTemplateEmail({
            to: owner.email,
            templateAlias: Templates.EmailChangeVerification,
            model: {
                firstName: owner.full_name.split(' ')[0] || owner.full_name,
                name: owner.full_name,
                ctaUrl: verifyUrl,
                confirmUrl: verifyUrl,
                expiryMinutes: 7 * 24 * 60,
            },
            from: 'support@virtualaddresshub.co.uk',
            replyTo: 'support@virtualaddresshub.co.uk',
            templateId: 42716349,
        });
    } catch (error) {
        console.error('[businessOwners] Failed to resend verification email:', error);
        // Still return token - email might have been sent
    }
    
    return token;
}

/**
 * Verify invite token and return owner details
 */
export async function verifyBusinessOwnerInviteToken(token: string): Promise<{
    ownerId: number;
    fullName: string;
    email: string;
} | null> {
    const pool = getPool();
    const tokenHash = hashToken(token);
    
    // Find valid invite
    const inviteResult = await pool.query(
        `SELECT bo.id, bo.full_name, bo.email, boi.expires_at, boi.used_at
         FROM business_owner_invite boi
         JOIN business_owner bo ON bo.id = boi.business_owner_id
         WHERE boi.token_hash = $1
           AND boi.used_at IS NULL
           AND boi.expires_at > NOW()`,
        [tokenHash]
    );
    
    if (inviteResult.rows.length === 0) {
        return null;
    }
    
    const row = inviteResult.rows[0];
    return {
        ownerId: row.id,
        fullName: row.full_name,
        email: row.email,
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
    
    // Dynamic import of CommonJS module
    const { sumsubFetch } = await import('../../lib/sumsub');
    
    // Get owner details
    const ownerResult = await pool.query(
        'SELECT id, user_id, full_name, email, sumsub_applicant_id FROM business_owner WHERE id = $1',
        [ownerId]
    );
    
    if (ownerResult.rows.length === 0) {
        throw new Error('Business owner not found');
    }
    
    const owner = ownerResult.rows[0];
    
    // If applicant already exists, generate new token
    if (owner.sumsub_applicant_id) {
        const levelName = process.env.SUMSUB_LEVEL || process.env.SUMSUB_LEVEL_NAME || 'basic-kyc';
        
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
    
    // Generate access token
    const levelName = process.env.SUMSUB_LEVEL || process.env.SUMSUB_LEVEL_NAME || 'basic-kyc';
    
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

