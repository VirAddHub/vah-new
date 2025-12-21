'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, RefreshCw, Shield, Loader2 } from 'lucide-react';
import { SubscriptionSummary } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';

interface AccountBillingCardProps {
  subscription: SubscriptionSummary;
  onRefresh?: () => void;
}

export function AccountBillingCard({ subscription, onRefresh }: AccountBillingCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { data: overview, mutate: mutateOverview } = useSWR('/api/bff/billing/overview', swrFetcher);

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
          title: "Already active",
          description: "Your subscription is already active.",
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
        window.location.href = `${appUrl}/billing?billing_request_flow_id=${encodeURIComponent(data.data.redirectFlowId)}`;
        return;
      }

      // Handle redirect URL
      const redirectUrl = data.data?.redirect_url || data.redirect_url;
      if (redirectUrl) {
        toast({
          title: "Redirecting to payment setup",
          description: "You'll be redirected to complete your payment setup.",
        });
        window.location.href = redirectUrl;
        return;
      }

      // Handle skip payment case (GoCardless not configured)
      if (data.data?.skip_payment) {
        toast({
          title: "Payment setup",
          description: data.data.message || "Payment setup will be completed later.",
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
        title: "Error",
        description: error.message || "Failed to restart subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpdateBank = async () => {
    setIsLoading('update-bank');
    try {
      const response = await fetch('/api/bff/billing/update-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create update bank link');
      }

      // Open GoCardless secure flow in new window
      if (data.data?.url || data.data?.redirect_url) {
        window.open(data.data.url || data.data.redirect_url, '_blank', 'noopener,noreferrer');
        toast({
          title: "Done",
          description: "Check GoCardless in the new tab.",
        });

        // Refresh data after action
        await mutateOverview();
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open bank update page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleReauthorise = async () => {
    setIsLoading('reauthorise');
    try {
      const response = await fetch('/api/bff/billing/reauthorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create reauthorization link');
      }

      // Open GoCardless secure flow in new window
      if (data.data?.url || data.data?.redirect_url) {
        window.open(data.data.url || data.data.redirect_url, '_blank', 'noopener,noreferrer');
        toast({
          title: "Done",
          description: "Check GoCardless in the new tab.",
        });

        // Refresh data after action
        await mutateOverview();
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open reauthorization page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past due</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{subscription.plan_name}</p>
              <p className="text-sm text-muted-foreground">
                {subscription.price_label} / {subscription.billing_period}
              </p>
            </div>
            {getStatusBadge()}
          </div>
        </div>

        {/* Mandate Status */}
        {hasMandate && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">
              Direct Debit {mandateStatus === 'active' ? 'active' : 'pending'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {(subscription.status === 'cancelled' || subscription.status === 'past_due') && (
            <Button
              onClick={handleReactivate}
              disabled={isLoading === 'reactivate'}
              className="flex items-center gap-2"
            >
              {isLoading === 'reactivate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reactivate subscription
            </Button>
          )}
          {hasMandate && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleUpdateBank}
                disabled={isLoading === 'update-bank'}
                className="flex items-center gap-2"
              >
                {isLoading === 'update-bank' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Update bank details
              </Button>
              <Button
                variant="outline"
                onClick={handleReauthorise}
                disabled={isLoading === 'reauthorise'}
                className="flex items-center gap-2"
              >
                {isLoading === 'reauthorise' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Re-authorise Direct Debit
              </Button>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            <p>Billing address is managed by GoCardless</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
