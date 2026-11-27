'use client';

import useSWR from 'swr';

export type AccessLevel = 'none' | 'onboarding' | 'full';
export type NextStep = 'none' | 'payment' | 'billing' | 'verification' | 'owners' | 'company' | 'support' | 'mail';
export type MissingReason =
  | 'account_suspended' | 'account_closed' | 'payment_required' | 'payment_overdue' | 'subscription_cancelled'
  | 'identity_required' | 'identity_in_review' | 'identity_rejected' | 'owners_required' | 'company_checks_pending';

export interface AccessDecision {
  level: AccessLevel;
  standing: 'good' | 'suspended' | 'closed';
  payment: { state: 'none' | 'active' | 'past_due' | 'cancelled' | 'pending'; entitled: boolean; paidThroughMs: number | null; cancelAtPeriodEnd: boolean };
  verification: { state: 'not_started' | 'in_review' | 'action_required' | 'rejected' | 'owners_pending' | 'complete'; primaryApproved: boolean; pendingOwners: number };
  /** Company checks: present when the API includes it (older responses may not). */
  company?: { required: number; satisfactory: number; investigating: number; declarationNeeded?: boolean };
  missing: MissingReason[];
  next: NextStep;
  /** How many items are waiting while service is restricted. A count only. Null when in full service. */
  mailWaiting: number | null;
  isAdmin: boolean;
}

type Result = { status: number; access: AccessDecision | null };

async function fetchAccess(): Promise<Result> {
  const res = await fetch('/api/bff/access', { credentials: 'include', cache: 'no-store' });
  const json = await res.json().catch(() => null);
  return { status: res.status, access: res.ok && json?.ok ? (json.data as AccessDecision) : null };
}

/** Where each outstanding step is completed. */
export const NEXT_STEP_PATH: Record<NextStep, string> = {
  none: '/login',
  payment: '/account/billing',
  billing: '/account/billing',
  verification: '/account/verification',
  owners: '/business-owners',
  company: '/account/verification#company',
  support: '/account/support',
  mail: '/mail',
};

export function useAccess() {
  const { data, error, isLoading, mutate } = useSWR<Result>('access-decision', fetchAccess, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
  return {
    access: data?.access ?? null,
    unauthenticated: data?.status === 401,
    isLoading: isLoading || (!data && !error),
    error: error || (data && data.status >= 500 ? new Error('access_unavailable') : null),
    refresh: mutate,
  };
}
