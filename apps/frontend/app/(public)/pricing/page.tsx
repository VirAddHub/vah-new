import type { Metadata } from 'next';
import { getServerPricing } from '@/lib/pricing.server';
import PricingPageClient from './pricing-page-client';

export const metadata: Metadata = {
  title: 'London Virtual Office Pricing | VirtualAddressHub',
  description:
    'Compare monthly and annual subscriptions for a London business address and digital mail management. View included services and forwarding conditions.',
  alternates: { canonical: '/pricing' },
  openGraph: {
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
  return <PricingPageClient initialPricing={initialPricing} />;
}
