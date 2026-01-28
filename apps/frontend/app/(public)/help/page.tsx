import type { Metadata } from 'next';
import { HelpPageClient } from './HelpPageClient';

// Force dynamic rendering (this page passes function props)
export const dynamic = 'force-dynamic';
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Help Centre & FAQs | VirtualAddressHub',
    description: 'Get answers to frequently asked questions about virtual business addresses, mail forwarding, pricing, compliance, and more. Fast answers and friendly support.',
    openGraph: {
        title: 'Help Centre & FAQs | VirtualAddressHub',
        description: 'Get answers to frequently asked questions about virtual business addresses, mail forwarding, pricing, compliance, and more.',
        url: 'https://virtualaddresshub.com/help',
    },
};

/**
 * Help Centre Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 * Layout provides: HeaderWithNav, main wrapper, FooterWithNav
 */
export default function Help() {
    return <HelpPageClient />;
}
