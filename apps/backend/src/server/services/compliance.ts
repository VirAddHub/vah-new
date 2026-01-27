// src/server/services/compliance.ts
// Identity compliance computation for KYC + Companies House verification

import { getPool } from '../db';

export interface UserRow {
    id?: number;
    kyc_status?: string | null;
    ch_verification_status?: string | null;
    companies_house_verified?: boolean | null;
}

export interface IdentityCompliance {
    isKycApproved: boolean;
    isChVerified: boolean;
    allRequiredOwnersVerified: boolean;
    canUseRegisteredOfficeAddress: boolean;
}

/**
 * Compute identity compliance status from user row
 * 
 * Rules:
 * - KYC is approved if kyc_status is 'approved' or 'verified'
 * - CH is verified if ch_verification_status is 'approved' or companies_house_verified is true (informational only)
 * - Address can be used when KYC is approved AND all required business owners are verified
 */
export async function computeIdentityCompliance(user: UserRow): Promise<IdentityCompliance> {
    // KYC check: treat 'approved' or 'verified' as approved
    const isKycApproved = 
        user.kyc_status === 'approved' || 
        user.kyc_status === 'verified';

    // Companies House check: check both the status field and the boolean flag
    const isChVerified = 
        user.ch_verification_status === 'approved' ||
        user.ch_verification_status === 'verified' ||
        user.companies_house_verified === true;

    // Check if all required business owners are verified
    let allRequiredOwnersVerified = true;
    
    if (user.id) {
        const pool = getPool();
        const pendingOwners = await pool.query(
            `SELECT COUNT(*) as count
             FROM business_owner
             WHERE user_id = $1
               AND requires_verification = true
               AND status != 'verified'`,
            [user.id]
        );
        
        const pendingCount = Number(pendingOwners.rows[0]?.count || 0);
        allRequiredOwnersVerified = pendingCount === 0;
    }

    // Address can be used when KYC is complete AND all required owners are verified
    const canUseRegisteredOfficeAddress = isKycApproved && allRequiredOwnersVerified;

    return {
        isKycApproved,
        isChVerified,
        allRequiredOwnersVerified,
        canUseRegisteredOfficeAddress,
    };
}

