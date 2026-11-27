import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import { PrivacyPageClient } from './PrivacyPageClient';

export const metadata: Metadata = {
    alternates: { canonical: '/privacy' },
    title: 'Privacy Policy | VirtualAddressHub',
    description: 'Learn how VirtualAddressHub protects your privacy and handles your personal data. GDPR compliant privacy policy for our virtual business address services.',
    openGraph: {
    images: OG_IMAGES,
        title: 'Privacy Policy | VirtualAddressHub',
        description: 'Learn how VirtualAddressHub protects your privacy and handles your personal data. GDPR compliant privacy policy.',
        url: 'https://virtualaddresshub.co.uk/privacy',
    },
};


/**
 * Privacy Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function Privacy() {
    return <PrivacyPageClient />;
}
