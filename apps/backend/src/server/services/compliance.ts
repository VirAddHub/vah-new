// src/server/services/compliance.ts
// Identity compliance computation for KYC + Companies House verification

export interface UserRow {
    kyc_status?: string | null;
    ch_verification_status?: string | null;
    companies_house_verified?: boolean | null;
}

export interface IdentityCompliance {
    isKycApproved: boolean;
    isChVerified: boolean;
    canUseRegisteredOfficeAddress: boolean;
}

/**
 * Compute identity compliance status from user row
 * 
 * Rules:
 * - KYC is approved if kyc_status is 'approved' or 'verified'
 * - CH is verified if ch_verification_status is 'approved' or companies_house_verified is true (informational only)
 * - Address can be used when KYC is approved
 */
export function computeIdentityCompliance(user: UserRow): IdentityCompliance {
    // KYC check: treat 'approved' or 'verified' as approved
    const isKycApproved = 
        user.kyc_status === 'approved' || 
        user.kyc_status === 'verified';

    // Companies House check: check both the status field and the boolean flag
    const isChVerified = 
        user.ch_verification_status === 'approved' ||
        user.ch_verification_status === 'verified' ||
        user.companies_house_verified === true;

    // Address can be used when KYC is complete (CH is not a gate)
    const canUseRegisteredOfficeAddress = isKycApproved;

    return {
        isKycApproved,
        isChVerified,
        canUseRegisteredOfficeAddress,
    };
}

