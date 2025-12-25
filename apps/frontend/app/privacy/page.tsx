import type { Metadata } from 'next';
import { PrivacyPolicyPage } from '@/components/PrivacyPolicyPage';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { PrivacyPageClient } from './PrivacyPageClient';

export const metadata: Metadata = {
    title: 'Privacy Policy | VirtualAddressHub',
    description: 'Learn how VirtualAddressHub protects your privacy and handles your personal data. GDPR compliant privacy policy for our virtual business address services.',
    openGraph: {
        title: 'Privacy Policy | VirtualAddressHub',
        description: 'Learn how VirtualAddressHub protects your privacy and handles your personal data. GDPR compliant privacy policy.',
        url: 'https://virtualaddresshub.com/privacy',
    },
};

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Privacy() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
                <PrivacyPageClient />
            </main>
            <FooterWithNav />
        </div>
    );
}
