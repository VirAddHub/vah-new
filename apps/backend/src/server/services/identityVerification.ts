/**
 * Identity verification, independent of any provider.
 *
 * Intended set-up (not yet connected): an identity provider for document, facial match, liveness,
 * PEP, sanctions and adverse-media checks. Until a provider integration exists, is configured and
 * has been tested, nothing here claims those checks were done:
 *  - customers cannot complete identity verification online (start answers "not available");
 *  - administrators can record a result they established themselves (manual document review),
 *    with the method and a reference; every such record is kept and audited;
 *  - KYC_AUTO_APPROVE_FOR_TESTING still approves test accounts and must be off before launch.
 *
 * History: Sumsub was used until Nov 2026. Its columns (sumsub_*) and the verification_event and
 * webhook_log rows it produced are kept as historical records and are no longer written.
 */
import { kycAutoApproveForTesting } from '../../config/testingSwitches';

export type IdentityProviderStatus = { connected: boolean; name: string | null; screening: boolean };

/** No provider integration exists in this codebase yet, so nothing is reported as connected. */
export function identityProviderStatus(): IdentityProviderStatus {
    return { connected: false, name: null, screening: false };
}

export function canSelfVerify(): 'testing' | 'provider' | 'unavailable' {
    if (kycAutoApproveForTesting()) return 'testing';
    return identityProviderStatus().connected ? 'provider' : 'unavailable';
}

export const IDENTITY_UNAVAILABLE_MESSAGE =
    'Online identity verification is not available yet. We will contact you to complete it.';

export const IDENTITY_METHODS = ['manual_documents', 'provider', 'testing'] as const;
export type IdentityMethod = typeof IDENTITY_METHODS[number];
