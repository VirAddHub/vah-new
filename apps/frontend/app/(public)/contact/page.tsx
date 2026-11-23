import type { Metadata } from 'next';
import ContactPage from '@/components/ContactPage';

export const metadata: Metadata = {
    alternates: { canonical: '/contact' },
    title: 'Contact Us | VirtualAddressHub',
    description: 'Get in touch with VirtualAddressHub for support, questions, or inquiries about our virtual business address services. We\'re here to help.',
    openGraph: {
        title: 'Contact Us | VirtualAddressHub',
        description: 'Get in touch with VirtualAddressHub for support, questions, or inquiries about our virtual business address services.',
        url: 'https://virtualaddresshub.co.uk/contact',
    },
};


/**
 * Contact Page
 * 
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function ContactRoute() {
    return <ContactPage />;
}
