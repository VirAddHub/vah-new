// src/server/services/compliance.ts
// Identity compliance computation for KYC + Companies House verification
// See docs/IDENTITY_VERIFICATION_ENGINEERING_SPEC.md

import { getPool } from '../db';

export type VerificationState = 'verified' | 'pending_others' | 'action_required';

export interface UserRow {
    id?: number;
    kyc_status?: string | null;
    ch_verification_status?: string | null;
    companies_house_verified?: boolean | null;
    companies_house_number?: string | null;
    company_number?: string | null;
}

/**
 * Full compliance result per engineering spec.
 * Legacy fields kept for backward compatibility with GET /api/profile.
 */
export interface IdentityCompliance {
    /** Primary user KYC status is 'approved' (or legacy 'verified') */
    isPrimaryUserVerified: boolean;
    /** No business_owner with requires_verification=true has status !== 'verified' */
    allRequiredOwnersVerified: boolean;
    /** User has companies_house_number (or company_number) set */
    hasCompanyNumber: boolean;
    /** Address can be used for incorporation/setup (always true per spec) */
    canUseAddressForIncorporation: boolean;
    /** Certificate allowed only when primary + all owners + company number */
    canDownloadProofOfAddressCertificate: boolean;
    /** Primary approved and all required owners verified (company number not required) */
    isFullyCompliant: boolean;
    /** Page state: verified | pending_others | action_required */
    verificationState: VerificationState;
    /** Count of owners with requires_verification=true and status !== 'verified' */
    pendingOwnersCount: number;
    // Legacy aliases (backward compatibility)
    isKycApproved: boolean;
    isChVerified: boolean;
    canUseRegisteredOfficeAddress: boolean;
}

/**
 * Compute identity compliance from a user row (and DB for owners count).
 * Used when you already have the user object (e.g. GET /api/profile).
 */
export async function computeIdentityCompliance(user: UserRow): Promise<IdentityCompliance> {
    const isPrimaryUserVerified =
        user.kyc_status === 'approved' || user.kyc_status === 'verified';

    const isChVerified =
        user.ch_verification_status === 'approved' ||
        user.ch_verification_status === 'verified' ||
        user.companies_house_verified === true;

    let pendingOwnersCount = 0;
    if (user.id) {
        const pool = getPool();
        const result = await pool.query(
            `SELECT COUNT(*) as count
             FROM business_owner
             WHERE user_id = $1
               AND requires_verification = true
               AND status != 'verified'`,
            [user.id]
        );
        pendingOwnersCount = Number(result.rows[0]?.count || 0);
    }
    const allRequiredOwnersVerified = pendingOwnersCount === 0;

    const companyNumber = (user.companies_house_number || user.company_number || '').trim();
    const hasCompanyNumber = companyNumber.length > 0;

    const canUseAddressForIncorporation = true;
    const canDownloadProofOfAddressCertificate =
        isPrimaryUserVerified && allRequiredOwnersVerified && hasCompanyNumber;
    const isFullyCompliant = isPrimaryUserVerified && allRequiredOwnersVerified;

    let verificationState: VerificationState;
    if (isPrimaryUserVerified && allRequiredOwnersVerified) {
        verificationState = 'verified';
    } else if (isPrimaryUserVerified && !allRequiredOwnersVerified) {
        verificationState = 'pending_others';
    } else {
        verificationState = 'action_required';
    }

    const canUseRegisteredOfficeAddress = isPrimaryUserVerified && allRequiredOwnersVerified;

    return {
        isPrimaryUserVerified,
        allRequiredOwnersVerified,
        hasCompanyNumber,
        canUseAddressForIncorporation,
        canDownloadProofOfAddressCertificate,
        isFullyCompliant,
        verificationState,
        pendingOwnersCount,
        isKycApproved: isPrimaryUserVerified,
        isChVerified,
        canUseRegisteredOfficeAddress,
    };
}

/**
 * Compute identity compliance by userId (loads user from DB).
 * Use for certificate gate and dedicated GET /api/profile/compliance.
 */
export async function computeIdentityComplianceByUserId(userId: number): Promise<IdentityCompliance | null> {
    const pool = getPool();
    const result = await pool.query(
        `SELECT id, kyc_status, companies_house_number, company_number,
                ch_verification_status, companies_house_verified
         FROM "user"
         WHERE id = $1`,
        [userId]
    );
    if (result.rows.length === 0) return null;
    return computeIdentityCompliance(result.rows[0]);
}
