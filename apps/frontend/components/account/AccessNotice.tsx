'use client';

import Link from 'next/link';
import { Check, Circle, Mail } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAccess, type AccessDecision } from '@/hooks/useAccess';

type Step = { key: string; label: string; detail: string; done: boolean; href: string; action: string };

function formatDate(ms: number | null) {
  return ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

export function stepsFor(access: AccessDecision): Step[] {
  const { payment, verification } = access;
  const pay: Step =
    payment.state === 'past_due'
      ? { key: 'payment', label: 'Update your payment', detail: 'Your last payment did not go through. Update your card to restore your service.', done: false, href: '/account/billing', action: 'Update payment' }
      : payment.state === 'cancelled'
        ? { key: 'payment', label: 'Restart your subscription', detail: 'Your subscription has ended. Start a new one to use your address again.', done: false, href: '/account/billing', action: 'Go to billing' }
        : { key: 'payment', label: 'Pay for your plan', detail: payment.entitled ? 'Your plan is paid.' : 'Choose monthly or annual billing and pay securely by card.', done: payment.entitled, href: '/account/billing', action: 'Complete payment' };

  const identityDetail: Record<AccessDecision['verification']['state'], string> = {
    not_started: 'We need to verify who you are before your address and mail open.',
    in_review: 'We are checking your documents. You do not need to do anything.',
    action_required: 'We need a little more information to finish checking your identity.',
    rejected: 'We could not verify your identity. Please contact support so we can review it.',
    owners_pending: 'Your identity is verified.',
    complete: 'Your identity is verified.',
  };
  const identity: Step = {
    key: 'identity', label: 'Verify your identity', detail: identityDetail[verification.state], done: verification.primaryApproved,
    href: verification.state === 'rejected' ? '/account/support' : '/account/verification',
    action: verification.state === 'rejected' ? 'Contact support' : verification.state === 'in_review' ? 'View status' : 'Verify identity',
  };
  const steps = [pay, identity];
  if (verification.pendingOwners > 0 || verification.state === 'owners_pending') {
    const n = verification.pendingOwners;
    steps.push({
      key: 'owners', label: 'Business owners verified',
      detail: `${n} business owner${n === 1 ? '' : 's'} still need${n === 1 ? 's' : ''} to verify their identity. Your service is paused until every required owner is verified. We have emailed them a link; you can resend it.`,
      done: false, href: '/business-owners', action: 'View owners',
    });
  }
  const pre = access.company?.preIncorporation;
  if (access.missing.includes('company_number_overdue')) {
    steps.push({ key: 'company', label: 'Add your company number', detail: 'The 30 days to register your company have passed, so the address is paused. Add the company number once it is registered and we will check it.', done: false, href: '/account/verification#company', action: 'Add company number' });
  } else if (access.missing.includes('pre_incorporation_refused')) {
    steps.push({ key: 'company', label: 'Company not accepted', detail: 'We could not accept your proposed company. Contact support if you have questions.', done: false, href: '/account/support', action: 'Contact support' });
  } else if (access.missing.includes('company_checks_pending') && pre === 'needed') {
    steps.push({ key: 'company', label: 'Tell us about your company', detail: 'Not registered yet? Tell us about the company you are forming: its name, activity, directors and owners.', done: false, href: '/account/verification#company', action: 'Add company details' });
  } else if (access.missing.includes('company_checks_pending') && pre === 'in_review') {
    steps.push({ key: 'company', label: 'Proposed company in review', detail: 'We are reviewing the company you are forming. We will email you when we have decided.', done: false, href: '/account/verification#company', action: 'View details' });
  } else if (access.missing.includes('company_checks_pending')) {
    const needDeclaration = !!access.company?.declarationNeeded;
    steps.push(needDeclaration
      ? { key: 'company', label: 'Tell us about your company', detail: 'Your business activity, directors and owners. We check them against Companies House.', done: false, href: '/account/verification#company', action: 'Add company details' }
      : { key: 'company', label: 'Company checks', detail: 'We are checking your company\'s details on the Companies House register. You do not need to do anything unless we contact you.', done: false, href: '/account/support', action: 'Contact support' });
  }
  return steps;
}

/**
 * Shown on every dashboard page while the account is not in full service: what is outstanding,
 * and (if anything has arrived) a generic "mail is waiting" line. It never shows who the mail is
 * from or anything else about it; the backend does not send that information to this page.
 */
export function AccessNotice({ access, currentPath }: { access: AccessDecision; currentPath: string }) {
  const steps = stepsFor(access);
  const paidThrough = formatDate(access.payment.paidThroughMs);
  return (
    <section aria-labelledby="access-notice-title" className="mb-6 rounded-2xl border border-border bg-background p-5 sm:p-6">
      <h2 id="access-notice-title" className="text-h3 font-semibold text-foreground">Finish setting up your account</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Your address, mail and forwarding open as soon as the steps below are complete.
      </p>

      {access.mailWaiting != null && access.mailWaiting > 0 && (
        <p className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-body-sm text-foreground" role="status">
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">
              {access.mailWaiting === 1 ? '1 item of mail is waiting.' : `${access.mailWaiting} items of mail are waiting.`}
            </strong>{' '}
            You will be able to view {access.mailWaiting === 1 ? 'it' : 'them'} once the steps below are complete.
          </span>
        </p>
      )}

      <ol className="mt-4 divide-y divide-border">
        {steps.map(step => (
          <li key={step.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {step.done
                ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
                : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
              <div className="min-w-0">
                <p className="text-body font-medium text-foreground">
                  {step.label} <span className="sr-only">{step.done ? '(done)' : '(to do)'}</span>
                </p>
                <p className="text-body-sm text-muted-foreground">{step.detail}</p>
              </div>
            </div>
            {!step.done && currentPath !== step.href && (
              <Link href={step.href} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-body-sm font-medium text-background hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                {step.action}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {access.payment.state === 'past_due' && access.payment.entitled && paidThrough && (
        <p className="mt-2 text-body-sm text-muted-foreground">Your service continues until {paidThrough}.</p>
      )}
    </section>
  );
}

/** Placed at the top of the dashboard's main column: renders the notice only while restricted. */
export function AccessNoticeSlot() {
  const { access } = useAccess();
  const pathname = usePathname() || '';
  if (!access || access.isAdmin || access.level === 'full') return null;
  return <AccessNotice access={access} currentPath={pathname} />;
}

/**
 * Short sidebar summary of the first thing still missing, taken from the same access decision
 * the backend enforces. Null when the account is in full service.
 */
export function sidebarStatusFor(access: AccessDecision): { title: string; detail: string; href: string } | null {
  if (access.level === 'full') return null;
  const m = access.missing;
  if (m.includes('account_suspended')) return { title: 'Account suspended', detail: 'Contact support to restore your service.', href: '/account/support' };
  if (m.includes('account_closed')) return { title: 'Account closed', detail: 'Contact support if you think this is a mistake.', href: '/account/support' };
  if (m.includes('payment_overdue')) return { title: 'Payment overdue', detail: 'Update your payment to restore your service.', href: '/account/billing' };
  if (m.includes('subscription_cancelled')) return { title: 'Subscription ended', detail: 'Start a new subscription to use your address.', href: '/account/billing' };
  if (m.includes('payment_required')) return { title: 'Payment needed', detail: 'Pay for your plan to activate your address.', href: '/account/billing' };
  if (m.includes('identity_rejected')) return { title: 'Identity check unsuccessful', detail: 'Contact support so we can review it.', href: '/account/support' };
  if (m.includes('identity_in_review')) return { title: 'Identity check in review', detail: 'We are checking your documents.', href: '/account/verification' };
  if (m.includes('identity_required')) return { title: 'Verify your identity', detail: 'Needed before your address and mail open.', href: '/account/verification' };
  if (m.includes('owners_required')) {
    const n = access.verification.pendingOwners;
    return { title: 'Owners to verify', detail: `${n || 'Some'} business owner${n === 1 ? '' : 's'} still need${n === 1 ? 's' : ''} to verify.`, href: '/business-owners' };
  }
  if (m.includes('company_number_overdue')) return { title: 'Company number needed', detail: 'Add your new company\'s number to restore service.', href: '/account/verification#company' };
  if (m.includes('pre_incorporation_refused')) return { title: 'Company not accepted', detail: 'Contact support.', href: '/account/support' };
  if (m.includes('company_checks_pending') && access.company?.preIncorporation === 'in_review') return { title: 'Proposed company in review', detail: 'We will email you when we have decided.', href: '/account/verification#company' };
  if (m.includes('company_checks_pending')) return access.company?.declarationNeeded
    ? { title: 'Company details needed', detail: 'Tell us about your company and its owners.', href: '/account/verification#company' }
    : { title: 'Company checks in progress', detail: 'We are checking your company on Companies House.', href: '/account' };
  return { title: 'Setup not finished', detail: 'Complete the steps on your dashboard.', href: '/account' };
}

/** Which sidebar items need attention. */
export function navAttention(access: AccessDecision | null): { billing: boolean; verification: boolean } {
  if (!access || access.level === 'full') return { billing: false, verification: false };
  const m = access.missing;
  return {
    billing: m.some(x => x === 'payment_required' || x === 'payment_overdue' || x === 'subscription_cancelled'),
    verification: m.some(x => x === 'identity_required' || x === 'identity_rejected' || x === 'owners_required') || (m.includes('company_checks_pending') && !!access.company?.declarationNeeded) || m.includes('company_number_overdue'),
  };
}
