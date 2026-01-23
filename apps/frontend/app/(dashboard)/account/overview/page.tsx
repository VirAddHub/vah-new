'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, MapPin, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { REGISTERED_OFFICE_ADDRESS } from '@/lib/config/address';

export default function AccountOverviewPage() {
    const router = useRouter();

    // Fetch account data
    const { data: accountData } = useSWR<{ ok: boolean; data: any }>('/api/bff/account', swrFetcher);
    const { data: overview } = useSWR('/api/bff/billing/overview', swrFetcher);
    const { data: userData } = useSWR('/api/bff/auth/whoami', swrFetcher);
    const { data: profileData } = useSWR('/api/bff/profile', swrFetcher);

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
        <div className="w-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-[54px] font-medium leading-[1.2] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Account Overview
                </h1>
                <p className="text-[18px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    View your account status and quick actions
                </p>
            </div>

            {/* Account Status Card */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Account Status
                            </h2>
                            <div className="flex items-center gap-3">
                                {accountSummary.status === 'active' ? (
                                    <Badge className="bg-[#5AE094] text-[#024E40] border-0 px-4 py-1.5 text-[14px] font-medium">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Active
                                    </Badge>
                                ) : accountSummary.status === 'action_required' ? (
                                    <Badge className="bg-[#FEF3C7] text-[#92400E] border-0 px-4 py-1.5 text-[14px] font-medium">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Action Required
                                    </Badge>
                                ) : (
                                    <Badge className="bg-[#F3F4F6] text-[#666666] border-0 px-4 py-1.5 text-[14px] font-medium">
                                        {accountSummary.status === 'cancelled' ? 'Cancelled' : 'Unknown'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Plan & Billing Summary */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Plan & Billing
                        </h2>
                        <Button
                            onClick={() => router.push('/account/billing')}
                            variant="outline"
                            className="border-[#40C46C] text-[#024E40] hover:bg-[#40C46C]/10"
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        >
                            View Billing
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                            <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Plan
                            </p>
                            <p className="text-[18px] font-medium leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                {accountSummary.planName}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Price
                            </p>
                            <p className="text-[18px] font-medium leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                {accountSummary.priceLabel}/{accountSummary.billingPeriod === 'annual' ? 'year' : 'month'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Next Billing
                            </p>
                            <p className="text-[18px] font-medium leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                {accountSummary.nextBillingDate}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KYC Status Card */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-[#024E40]" />
                                <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Identity Verification
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {accountSummary.kycStatus === 'verified' ? (
                                    <Badge className="bg-[#5AE094] text-[#024E40] border-0 px-4 py-1.5 text-[14px] font-medium">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge className="bg-[#FEF3C7] text-[#92400E] border-0 px-4 py-1.5 text-[14px] font-medium">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Pending
                                    </Badge>
                                )}
                            </div>
                        </div>
                        {accountSummary.kycStatus !== 'verified' && (
                            <Button
                                onClick={() => router.push('/account/verification')}
                                className="bg-[#40C46C] text-[#024E40] hover:bg-[#40C46C]/90"
                                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                            >
                                Complete Verification
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Business Address Card */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-[#024E40]" />
                            <h2 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Registered Business Address
                            </h2>
                        </div>
                        <Button
                            onClick={() => router.push('/account/addresses')}
                            variant="outline"
                            className="border-[#40C46C] text-[#024E40] hover:bg-[#40C46C]/10"
                            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                        >
                            Manage Addresses
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                    {accountSummary.businessAddress?.formatted ? (
                        <div className="bg-[#F9F9F9] rounded-[10px] p-4">
                            <pre className="whitespace-pre-wrap text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                {accountSummary.businessAddress.formatted}
                            </pre>
                        </div>
                    ) : (
                        <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            No business address configured
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
