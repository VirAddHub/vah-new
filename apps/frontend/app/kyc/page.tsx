import type { Metadata } from 'next';
import { KYCPolicyPage } from '@/components/KYCPolicyPage';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { KYCPageClient } from './KYCPageClient';

export const metadata: Metadata = {
    title: 'KYC Policy | VirtualAddressHub',
    description: 'Learn about our Know Your Customer (KYC) verification process. Understand what documents you need and how we ensure compliance with UK regulations.',
    openGraph: {
        title: 'KYC Policy | VirtualAddressHub',
        description: 'Learn about our Know Your Customer (KYC) verification process and compliance requirements.',
        url: 'https://virtualaddresshub.com/kyc',
    },
};

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function KYC() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
                <KYCPageClient />
            </main>
            <FooterWithNav />
        </div>
    );
}
