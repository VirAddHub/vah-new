'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher } from '@/services/http';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';

// Lazy load account components to avoid circular dependencies
const AccountBillingCard = dynamic(() => import('@/components/account/AccountBillingCard').then(mod => ({ default: mod.AccountBillingCard })), { ssr: false });
const BusinessContactCard = dynamic(() => import('@/components/account/BusinessContactCard').then(mod => ({ default: mod.BusinessContactCard })), { ssr: false });
const ForwardingAddressCard = dynamic(() => import('@/components/account/ForwardingAddressCard').then(mod => ({ default: mod.ForwardingAddressCard })), { ssr: false });
const OwnersCard = dynamic(() => import('@/components/account/OwnersCard').then(mod => ({ default: mod.OwnersCard })), { ssr: false });
const InvoicesCard = dynamic(() => import('@/components/account/InvoicesCard').then(mod => ({ default: mod.InvoicesCard })), { ssr: false });
const SumsubKycWidget = dynamic(() => import('./SumsubKycWidget').then(mod => ({ default: mod.SumsubKycWidget })), { ssr: false });
import { AccountPageData, BusinessContactInfo, Address, BusinessOwner, InvoiceRow, SubscriptionSummary } from '@/lib/account/types';
import { toast } from '@/hooks/use-toast';
import { User } from 'lucide-react';
import { REGISTERED_OFFICE_ADDRESS } from '@/lib/config/address';

