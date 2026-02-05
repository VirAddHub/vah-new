'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useBillingOverview, useWhoAmI, useProfile } from '@/hooks/useDashboardData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, MapPin, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { REGISTERED_OFFICE_ADDRESS } from '@/lib/config/address';

/**
 * Premium Account Overview Page
 * 
 * Design principles from design-system.ts:
 * - Clean, spacious layout
 * - Consistent spacing (16px/24px/32px)
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

    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;
    const o = overview?.data;

    // Build account summary
    const accountSummary = useMemo(() => {
        const pricePence = o?.current_price_pence;
        const priceLabel = pricePence && pricePence > 0
            ? `£${(pricePence / 100).toFixed(2)}`
            : 'Price not available';

        // Get next billing date
        const nextBillingDate = o?.next_billing_date || o?.period_end;
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

        // KYC status
        const kycStatus = profile?.kyc_status || user?.kyc_status || 'pending';
        const isKycApproved = kycStatus === 'approved' || kycStatus === 'verified';

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
            kycStatus: isKycApproved ? 'verified' : 'pending',
            businessAddress,
        };
    }, [accountData, o, profile, user]);

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-semibold text-neutral-900 mb-2 leading-tight tracking-tight">
                    Account Overview
                </h1>
                <p className="text-base text-neutral-600 leading-relaxed">
                    View your account status and quick actions
                </p>
            </div>

            {/* Account Status Card */}
            <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-3">
                            <h2 className="text-xl font-semibold text-neutral-900">
                                Account Status
                            </h2>
                            <div className="flex items-center gap-3">
                                {accountSummary.status === 'active' ? (
                                    <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1 text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={2} />
                                        Active
                                    </Badge>
                                ) : accountSummary.status === 'action_required' ? (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-0 px-3 py-1 text-sm font-medium">
                                        <AlertCircle className="w-4 h-4 mr-2" strokeWidth={2} />
                                        Action Required
                                    </Badge>
                                ) : (
                                    <Badge className="bg-neutral-100 text-neutral-600 border-0 px-3 py-1 text-sm font-medium">
                                        {accountSummary.status === 'cancelled' ? 'Cancelled' : 'Unknown'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Plan & Billing Summary */}
            <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
                        <h2 className="text-xl font-semibold text-neutral-900">
                            Plan & Billing
                        </h2>
                        <Button
                            onClick={() => router.push('/account/billing')}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            View Billing
                            <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-neutral-500">
                                Plan
                            </p>
                            <p className="text-base font-medium text-neutral-900">
                                {accountSummary.planName}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-neutral-500">
                                Price
                            </p>
                            <p className="text-base font-medium text-neutral-900">
                                {accountSummary.priceLabel}/{accountSummary.billingPeriod === 'annual' ? 'year' : 'month'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-neutral-500">
                                Next Billing
                            </p>
                            <p className="text-base font-medium text-neutral-900">
                                {accountSummary.nextBillingDate}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KYC Status Card */}
            <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-primary" strokeWidth={2} />
                                <h2 className="text-xl font-semibold text-neutral-900">
                                    Identity Verification
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {accountSummary.kycStatus === 'verified' ? (
                                    <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1 text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={2} />
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-0 px-3 py-1 text-sm font-medium">
                                        <AlertCircle className="w-4 h-4 mr-2" strokeWidth={2} />
                                        Pending
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {accountSummary.kycStatus !== 'verified' && (
                            <Button
                                onClick={() => router.push('/account/verification')}
                                size="sm"
                            >
                                Complete Verification
                                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Business Address Card */}
            <Card className="rounded-2xl border border-neutral-200 bg-white mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-primary" strokeWidth={2} />
                            <h2 className="text-xl font-semibold text-neutral-900">
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
                        <div className="bg-neutral-50 rounded-lg p-4">
                            <pre className="whitespace-pre-wrap text-sm text-neutral-600 leading-relaxed">
                                {accountSummary.businessAddress.formatted}
                            </pre>
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            No business address configured
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
