'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, RefreshCw, Loader2 } from 'lucide-react';
import { SubscriptionSummary } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import {
  PaymentMethodModal,
  type PaymentMethodModalMode,
} from '@/components/account/PaymentMethodModal';

interface AccountBillingCardProps {
  subscription: SubscriptionSummary;
  onRefresh?: () => void;
}

export function AccountBillingCard({
  subscription,
  onRefresh,
}: AccountBillingCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalMode, setPaymentModalMode] =
    useState<PaymentMethodModalMode>('update');
  const { data: overview, mutate: mutateOverview } = useSWR(
    '/api/bff/billing/overview',
    swrFetcher
  );

  const hasMandate = overview?.data?.has_mandate || false;
  const mandateStatus = overview?.data?.mandate_status || 'missing';

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
      className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white w-full max-w-[408px] flex-shrink-0"
      style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
    >
      <CardContent className="p-[28px] h-full flex flex-col">
        <div className="flex flex-col gap-[14px] flex-1">
          {/* Header */}
          <h3
            className="text-[18px] font-semibold leading-[1.4] text-[#1A1A1A]"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
          >
            Account & billing
          </h3>

          {/* Plan: clarify monthly vs yearly */}
          <div className="flex items-center justify-between gap-[58px]">
            <span
              className="text-[12px] font-normal leading-[1.4] text-[#666666]"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              }}
            >
              Plan
            </span>
            <span
              className="text-[12px] font-normal leading-[1.4] text-[#666666] text-right"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              }}
            >
              {subscription.billing_period === 'annual'
                ? `Annual (${subscription.price_label}/year)`
                : `Monthly (${subscription.price_label}/month)`}
            </span>
          </div>
          <div className="w-full h-[0.5px] bg-[#E5E7EB]"></div>

          {/* Status */}
          <div className="flex items-center justify-between gap-[58px]">
            <span
              className="text-[12px] font-normal leading-[1.4] text-[#666666]"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              }}
            >
              Status
            </span>
            <span
              className="text-[12px] font-normal leading-[1.4] text-[#666666] text-right"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              }}
            >
              {subscription.status === 'active'
                ? 'Active'
                : subscription.status === 'cancelled'
                  ? 'Cancelled'
                  : subscription.status === 'past_due'
                    ? 'Past due'
                    : 'Unknown'}
            </span>
          </div>
          <div className="w-full h-[0.5px] bg-[#E5E7EB]"></div>

          {/* Next billing */}
          <div className="flex items-center justify-between gap-[58px]">
            <span
              className="text-[12px] font-normal leading-[1.4] text-[#666666]"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              }}
            >
              Next billing
            </span>
            <span
              className="text-[12px] font-normal leading-[1.4] text-[#666666] text-right"
              style={{
                fontFamily: 'var(--font-poppins), Poppins, sans-serif',
              }}
            >
              {nextBillingLabel}
            </span>
          </div>

          {/* Payment details actions: always show so users can edit / set up payment */}
          <div className="pt-4 border-t space-y-3">
            {(subscription.status === 'cancelled' ||
              subscription.status === 'past_due') && (
              <Button
                onClick={handleReactivate}
                disabled={isLoading === 'reactivate'}
                className="w-full bg-[#206039] text-white hover:bg-[#206039]/90"
                style={{
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                }}
              >
                {isLoading === 'reactivate' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reactivate subscription
                  </>
                )}
              </Button>
            )}
            {subscription.status === 'active' && !hasMandate && (
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentModalMode('setup');
                  setPaymentModalOpen(true);
                }}
                className="w-full"
                style={{
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Set up payment method
              </Button>
            )}
            {hasMandate && (
              <Button
                onClick={() => {
                  setPaymentModalMode('update');
                  setPaymentModalOpen(true);
                }}
                className="w-full bg-[#206039] text-white hover:bg-[#206039]/90"
                style={{
                  fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Update bank details
              </Button>
            )}
          </div>
        </div>

        <PaymentMethodModal
          open={paymentModalOpen}
          mode={paymentModalMode}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={async () => {
            await mutateOverview();
            onRefresh?.();
          }}
        />
      </CardContent>
    </Card>
  );
}
