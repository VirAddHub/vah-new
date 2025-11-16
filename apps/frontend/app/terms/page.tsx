import type { Metadata } from 'next';
import { TermsPage } from '@/components/TermsPage';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { TermsPageClient } from './TermsPageClient';

export const metadata: Metadata = {
    title: 'Terms of Service | VirtualAddressHub',
    description: 'Read our terms of service for virtual business address services, mail forwarding, and compliance support. Understand your rights and responsibilities.',
    openGraph: {
        title: 'Terms of Service | VirtualAddressHub',
        description: 'Read our terms of service for virtual business address services, mail forwarding, and compliance support.',
        url: 'https://virtualaddresshub.com/terms',
    },
};

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Terms() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main className="flex-1 relative z-0 w-full">
                <TermsPageClient />
            </main>
            <FooterWithNav />
        </div>
    );
}
