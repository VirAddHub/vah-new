import type { Metadata } from 'next';
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

/**
 * Privacy Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function Privacy() {
    return <PrivacyPageClient />;
}
