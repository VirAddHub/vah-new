import type { Metadata } from 'next';
import { MarketingNavigation } from '@/components/MarketingNavigation';
import { HomePage } from '@/components/HomePage';
import { Footer } from '@/components/Footer';
import { PricingProvider } from '@/contexts/PricingContext';
import { getServerPricing } from '@/lib/pricing.server';
import { jsonLdScript } from '@/lib/jsonLd';
import { faqJsonLd, homepageHelp } from '@/lib/marketing';
export const metadata: Metadata = {
  title: 'London Virtual Office & Business Address | VirtualAddressHub',
  description:
    'A London SE1 business address by Tower Bridge from £9.99 a month: registered office, director’s service address and same-day mail scanning.',
  alternates: { canonical: '/' },
};
export default async function Home() {
  const initialPricing = await getServerPricing();
  return (
    <PricingProvider initialPricing={initialPricing}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(homepageHelp.map(h => ({ q: h.title, a: h.summary })))) }} />
      <MarketingNavigation />
      <main id="main-content">
        <HomePage />
      </main>
      <Footer />
    </PricingProvider>
  );
}
