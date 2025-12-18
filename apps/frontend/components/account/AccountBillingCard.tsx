'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, RefreshCw, MapPin } from 'lucide-react';
import { SubscriptionSummary } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';

interface AccountBillingCardProps {
  subscription: SubscriptionSummary;
}

export function AccountBillingCard({ subscription }: AccountBillingCardProps) {
  const handleReactivate = () => {
    toast({
      title: "Coming soon",
      description: "Subscription reactivation will be available soon.",
    });
  };

  const handlePaymentMethods = () => {
    toast({
      title: "Coming soon",
      description: "Payment methods management will be available soon.",
    });
  };

  const handleChangeBillingAddress = () => {
    toast({
      title: "Coming soon",
      description: "Billing address changes will be available soon.",
    });
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

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {subscription.status === 'cancelled' && (
            <Button onClick={handleReactivate} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reactivate subscription
            </Button>
          )}
          <Button variant="outline" onClick={handlePaymentMethods} className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment methods
          </Button>
          <Button variant="outline" onClick={handleChangeBillingAddress} className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Change billing address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
