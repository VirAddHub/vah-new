/** Summarise the mail rules; never infer an active subscription from the billing label. */
export function customerAccessNotes(user: {
  status?: string;
  is_admin?: boolean;
  plan_status?: string;
  kyc_status?: string;
  service_subscription_status?: string | null;
  plan_name?: string | null;
  deleted_at?: unknown;
}): { title: string; summary: string; next: string } {
  if (user.deleted_at) return {title:'Deleted account', summary:'This account has been deleted.', next:'Restore the account, then review access.'};
  if (user.is_admin) return {title:'Admin account', summary:'Admin access follows separate permission rules.', next:'Review admin permissions; customer mail checks do not describe admin access.'};
  const verified = ['approved', 'verified'].includes(user.kyc_status || '');
  const billingActive = user.plan_status === 'active' && user.service_subscription_status === 'active';
  if (user.status === 'suspended') {
    const remaining: string[] = [];
    if (!billingActive) remaining.push(user.service_subscription_status === undefined ? 'Confirm the subscription status.' : 'Resolve billing.');
    if (!verified) remaining.push(user.kyc_status === 'rejected' ? 'Review the rejected identity check.' : 'Complete identity verification.');
    return {
      title:'Suspended by admin',
      summary:'Mail access is blocked. Payment will not remove the suspension.',
      next:['Restore account access when you are ready.', ...remaining].join(' '),
    };
  }
  if (user.service_subscription_status === undefined) return {
    title:'Access needs checking', summary:'The subscription has not been confirmed.', next:'Refresh the page and check billing before confirming mail access.',
  };
  if (billingActive && verified && user.status === 'active') return {
    title:'Ready to receive mail', summary:'Account, billing and identity checks are complete.', next:'No setup action needed. Previously locked scans may still need attention.',
  };
  const blockers: string[] = [];
  if (!billingActive) blockers.push(user.plan_status === 'pending_payment' ? 'Payment is pending.' : 'Billing needs attention.');
  if (!verified) blockers.push(user.kyc_status === 'rejected' ? 'Identity verification was rejected.' : 'Identity verification is pending.');
  if (billingActive && verified && user.status !== 'active') blockers.push('Account access is not active.');
  const steps: string[] = [];
  if (!billingActive) steps.push(user.plan_status === 'pending_payment' ? 'Complete payment' : 'Review billing');
  if (!verified) steps.push(user.kyc_status === 'rejected' ? 'review the rejected identity check' : 'complete identity verification');
  if (user.status !== 'active') steps.push('check account access is Active');
  return {
    title:'Setup incomplete',
    summary:`${user.service_subscription_status !== 'active' ? 'Mail access is blocked.' : 'New scans remain locked.'} ${blockers.join(' ')}`,
    next:steps.join(', then ') + '.',
  };
}

export function customerStatusLabel(value?: string): string {
  if (!value) return 'Not recorded';
  if (value === 'approved' || value === 'verified') return 'Verified';
  const words = value.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