export default function AccountPage() {
    const router = useRouter();

    // Fetch account data from existing APIs
    const { data: accountData, mutate: mutateAccount } = useSWR<{ ok: boolean; data: AccountPageData }>('/api/bff/account', swrFetcher);
    const { data: overview, mutate: mutateOverview } = useSWR('/api/bff/billing/overview', swrFetcher);
    const { data: invoicesData, mutate: mutateInvoices } = useSWR('/api/bff/billing/invoices?page=1&page_size=12', swrFetcher);
    const { data: userData, mutate: mutateUser } = useSWR('/api/bff/auth/whoami', swrFetcher);
    const { data: profileData, mutate: mutateProfile } = useSWR('/api/bff/profile', swrFetcher);

    // Handle different response shapes for whoami
    // Backend can return: { ok: true, data: { user: {...} } } or { ok: true, data: {...} }
    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;
    const o = overview?.data;
    const invoicesRaw = invoicesData?.data?.items || [];

    // Debug: Log what we're getting (development only)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[Account Page] Data loaded:', {
            profile: profile ? {
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone,
                email: profile.email,
                forwarding_address: profile.forwarding_address
            } : 'null',
            user: user ? {
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                email: user.email,
                forwarding_address: user.forwarding_address
            } : 'null',
            profileData: profileData,
            userData: userData,
        });
    }

    // Check for errors and loading states
    const accountError = accountData && !accountData.ok;
    const profileError = profileData && !profileData.ok;
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
        userError ? { endpoint: '/api/bff/auth/whoami', error: userData } : null,
    ].filter(Boolean) as Array<{ endpoint: string; error: any }>;

    // Build account data from existing APIs
    const data = useMemo<AccountPageData | null>(() => {
        // If we have account data from dedicated endpoint, use it but merge with latest profile/user data
        // to ensure email and forwarding_address are always up-to-date
        if (accountData?.ok) {
            const merged = { ...accountData.data };

            // Always use latest email from profile or user (accountData might be stale)
            if (profile?.email || user?.email) {
                merged.contact = {
                    ...merged.contact,
                    email: profile?.email || user?.email || merged.contact?.email || '',
                };
            }

            // Always use latest forwarding_address from profile or user (accountData might be stale)
            if (profile?.forwarding_address || user?.forwarding_address) {
                merged.forwarding_address = profile?.forwarding_address || user?.forwarding_address
                    ? { formatted: profile?.forwarding_address || user?.forwarding_address || '' }
                    : merged.forwarding_address;
            }

            // Business address comes from the BFF endpoint (registered office address from config)
            // No need to reformat from profile data - it's already correct from the backend

            return merged;
        }

        // Build from individual API responses (fallback)
        // Plan price from billing overview. Do NOT fall back to invoice totals (they can include forwarding fees).
        const pricePence = o?.current_price_pence;

        const priceLabel = pricePence && pricePence > 0
            ? `£${(pricePence / 100).toFixed(2)}`
            : 'Price not available';

        const subscription: SubscriptionSummary = {
            plan_name: o?.plan || 'Digital Mailbox Plan',
            price_label: priceLabel,
            billing_period: (o?.cadence === 'yearly' || o?.cadence === 'annual' || o?.cadence === 'year') ? 'annual' : 'monthly',
            status: o?.status === 'active' ? 'active' : o?.status === 'cancelled' ? 'cancelled' : o?.status === 'past_due' ? 'past_due' : 'unknown'
        };

        // Build contact info - prioritize profile data, fallback to user data
        // Handle null/undefined explicitly to avoid showing empty strings when data exists
        const contact: BusinessContactInfo = {
            first_name: (profile?.first_name ?? user?.first_name) || '',
            middle_names: profile?.middle_names || '',
            last_name: (profile?.last_name ?? user?.last_name) || '',
            phone: (profile?.phone ?? user?.phone) || '',
            email: (profile?.email ?? user?.email) || ''
        };

        // SAFETY: Never overwrite existing addresses
        const forwarding_address: Address | null = profile?.forwarding_address || user?.forwarding_address
            ? { formatted: profile?.forwarding_address || user?.forwarding_address || '' }
            : null;

        // Business address (Registered Office) - should come from BFF account endpoint
        // If not available, fallback to config for display purposes
        let business_address: Address | null = null;
        if (accountData?.ok && accountData.data?.business_address) {
            business_address = accountData.data.business_address;
        } else {
            // Fallback: use config directly if BFF endpoint didn't provide it
            business_address = {
                formatted: [
                    REGISTERED_OFFICE_ADDRESS.line1,
                    REGISTERED_OFFICE_ADDRESS.line2,
                    `${REGISTERED_OFFICE_ADDRESS.city} ${REGISTERED_OFFICE_ADDRESS.postcode}`,
                ].filter(Boolean).join('\n'),
            };
        }

        // Transform invoices (BFF invoices route already normalizes pdf_url to BFF endpoint)
        const invoiceRows: InvoiceRow[] = invoicesRaw.map((inv: any) => {
            // Handle date: created_at is bigint (epoch ms), period_end is string 'YYYY-MM-DD'
            let dateLabel = 'N/A';

            // Try period_end first (preferred - billing period end date)
            if (inv.period_end) {
                try {
                    // period_end is string 'YYYY-MM-DD'
                    const dateStr = String(inv.period_end).trim();
                    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const date = new Date(dateStr + 'T00:00:00Z'); // Add time to avoid timezone issues
                        if (!isNaN(date.getTime())) {
                            dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
                        }
                    }
                } catch (e) {
                    // Fall through to other date sources
                }
            }

            // Fallback to date field (created_at as bigint)
            if (dateLabel === 'N/A' && inv.date) {
                try {
                    const timestamp = typeof inv.date === 'number' ? inv.date : Number(inv.date);
                    if (!isNaN(timestamp) && timestamp > 0) {
                        // Handle both epoch seconds and milliseconds
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

            // Last fallback: created_at if available
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

            // Always use BFF download route if invoice has a PDF (pdf_url or pdf_path indicates PDF exists)
            // Never use raw pdf_path from backend - always use BFF route for authentication
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
            // Send phone and email (name fields are locked and excluded from payload)
            const payload: any = {
                phone: contact.phone
            };

            // Include email if it has changed
            if (contact.email && contact.email !== data?.contact?.email) {
                payload.email = contact.email;
            }

            const response = await fetch('/api/bff/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                throw new Error(result.error || result.message || 'Failed to save contact information');
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
                globalMutate('/api/bff/auth/whoami'),
            ]);

            const emailChanged = contact.email !== data?.contact?.email;
            const phoneChanged = contact.phone !== data?.contact?.phone;

            // Email change requires verification - show special message
            if (emailChanged) {
                toast({
                    title: "Verification email sent",
                    description: result.data?.message || "We've sent a confirmation link to your new email address. Please check your inbox and click the link to complete the change.",
                });
            } else if (phoneChanged) {
                toast({
                    title: "Saved",
                    description: "Your phone number has been updated.",
                });
            } else {
                toast({
                    title: "Saved",
                    description: "Your contact information has been updated.",
                });
            }
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
            // IMPORTANT: Revalidate both whoami and profile to prevent stale cache
            await Promise.all([
                mutateProfile(),
                mutateAccount(),
                mutateUser(),
                // Global mutate to refresh any other components using these keys
                globalMutate('/api/bff/profile'),
                globalMutate('/api/bff/account'),
                globalMutate('/api/bff/auth/whoami'),
            ]);

            // Force Next.js App Router to refresh server data
            router.refresh();

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
        const accountErrorMsg = accountData && !accountData.ok ? (accountData as any).error || 'Unknown error' : null;
        const profileErrorMsg = profileData && !profileData.ok ? (profileData as any).error || 'Unknown error' : null;
        const errorMessage = accountErrorMsg || profileErrorMsg || 'Failed to load account details';
        const errorDetails = (accountData && !accountData.ok ? (accountData as any).details : null) ||
            (profileData && !profileData.ok ? (profileData as any).details : null);

        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Navigation onNavigate={() => { }} />
                <main id="main-content" role="main" className="flex-1">
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
            </div>
        );
    }

    // Show loading state
    if (isLoading || !data) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Navigation onNavigate={() => { }} />
                <main id="main-content" role="main" className="flex-1">
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
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            <Navigation onNavigate={() => { }} />
            <main id="main-content" role="main" className="flex-1">
                <div className="max-w-[1440px] mx-auto px-[80px] py-[80px]">
                    {/* My Account Heading */}
                    <h1 className="text-[54px] font-medium leading-[1.2] text-[#1A1A1A] mb-[34px]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                        My Account
                    </h1>

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

                    {/* Main Two-Column Layout */}
                    <div className="flex gap-[27px] items-start mb-[24px]">
                        {/* Left Column - Invoice Section (845px) */}
                        <div className="w-[845px] h-[490px] flex-shrink-0">
                            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white h-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                <CardContent className="p-[28px] h-full flex flex-col">
                                    <div className="flex flex-col gap-[34px] flex-1 overflow-hidden">
                                        {/* Business Owner (PSC) Section */}
                                        <div className="flex flex-col gap-[8px]">
                                            <h3 className="text-[18px] font-medium leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                Business Owner (PSC)
                                            </h3>
                                            <div className="w-[234px] h-[2px] bg-[#E5E7EB]"></div>
                                        </div>

                                        {/* Invoice Section */}
                                        <div className="flex flex-col gap-[13px]">
                                            <h3 className="text-[18px] font-semibold leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                Invoice
                                            </h3>
                                            <div className="w-[557px] h-[2px] bg-[#5AE094]"></div>
                                            
                                            {/* Invoice Table */}
                                            <div className="flex flex-col gap-[13px] flex-1 overflow-y-auto">
                                                {/* Table Header */}
                                                <div className="flex items-center gap-[20px] text-[12px] font-medium leading-[1.45] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                    <div className="w-[144px] flex-shrink-0">Invoice No</div>
                                                    <div className="w-[144px] flex-shrink-0">Description</div>
                                                    <div className="w-[144px] flex-shrink-0">Total</div>
                                                    <div className="w-[144px] flex-shrink-0">Status</div>
                                                    <div className="w-[110px] flex-shrink-0">Activities</div>
                                                </div>
                                                
                                                {/* Divider */}
                                                <div className="w-full h-[0.5px] bg-[#E5E7EB]"></div>
                                                
                                                {/* Invoice Rows */}
                                                {data.invoices.length === 0 ? (
                                                    <div className="py-8 text-center text-[12px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                        No invoices yet
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0">
                                                        {data.invoices.map((invoice, index) => (
                                                            <div key={invoice.invoice_no}>
                                                                <div className="flex items-center gap-[20px] py-2">
                                                                    <div className="w-[144px] flex-shrink-0 text-[12px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                        {invoice.invoice_no}
                                                                    </div>
                                                                    <div className="w-[144px] flex-shrink-0 text-[12px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                        {invoice.description}
                                                                    </div>
                                                                    <div className="w-[144px] flex-shrink-0 text-[12px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                        {invoice.total_label}
                                                                    </div>
                                                                    <div className="w-[144px] flex-shrink-0">
                                                                        <div className="inline-flex items-center justify-center px-[2.5px] py-[2.5px] rounded-[23px] bg-[#E7F6EF] border border-[#E5E7EB]">
                                                                            <span className="text-[10px] font-normal leading-[1.4] text-[#666666] px-[3.76px]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                                {invoice.status === 'paid' ? 'Paid' : invoice.status === 'not_paid' ? 'Not Paid' : invoice.status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-[110px] flex-shrink-0">
                                                                        {invoice.download_url && (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    const url = invoice.download_url!;
                                                                                    try {
                                                                                        const response = await fetch(url, {
                                                                                            method: 'GET',
                                                                                            credentials: 'include',
                                                                                        });
                                                                                        if (!response.ok) {
                                                                                            alert(`Failed to download invoice: ${response.statusText}`);
                                                                                            return;
                                                                                        }
                                                                                        if (response.headers.get('content-type')?.includes('application/pdf')) {
                                                                                            const blob = await response.blob();
                                                                                            const blobUrl = URL.createObjectURL(blob);
                                                                                            const link = document.createElement('a');
                                                                                            link.href = blobUrl;
                                                                                            link.download = `invoice-${invoice.invoice_no}.pdf`;
                                                                                            document.body.appendChild(link);
                                                                                            link.click();
                                                                                            URL.revokeObjectURL(blobUrl);
                                                                                            if (link.parentNode === document.body) {
                                                                                                document.body.removeChild(link);
                                                                                            }
                                                                                        } else {
                                                                                            window.open(url, '_blank');
                                                                                        }
                                                                                    } catch (error: any) {
                                                                                        alert(`Failed to download invoice: ${error?.message || 'Unknown error'}`);
                                                                                    }
                                                                                }}
                                                                                className="inline-flex items-center justify-center px-[2.5px] py-[2.5px] rounded-[26px] bg-[#E7F6EF] border border-[#E5E7EB] hover:bg-[#D4F0E0] transition-colors cursor-pointer"
                                                                            >
                                                                                <span className="text-[10px] font-normal leading-[1.4] text-[#666666] px-[3.76px]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                                                                    Download PDF
                                                                                </span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {index < data.invoices.length - 1 && (
                                                                    <div className="w-full h-[0.5px] bg-[#E5E7EB]"></div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column - Business Contact + Account & Billing (408px) */}
                        <div className="w-[408px] flex-shrink-0 flex flex-col gap-[24px] items-start">
                            {/* Business Contact Card */}
                            <BusinessContactCard
                                contact={data.contact}
                                onSave={handleSaveContact}
                            />

                            {/* Account & Billing Card */}
                        <AccountBillingCard
                            subscription={data.subscription}
                            onRefresh={async () => {
                                await mutateOverview();
                                await mutateProfile();
                                await mutateAccount();
                            }}
                        />
                        </div>
                    </div>

                    {/* Address Section */}
                    <div className="mb-[24px]">
                        <ForwardingAddressCard
                            address={data.forwarding_address || null}
                            businessAddress={data.business_address || null}
                            onSave={handleSaveAddress}
                        />
                            </div>

                    {/* KYC Verification Section */}
                    <div className="mb-[24px]">
                        <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            <CardContent className="p-[28px]">
                                <div className="flex flex-col gap-[36px]">
                                    <div className="flex flex-col gap-[5px]">
                                        <h3 className="text-[18px] font-semibold leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                            KYC Verification
                                        </h3>
                                        <p className="text-[16px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                            Upload government-issued ID to verify your identity and activate your VirtualAddress account.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-[10px] p-[120px] border border-dashed border-[#E5E7EB] rounded-[10px] bg-[#F9F9F9]">
                                        <p className="text-[16px] font-semibold leading-[1.4] text-[#1A1A1A] text-center" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                            Mail Scan Preview
                                        </p>
                                        <p className="text-[16px] font-normal leading-[1.4] text-[#666666] text-center" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                            Corporation Tax Notice
                                        </p>
                                    </div>
                                    <div className="flex justify-end">
                                        <SumsubKycWidget />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                        {/* Debug: Show what data we have (remove in production) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="text-xs bg-muted p-2 rounded font-mono">
                                <p>Debug: profile={JSON.stringify({ first_name: profile?.first_name, last_name: profile?.last_name, phone: profile?.phone })}</p>
                                <p>Debug: user={JSON.stringify({ first_name: user?.first_name, last_name: user?.last_name, phone: user?.phone })}</p>
                                <p>Debug: contact={JSON.stringify(data.contact)}</p>
                            </div>
                        )}
                </div>
            </main>
        </div>
    );
}
