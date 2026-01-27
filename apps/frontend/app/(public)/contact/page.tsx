import type { Metadata } from 'next';
import ContactPage from '@/components/ContactPage';

export const metadata: Metadata = {
    title: 'Contact Us | VirtualAddressHub',
    description: 'Get in touch with VirtualAddressHub for support, questions, or inquiries about our virtual business address services. We\'re here to help.',
    openGraph: {
        title: 'Contact Us | VirtualAddressHub',
        description: 'Get in touch with VirtualAddressHub for support, questions, or inquiries about our virtual business address services.',
        url: 'https://virtualaddresshub.com/contact',
    },
};

export const dynamic = 'force-dynamic';
export const revalidate = false;

/**
 * Contact Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function ContactRoute() {
    return <ContactPage />;
}
