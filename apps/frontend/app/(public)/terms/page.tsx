import type { Metadata } from 'next';
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

/**
 * Terms Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function Terms() {
    return <TermsPageClient />;
}
