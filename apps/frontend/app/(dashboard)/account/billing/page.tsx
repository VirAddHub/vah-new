'use client';

import { useMemo } from 'react';
import { useBillingOverview, useInvoices } from '@/hooks/useDashboardData';
import { SubscriptionSummary } from '@/lib/account/types';
import dynamic from 'next/dynamic';

const AccountBillingCard = dynamic(() => import('@/components/account/AccountBillingCard').then(mod => ({ default: mod.AccountBillingCard })), { ssr: false });
const InvoicesCard = dynamic(() => import('@/components/account/InvoicesCard').then(mod => ({ default: mod.InvoicesCard })), { ssr: false });

export default function AccountBillingPage() {
    // Fetch billing data using stable hooks
    const { data: overview, mutate: mutateOverview } = useBillingOverview();
    const { data: invoicesData, mutate: mutateInvoices } = useInvoices();

    const o = overview?.data;
    const invoicesRaw = invoicesData?.data?.items || [];

    // Build subscription summary
    const subscription = useMemo<SubscriptionSummary>(() => {
        const pricePence = o?.current_price_pence;
        const priceLabel = pricePence && pricePence > 0
            ? `£${(pricePence / 100).toFixed(2)}`
            : 'Price not available';

        const billingPeriod: 'monthly' | 'annual' = (o?.cadence === 'yearly' || o?.cadence === 'annual' || o?.cadence === 'year') ? 'annual' : 'monthly';
        const status: 'active' | 'cancelled' | 'past_due' | 'unknown' = o?.status === 'active' ? 'active' : o?.status === 'cancelled' ? 'cancelled' : o?.status === 'past_due' ? 'past_due' : 'unknown';

        return {
            plan_name: o?.plan || 'Digital Mailbox Plan',
            price_label: priceLabel,
            billing_period: billingPeriod,
            status: status
        };
    }, [o]);

    // Transform invoices
    const invoices = useMemo(() => {
        return invoicesRaw.map((inv: any) => {
            let dateLabel = 'N/A';

            if (inv.period_end) {
                try {
                    const dateStr = String(inv.period_end).trim();
                    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const date = new Date(dateStr + 'T00:00:00Z');
                        if (!isNaN(date.getTime())) {
                            dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
                        }
                    }
                } catch (e) {
                    // Fall through
                }
            }

            if (dateLabel === 'N/A' && inv.date) {
                try {
                    const timestamp = typeof inv.date === 'number' ? inv.date : Number(inv.date);
                    if (!isNaN(timestamp) && timestamp > 0) {
                        const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
                        const date = new Date(ts);
                        if (!isNaN(date.getTime())) {
                            dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
                        }
                    }
                } catch (e) {
                    // Keep 'N/A'
                }
            }

            if (dateLabel === 'N/A' && inv.created_at) {
                try {
                    const timestamp = typeof inv.created_at === 'number' ? inv.created_at : Number(inv.created_at);
                    if (!isNaN(timestamp) && timestamp > 0) {
                        const ts = timestamp > 1e12 ? timestamp : timestamp * 1000;
                        const date = new Date(ts);
                        if (!isNaN(date.getTime())) {
                            dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
                        }
                    }
                } catch (e) {
                    // Keep 'N/A'
                }
            }

            const hasPdf = Boolean(inv?.pdf_url || inv?.pdf_path);
            const downloadUrl = hasPdf && inv.id
                ? `/api/bff/billing/invoices/${inv.id}/download`
                : null;

            return {
                invoice_no: inv.invoice_number || inv.id?.toString() || 'N/A',
                description: inv.description || 'Subscription payment',
                total_label: inv.amount_pence ? `£${(inv.amount_pence / 100).toFixed(2)}` : '£0.00',
                status: inv.status === 'paid' ? 'paid' : inv.status === 'void' ? 'void' : inv.status === 'failed' ? 'failed' : 'not_paid',
                date_label: dateLabel,
                download_url: downloadUrl
            };
        });
    }, [invoicesRaw]);

    return (
        <div className="w-full">
            <div className="mb-5 sm:mb-6 md:mb-8">
                <h1 className="text-h1 text-foreground mb-2 sm:mb-4">
                    Billing
                </h1>
                <p className="text-body-sm text-muted-foreground sm:text-body">
                    Your plan, payment method, and invoice history.
                </p>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-8 sm:gap-10">
                <AccountBillingCard
                    subscription={subscription}
                    onRefresh={async () => {
                        await mutateOverview();
                        await mutateInvoices();
                    }}
                />
                <InvoicesCard invoices={invoices} />
            </div>
        </div>
    );
}
