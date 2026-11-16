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
        : { key: 'payment', label: 'Pay for your plan', detail: 'Choose monthly or annual billing and pay securely by card.', done: payment.entitled, href: '/account/billing', action: 'Complete payment' };

  const identityDetail: Record<AccessDecision['verification']['state'], string> = {
    not_started: 'Confirm who you are with a photo ID. It takes a few minutes.',
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
      detail: `${n} business owner${n === 1 ? '' : 's'} still need${n === 1 ? 's' : ''} to verify their identity. We have emailed them a link; you can resend it.`,
      done: false, href: '/business-owners', action: 'View owners',
    });
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
            <strong className="font-semibold">Mail is waiting.</strong>{' '}
            You will be able to view it once the steps below are complete.
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
