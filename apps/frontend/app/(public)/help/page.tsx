import type { Metadata } from 'next';
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

/**
 * Help Centre Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 * Layout provides: HeaderWithNav, main wrapper, FooterWithNav
 */
export default function Help() {
    return <HelpPageClient />;
}
