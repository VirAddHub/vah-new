import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import ContactPage from '@/components/ContactPage';
import { jsonLdScript } from '@/lib/jsonLd';
import { contactFaq, faqJsonLd } from '@/lib/marketing';

const title = 'Contact VirtualAddressHub | London SE1 Virtual Office';
const description = 'Questions about a London SE1 business address, same-day mail scanning or your account? We reply the same working day, Monday to Friday.';

export const metadata: Metadata = {
    alternates: { canonical: '/contact' },
    title,
    description,
    openGraph: {
    images: OG_IMAGES, title, description, url: 'https://virtualaddresshub.co.uk/contact' },
};

/**
 * Contact Page
 *
 * Uses shared (public) layout - no duplicate header/footer
 */
export default function ContactRoute() {
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(contactFaq)) }} />
            <ContactPage />
        </>
    );
}
