import type { Metadata } from 'next';
import { MarketingNavigation } from '@/components/MarketingNavigation';
import { HomePage } from '@/components/HomePage';
import { Footer } from '@/components/Footer';
import { PricingProvider } from '@/contexts/PricingContext';
import { getServerPricing } from '@/lib/pricing.server';
export const metadata: Metadata = {
  title: 'London Virtual Office & Business Address | VirtualAddressHub',
  description:
    'One London address for your business, registered office and director correspondence, with digital mail management. Explore monthly and annual plans.',
  alternates: { canonical: '/' },
};
export default async function Home() {
  const initialPricing = await getServerPricing();
  return (
    <PricingProvider initialPricing={initialPricing}>
      <MarketingNavigation />
      <main id="main-content">
        <HomePage />
      </main>
      <Footer />
    </PricingProvider>
  );
}
