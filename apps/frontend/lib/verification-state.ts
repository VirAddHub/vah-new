/**
 * Centralised verification state labels and copy.
 * Use for consistent wording across /verify-owner, Account → Verification, and certificate gating.
 * UK English. Backend remains source of truth; this is for UI only.
 */

export type VerificationPageState = 'verified' | 'pending_others' | 'action_required';

export type OwnerVerificationStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

export type CertificateBlockReason = 'primary' | 'owners' | 'company';

export interface VerificationPageStateMeta {
  label: string;
  description: string;
}

export interface OwnerStatusMeta {
  label: string;
  /** For Badge variant: default | secondary | destructive | outline */
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface CertificateBlockMeta {
  title: string;
  description: string;
}

const PAGE_STATE_META: Record<VerificationPageState, VerificationPageStateMeta> = {
  verified: {
    label: 'Identity verification complete',
    description:
      'Your identity check (ID verification) has been approved. You have full access to your business address and all account features.',
  },
  pending_others: {
    label: 'Waiting for other directors',
    description:
      'You are verified. Waiting for other directors to complete their verification.',
  },
  action_required: {
    label: 'Verification required',
    description:
      'Complete identity verification to fully activate your account (including proof of address certificates). This typically takes 5–10 minutes.',
  },
};

const OWNER_STATUS_META: Record<OwnerVerificationStatus, OwnerStatusMeta> = {
  not_started: {
    label: 'Not started',
    variant: 'secondary',
  },
  pending: {
    label: 'Pending',
    variant: 'secondary',
  },
  verified: {
    label: 'Verified',
    variant: 'default',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
  },
  expired: {
    label: 'Expired',
    variant: 'outline',
  },
};

const CERTIFICATE_BLOCK_META: Record<CertificateBlockReason, CertificateBlockMeta> = {
  primary: {
    title: 'Verification required',
    description: 'Complete identity verification to download your letter.',
  },
  owners: {
    title: 'Other directors must verify',
    description:
      'All required directors or persons with significant control must complete verification before you can download your letter.',
  },
  company: {
    title: 'Companies House number required',
    description: 'Add your Companies House number in Account → Verification to download your letter.',
  },
};

export function getVerificationPageStateMeta(
  state: VerificationPageState
): VerificationPageStateMeta {
  return PAGE_STATE_META[state] ?? PAGE_STATE_META.action_required;
}

export function getOwnerStatusMeta(status: string): OwnerStatusMeta {
  const key = status as OwnerVerificationStatus;
  return OWNER_STATUS_META[key] ?? { label: status, variant: 'secondary' };
}

export function getCertificateBlockMeta(reason: CertificateBlockReason): CertificateBlockMeta {
  return CERTIFICATE_BLOCK_META[reason];
}

/**
 * Map compliance flags to certificate block reason (for UI messaging only).
 * Backend enforces; this is for consistent copy.
 */
export function getCertificateBlockReasonFromCompliance(compliance: {
  isPrimaryUserVerified?: boolean;
  allRequiredOwnersVerified?: boolean;
  hasCompanyNumber?: boolean;
} | null): CertificateBlockReason {
  if (!compliance) return 'primary';
  if (!compliance.isPrimaryUserVerified) return 'primary';
  if (!compliance.allRequiredOwnersVerified) return 'owners';
  if (!compliance.hasCompanyNumber) return 'company';
  return 'primary';
}

/**
 * Map backend 403 error code to certificate block reason.
 */
export function getCertificateBlockReasonFromError(
  errorCode: string | undefined
): CertificateBlockReason {
  if (errorCode === 'owners_pending') return 'owners';
  if (errorCode === 'company_number_missing') return 'company';
  return 'primary';
}

/**
 * Whether the signed-in user still needs to complete primary identity verification
 * (nav badge / “Required” label). Aligns with Account → Verification when
 * `verificationState` comes from `/api/bff/profile/compliance`.
 */
export function isPrimaryVerificationRequiredForNav(options: {
  verificationState?: VerificationPageState | string | null;
  kycStatus?: string | null;
}): boolean {
  const state = options.verificationState as VerificationPageState | undefined;
  if (state === 'verified' || state === 'pending_others') return false;
  if (state === 'action_required') return true;

  const k = (options.kycStatus || '').toLowerCase();
  const done = k === 'approved' || k === 'verified';
  return !done;
}
