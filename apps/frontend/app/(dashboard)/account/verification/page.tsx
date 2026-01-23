'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import dynamic from 'next/dynamic';

const SumsubKycWidget = dynamic(() => import('../SumsubKycWidget').then(mod => ({ default: mod.SumsubKycWidget })), { ssr: false });

export default function AccountVerificationPage() {
    // Fetch profile data for KYC status
    const { data: profileData } = useSWR('/api/bff/profile', swrFetcher);
    const { data: userData } = useSWR('/api/bff/auth/whoami', swrFetcher);

    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;

    // Get KYC status
    const kycStatus = useMemo(() => {
        const status = profile?.kyc_status || user?.kyc_status || 'pending';
        return {
            status: status === 'approved' || status === 'verified' ? 'verified' : 'pending',
            label: status === 'approved' || status === 'verified' ? 'Verified' : 'Pending',
            description: status === 'approved' || status === 'verified' 
                ? 'Your identity has been verified. You have full access to all features.'
                : 'Complete identity verification to activate your account and access all features.',
        };
    }, [profile, user]);

    return (
        <div className="w-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-[54px] font-medium leading-[1.2] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Identity Verification
                </h1>
                <p className="text-[18px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Verify your identity to activate your account and access all features
                </p>
            </div>

            {/* KYC Status Card */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                kycStatus.status === 'verified' ? 'bg-[#5AE094]' : 'bg-[#FEF3C7]'
                            }`}>
                                {kycStatus.status === 'verified' ? (
                                    <CheckCircle2 className="w-8 h-8 text-[#024E40]" />
                                ) : (
                                    <ShieldCheck className="w-8 h-8 text-[#92400E]" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <h2 className="text-[32px] font-semibold leading-[1.2] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    {kycStatus.label}
                                </h2>
                                <Badge className={`w-fit ${
                                    kycStatus.status === 'verified' 
                                        ? 'bg-[#5AE094] text-[#024E40] border-0' 
                                        : 'bg-[#FEF3C7] text-[#92400E] border-0'
                                } px-4 py-1.5 text-[14px] font-medium`}>
                                    {kycStatus.status === 'verified' ? 'Identity Verified' : 'Verification Required'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <p className="text-[16px] font-normal leading-[1.4] text-[#666666] mb-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                        {kycStatus.description}
                    </p>
                </CardContent>
            </Card>

            {/* Why Verification is Required */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <div className="flex items-start gap-3 mb-4">
                        <Info className="w-6 h-6 text-[#024E40] flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <h3 className="text-[20px] font-semibold leading-[1.2] text-[#1A1A1A] mb-3" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                Why Verification is Required
                            </h3>
                            <p className="text-[16px] font-normal leading-[1.4] text-[#666666] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                As a regulated virtual address service, we are required by UK law to verify the identity of all account holders. This helps us:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-[16px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                <li>Comply with Anti-Money Laundering (AML) regulations</li>
                                <li>Prevent fraud and identity theft</li>
                                <li>Protect your account and mail</li>
                                <li>Meet Companies House and HMRC requirements</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* What Happens After Verification */}
            <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white mb-6">
                <CardContent className="p-8">
                    <h3 className="text-[20px] font-semibold leading-[1.2] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                        What Happens After Verification
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[#5AE094] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[16px] font-medium leading-[1.4] text-[#1A1A1A] mb-1" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Full Account Access
                                </p>
                                <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Access all features including mail forwarding, document scanning, and business address services
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[#5AE094] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[16px] font-medium leading-[1.4] text-[#1A1A1A] mb-1" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Companies House Registration
                                </p>
                                <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Use your verified address for official business registrations
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[#5AE094] flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[16px] font-medium leading-[1.4] text-[#1A1A1A] mb-1" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Secure Mail Handling
                                </p>
                                <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    Receive and manage sensitive business correspondence with confidence
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KYC Widget */}
            {kycStatus.status !== 'verified' && (
                <Card className="rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border-0 bg-white">
                    <CardContent className="p-8">
                        <h3 className="text-[24px] font-semibold leading-[1.33] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Start Verification
                        </h3>
                        <p className="text-[16px] font-normal leading-[1.4] text-[#666666] mb-6" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Upload government-issued ID to verify your identity. The process typically takes 5-10 minutes.
                        </p>
                        <SumsubKycWidget />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
