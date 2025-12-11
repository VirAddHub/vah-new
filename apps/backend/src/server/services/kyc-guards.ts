// src/server/services/kyc-guards.ts
// KYC verification guards for enforcing KYC requirements

export type KycStatus = "not_started" | "pending" | "approved" | "verified" | "rejected" | null | undefined;

/**
 * Check if KYC status is approved
 * Accepts both "approved" and "verified" as valid approved statuses
 */
export function isKycApproved(status: KycStatus): boolean {
    return status === "approved" || status === "verified";
}

/**
 * Check if mail can be forwarded based on KYC status and mail tag
 * 
 * Rules:
 * - HMRC and Companies House mail can always be forwarded (regardless of KYC)
 * - All other mail requires approved KYC status
 */
export function canForwardMail(kycStatus: KycStatus, tag?: string | null): boolean {
    const normalisedTag = (tag || "").toLowerCase().trim();

    // Always allow HMRC and Companies House mail, regardless of KYC
    if (
        normalisedTag === "hmrc" ||
        normalisedTag === "companies house" ||
        normalisedTag === "companieshouse" ||
        normalisedTag === "companies_house"
    ) {
        return true;
    }

    // Everything else requires approved KYC (accepts both "approved" and "verified")
    return kycStatus === "approved" || kycStatus === "verified";
}

