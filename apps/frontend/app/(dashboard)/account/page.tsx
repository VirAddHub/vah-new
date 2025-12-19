'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher } from '@/services/http';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import dynamic from 'next/dynamic';

// Lazy load account components to avoid circular dependencies
const AccountBillingCard = dynamic(() => import('@/components/account/AccountBillingCard').then(mod => ({ default: mod.AccountBillingCard })), { ssr: false });
const BusinessContactCard = dynamic(() => import('@/components/account/BusinessContactCard').then(mod => ({ default: mod.BusinessContactCard })), { ssr: false });
const ForwardingAddressCard = dynamic(() => import('@/components/account/ForwardingAddressCard').then(mod => ({ default: mod.ForwardingAddressCard })), { ssr: false });
const OwnersCard = dynamic(() => import('@/components/account/OwnersCard').then(mod => ({ default: mod.OwnersCard })), { ssr: false });
const InvoicesCard = dynamic(() => import('@/components/account/InvoicesCard').then(mod => ({ default: mod.InvoicesCard })), { ssr: false });
import { AccountPageData, BusinessContactInfo, Address, BusinessOwner, InvoiceRow, SubscriptionSummary } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

export default function AccountPage() {
    // Fetch account data from existing APIs
    const { data: accountData, mutate: mutateAccount } = useSWR<{ ok: boolean; data: AccountPageData }>('/api/bff/account', swrFetcher);
    const { data: overview, mutate: mutateOverview } = useSWR('/api/bff/billing/overview', swrFetcher);
    const { data: invoicesData, mutate: mutateInvoices } = useSWR('/api/bff/billing/invoices?page=1&page_size=12', swrFetcher);
    const { data: userData, mutate: mutateUser } = useSWR('/api/auth/whoami', swrFetcher);
    const { data: profileData, mutate: mutateProfile } = useSWR('/api/bff/profile', swrFetcher);

    const user = userData?.data?.user;
    const profile = profileData?.data;
    const o = overview?.data;
    const invoicesRaw = invoicesData?.data?.items || [];

    // Check for errors and loading states
    const accountError = accountData && accountData.ok === false;
    const profileError = profileData && profileData.ok === false;
    const overviewError = overview && overview.ok === false;
    const invoicesError = invoicesData && invoicesData.ok === false;
    const userError = userData && userData.ok === false;
    const hasError = accountError || profileError || overviewError || invoicesError || userError;
    const isLoading = !accountData && !profileData && !userData && !overview;

    // Collect all error payloads for the banner
    const errorPayloads = [
        accountError ? { endpoint: '/api/bff/account', error: accountData } : null,
        profileError ? { endpoint: '/api/bff/profile', error: profileData } : null,
        overviewError ? { endpoint: '/api/bff/billing/overview', error: overview } : null,
        invoicesError ? { endpoint: '/api/bff/billing/invoices', error: invoicesData } : null,
        userError ? { endpoint: '/api/auth/whoami', error: userData } : null,
    ].filter(Boolean) as Array<{ endpoint: string; error: any }>;

    // Build account data from existing APIs
    const data = useMemo<AccountPageData | null>(() => {
        // If we have account data from dedicated endpoint, use it
        if (accountData?.ok) {
            return accountData.data;
        }

        // Build from individual API responses (fallback)
        // Get price from billing overview, or fallback to most recent paid invoice
        let pricePence = o?.current_price_pence;
        if (!pricePence || pricePence === 0) {
            // Try to get price from most recent paid invoice
            const recentPaidInvoice = invoicesRaw.find((inv: any) => inv.status === 'paid');
            if (recentPaidInvoice?.amount_pence) {
                pricePence = recentPaidInvoice.amount_pence;
            }
        }
        
        const priceLabel = pricePence && pricePence > 0 
            ? `£${(pricePence / 100).toFixed(2)}`
            : 'Price not available';

        const subscription: SubscriptionSummary = {
            plan_name: o?.plan || 'Digital Mailbox Plan',
            price_label: priceLabel,
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

        // Transform invoices (BFF invoices route already normalizes pdf_url to BFF endpoint)
        const invoiceRows: InvoiceRow[] = invoicesRaw.map((inv: any) => ({
            invoice_no: inv.invoice_number || inv.id?.toString() || 'N/A',
            description: inv.description || 'Subscription payment',
            total_label: inv.amount_pence ? `£${(inv.amount_pence / 100).toFixed(2)}` : '£0.00',
            status: inv.status === 'paid' ? 'paid' : inv.status === 'void' ? 'void' : inv.status === 'failed' ? 'failed' : 'not_paid',
            date_label: inv.date ? new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A',
            download_url: inv.pdf_url || inv.download_url || (inv.id ? `/api/bff/billing/invoices/${inv.id}/download` : null)
        }));

        return {
            subscription,
            contact,
            forwarding_address,
            business_address,
            owners: [], // TODO: Fetch from PSC API when available
            invoices: invoiceRows
        };
    }, [accountData, o, profile, user, invoicesRaw]);

    // Handlers
    const handleSaveContact = async (contact: BusinessContactInfo) => {
        try {
            // SAFETY: Never send email in PATCH body (backend will reject it anyway)
            const response = await fetch('/api/bff/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    first_name: contact.first_name,
                    middle_names: contact.middle_names,
                    last_name: contact.last_name,
                    phone: contact.phone
                    // email is intentionally excluded - backend blocks it
                })
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Failed to save contact information');
            }

            // Refresh all relevant data after successful PATCH
            // Use global mutate to ensure ALL components using these keys refresh
            await Promise.all([
                mutateProfile(),
                mutateAccount(),
                mutateUser(),
                mutateOverview(),
                // Global mutate to refresh any other components using these keys
                globalMutate('/api/bff/profile'),
                globalMutate('/api/bff/account'),
                globalMutate('/api/auth/whoami'),
            ]);

            toast({
                title: "Saved",
                description: "Contact information has been updated.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save contact information",
                variant: "destructive",
            });
            throw error;
        }
    };

    const handleSaveAddress = async (address: Address) => {
        try {
            const response = await fetch('/api/bff/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    forwarding_address: address.formatted
                })
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Failed to save forwarding address');
            }

            // Refresh all relevant data after successful PATCH
            // Use global mutate to ensure ALL components using these keys refresh
            await Promise.all([
                mutateProfile(),
                mutateAccount(),
                mutateUser(),
                // Global mutate to refresh any other components using these keys
                globalMutate('/api/bff/profile'),
                globalMutate('/api/bff/account'),
                globalMutate('/api/auth/whoami'),
            ]);

            toast({
                title: "Saved",
                description: "Forwarding address has been updated.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save forwarding address",
                variant: "destructive",
            });
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

    // Show error state if critical data failed to load
    if (hasError && !isLoading) {
        // Get error message from failed requests
        const accountErrorMsg = accountData && accountData.ok === false ? accountData.error || 'Unknown error' : null;
        const profileErrorMsg = profileData && profileData.ok === false ? profileData.error || 'Unknown error' : null;
        const errorMessage = accountErrorMsg || profileErrorMsg || 'Failed to load account details';
        const errorDetails = (accountData && accountData.ok === false ? accountData.details : null) ||
            (profileData && profileData.ok === false ? profileData.details : null);

        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Navigation onNavigate={() => { }} />
                <main className="flex-1">
                    <div className="max-w-6xl mx-auto p-6 space-y-8">
                        <div className="flex items-center gap-3">
                            <User className="h-8 w-8 text-primary" />
                            <h1 className="text-3xl font-bold text-foreground">Account</h1>
                        </div>
                        <div className="bg-destructive/10 border border-destructive rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-destructive mb-2">Unable to load account details</h2>
                            <p className="text-muted-foreground mb-2">
                                {errorMessage}
                            </p>
                            {errorDetails && typeof errorDetails === 'string' && (
                                <p className="text-sm text-muted-foreground mb-4 font-mono bg-muted p-2 rounded">
                                    {errorDetails}
                                </p>
                            )}
                            {errorPayloads.length > 0 && (
                                <div className="mb-4 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-48">
                                    <p className="font-semibold mb-2">Error Payloads:</p>
                                    <pre>{JSON.stringify(errorPayloads, null, 2)}</pre>
                                </div>
                            )}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        mutateAccount();
                                        mutateProfile();
                                        mutateOverview();
                                        mutateUser();
                                    }}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                >
                                    Refresh page
                                </button>
                                <a
                                    href="/api/bff/debug"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                                >
                                    Open debug endpoint
                                </a>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Show loading state
    if (isLoading || !data) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Navigation onNavigate={() => { }} />
                <main className="flex-1">
                    <div className="max-w-6xl mx-auto p-6 space-y-8">
                        <div className="flex items-center gap-3">
                            <User className="h-8 w-8 text-primary" />
                            <h1 className="text-3xl font-bold text-foreground">Account</h1>
                        </div>
                        <div className="space-y-4">
                            <div className="h-32 bg-muted animate-pulse rounded-lg" />
                            <div className="h-32 bg-muted animate-pulse rounded-lg" />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navigation onNavigate={() => { }} />
            <main className="flex-1">
                <div className="max-w-6xl mx-auto p-6 space-y-8">
                    <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">Account</h1>
                    </div>

                    {/* Big banner for 500 errors */}
                    {hasError && errorPayloads.length > 0 && (
                        <div className="bg-destructive border-2 border-destructive rounded-lg p-6 mb-6">
                            <h2 className="text-xl font-bold text-destructive-foreground mb-3">
                                ⚠️ Server Error Detected
                            </h2>
                            <p className="text-destructive-foreground mb-4">
                                One or more API calls returned an error. Check the details below and visit the debug endpoint for more information.
                            </p>
                            <div className="mb-4 p-3 bg-destructive-foreground/10 rounded text-xs font-mono overflow-auto max-h-64">
                                <p className="font-semibold mb-2 text-destructive-foreground">Error Payloads:</p>
                                <pre className="text-destructive-foreground">{JSON.stringify(errorPayloads, null, 2)}</pre>
                            </div>
                            <a
                                href="/api/bff/debug"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-6 py-3 bg-destructive-foreground text-destructive rounded-md hover:opacity-90 font-semibold"
                            >
                                Open Debug Endpoint →
                            </a>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Section A - Account & Billing */}
                        <AccountBillingCard
                            subscription={data.subscription}
                            onRefresh={async () => {
                                await mutateOverview();
                                await mutateProfile();
                                await mutateAccount();
                            }}
                        />

                        {/* Section B - Business Contact */}
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
                    />

                    {/* Section E - Invoices */}
                    <InvoicesCard invoices={data.invoices || []} />
                </div>
            </main>
            <Footer />
        </div>
    );
}
