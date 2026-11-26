import type { Metadata } from 'next';
import { getServerPricing } from '@/lib/pricing.server';
import PricingPageClient from './pricing-page-client';

export const metadata: Metadata = {
    title: 'London Virtual Office Pricing | VirtualAddressHub',
    description: 'Compare monthly and annual subscriptions for a London business address and digital mail management. View included services and forwarding conditions.',
    alternates: { canonical: '/pricing' },
    openGraph: { title: 'London Virtual Office Pricing | VirtualAddressHub', url: '/pricing' },
};

export const revalidate = 60;

export default async function PricingPage() {
  const initialPricing = await getServerPricing();
  return <PricingPageClient initialPricing={initialPricing} />;
}
