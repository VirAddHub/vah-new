import type { Metadata } from 'next';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { HelpPageClient } from './HelpPageClient';

export const metadata: Metadata = {
    title: 'Help Centre & FAQs | VirtualAddressHub',
    description: 'Get answers to frequently asked questions about virtual business addresses, mail forwarding, pricing, compliance, and more. Fast answers and friendly support.',
    openGraph: {
        title: 'Help Centre & FAQs | VirtualAddressHub',
        description: 'Get answers to frequently asked questions about virtual business addresses, mail forwarding, pricing, compliance, and more.',
        url: 'https://virtualaddresshub.com/help',
    },
};

export default function Help() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main className="flex-1 relative z-0 w-full">
                <HelpPageClient />
            </main>
            <FooterWithNav />
        </div>
    );
}
