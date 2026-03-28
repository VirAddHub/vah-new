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

const OFFICIAL_TAG_VARIANTS = ["hmrc", "companies house", "companieshouse", "companies_house"];

function isOfficialTag(value: string | null | undefined): boolean {
    const n = (value || "").toLowerCase().trim();
    return OFFICIAL_TAG_VARIANTS.some(v => n === v || n.replace(/\s+/g, "_") === v);
}

/**
 * HMRC / Companies House detection for KYC bypass and £0 forwarding fee.
 * Matches ingest filenames (e.g. source_slug "companieshouse") and DB tags ("Companies House", "HMRC", etc.).
 */
export function isOfficialMailClassification(tag?: string | null, sourceSlug?: string | null): boolean {
    return isOfficialTag(tag) || isOfficialTag(sourceSlug);
}

/**
 * Check if mail can be forwarded based on KYC status and mail tag/source
 * 
 * Rules:
 * - HMRC and Companies House mail (tag or source_slug) can always be forwarded (regardless of KYC)
 * - All other mail requires approved KYC status
 */
export function canForwardMail(kycStatus: KycStatus, tag?: string | null, sourceSlug?: string | null): boolean {
    if (isOfficialMailClassification(tag, sourceSlug)) return true;
    return kycStatus === "approved" || kycStatus === "verified";
}

