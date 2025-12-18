'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { AccountBillingCard } from '@/components/account/AccountBillingCard';
import { BusinessContactCard } from '@/components/account/BusinessContactCard';
import { ForwardingAddressCard } from '@/components/account/ForwardingAddressCard';
import { OwnersCard } from '@/components/account/OwnersCard';
import { InvoicesCard } from '@/components/account/InvoicesCard';
import { AccountPageData, BusinessContactInfo, Address, BusinessOwner, InvoiceRow, SubscriptionSummary } from '@/lib/account/types';
import { mockAccountData } from '@/lib/account/mockAccountData';
import { toast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

export default function AccountPage() {
    // Fetch account data from existing APIs
    const { data: accountData } = useSWR<{ ok: boolean; data: AccountPageData }>('/api/bff/account', swrFetcher);
    const { data: overview, mutate: mutateOverview } = useSWR('/api/billing/overview', swrFetcher);
    const { data: invoicesData, mutate: mutateInvoices } = useSWR('/api/billing/invoices?page=1&page_size=12', swrFetcher);
    const { data: userData, mutate: mutateUser } = useSWR('/api/auth/whoami', swrFetcher);
    const { data: profileData, mutate: mutateProfile } = useSWR('/api/profile', swrFetcher);

    const user = userData?.data?.user;
    const profile = profileData?.data;
    const o = overview?.data;
    const invoices = invoicesData?.data?.items || [];

    // Build account data from existing APIs
    const data = useMemo<AccountPageData>(() => {
        // If we have account data from dedicated endpoint, use it
        if (accountData?.ok) {
            return accountData.data;
        }

        // Otherwise, build from existing APIs
        const subscription: SubscriptionSummary = {
            plan_name: o?.plan || 'Digital Mailbox Plan',
            price_label: o?.current_price_pence ? `£${(o.current_price_pence / 100).toFixed(2)}` : '£9.99',
            billing_period: (o?.cadence === 'yearly' || o?.cadence === 'annual') ? 'annual' : 'monthly',
            status: o?.status === 'active' ? 'active' : o?.status === 'cancelled' ? 'cancelled' : o?.status === 'past_due' ? 'past_due' : 'unknown'
        };

        const contact: BusinessContactInfo = {
            first_name: profile?.first_name || user?.first_name || '',
            middle_names: profile?.middle_names || '',
            last_name: profile?.last_name || user?.last_name || '',
            phone: profile?.phone || user?.phone || '',
            email: profile?.email || user?.email || ''
        };

        // SAFETY: Never overwrite existing addresses
        const forwarding_address: Address | null = profile?.forwarding_address || user?.forwarding_address
            ? { formatted: profile?.forwarding_address || user?.forwarding_address || '' }
            : null;

        // SAFETY: Preserve business_address if it exists (display only, never delete)
        const business_address: Address | null = (profile?.address_line1 || profile?.city)
            ? {
                formatted: [
                    profile?.address_line1,
                    profile?.address_line2,
                    profile?.city,
                    profile?.postal_code,
                    profile?.country
                ].filter(line => line && line.trim() !== '').join('\n')
            }
            : null;

        // Transform invoices
        const invoiceRows: InvoiceRow[] = invoices.map((inv: any) => ({
            invoice_no: inv.invoice_number || inv.id?.toString() || 'N/A',
            description: inv.description || 'Subscription payment',
            total_label: inv.amount_pence ? `£${(inv.amount_pence / 100).toFixed(2)}` : '£0.00',
            status: inv.status === 'paid' ? 'paid' : inv.status === 'void' ? 'void' : 'not_paid',
            date_label: inv.date ? new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A',
            download_url: inv.download_url || inv.invoice_url
        }));

        return {
            subscription,
            contact,
            forwarding_address,
            business_address,
            owners: [], // TODO: Fetch from PSC API when available
            invoices: invoiceRows
        };
    }, [accountData, o, profile, user, invoices]);

    // Handlers
    const handleSaveContact = async (contact: BusinessContactInfo) => {
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    first_name: contact.first_name,
                    middle_names: contact.middle_names,
                    last_name: contact.last_name,
                    phone: contact.phone,
                    email: contact.email
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save contact information');
            }

            // Refresh profile data
            await mutateProfile();
            await mutateUser();
        } catch (error) {
            throw error;
        }
    };

    const handleSaveAddress = async (address: Address) => {
        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    forwarding_address: address.formatted
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save forwarding address');
            }

            // Refresh profile data
            await mutateProfile();
            await mutateUser();
        } catch (error) {
            throw error;
        }
    };

    const handleAddOwner = async (ownerData: any) => {
        // TODO: Implement API call to add owner
        toast({
            title: "Coming soon",
            description: "Owner management API will be available soon.",
        });
        // await mutate();
    };

    const handleEditOwner = async (owner: BusinessOwner) => {
        // TODO: Implement API call to update owner
        // Preserve verified status
        toast({
            title: "Coming soon",
            description: "Owner management API will be available soon.",
        });
        // await mutate();
    };

    const handleRemoveOwner = async (ownerId: string | number) => {
        // TODO: Implement API call to remove owner
        toast({
            title: "Coming soon",
            description: "Owner management API will be available soon.",
        });
        // await mutate();
    };

    const handleVerifyOwner = async (ownerId: string | number) => {
        // TODO: Implement Sumsub verification
        toast({
            title: "Coming soon",
            description: "Verification will be requested for this owner.",
        });
    };

    // Transform invoices data - use data from useMemo
    const invoices: InvoiceRow[] = data.invoices || [];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navigation onNavigate={() => { }} />
            <main className="flex-1">
                <div className="max-w-6xl mx-auto p-6 space-y-8">
                    <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">Account</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Section A - Account & Billing */}
                        <AccountBillingCard subscription={data.subscription} />

                        {/* Section B - Business Contact Information */}
                        <BusinessContactCard
                            contact={data.contact}
                            onSave={handleSaveContact}
                        />
                    </div>

                    {/* Section C - Forwarding Address */}
                    <ForwardingAddressCard
                        address={data.forwarding_address || null}
                        onSave={handleSaveAddress}
                    />

                    {/* Business Address (Display Only - Never Delete) */}
                    {data.business_address && (
                        <div className="bg-muted/50 p-4 rounded-lg border">
                            <h3 className="font-medium mb-2">Business Address (Registered Office)</h3>
                            <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                                {data.business_address.formatted}
                            </pre>
                            <p className="text-xs text-muted-foreground mt-2">
                                This is your registered office address and cannot be edited here.
                            </p>
                        </div>
                    )}

                    {/* Section D - Business Owners (PSC) */}
                    <OwnersCard
                        owners={data.owners || []}
                        onAdd={handleAddOwner}
                        onEdit={handleEditOwner}
                        onRemove={handleRemoveOwner}
                        onVerify={handleVerifyOwner}
                    />

                    {/* Section E - Invoices */}
                    <InvoicesCard invoices={invoices} />
                </div>
            </main>
            <Footer />
        </div>
    );
}
