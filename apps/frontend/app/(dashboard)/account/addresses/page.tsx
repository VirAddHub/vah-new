'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';
import { useProfile, useWhoAmI } from '@/hooks/useDashboardData';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { toast } from '@/hooks/use-toast';
import { mutate as globalMutate } from 'swr';
import { DASHBOARD_BOOTSTRAP_KEY } from '@/lib/swrKeys';
import { useRouter } from 'next/navigation';

const ForwardingAddressCard = dynamic(() => import('@/components/account/ForwardingAddressCard').then(mod => ({ default: mod.ForwardingAddressCard })), { ssr: false });

export default function AccountAddressesPage() {
    const router = useRouter();

    // Fetch account data
    const { data: accountData, mutate: mutateAccount } = useSWR<{ ok: boolean; data: any }>('/api/bff/account', swrFetcher);
    const { data: profileData, mutate: mutateProfile } = useProfile();
    const { data: userData, mutate: mutateUser } = useWhoAmI();

    const user = userData?.data?.user || userData?.data || null;
    const profile = profileData?.data;

    // Build addresses
    const addresses = useMemo(() => {
        // Business address (Registered Office)
        let businessAddress = null;
        if (accountData?.ok && accountData.data?.business_address) {
            businessAddress = accountData.data.business_address;
        }

        // Forwarding address
        const forwardingAddress = profile?.forwarding_address || user?.forwarding_address
            ? { formatted: profile?.forwarding_address || user?.forwarding_address || '' }
            : null;

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
                globalMutate(DASHBOARD_BOOTSTRAP_KEY),
                globalMutate('/api/bff/account'),
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
        <div className="w-full">
            <div className="mb-5 sm:mb-6 md:mb-8">
                <h1 className="page-title">
                    Addresses
                </h1>
                <p className="page-lede">
                    View your registered business address and manage your mail forwarding address
                </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
                <Card className="rounded-xl sm:rounded-2xl shadow-sm border border-border bg-muted">
                    <CardContent className="p-4 sm:p-6 md:p-8">
                        <h2 className="text-h2 text-foreground mb-3 sm:mb-4">
                            Registered Office Address
                        </h2>
                        <p className="text-label text-foreground mb-4">
                            Your trusted Central London address for Companies House, HMRC, and official business mail.
                        </p>
                        {addresses.businessAddress?.formatted ? (
                            <div className="bg-card rounded-lg p-4 border border-border">
                                <pre className="whitespace-pre-wrap text-body-sm text-foreground">
                                    {addresses.businessAddress.formatted}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-body-sm text-muted-foreground">
                                No business address configured
                            </p>
                        )}
                    </CardContent>
                </Card>

                <ForwardingAddressCard
                    address={addresses.forwardingAddress || null}
                    businessAddress={addresses.businessAddress || null}
                    onSave={handleSaveAddress}
                    readOnly
                />
            </div>
        </div>
    );
}
