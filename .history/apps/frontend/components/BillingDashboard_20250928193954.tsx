'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  CreditCard,
  Download,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  ExternalLink
} from 'lucide-react';

interface BillingDashboardProps {
  onNavigate?: (page: string) => void;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  due_date?: string;
  download_url?: string;
}

export function BillingDashboard({ onNavigate }: BillingDashboardProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Load billing data
  useEffect(() => {
    const loadBillingData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [billingResponse, invoicesResponse, subscriptionResponse] = await Promise.all([
          apiClient.getBilling(),
          apiClient.getInvoices(),
          apiClient.getSubscriptionStatus()
        ]);

        if (billingResponse.ok) {
          setBillingInfo(billingResponse.data);
        }

        if (invoicesResponse.ok) {
            setInvoices(invoicesResponse.data.items || []);
        }

        if (subscriptionResponse.ok) {
          setSubscriptionStatus(subscriptionResponse.data);
        }

      } catch (err) {
        console.error('Failed to load billing data:', err);
        setError('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    loadBillingData();
  }, []);

  const handleCreatePaymentMethod = async () => {
    try {
      setLoading(true);
      const response = await apiClient.createRedirectFlow();

      if (response.ok) {
        const data = response.data as { redirect_url?: string };
        setRedirectUrl(data.redirect_url || '');
        // Redirect to GoCardless
        if (data.redirect_url) {
          window.open(data.redirect_url, '_blank');
        }
      } else {
        setError('Failed to create payment method');
      }
    } catch (err) {
      console.error('Failed to create payment method:', err);
      setError('Failed to create payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await apiClient.getInvoiceLinkUser(invoiceId);

      if (response.ok) {
        window.open(response.data.url, '_blank');
      } else {
        setError('Failed to get invoice download link');
      }
    } catch (err) {
      console.error('Failed to download invoice:', err);
      setError('Failed to download invoice');
    }
  };

  type ManageAction = 'pause' | 'resume' | 'cancel';

  const handleManageSubscription = async (action: ManageAction) => {
    try {
      setLoading(true);
      const response = await apiClient.manageSubscription(action);

      if (response.ok) {
        // Refresh subscription status
        const statusResponse = await apiClient.getSubscriptionStatus();
        if (statusResponse.ok) {
          setSubscriptionStatus(statusResponse.data);
        }
      } else {
        setError(`Failed to ${action} subscription`);
      }
    } catch (err) {
      console.error(`Failed to ${action} subscription:`, err);
      setError(`Failed to ${action} subscription`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Paid
        </Badge>;
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading && !billingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">Billing & Payments</h1>
              <p className="text-muted-foreground">
                Manage your subscription and view invoices
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Subscription Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Current Plan</h3>
                <p className="text-2xl font-bold text-primary">£9.99/month</p>
                <p className="text-sm text-muted-foreground">Virtual Address Service</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <div className="flex items-center gap-2">
                  {subscriptionStatus?.plan_status === 'active' ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {subscriptionStatus?.plan_status || 'Inactive'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <Button
                onClick={handleCreatePaymentMethod}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {subscriptionStatus?.plan_status === 'active' ? 'Update Payment Method' : 'Add Payment Method'}
              </Button>

              {subscriptionStatus?.plan_status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => handleManageSubscription('cancel')}
                  disabled={loading}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
              <p className="text-xs text-muted-foreground">
                {invoices.filter(inv => inv.status === 'paid').length} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{invoices
                  .filter(inv => inv.status === 'paid')
                  .reduce((sum, inv) => sum + (inv.amount || 0), 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£9.99</div>
              <p className="text-xs text-muted-foreground">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Invoice #{invoice.id}</p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Amount: £{invoice.amount?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(invoice.created_at).toLocaleDateString()}
                        {invoice.due_date && (
                          <span> • Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No invoices yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Invoices will appear here once you start using the service
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Setup */}
        {redirectUrl && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Payment Method Setup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                A new window should have opened for you to set up your payment method with GoCardless.
                If it didn't open, click the button below.
              </p>
              <Button
                onClick={() => window.open(redirectUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Payment Setup
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
