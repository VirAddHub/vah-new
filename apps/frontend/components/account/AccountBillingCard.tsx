'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { SubscriptionSummary } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';
import { useBillingOverview } from '@/hooks/useDashboardData';
interface AccountBillingCardProps {
  subscription: SubscriptionSummary;
  onRefresh?: () => void;
}

export function AccountBillingCard({
  subscription,
  onRefresh,
}: AccountBillingCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [manageBillingBusy, setManageBillingBusy] = useState(false);
  const { data: overview, mutate: mutateOverview } = useBillingOverview();

  const canOpenBillingPortal =
    subscription.status === 'active' || subscription.status === 'past_due';

  const handleManageBilling = async () => {
    if (manageBillingBusy) return;
    setManageBillingBusy(true);
    try {
      const response = await fetch('/api/bff/billing/update-bank', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        const msg =
          data?.message ||
          data?.error ||
          'Could not open billing management. Please try again.';
        throw new Error(typeof msg === 'string' ? msg : 'Request failed');
      }
      const url =
        (typeof data.data?.redirect_url === 'string' && data.data.redirect_url) ||
        (typeof data.data?.url === 'string' && data.data.url) ||
        null;
      if (!url) {
        throw new Error('No billing link returned. Please try again or contact support.');
      }
      window.location.href = url;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast({
        title: 'Could not open billing',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setManageBillingBusy(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading('reactivate');
    try {
      // Get plan_id from overview or use subscription data
      // The backend will use user.plan_id if not provided, but we should try to get it
      const planId = overview?.data?.plan_id || null;
      const billingPeriod = subscription.billing_period || 'monthly';

      const response = await fetch('/api/bff/payments/redirect-flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan_id: planId,
          billing_period: billingPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to restart subscription');
      }

      // Handle already linked case
      if (data.data?.alreadyLinked) {
        toast({
          title: 'Already active',
          description: 'Your subscription is already active.',
        });
        await mutateOverview();
        if (onRefresh) {
          await onRefresh();
        }
        return;
      }

      // Handle resume case
      if (data.data?.resume && data.data?.redirectFlowId) {
        const appUrl = window.location.origin;
        window.location.href = `${appUrl}/billing?billing_request_flow_id=${encodeURIComponent(
          data.data.redirectFlowId
        )}`;
        return;
      }

      // Handle redirect URL
      const redirectUrl = data.data?.redirect_url || data.redirect_url;
      if (redirectUrl) {
        toast({
          title: 'Redirecting to payment setup',
          description: "You'll be redirected to complete your payment setup.",
        });
        window.location.href = redirectUrl;
        return;
      }

      if (data.data?.skip_payment) {
        toast({
          title: 'Payment setup',
          description:
            data.data.message || 'Payment setup will be completed later.',
        });
        await mutateOverview();
        if (onRefresh) {
          await onRefresh();
        }
        return;
      }

      throw new Error('No redirect URL received');
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error.message || 'Failed to restart subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  // Next billing: backend sends next_billing_date (YYYY-MM-DD) or we use next_charge_at (ms) or latest_invoice.period_end
  const nextBillingDate =
    overview?.data?.next_billing_date ||
    overview?.data?.latest_invoice?.period_end;
  const nextChargeAt = overview?.data?.next_charge_at;
  let nextBillingLabel = 'N/A';
  if (nextBillingDate) {
    try {
      const date =
        typeof nextBillingDate === 'string'
          ? new Date(nextBillingDate + 'T00:00:00Z')
          : new Date(nextBillingDate);
      if (!isNaN(date.getTime())) {
        nextBillingLabel = date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch (e) {
      // Keep 'N/A'
    }
  }
  if (nextBillingLabel === 'N/A' && nextChargeAt != null) {
    try {
      const ms = Number(nextChargeAt);
      const date = new Date(ms > 1e12 ? ms : ms * 1000);
      if (!isNaN(date.getTime())) {
        nextBillingLabel = date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch (e) {
      // Keep 'N/A'
    }
  }

  return (
    <Card
      className="w-full min-w-0 max-w-full flex-shrink-0 rounded-xl border-border/80 bg-card shadow-sm sm:max-w-xl sm:rounded-2xl"
    >
      <CardContent className="flex h-full flex-col p-5 sm:p-8">
        <div className="flex flex-1 flex-col gap-4 sm:gap-5">
          <div>
            <h3 className="text-h4 text-foreground sm:text-h3">Subscription</h3>
            <p className="mt-1 text-caption text-muted-foreground sm:text-body-sm">
              Your current subscription details.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 min-w-0">
            <span className="shrink-0 text-caption text-muted-foreground">
              Current plan
            </span>
            <div className="min-w-0 text-right">
              <p className="text-body-sm font-medium text-foreground sm:text-body">
                {subscription.plan_name}
              </p>
              <p className="mt-0.5 text-caption text-muted-foreground">
                {subscription.billing_period === 'annual'
                  ? `${subscription.price_label} / year`
                  : `${subscription.price_label} / month`}
              </p>
            </div>
          </div>
          <div className="h-px w-full bg-border" />

          <div className="flex items-center justify-between gap-4 min-w-0">
            <span className="shrink-0 text-caption text-muted-foreground">
              Next billing date
            </span>
            <span className="min-w-0 truncate text-right text-body-sm text-foreground sm:max-w-none">
              {nextBillingLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 min-w-0">
            <span className="shrink-0 text-caption text-muted-foreground">
              Status
            </span>
            <span className="text-right text-body-sm text-muted-foreground">
              {subscription.status === 'active'
                ? 'Active'
                : subscription.status === 'cancelled'
                  ? 'Cancelled'
                  : subscription.status === 'past_due'
                    ? 'Past due'
                    : 'Unknown'}
            </span>
          </div>

          {canOpenBillingPortal && (
            <div className="border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={manageBillingBusy}
                onClick={handleManageBilling}
                className="h-11 min-h-[44px] w-full touch-manipulation border-border bg-background/90 text-body-sm font-medium text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,transform,border-color] duration-200 hover:border-foreground/15 hover:bg-muted/40 hover:text-foreground sm:h-11 sm:w-auto sm:hover:-translate-y-px active:scale-[0.99] sm:active:scale-100"
              >
                {manageBillingBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Opening…
                  </>
                ) : (
                  <>
                    Manage billing
                    <ExternalLink className="ml-2 h-4 w-4 opacity-70" aria-hidden />
                  </>
                )}
              </Button>
              <p className="mt-2 text-caption leading-snug text-muted-foreground">
                Manage your subscription and payment details securely.
              </p>
            </div>
          )}

          {(subscription.status === 'cancelled' ||
            subscription.status === 'past_due') && (
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleReactivate}
                disabled={isLoading === 'reactivate'}
                className="h-12 w-full touch-manipulation sm:h-11"
                size="lg"
              >
                {isLoading === 'reactivate' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reactivating…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reactivate subscription
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
