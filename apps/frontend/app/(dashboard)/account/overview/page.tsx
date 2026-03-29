'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useAccount,
    useBillingOverview,
    useWhoAmI,
    useProfile,
    useDashboardBootstrap,
} from '@/hooks/useDashboardData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { REGISTERED_OFFICE_ADDRESS } from '@/lib/config/address';
/**
 * Premium Account Overview Page
 * 
 * Design principles:
 * - Compact, scannable layout
 * - Tighter spacing on small cards
 * - Subtle borders, no heavy shadows
 * - Clear typography hierarchy
 * - lucide-react icons with strokeWidth={2}
 */

export default function AccountOverviewPage() {
    const router = useRouter();

    // Fetch account data using stable hooks
    const { data: accountData } = useAccount();
    const { data: overview } = useBillingOverview();
    const { data: userData } = useWhoAmI();
    const { data: profileData } = useProfile();
    const { data: boot, isLoading: bootLoading } = useDashboardBootstrap();

    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;
    const o = overview?.data;
    const bootstrapOk = boot?.ok === true;
    const complianceVs = bootstrapOk
        ? ((boot!.data.compliance as { verificationState?: string } | undefined)?.verificationState ?? null)
        : null;
    const bootstrapPending = bootLoading && boot === undefined;

    // Build account summary
    const accountSummary = useMemo(() => {
        const pricePence = o?.current_price_pence;
        const priceLabel = pricePence && pricePence > 0
            ? `£${(pricePence / 100).toFixed(2)}`
            : 'Price not available';

        // Next billing: backend sends next_billing_date, or use latest_invoice.period_end / next_charge_at
        const nextBillingDate = o?.next_billing_date || o?.latest_invoice?.period_end || o?.period_end;
        const nextChargeAt = o?.next_charge_at;
        let nextBillingLabel = 'N/A';
        if (nextBillingDate) {
            try {
                const date = typeof nextBillingDate === 'string'
                    ? new Date(nextBillingDate + 'T00:00:00Z')
                    : new Date(nextBillingDate);
                if (!isNaN(date.getTime())) {
                    nextBillingLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
                    nextBillingLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                }
            } catch (e) {
                // Keep 'N/A'
            }
        }

        // KYC: prefer compliance.verificationState from bootstrap (same source as nav); avoid defaulting to pending before load
        let kycUi: 'loading' | 'verified' | 'pending' = 'loading';
        if (bootstrapOk) {
            if (complianceVs === 'verified' || complianceVs === 'pending_others') {
                kycUi = 'verified';
            } else if (complianceVs === 'action_required') {
                kycUi = 'pending';
            } else {
                const kycStatus = profile?.kyc_status || user?.kyc_status || 'pending';
                const isKycApproved = kycStatus === 'approved' || kycStatus === 'verified';
                kycUi = isKycApproved ? 'verified' : 'pending';
            }
        } else if (!bootLoading) {
            kycUi = 'pending';
        }

        const complianceObj =
            bootstrapOk && boot?.data?.compliance
                ? (boot.data.compliance as { isKycApproved?: boolean; isChVerified?: boolean })
                : null;
        const identityAndCompanyVerified = Boolean(
            complianceObj?.isKycApproved && complianceObj?.isChVerified,
        );

        // Account status
        const accountStatus = o?.status === 'active' ? 'active' : o?.status === 'cancelled' ? 'cancelled' : o?.status === 'past_due' ? 'action_required' : 'unknown';

        // Business address
        let businessAddress = null;
        if (accountData?.ok && accountData.data?.business_address) {
            businessAddress = accountData.data.business_address;
        } else {
            businessAddress = {
                formatted: [
                    REGISTERED_OFFICE_ADDRESS.line1,
                    REGISTERED_OFFICE_ADDRESS.line2,
                    `${REGISTERED_OFFICE_ADDRESS.city} ${REGISTERED_OFFICE_ADDRESS.postcode}`,
                ].filter(Boolean).join('\n'),
            };
        }

        return {
            status: accountStatus,
            planName: o?.plan || 'Digital Mailbox Plan',
            priceLabel,
            billingPeriod: (o?.cadence === 'yearly' || o?.cadence === 'annual' || o?.cadence === 'year') ? 'annual' : 'monthly',
            nextBillingDate: nextBillingLabel,
            kycStatus: kycUi,
            identityAndCompanyVerified,
            businessAddress,
        };
    }, [accountData, o, profile, user, bootstrapOk, complianceVs, bootLoading, boot]);

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="mb-4 sm:mb-5">
                <h1 className="text-h3 sm:text-h2 font-semibold text-foreground mb-1 leading-tight tracking-tight">
                    Account Overview
                </h1>
                <p className="text-body-sm text-muted-foreground leading-snug">
                    View your account status and quick actions
                </p>
            </div>

            {/* Registered Business Address */}
            <Card className="rounded-lg sm:rounded-xl border border-border bg-card mb-3 sm:mb-4">
                <CardContent className="p-3.5 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" strokeWidth={2} />
                            <h2 className="text-base sm:text-h4 font-semibold text-foreground truncate">
                                Registered Business Address
                            </h2>
                        </div>
                        <Button
                            onClick={() => router.push('/account/addresses')}
                            className="w-full sm:w-auto"
                            variant="outline"
                            size="sm"
                        >
                            Manage Addresses
                            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                        </Button>
                    </div>
                    {accountSummary.businessAddress?.formatted ? (
                        <div className="bg-muted/50 rounded-md p-3">
                            <pre className="whitespace-pre-wrap text-caption sm:text-body-sm text-muted-foreground leading-relaxed">
                                {accountSummary.businessAddress.formatted}
                            </pre>
                        </div>
                    ) : (
                        <p className="text-caption sm:text-body-sm text-muted-foreground">
                            No business address configured
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Plan & billing, account status, identity verification */}
            <Card className="rounded-lg sm:rounded-xl border border-border bg-card mb-3 sm:mb-4">
                <CardContent className="p-3.5 sm:p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
                        <div className="lg:col-span-5 flex flex-col min-w-0">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                                <h2 className="text-base sm:text-h4 font-semibold text-foreground">
                                    Plan & Billing
                                </h2>
                                <Button
                                    onClick={() => router.push('/account/billing')}
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto shrink-0"
                                >
                                    View Billing
                                    <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div className="flex flex-col gap-1">
                                    <p className="text-caption text-muted-foreground">
                                        Plan
                                    </p>
                                    <p className="text-body-sm sm:text-body font-medium text-foreground">
                                        {accountSummary.planName}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-caption text-muted-foreground">
                                        Price
                                    </p>
                                    <p className="text-body-sm sm:text-body font-medium text-foreground">
                                        {accountSummary.billingPeriod === 'annual'
                                            ? `Annual (${accountSummary.priceLabel}/year)`
                                            : `Monthly (${accountSummary.priceLabel}/month)`}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-caption text-muted-foreground">
                                        Next Billing
                                    </p>
                                    <p className="text-body-sm sm:text-body font-medium text-foreground">
                                        {accountSummary.nextBillingDate}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col gap-2 min-w-0 pt-5 border-t border-border lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6">
                            <h2 className="text-base sm:text-h4 font-semibold text-foreground">
                                Account Status
                            </h2>
                            <div className="flex flex-wrap items-center gap-2">
                                {accountSummary.status === 'active' ? (
                                    <Badge className="bg-green-100 text-green-800 border-0 px-2 py-0.5 text-caption font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                                        Active
                                    </Badge>
                                ) : accountSummary.status === 'action_required' ? (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-0 px-2 py-0.5 text-caption font-medium">
                                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                                        Action Required
                                    </Badge>
                                ) : (
                                    <Badge className="bg-muted text-muted-foreground border-0 px-2 py-0.5 text-caption font-medium">
                                        {accountSummary.status === 'cancelled' ? 'Cancelled' : 'Unknown'}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex flex-col gap-3 min-w-0 pt-5 border-t border-border lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <h2 className="text-base sm:text-h4 font-semibold text-foreground">
                                        Identity Verification
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {bootstrapPending || accountSummary.kycStatus === 'loading' ? (
                                            <div className="h-7 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
                                        ) : accountSummary.identityAndCompanyVerified ? (
                                            <Badge className="bg-green-100 text-green-800 border-0 px-2 py-0.5 text-caption font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                                                Verified
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-yellow-100 text-yellow-800 border-0 px-2 py-0.5 text-caption font-medium">
                                                <AlertCircle className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                                                Pending
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {!accountSummary.identityAndCompanyVerified &&
                                    accountSummary.kycStatus !== 'loading' &&
                                    !bootstrapPending && (
                                        <Button
                                            onClick={() => router.push('/account/verification')}
                                            size="sm"
                                            className="w-full sm:w-auto shrink-0"
                                        >
                                            Complete Verification
                                            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                                        </Button>
                                    )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
