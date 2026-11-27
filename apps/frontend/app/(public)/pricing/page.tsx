import type { Metadata } from 'next';
import { OG_IMAGES } from '@/lib/site';
import { getServerPricing } from '@/lib/pricing.server';
import PricingPageClient from './pricing-page-client';
import { jsonLdScript } from '@/lib/jsonLd';
import { faqJsonLd, pricingFaq } from '@/lib/marketing';

export const metadata: Metadata = {
  title: 'London Virtual Office Pricing | VirtualAddressHub',
  description:
    'London SE1 virtual office from £9.99 a month: registered office, director’s service address and same-day mail scanning in one plan. See forwarding prices.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    images: OG_IMAGES,
    title: 'One London address. One straightforward subscription.',
    description:
      'Compare monthly and annual billing for the same London business address and digital mail service.',
    url: '/pricing',
    type: 'website',
  },
};


export const revalidate = 60;

export default async function PricingPage() {
  const initialPricing = await getServerPricing();
  // Price markup so Google can show the price; only real prices from the plans API are used.
  const offers = [
    initialPricing?.monthlyPrice != null && { '@type': 'Offer', name: 'Monthly plan', price: initialPricing.monthlyPrice.toFixed(2), priceCurrency: 'GBP',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: initialPricing.monthlyPrice.toFixed(2), priceCurrency: 'GBP', unitCode: 'MON' }, availability: 'https://schema.org/InStock', url: 'https://virtualaddresshub.co.uk/pricing' },
    initialPricing?.annualPrice != null && { '@type': 'Offer', name: 'Annual plan', price: initialPricing.annualPrice.toFixed(2), priceCurrency: 'GBP',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: initialPricing.annualPrice.toFixed(2), priceCurrency: 'GBP', unitCode: 'ANN' }, availability: 'https://schema.org/InStock', url: 'https://virtualaddresshub.co.uk/pricing' },
  ].filter(Boolean);
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'London SE1 virtual office and mail scanning',
    serviceType: 'Virtual office',
    provider: { '@type': 'Organization', name: 'VirtualAddressHub', url: 'https://virtualaddresshub.co.uk' },
    areaServed: 'GB',
    description: 'A London SE1 business address by Tower Bridge, usable as a registered office and director’s service address, with same-day mail scanning.',
    ...(offers.length ? { offers } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(pricingFaq)) }} />
      <PricingPageClient initialPricing={initialPricing} />
    </>
  );
}
