import type { Metadata } from 'next';
import ContactPage from '@/components/ContactPage';
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

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

export default function ContactRoute() {
    return (
        <div className="min-h-screen flex flex-col relative">
            <HeaderWithNav />
            <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
                <ContactPage />
            </main>
            <FooterWithNav />
        </div>
    );
}
