'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { REGISTERED_OFFICE_ADDRESS } from '@/lib/config/address';
import { toast } from '@/hooks/use-toast';
import { mutate as globalMutate } from 'swr';
import { useRouter } from 'next/navigation';

const ForwardingAddressCard = dynamic(() => import('@/components/account/ForwardingAddressCard').then(mod => ({ default: mod.ForwardingAddressCard })), { ssr: false });

export default function AccountAddressesPage() {
    const router = useRouter();

    // Fetch account data
    const { data: accountData, mutate: mutateAccount } = useSWR<{ ok: boolean; data: any }>('/api/bff/account', swrFetcher);
    const { data: profileData, mutate: mutateProfile } = useSWR('/api/bff/profile', swrFetcher);
    const { data: userData, mutate: mutateUser } = useSWR('/api/bff/auth/whoami', swrFetcher);

    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;

    // 🔍 STEP 3: Log frontend profile fetch
    if (profileData) {
        console.log("🟣 PROFILE FROM API:", profile);
        console.log("🟣 forwarding_address:", profile?.forwarding_address);
        console.log("🟣 forwardingAddress:", profile?.forwardingAddress);
    }

    // Build addresses
    const addresses = useMemo(() => {
        // Business address (Registered Office)
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

        // Forwarding address
        const forwardingAddress = profile?.forwarding_address || user?.forwarding_address
            ? { formatted: profile?.forwarding_address || user?.forwarding_address || '' }
            : null;

        // 🔍 STEP 4: Log forwarding check
        console.log("🔴 FORWARDING CHECK:", {
            forwarding_address: profile?.forwarding_address,
            forwardingAddress: profile?.forwardingAddress,
            user_forwarding_address: user?.forwarding_address,
            forwardingAddressFormatted: forwardingAddress?.formatted,
            profile,
            user,
        });

        return {
            businessAddress,
            forwardingAddress,
        };
    }, [accountData, profile, user]);

    // Handle save forwarding address
    const handleSaveAddress = async (address: { formatted: string }) => {
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

            // Refresh all relevant data
            await Promise.all([
                mutateProfile(),
                mutateAccount(),
                mutateUser(),
                globalMutate('/api/bff/profile'),
                globalMutate('/api/bff/account'),
                globalMutate('/api/bff/auth/whoami'),
            ]);

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

    return (
        <div className="w-full" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {/* Page Header */}
            <div className="mb-5 sm:mb-6 md:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-medium leading-tight text-[#1A1A1A] mb-2 sm:mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Addresses
                </h1>
                <p className="text-sm sm:text-base md:text-[18px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                    Manage your business and forwarding addresses
                </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
                {/* Registered Office Address */}
                <Card className="rounded-xl sm:rounded-[20px] shadow-[0px_2px_10px_rgba(0,0,0,0.06)] border border-[#D1D5DB] bg-[#F5F5F5]">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        <h2 className="text-lg sm:text-xl md:text-[24px] font-semibold leading-[1.33] text-[#1A1A1A] mb-3 sm:mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Registered Office Address
                        </h2>
                        <p className="text-[14px] font-medium leading-[1.4] text-[#1A1A1A] mb-4" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                            Your trusted Central London address for Companies House, HMRC, and official business mail.
                        </p>
                        {addresses.businessAddress?.formatted ? (
                            <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB]">
                                <pre className="whitespace-pre-wrap text-[14px] font-normal leading-[1.4] text-[#1A1A1A]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                    {addresses.businessAddress.formatted}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-[14px] font-normal leading-[1.4] text-[#666666]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
                                No business address configured
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Forwarding Address */}
                <ForwardingAddressCard
                    address={addresses.forwardingAddress || null}
                    businessAddress={addresses.businessAddress || null}
                    onSave={handleSaveAddress}
                />
            </div>
        </div>
    );
}
