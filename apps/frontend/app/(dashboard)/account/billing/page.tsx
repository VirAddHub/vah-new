'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

const AccountBillingCard = dynamic(() => import('@/components/account/AccountBillingCard').then(mod => ({ default: mod.AccountBillingCard })), { ssr: false });
const InvoicesCard = dynamic(() => import('@/components/account/InvoicesCard').then(mod => ({ default: mod.InvoicesCard })), { ssr: false });

export default function AccountBillingPage() {
    // Fetch billing data
    const { data: overview, mutate: mutateOverview } = useSWR('/api/bff/billing/overview', swrFetcher);
    const { data: invoicesData, mutate: mutateInvoices } = useSWR('/api/bff/billing/invoices?page=1&page_size=12', swrFetcher);

    const o = overview?.data;
    const invoicesRaw = invoicesData?.data?.items || [];

    // Build subscription summary
    const subscription = useMemo(() => {
        const pricePence = o?.current_price_pence;
        const priceLabel = pricePence && pricePence > 0
            ? `£${(pricePence / 100).toFixed(2)}`
            : 'Price not available';

        return {
            plan_name: o?.plan || 'Digital Mailbox Plan',
            price_label: priceLabel,
            billing_period: (o?.cadence === 'yearly' || o?.cadence === 'annual' || o?.cadence === 'year') ? 'annual' : 'monthly',
            status: o?.status === 'active' ? 'active' : o?.status === 'cancelled' ? 'cancelled' : o?.status === 'past_due' ? 'past_due' : 'unknown'
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
        <div className="w-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-[54px] font-medium leading-[1.2] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Billing
                </h1>
                <p className="text-[18px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Manage your subscription, payment method, and invoices
                </p>
            </div>

            <Tabs defaultValue="payment" className="w-full">
                <TabsList className="mb-6 bg-transparent border-b border-[#E5E7EB] rounded-none p-0 h-auto">
                    <TabsTrigger
                        value="payment"
                        className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#40C46C] data-[state=active]:text-[#024E40] text-[#666666] font-normal data-[state=active]:font-medium"
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        Payment Details
                    </TabsTrigger>
                    <TabsTrigger
                        value="invoices"
                        className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#40C46C] data-[state=active]:text-[#024E40] text-[#666666] font-normal data-[state=active]:font-medium"
                        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                    >
                        Invoices
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="payment" className="mt-6">
                    <AccountBillingCard
                        subscription={subscription}
                        onRefresh={async () => {
                            await mutateOverview();
                            await mutateInvoices();
                        }}
                    />
                </TabsContent>

                <TabsContent value="invoices" className="mt-6">
                    <InvoicesCard invoices={invoices} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
